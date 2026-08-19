import json
from collections import Counter

with open('/tmp/storekit-frontend-qa-results.json', encoding='utf-8') as f:
    results = json.load(f)

errors = Counter()
failures = Counter()
bad = []
for item in results:
    case = item['case']
    probe = item.get('probe', {})
    if probe.get('bodyText', 0) < 20 or probe.get('rootChildren', 0) == 0 or probe.get('lang') != case['lang'] or (case['theme'] == 'dark' and not probe.get('dark')):
        bad.append({'case': case, 'route': item['route'], 'probe': probe})
    for error in item.get('errors', []):
        errors[error] += 1
    for failure in item.get('network_failures', []):
        failures[(failure.get('status'), failure.get('error'), failure.get('url'))] += 1

print(f'results={len(results)}')
print(f'errors_total={sum(errors.values())}')
print(f'network_failures_total={sum(failures.values())}')
print(f'bad_probes={len(bad)}')
print('\nerrors_unique:')
for key, count in errors.most_common():
    print(f'{count}x {key}')
print('\nnetwork_failures_unique:')
for key, count in failures.most_common(40):
    print(f'{count}x {key}')
print('\nbad_probes:')
for item in bad[:50]:
    print(json.dumps(item, ensure_ascii=False))
