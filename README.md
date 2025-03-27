# ProShop eCommerce Platform

> Ecommerce platform built using MERN & Redux with secure login using JWT, bcrypt & HTTP-Only cookie, scripts for seeding MongoDB, API tests in Postman, & payment processing using PayPal API.

<img src="./frontend/public/images/screens.png">

## Features

- Full featured shopping cart
- Product reviews and ratings
- Top products carousel
- Product pagination
- Product search feature
- User profile with orders
- Admin product management
- Admin user management
- Admin Order details page
- Mark orders as delivered option
- Checkout process (shipping, payment method, etc)
- PayPal / credit card integration
- Database seeder (products & users)
- Render continuous deployment from GitHub

## Workflow

1. Backend
   a) Add the route with the controller to deal with database, external systems, etc.
2. Frontend
   a) Start with the global state inside the slice and add the actions
   b) Then add the screen to implement functionality to handle user events

Proshop uses the following technologies:

- [JSON Web Tokens (JWT)](https://jwt.io/): An open, industry standard RFC 7519 method for representing claims securely between two parties. JWT.IO allows you to decode, verify and generate JWT.
- [MongoDB](https://www.mongodb.com/): A document database.
- [Express](https://expressjs.com/): Node.js framework for web apps, APIs and routing.
- [React 18](https://react.dev/): Web & native UI.
- [Node.js](https://nodejs.org/): JS runtime environment for servers, web apps, command line tools and scripts.
- [React Bootstrap](https://react-bootstrap.netlify.app/): Bootstrap JavaScript frontend framework for React.
- [React Icons](https://github.com/react-icons/react-icons): ES6 import compatible icons for React projects.
- [React Router DOM](https://github.com/remix-run/react-router): A multi-strategy router for React.
- [React Router Bootstrap](https://github.com/react-bootstrap/react-router-bootstrap): Integration between React Router v6 and React Bootstrap.
- [React Toastify](https://github.com/fkhadra/react-toastify): Allows you to add notifications to your app with ease.
- [Redux](https://redux.js.org/): State management using RTX Query.
- [Redux Toolkit](https://redux-toolkit.js.org/): The standard way to write Redux logic and includes a powerful data fetching and caching capability that we've dubbed "[RTK Query](https://redux-toolkit.js.org/introduction/getting-started#rtk-query)".
- [React Redux](https://react-redux.js.org/): Bridge that connects Redux and React together, i.e. React bindings for Redux.
- [Nodemon](https://nodemon.io/): Monitor for changes and auto restart server during development.
- [Concurrently](https://www.npmjs.com/package/concurrently): Run multiple commands concurrently.
- [DotEnv](https://github.com/motdotla/dotenv): Loads environment variables from a .env file into process.env.
- [Axios](https://axios-http.com/): Simple promise based HTTP client for the browser and node.js.
- [Colors](https://github.com/Marak/colors.js): Get color and style in your node.js console.
- [Mongoose](https://mongoosejs.com/): MongoDB object modeling for Node.js.
- [BCrypt.js](https://github.com/dcodeIO/bcrypt.js): A library to help you hash passwords in JavaScript, compatible to the C++ bcrypt binding on node.js.
- [JSON Web Token (JWT)](https://github.com/auth0/node-jsonwebtoken): An implementation of [JSON Web Tokens](https://datatracker.ietf.org/doc/html/rfc7519) that makes use of node-jws.
- [Cookie Parser ](https://github.com/expressjs/cookie-parse): Parse the cookie from the header in the request object and populate req.cookies with an object keyed by the cookie names. Optionally you may enable signed cookie support by passing a secret string, which assigns req.secret so it may be used by other middleware.
- [React PayPal JS](https://paypal.github.io/react-paypal-js/): Provides a solution to developers to abstract away complexities around loading the PayPal JS SDK. It enforces best practices by default so buyers get the best possible user experience.
- [Multer](https://github.com/expressjs/multer): A node.js middleware for handling multipart/form-data, which is primarily used for uploading files. It is written on top of busboy for maximum efficiency.
- [React Helmet Async](https://github.com/staylor/react-helmet-async): Fork of React Helmet. <Helmet> usage is synonymous, but server and client now requires <HelmetProvider> to encapsulate state per request. This reusable React component will manage all of your changes to the document head.
