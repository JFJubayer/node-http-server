import http from 'node:http';

function layout(title, content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6; color: #222; }
    nav { margin-bottom: 2rem; }
    nav a { margin-right: 1rem; }
    code { background: #f1f1f1; padding: 0.1rem 0.3rem; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a><a href="/api/time">Time (JSON)</a></nav>
  ${content}
</body>
</html>
`;
}

// The name comes from the address bar, so it must be escaped before it goes into HTML.
function escapeHtml(text) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return text.replace(/[&<>"']/g, (ch) => entities[ch]);
}

const homePage = (name) => layout('Node HTTP server', `<h1>Hello, ${escapeHtml(name)}!</h1>
  <p>This page is sent by a Node.js server built with the <code>http</code> module.</p>
  <p>Put a name in the address to change the greeting: <a href="/?name=Karim"><code>/?name=Karim</code></a></p>`);

const aboutPage = layout('About', `<h1>About</h1>
  <p>A small practice project for learning how requests and responses work in Node.js. It only uses the built-in <code>http</code> module.</p>
  <ul>
    <li><code>/</code> the home page (HTML)</li>
    <li><code>/about</code> this page (HTML)</li>
    <li><code>/api/time</code> the current time (JSON)</li>
  </ul>`);

const notFoundPage = layout('Page not found', `<h1>404 - Page not found</h1>
  <p>There is nothing at this address. <a href="/">Go back home</a>.</p>`);

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

// "/about?x=1" becomes ["/about", "x=1"]
function splitUrl(url) {
  const i = url.indexOf('?');
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i + 1)];
}

export function createServer(log = console.log) {
  return http.createServer((req, res) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed');
    }

    const [path, query] = splitUrl(req.url);

    if (path === '/') {
      const name = new URLSearchParams(query).get('name')?.trim() || 'world';
      send(res, 200, 'text/html; charset=utf-8', homePage(name));
    } else if (path === '/about') {
      send(res, 200, 'text/html; charset=utf-8', aboutPage);
    } else if (path === '/api/time') {
      const body = JSON.stringify({ time: new Date().toISOString() });
      send(res, 200, 'application/json; charset=utf-8', body);
    } else {
      send(res, 404, 'text/html; charset=utf-8', notFoundPage);
    }
  });
}
