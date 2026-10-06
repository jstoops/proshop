import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'upload-secret';
process.env.PAYPAL_CLIENT_ID = 'paypal-client';
process.env.PAYPAL_APP_SECRET = 'paypal-secret';
process.env.PAYPAL_API_URL = 'https://paypal.test';

const { default: app } = await import('../app.js');

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const createdFiles = [];

describe('POST /api/upload', () => {
  after(() => {
    for (const file of createdFiles) {
      fs.rmSync(file, { force: true });
    }
  });

  it('stores a png and returns its public path', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('image', png, 'pixel.png');

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Image uploaded successfully');
    assert.match(res.body.image, /^\/uploads\/image-\d+\.png$/);

    const diskPath = path.resolve(res.body.image.slice(1));
    createdFiles.push(diskPath);
    assert.equal(fs.existsSync(diskPath), true);
  });

  it('accepts jpeg and webp images', async () => {
    const jpeg = await request(app)
      .post('/api/upload')
      .attach('image', png, { filename: 'pixel.jpg', contentType: 'image/jpeg' });
    const webp = await request(app)
      .post('/api/upload')
      .attach('image', png, { filename: 'pixel.webp', contentType: 'image/webp' });

    assert.equal(jpeg.status, 200);
    assert.match(jpeg.body.image, /\.jpg$/);
    assert.equal(webp.status, 200);
    assert.match(webp.body.image, /\.webp$/);

    createdFiles.push(path.resolve(jpeg.body.image.slice(1)));
    createdFiles.push(path.resolve(webp.body.image.slice(1)));
  });

  it('rejects files that are not images', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('hello'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Images only!');
  });

  it('rejects a mismatched extension and mime type', async () => {
    const wrongType = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('hello'), {
        filename: 'pixel.jpg',
        contentType: 'text/plain',
      });
    const wrongExt = await request(app)
      .post('/api/upload')
      .attach('image', png, {
        filename: 'pixel.gif',
        contentType: 'image/png',
      });

    assert.equal(wrongType.status, 400);
    assert.equal(wrongType.body.message, 'Images only!');
    assert.equal(wrongExt.status, 400);
    assert.equal(wrongExt.body.message, 'Images only!');
  });
});
