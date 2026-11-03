import assert from 'node:assert/strict';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createServer } from '../src/app.js';

let server;
let base;
let logs;

beforeEach(async () => {
  logs = [];
  server = createServer((line) => logs.push(line));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  const closed = once(server, 'close');
  server.close();
  server.closeAllConnections();
  await closed;
});

describe('home page', () => {
  test('sends an HTML page', async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/html/);
    assert.match(await res.text(), /<h1>Hello, world!<\/h1>/);
  });
});

describe('home page greeting', () => {
  const greeting = async (query) => {
    const res = await fetch(`${base}/${query}`);
    assert.equal(res.status, 200);
    return res.text();
  };

  test('uses the name from ?name=', async () => {
    assert.match(await greeting('?name=Karim'), /<h1>Hello, Karim!<\/h1>/);
  });

  test('trims the name and works with Bangla letters', async () => {
    assert.match(await greeting('?name=%20Karim%20'), /<h1>Hello, Karim!<\/h1>/);
    assert.match(await greeting(`?name=${encodeURIComponent('করিম')}`), /<h1>Hello, করিম!<\/h1>/);
  });

  test('falls back to "world" when the name is missing or empty', async () => {
    assert.match(await greeting('?name='), /<h1>Hello, world!<\/h1>/);
    assert.match(await greeting('?other=1'), /<h1>Hello, world!<\/h1>/);
  });

  test('escapes HTML so a name cannot inject a script', async () => {
    const html = await greeting(`?name=${encodeURIComponent('<script>alert("x")</script>')}`);
    assert.ok(!html.includes('<script>alert'));
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  });
});

describe('/api/time', () => {
  test('sends JSON with the current time', async () => {
    const before = Date.now();
    const res = await fetch(`${base}/api/time`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^application\/json/);

    const sent = Date.parse((await res.json()).time);
    assert.ok(sent >= before - 1000 && sent <= Date.now() + 1000);
  });
});

describe('/about', () => {
  test('sends an HTML page', async () => {
    const res = await fetch(`${base}/about`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/html/);
    assert.match(await res.text(), /<h1>About<\/h1>/);
  });

  test('ignores the query string when choosing the route', async () => {
    const res = await fetch(`${base}/about?x=1`);
    assert.equal(res.status, 200);
  });
});

describe('unknown paths', () => {
  test('answer 404 with an HTML page', async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /^text\/html/);
    assert.match(await res.text(), /404 - Page not found/);
  });
});

describe('request log', () => {
  test('prints one line per request with method, address, status and time', async () => {
    await fetch(`${base}/about?x=1`);
    await fetch(`${base}/nope`);
    await nextTurn();

    assert.equal(logs.length, 2);
    assert.match(logs[0], /^\d{4}-\d\d-\d\dT[\d:.]+Z GET \/about\?x=1 200 \d+ms$/);
    assert.match(logs[1], / GET \/nope 404 \d+ms$/);
  });
});

describe('other methods', () => {
  test('POST is answered with 405 and an Allow header', async () => {
    const res = await fetch(`${base}/`, { method: 'POST' });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET, HEAD');
  });

  test('HEAD sends the headers but no body', async () => {
    const res = await fetch(`${base}/`, { method: 'HEAD' });
    assert.equal(res.status, 200);
    assert.ok(Number(res.headers.get('content-length')) > 0);
    assert.equal(await res.text(), '');
  });
});
