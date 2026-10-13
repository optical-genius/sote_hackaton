import urllib.request
import json

url = "http://172.20.160.1:1234/v1/models"
req = urllib.request.Request(url, headers={"Authorization": "Bearer sk-lm-tia401iw:MRIY7W74tWqkZKbMaxVd"})
try:
    with urllib.request.urlopen(req, timeout=3) as resp:
        print("Status:", resp.status)
        data = json.loads(resp.read().decode())
        models = [m['id'] for m in data.get('data', [])]
        print("Available models:", models)
except Exception as e:
    print("Error connecting to 172.20.160.1:1234:", e)
