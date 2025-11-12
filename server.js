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

// ---------- Config & env ----------
const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '') || null;
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/repair-app';
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace-me-secure';

// ---------- Basic security & logging ----------
// Use helmet but disable frameguard & default CSP (we set CSP per-request below)
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
app.use(cors()); // consider restricting to known origins in production
app.use(morgan('tiny'));

// IMPORTANT: trust proxy so secure cookies work behind Render/Heroku proxies
app.set('trust proxy', 1);

// ---------- Session configuration ----------
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Set it in environment variables.');
}
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    secure: true,        // requires HTTPS in production (Render provides HTTPS)
    sameSite: 'none',    // required for embedded Shopify apps
    httpOnly: true
  }
}));

// ---------- Allow framing for Shopify (per-request CSP) ----------
// This middleware removes any X-Frame-Options header and sets a targeted CSP
// when the request comes from Shopify via an App Proxy (X-Shopify-Shop-Domain header).
// Place this before routes that will be framed (e.g. /proxy/*).
app.use((req, res, next) => {
  try {
    // Remove any header that would block framing
    if (typeof res.removeHeader === 'function') res.removeHeader('X-Frame-Options');

    // Shopify app proxy sets X-Shopify-Shop-Domain header
    const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

    if (shop) {
      // Allow only the calling shop and Shopify admin to embed
      res.setHeader('Content-Security-Policy', `frame-ancestors https://${shop} https://admin.shopify.com`);
    } else {
      // Development fallback: remove restrictive CSP so iframe can be tested directly.
      if (typeof res.removeHeader === 'function') res.removeHeader('Content-Security-Policy');
    }
  } catch (err) {
    console.warn('iframe header middleware error', err);
  }
  next();
});

// ---------- Webhooks (must be mounted BEFORE bodyParser.json()) ----------
try {
  app.use('/webhooks', require('./routes/webhooks'));
} catch (e) {
  console.warn('Warning: ./routes/webhooks not found or failed to load. If you use webhooks, add that file.', e.message || e);
}

// ---------- Body parsers for the rest of the app ----------
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// ---------- Static files & API routes ----------
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/theme', express.static(path.join(__dirname, 'theme')));

// Temporary stub — remove after you seed real data
app.get('/api/public/structure', (req, res) => {
  res.json({
    ok: true,
    categories: [
      { _id: 'test-phone', name: 'Phones', description: 'Phone repair' },
      { _id: 'test-laptop', name: 'Laptops', description: 'Laptop repair' }
    ]
  });
});


// Mount your APIs (adjust requires to your actual route filenames)
try {
  app.use('/api', require('./routes/api'));
} catch (e) {
  console.warn('Warning: ./routes/api not found or failed to load. Add routes/api if needed.', e.message || e);
}
try {
  app.use('/admin-auth', require('./routes/admin-auth'));
} catch (e) {
  // optional route
}
try {
  app.use('/auth', require('./routes/auth')); // OAuth/auth
} catch (e) {
  console.warn('Warning: ./routes/auth missing (OAuth).', e.message || e);
}

// ---------- Mount the proxy-widget route so Shopify proxy requests to /proxy/* are handled ----------
try {
  const proxyWidget = require('./routes/proxy-widget');
  // Mount at /proxy so that Shopify's App Proxy (configured as https://service-repair.onrender.com/proxy)
  // will forward requests like /apps/service-repair/widget => service will call /proxy/widget
  app.use('/proxy', proxyWidget);
  console.log('Mounted proxy-widget router at /proxy');
} catch (e) {
  console.warn('Warning: ./routes/proxy-widget not found.', e.message || e);
}

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
  // adjust path if your admin view is stored elsewhere
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ---------- Health endpoints ----------
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- MongoDB connection ----------
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error', err);
    // If DB is required for your app to run, you might want to exit:
    // process.exit(1);
  });

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  if (APP_URL) console.log(`APP_URL set to ${APP_URL}`);
});
