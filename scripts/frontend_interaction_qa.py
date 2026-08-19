import json
import time
import urllib.request
import websocket

CDP_BASE = "http://127.0.0.1:9225"
APP_BASE = "http://127.0.0.1:8091"

class CDP:
    def __init__(self, ws):
        self.ws = ws
        self.i = 0
    def call(self, method, params=None):
        self.i += 1
        ident = self.i
        self.ws.send(json.dumps({"id": ident, "method": method, "params": params or {}}))
        while True:
            data = json.loads(self.ws.recv())
            if data.get("id") == ident:
                return data
    def eval(self, expression):
        result = self.call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
        return result.get("result", {}).get("result", {}).get("value")
    def nav(self, route):
        self.call("Page.navigate", {"url": APP_BASE + route})
        time.sleep(2.2)


def target():
    with urllib.request.urlopen(CDP_BASE + "/json/list") as response:
        return next(t for t in json.load(response) if t.get("type") == "page")


def click_by(selector):
    return f"(() => {{ const el=document.querySelector({json.dumps(selector)}); if(!el) return false; el.click(); return true; }})()"


def main():
    ws = websocket.create_connection(target()["webSocketDebuggerUrl"], timeout=15, origin="http://localhost")
    c = CDP(ws)
    c.call("Page.enable")
    c.call("Runtime.enable")
    c.call("Network.enable")
    c.eval("localStorage.setItem('sk-lang','en'); localStorage.setItem('sk-theme','light'); localStorage.removeItem('storekit-cart'); localStorage.removeItem('storekit-wishlist'); localStorage.removeItem('sk-guest-id');")
    results = {}

    c.nav("/")
    results["home_initial"] = c.eval("""(() => ({
      path: location.pathname,
      text: (document.body.innerText||'').length,
      buttons: [...document.querySelectorAll('button')].map(x => ({label:x.getAttribute('aria-label'), text:(x.innerText||'').trim()})).slice(0,30),
      links: [...document.querySelectorAll('a')].map(x => ({href:x.getAttribute('href'), text:(x.innerText||'').trim()})).slice(0,30),
    }))()""")

    results["theme_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /dark mode|light mode|الوضع الداكن|الوضع الفاتح/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.35)
    results["theme_state"] = c.eval("""(() => ({dark:document.documentElement.classList.contains('dark'),saved:localStorage.getItem('sk-theme')}))()""")
    results["mobile_menu_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /menu|navigation/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.4)
    results["mobile_menu_state"] = c.eval("""(() => ({
      visible: [...document.querySelectorAll('[role="dialog"], nav, [data-state="open"]')].some(x => { const r=x.getBoundingClientRect(); return r.width>0 && r.height>0; }),
      bodyText: (document.body.innerText||'').slice(0,500),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }))()""")
    results["mobile_menu_close"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /close navigation|إغلاق القائمة/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)

    results["quick_view_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||'')==='Quick View'); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.5)
    results["quick_view_state"] = c.eval("""(() => ({dialogs:[...document.querySelectorAll('[role="dialog"], .quick-view-modal, .mobile-quickview')].map(x=>({text:(x.innerText||'').slice(0,300),class:x.className})), bodyWidth:document.documentElement.scrollWidth-document.documentElement.clientWidth}))()""")
    results["quick_view_close"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /close|إغلاق/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)
    results["wishlist_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||'')==='Add to Wishlist'); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)
    results["wishlist_state"] = c.eval("""(() => ({saved:localStorage.getItem('sk-wishlist'),buttons:[...document.querySelectorAll('button')].map(x=>x.getAttribute('aria-label')).filter(Boolean).filter(x=>/wishlist|المفضلة/i.test(x)).slice(0,4)}))()""")
    results["language_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /language|اللغة/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)
    results["language_select_ar"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /العربية/.test(x.innerText||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.5)
    results["language_state"] = c.eval("""(() => ({lang:document.documentElement.lang,dir:document.documentElement.dir,text:(document.body.innerText||'').slice(0,200)}))()""")

    results["theme_buttons"] = c.eval("""(() => [...document.querySelectorAll('button')].map(x => x.getAttribute('aria-label')).filter(Boolean).filter(x => /theme|mode|الوضع|المظهر/i.test(x)))()""")

    c.eval("localStorage.setItem('sk-lang','en'); localStorage.setItem('sk-theme','light');")
    c.nav("/products/leather-bucket-bag")
    results["product_initial"] = c.eval("""(() => ({text:(document.body.innerText||'').length, buttons:[...document.querySelectorAll('button')].map(x=>({label:x.getAttribute('aria-label'),text:(x.innerText||'').trim()})).filter(x=>x.label||x.text).slice(-20)}))()""")
    results["variant_color_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label')==='Tan'); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)
    results["variant_size_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => (x.innerText||'').trim()==='One Size'); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.3)
    results["product_add_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /add to bag|add to cart|إضافة/i.test((x.innerText||'')+' '+(x.getAttribute('aria-label')||''))); if(!el) return {found:false}; el.click(); return {found:true,text:(el.innerText||'').trim(),disabled:el.disabled}; })()""")
    time.sleep(0.8)
    results["cart_after_add"] = c.eval("""(() => ({text:(document.body.innerText||'').slice(-900), cartButtons:[...document.querySelectorAll('button')].map(x=>x.getAttribute('aria-label')).filter(Boolean).filter(x=>/cart|السلة/i.test(x)), bodyWidth:document.documentElement.scrollWidth-document.documentElement.clientWidth}))()""")

    results["cart_open_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button')].find(x => /cart|السلة/i.test(x.getAttribute('aria-label')||'')); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(0.5)
    results["cart_open_state"] = c.eval("""(() => ({text:(document.body.innerText||'').slice(-1200), sheets:[...document.querySelectorAll('[role="dialog"], .mobile-cart-sheet')].map(x=>({class:x.className,text:(x.innerText||'').slice(0,200)}))}))()""")
    results["checkout_click"] = c.eval("""(() => { const el=[...document.querySelectorAll('button,a')].find(x => /checkout|إتمام الشراء/i.test((x.innerText||'').trim())); if(!el) return {found:false}; el.click(); return {found:true}; })()""")
    time.sleep(1.2)
    results["checkout_state"] = c.eval("""(() => ({path:location.pathname,text:(document.body.innerText||'').slice(0,900),bodyText:(document.body.innerText||'').trim().length,guestId:localStorage.getItem('sk-guest-id'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}))()""")

    c.nav("/admin/login")
    results["admin_login_initial"] = c.eval("""(() => ({text:(document.body.innerText||'').slice(0,600),inputs:[...document.querySelectorAll('input')].map(x=>({type:x.type,placeholder:x.placeholder,aria:x.getAttribute('aria-label')})),buttons:[...document.querySelectorAll('button')].map(x=>(x.innerText||'').trim()).filter(Boolean)}))()""")
    results["admin_login_submit"] = c.eval("""(() => { const input=document.querySelector('input[type="password"]'); const btn=[...document.querySelectorAll('button')].find(x=>/login|sign in|دخول|تسجيل/i.test(x.innerText||'')); if(!input||!btn) return {found:false}; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'storekit2024'); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); btn.click(); return {found:true}; })()""")
    time.sleep(1.5)
    results["admin_after_login"] = c.eval("""(() => ({path:location.pathname,text:(document.body.innerText||'').slice(0,800),      cookie:document.cookie.includes('sk_admin_session'),
      localAdminSession: localStorage.getItem('sk-admin-session'),apiLinks:[...document.querySelectorAll('a')].map(x=>x.getAttribute('href')).filter(Boolean).filter(x=>x.startsWith('/admin')).slice(0,20)}))()""")

    print(json.dumps(results, ensure_ascii=False, indent=2))
    ws.close()

if __name__ == '__main__':
    main()
