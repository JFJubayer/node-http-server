import http from 'node:http';

const homePage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Node HTTP server</title>
</head>
<body>
  <h1>Hello, world!</h1>
  <p>This page is sent by a Node.js server built with the http module.</p>
</body>
</html>
`;

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/') {
      send(res, 200, 'text/html; charset=utf-8', homePage);
    } else if (req.url === '/api/time') {
      const body = JSON.stringify({ time: new Date().toISOString() });
      send(res, 200, 'application/json; charset=utf-8', body);
    } else {
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    }
  });
}
