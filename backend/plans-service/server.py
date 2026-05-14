from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys

os.environ.setdefault('POSTGRES_HOST', 'localhost')
os.environ.setdefault('POSTGRES_PORT', '5432')
os.environ.setdefault('POSTGRES_USER', 'postgres')
os.environ.setdefault('POSTGRES_PASS', 'postgres')
os.environ.setdefault('POSTGRES_NAME', 'acme_performance')
os.environ.setdefault('IS_LOCAL', 'true')

from function import handler

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{args}", flush=True)

    def _handle(self, method):
        path = self.path
        body = {}
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = json.loads(self.rfile.read(content_length))

        event = {
            'requestContext': {'http': {'method': method}},
            'rawPath': path.split('?')[0],
            'queryStringParameters': {},
            'headers': {k.lower(): v for k, v in self.headers.items()},
            'body': json.dumps(body)
        }

        result = handler(event)
        self.send_response(result['statusCode'])
        for k, v in result.get('headers', {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(result['body'].encode())

    def do_GET(self): self._handle('GET')
    def do_POST(self): self._handle('POST')
    def do_PUT(self): self._handle('PUT')
    def do_DELETE(self): self._handle('DELETE')
    def do_OPTIONS(self): self._handle('OPTIONS')

print('Starting auth service on port 8006...', flush=True)
server = HTTPServer(('0.0.0.0', 8006), Handler)
print('Auth service running on http://localhost:8006', flush=True)
server.serve_forever()