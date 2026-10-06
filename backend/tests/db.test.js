import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

describe('connectDB', () => {
  it('logs the host after a successful connection', async (t) => {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/proshop-test';
    const logs = [];
    t.mock.method(mongoose, 'connect', async (uri) => {
      assert.equal(uri, process.env.MONGO_URI);
      return { connection: { host: 'memory-host' } };
    });
    t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')));

    await connectDB();

    assert.match(logs.join('\n'), /MongoDB Connected: memory-host/);
  });

  it('exits the process when the connection fails', async (t) => {
    const errors = [];
    t.mock.method(mongoose, 'connect', async () => {
      throw new Error('connection refused');
    });
    t.mock.method(console, 'error', (...args) => errors.push(args.join(' ')));
    t.mock.method(process, 'exit', (code) => {
      throw new Error(`exit ${code}`);
    });

    await assert.rejects(connectDB(), /exit 1/);
    assert.match(errors.join('\n'), /connection refused/);
  });
});
