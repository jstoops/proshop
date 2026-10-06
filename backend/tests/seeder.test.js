import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import products from '../data/products.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import { destroyData, importData, runSeeder } from '../seeder.js';

describe('database seeder', () => {
  let memoryServer;

  before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = memoryServer.getUri();
    await mongoose.connect(process.env.MONGO_URI);
  });

  after(async () => {
    await mongoose.disconnect();
    await memoryServer.stop();
  });

  it('imports the sample users and products owned by the admin', async () => {
    await importData();

    const users = await User.find({}).sort({ email: 1 });
    const catalog = await Product.find({});
    const admin = users.find((user) => user.isAdmin);

    assert.equal(users.length, 3);
    assert.equal(admin.email, 'admin@email.com');
    assert.equal(await admin.matchPassword('123456'), true);
    assert.equal(catalog.length, products.length);
    assert.ok(catalog.every((product) => product.user.equals(admin._id)));
    assert.equal(
      catalog.find((product) => product.name.includes('Airpods')).price,
      89.99
    );
  });

  it('replaces previously seeded orders', async () => {
    await importData();
    const admin = await User.findOne({ isAdmin: true });
    const product = await Product.findOne({});
    await Order.create({
      user: admin._id,
      orderItems: [
        {
          name: product.name,
          qty: 1,
          image: product.image,
          price: product.price,
          product: product._id,
        },
      ],
      shippingAddress: {
        address: '1 Main St',
        city: 'Boston',
        postalCode: '02101',
        country: 'USA',
      },
      paymentMethod: 'PayPal',
      itemsPrice: product.price,
      taxPrice: 0,
      shippingPrice: 0,
      totalPrice: product.price,
    });

    await importData();

    assert.equal(await Order.countDocuments(), 0);
    assert.equal(await Product.countDocuments(), products.length);
    assert.equal(await User.countDocuments(), 3);
  });

  it('destroys users, products, and orders', async () => {
    await importData();
    await destroyData();

    assert.equal(await User.countDocuments(), 0);
    assert.equal(await Product.countDocuments(), 0);
    assert.equal(await Order.countDocuments(), 0);
  });

  it('imports from the command entrypoint and then exits', async (t) => {
    const logs = [];
    const argv = process.argv.slice();
    delete process.argv[2];
    let code;
    t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')));
    t.mock.method(console, 'error', () => {});
    t.mock.method(process, 'exit', (status = 0) => {
      code = status;
    });

    try {
      await runSeeder();
    } finally {
      process.argv = argv;
    }

    assert.equal(code, 0);
    assert.match(logs.join('\n'), /Data Imported!/);
    assert.equal(await User.countDocuments(), 3);
  });

  it('destroys from the command entrypoint when passed -d', async (t) => {
    await importData();
    const logs = [];
    const argv = process.argv.slice();
    process.argv[2] = '-d';
    let code;
    t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')));
    t.mock.method(console, 'error', () => {});
    t.mock.method(process, 'exit', (status = 0) => {
      code = status;
    });

    try {
      await runSeeder();
    } finally {
      process.argv = argv;
    }

    assert.equal(code, 0);
    assert.match(logs.join('\n'), /Data Destroyed!/);
    assert.equal(await User.countDocuments(), 0);
  });

  it('exits with status 1 when the database cannot be reached', async (t) => {
    t.mock.method(mongoose, 'connect', async () => {
      throw new Error('connection refused');
    });
    t.mock.method(console, 'error', () => {});
    t.mock.method(process, 'exit', (code) => {
      throw new Error(`exit ${code}`);
    });

    await assert.rejects(runSeeder(), /exit 1/);
  });
});
