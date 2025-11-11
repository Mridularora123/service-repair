// server.js — Express + MongoDB + Shopify-friendly headers + proxy widget
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();

// ---------- Basic security & logging ----------
// Configure helmet but disable frameguard & contentSecurityPolicy defaults
// because we'll set a targeted CSP that allows framing by the shop when proxied.
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));

app.use(cors()); // you may lock this down to allowed origins if needed
app.use(morgan('tiny'));

// IMPORTANT: trust proxy so secure cookies work behind Render/Heroku proxies
app.set('trust proxy', 1);

// ---------- Session configuration ----------
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Set it in environment variables.');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-me-secure',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: true,        // requires HTTPS
    sameSite: 'none',    // required for embedded Shopify apps
    httpOnly: true
  }
}));

// ---------- Allow framing for Shopify (per-request CSP) ----------
// This middleware removes any X-Frame-Options header and sets a targeted CSP
// when the request comes from Shopify via an App Proxy (X-Shopify-Shop-Domain header).
// Place this before routes that will be framed (e.g. /proxy/widget).
app.use((req, res, next) => {
  try {
    // Remove any existing header that could block framing
    if (typeof res.removeHeader === 'function') res.removeHeader('X-Frame-Options');

    // If proxied by Shopify, Shopify sends X-Shopify-Shop-Domain header.
    // Restrict frame-ancestors to that shop (and admin.shopify if needed).
    const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

    if (shop) {
      // allow only the calling shop (and admin) to embed
      res.setHeader('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com`);
    } else {
      // Development fallback: remove restrictive CSP so iframe can be tested directly.
      // For production prefer app proxy and the shop-specific header above.
      if (typeof res.removeHeader === 'function') res.removeHeader('Content-Security-Policy');
    }
  } catch (err) {
    console.warn('iframe header middleware error', err);
  }
  next();
});

// ---------- Webhooks (must be mounted BEFORE bodyParser.json()) ----------
// Example: routes/webhooks should export handlers using express.raw()
// e.g. app.use('/webhooks', require('./routes/webhooks'));
app.use('/webhooks', require('./routes/webhooks'));

// ---------- Body parsers for the rest of the app ----------
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Static files & API routes ----------
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/theme', express.static(path.join(__dirname, 'theme')));

// Mount your APIs (adjust these requires to your actual route filenames)
app.use('/api', require('./routes/api'));
app.use('/admin-auth', require('./routes/admin-auth'));
app.use('/auth', require('./routes/auth')); // OAuth/auth

// ---------- Mount the proxy-widget route (serves the iframe page) ----------
const proxyWidget = require('./routes/proxy-widget'); // make sure this file exists
app.use(proxyWidget); // serves /proxy/widget (used by App Proxy or direct iframe)

// ---------- Minimal pages ----------
app.get('/', (req, res) => {
  const shop = req.query.shop || 'no-shop';
  res.send(`
    <html><head><meta charset="utf-8"><title>Service Repair</title></head>
    <body style="font-family:system-ui,Arial,sans-serif;line-height:1.4">
      <h1>Service Repair — Embedded App</h1>
      <p>Shop: <strong>${shop}</strong></p>
      <p><a href="/healthz">Health</a> • <a href="/admin">Admin UI</a></p>
      <p>Open this page in a new tab to test outside the iframe.</p>
    </body></html>
  `);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ---------- Health endpoints ----------
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- MongoDB connection ----------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/repair-app';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB error', err); process.exit(1); });

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
