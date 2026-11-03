import assert from 'node:assert/strict';
import { once } from 'node:events';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { createServer } from '../src/app.js';

let server;
let base;

beforeEach(async () => {
  server = createServer();
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
