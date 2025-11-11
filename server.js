// server.js — minimal Express + MongoDB app (updated for Shopify embedded apps)
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Security & logging
app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));

// IMPORTANT: trust proxy so secure cookies work behind Render/Heroku proxies
app.set('trust proxy', 1);

// Session configuration — required for embedded Shopify apps (SameSite=None; Secure)
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Set it in environment variables.');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-with-a-secure-string',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,       // cookies only over HTTPS
    sameSite: 'none',   // required to allow cookies in iframes
    httpOnly: true
  }
}));

// Allow Shopify admin to embed the app in an iframe
app.use((req, res, next) => {
  // Remove any header that blocks framing
  res.removeHeader('X-Frame-Options');

  // Allow admin and shop domains to embed the app
  res.setHeader('Content-Security-Policy',
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com https://*.shopify.com"
  );

  next();
});

// ---------- IMPORTANT: Mount webhooks BEFORE bodyParser.json() ----------
/*
  Webhook routes should be able to use express.raw() to verify HMAC.
  If you parse the JSON globally first, the raw body is consumed and verification fails.
*/
app.use('/webhooks', require('./routes/webhooks'));

// Now body parsing for the rest of the app
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Static file serving & API routes (keep your existing structure)
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/theme', express.static(path.join(__dirname, 'theme')));
app.use('/api', require('./routes/api'));
app.use('/admin-auth', require('./routes/admin-auth'));

// OAuth/auth route (must be mounted so /auth and /auth/callback work)
app.use('/auth', require('./routes/auth'));

// Minimal root page — helpful when Shopify opens the app embedded (Shopify passes ?shop=)
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

// Keep your admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Health endpoints
app.get('/health', (req,res)=>res.json({ok:true}));
app.get('/healthz', (req,res)=>res.json({ok:true, ts: Date.now()}));

// MongoDB setup (after routes so errors are logged before server listen)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/repair-app';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>{ console.error('MongoDB error', err); process.exit(1);});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));
