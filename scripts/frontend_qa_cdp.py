import json
import sys
import time
import urllib.request
import websocket

CDP_BASE = "http://127.0.0.1:9225"
APP_BASE = "http://127.0.0.1:8091"
ROUTES = [
    "/",
    "/collections",
    "/collections/new-arrivals",
    "/collections/essentials",
    "/collections/outerwear",
    "/products/leather-bucket-bag",
    "/products/oversized-merino-coat",
    "/cart",
    "/checkout",
    "/search",
    "/about",
    "/lookbook",
    "/account",
    "/account/orders",
    "/account/wishlist",
    "/sign-in",
    "/sign-up",
    "/admin/login",
    "/admin",
    "/admin/products",
    "/admin/collections",
    "/admin/orders",
    "/admin/settings",
    "/admin/content",
    "/admin/analytics",
    "/admin/reviews",
    "/admin/stock-alerts",
]
CASES = [
    ("en", "light", 390, 844, True),
    ("ar", "dark", 390, 844, True),
    ("en", "light", 1440, 1000, False),
    ("ar", "dark", 1440, 1000, False),
]

class Browser:
    def __init__(self, ws):
        self.ws = ws
        self.counter = 0
        self.events = []

    def command(self, method, params=None, timeout=15):
        self.counter += 1
        ident = self.counter
        self.ws.send(json.dumps({"id": ident, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                message = json.loads(self.ws.recv())
            except Exception:
                continue
            if message.get("id") == ident:
                return message
            self.events.append(message)
        raise TimeoutError(f"CDP timeout waiting for {method}")

    def drain(self, seconds=1.5):
        deadline = time.time() + seconds
        self.ws.settimeout(0.15)
        while time.time() < deadline:
            try:
                self.events.append(json.loads(self.ws.recv()))
            except Exception:
                pass
        self.ws.settimeout(15)

    def evaluate(self, expression):
        result = self.command("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
        return result.get("result", {}).get("result", {}).get("value")


def page_target():
    with urllib.request.urlopen(CDP_BASE + "/json/list") as response:
        targets = json.load(response)
    return next(target for target in targets if target.get("type") == "page")


def reset_events(browser):
    browser.events = []


def extract_errors(browser):
    errors = []
    failed = []
    for event in browser.events:
        method = event.get("method")
        params = event.get("params", {})
        if method == "Runtime.exceptionThrown":
            detail = params.get("exceptionDetails", {})
            errors.append(detail.get("text") or detail.get("exception", {}).get("description") or "Runtime exception")
        elif method == "Runtime.consoleAPICalled" and params.get("type") in {"error", "assert"}:
            args = params.get("args", [])
            errors.append(" ".join(str(arg.get("value", arg.get("description", ""))) for arg in args).strip() or "console error")
        elif method == "Log.entryAdded" and params.get("entry", {}).get("level") == "error":
            errors.append(params.get("entry", {}).get("text", "log error"))
        elif method == "Network.loadingFailed":
            failed.append({"url": params.get("url", ""), "error": params.get("errorText", "")})
        elif method == "Network.responseReceived":
            response = params.get("response", {})
            if response.get("status", 0) >= 400:
                failed.append({"url": response.get("url", ""), "status": response.get("status")})
    return errors, failed


def main():
    target = page_target()
    ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=15, origin="http://localhost")
    browser = Browser(ws)
    browser.command("Page.enable")
    browser.command("Runtime.enable")
    browser.command("Log.enable")
    browser.command("Network.enable")
    results = []

    for lang, theme, width, height, mobile in CASES:
        browser.command("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 2 if mobile else 1, "mobile": mobile})
        browser.command("Emulation.setTouchEmulationEnabled", {"enabled": mobile, "maxTouchPoints": 5})
        browser.command("Page.navigate", {"url": APP_BASE + "/"})
        browser.drain(1.4)
        browser.evaluate(f"localStorage.setItem('sk-lang', {json.dumps(lang)}); localStorage.setItem('sk-theme', {json.dumps(theme)});")
        browser.command("Page.reload", {"ignoreCache": True})
        browser.drain(1.3)

        for route in ROUTES:
            reset_events(browser)
            browser.command("Page.navigate", {"url": APP_BASE + route})
            browser.drain(1.6)
            probe = browser.evaluate("""(() => {
              const root = document.getElementById('root');
              return {
                route: location.pathname,
                lang: document.documentElement.lang,
                dir: document.documentElement.dir,
                dark: document.documentElement.classList.contains('dark'),
                viewport: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                bodyText: (document.body.innerText || '').trim().length,
                rootChildren: root ? root.children.length : 0,
                title: document.title,
                loading: [...document.querySelectorAll('[aria-busy="true"]')].length,
              };
            })()""") or {}
            errors, failed = extract_errors(browser)
            results.append({"case": {"lang": lang, "theme": theme, "width": width, "height": height, "mobile": mobile}, "route": route, "probe": probe, "errors": errors, "network_failures": failed})

    print(json.dumps(results, ensure_ascii=False, indent=2))
    ws.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"fatal": str(exc)}, ensure_ascii=False))
        sys.exit(2)
