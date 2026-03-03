import urllib.request, json

try:
    r = urllib.request.urlopen('http://127.0.0.1:8000/recommend/3')
    print("STATUS:", r.status)
    print(json.loads(r.read()))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print("BODY:", e.read().decode('utf-8', errors='replace'))
except Exception as e:
    print("OTHER ERROR:", e)
