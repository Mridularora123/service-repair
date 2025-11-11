// routes/auth.js
const express = require('express');
const fetch = global.fetch || require('node-fetch'); // use native fetch if available
const Shop = require('../models/Shop');
const router = express.Router();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SCOPES,
  HOST,
  SHOPIFY_API_VERSION = '2024-07'
} = process.env;

// Start OAuth: /auth?shop=the-shop.myshopify.com
router.get('/', (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send('Missing shop param');
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(installUrl);
});

// Callback: /auth/callback?shop=...&code=...
router.get('/callback', async (req, res) => {
  try {
    const { shop, code } = req.query;
    if (!shop || !code) return res.status(400).send('Missing params');

    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      })
    });
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('No access token', tokenData);
      return res.status(500).send('Failed to get access token');
    }

    // Save shop and token
    await Shop.updateOne(
      { shop },
      { $set: { shop, accessToken, installedAt: new Date() } },
      { upsert: true }
    );

    // register minimal webhooks (optional errors are non-fatal)
    const apiBase = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}`;
    const webhooks = [
      { topic: 'app/uninstalled', address: `${HOST}/webhooks/app_uninstalled`, format: 'json' },
      { topic: 'customers/redact', address: `${HOST}/webhooks/customers_redact`, format: 'json' },
      { topic: 'customers/data_request', address: `${HOST}/webhooks/customers_data_request`, format: 'json' }
    ];
    for (const wh of webhooks) {
      try {
        await fetch(`${apiBase}/webhooks.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken
          },
          body: JSON.stringify({ webhook: wh })
        });
      } catch (err) {
        console.warn('Webhook register failed', wh.topic, err && err.message);
      }
    }

    // Redirect into your app (embedded)
    return res.redirect(`${HOST}/?shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    console.error('Auth callback error', err);
    return res.status(500).send('Auth callback error');
  }
});

module.exports = router;
