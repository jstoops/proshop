import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import colors from 'colors';
import users from './data/users.js';
import products from './data/products.js';
import User from './models/userModel.js';
import Product from './models/productModel.js';
import Order from './models/orderModel.js';
import connectDB from './config/db.js';

dotenv.config();

const importData = async () => {
  await Order.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();

  const createdUsers = await User.insertMany(users);

  const adminUser = createdUsers[0]._id;

  const sampleProducts = products.map((product) => {
    return { ...product, user: adminUser };
  });

  await Product.insertMany(sampleProducts);
};

const destroyData = async () => {
  await Order.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();
};

const runSeeder = async () => {
  try {
    await connectDB();

    if (process.argv[2] === '-d') {
      await destroyData();
      console.log('Data Destroyed!'.red.inverse);
    } else {
      await importData();
      console.log('Data Imported!'.green.inverse);
    }

    process.exit(0);
  } catch (error) {
    console.error(`${error}`.red.inverse);
    process.exit(1);
  }
};

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runSeeder();
}

export { importData, destroyData, runSeeder };
