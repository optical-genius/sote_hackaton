import socket

candidates = [
    "172.20.160.1",
    "172.19.16.1",
    "172.17.0.1",
    "172.26.0.1",
    "10.0.2.2",
    "localhost",
    "127.0.0.1"
]

print("Testing port 1234 on candidates:")
for ip in candidates:
    s = socket.socket()
    s.settimeout(0.6)
    try:
        s.connect((ip, 1234))
        print(f" -> {ip}:1234 is OPEN! ***")
        s.close()
    except Exception as e:
        print(f" -> {ip}:1234 failed: {e}")
