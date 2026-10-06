import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

const buildDir = path.resolve('frontend/build');
const indexPath = path.join(buildDir, 'index.html');
const buildExisted = fs.existsSync(buildDir);

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'production-secret';
process.env.PAYPAL_CLIENT_ID = 'live-client';
process.env.PAYPAL_APP_SECRET = 'live-secret';
process.env.PAYPAL_API_URL = 'https://paypal.test';

fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(indexPath, '<html><body>proshop</body></html>');

const { default: app } = await import('../app.js');

describe('production app', () => {
  after(() => {
    if (!buildExisted) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    } else {
      fs.rmSync(indexPath, { force: true });
    }
  });

  it('serves the PayPal client id', async () => {
    const res = await request(app).get('/api/config/paypal');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { clientId: 'live-client' });
  });

  it('serves the built client for page routes', async () => {
    const root = await request(app).get('/');
    const nested = await request(app).get('/product/123');

    assert.equal(root.status, 200);
    assert.match(root.text, /proshop/);
    assert.equal(nested.status, 200);
    assert.match(nested.text, /proshop/);
  });

  it('still returns JSON for unknown non-GET API routes', async () => {
    const res = await request(app).post('/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.match(res.body.message, /Not Found - \/api\/does-not-exist/);
    assert.equal(res.body.stack, null);
  });
});
