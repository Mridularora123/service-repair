// routes/webhooks.js
const express = require('express');
const crypto = require('crypto');
const Shop = require('../models/Shop');
const router = express.Router();
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// helper to verify HMAC
function verifyHmac(rawBody, hmacHeader) {
  const digest = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(rawBody).digest('base64');
  return digest === hmacHeader;
}

// app uninstalled: delete token
router.post('/app_uninstalled', express.raw({ type: 'application/json' }), async (req, res) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  if (!verifyHmac(req.body, hmac)) return res.status(401).send('HMAC mismatch');

  const payload = JSON.parse(req.body.toString('utf8'));
  const shop = payload.myshopify_domain;
  await Shop.deleteOne({ shop });
  console.log('App uninstalled, removed shop', shop);
  res.status(200).send('ok');
});

// GDPR endpoints: simple 200s (you must implement proper data handling for production)
router.post('/customers_data_request', express.raw({ type: 'application/json' }), (req, res) => {
  // handle data request
  res.status(200).send('ok');
});
router.post('/customers_redact', express.raw({ type: 'application/json' }), (req, res) => {
  // handle redact
  res.status(200).send('ok');
});

module.exports = router;
