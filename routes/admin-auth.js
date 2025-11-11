// routes/auth.js
const express = require('express');
const fetch = require('node-fetch'); // if node >=18 you can use global fetch instead
const Shop = require('../models/Shop');
const router = express.Router();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SCOPES,
  HOST,
  SHOPIFY_API_VERSION = '2024-07'
} = process.env;

// 1) start install: redirect merchant to Shopify consent page
router.get('/', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop parameter');

  const redirectUri = `${HOST}/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.redirect(installUrl);
});

// 2) callback: exchange code for access token, save it, register webhooks
router.get('/callback', async (req, res) => {
  try {
    const { shop, code } = req.query;
    if (!shop || !code) return res.status(400).send('Missing shop or code');

    // Exchange code for access token
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
      console.error('No access token received', tokenData);
      return res.status(500).send('Failed to get access token');
    }

    // Save shop + token into Mongo
    await Shop.updateOne(
      { shop },
      { $set: { shop, accessToken, installedAt: new Date() } },
      { upsert: true }
    );

    // Register a couple of webhooks (app/uninstalled + GDPR endpoints)
    const apiBase = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}`;
    const webhooks = [
      { topic: 'app/uninstalled', address: `${HOST}/webhooks/app_uninstalled`, format: 'json' },
      { topic: 'customers/data_request', address: `${HOST}/webhooks/customers_data_request`, format: 'json' },
      { topic: 'customers/redact', address: `${HOST}/webhooks/customers_redact`, format: 'json' }
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
        // log but don't block install
        console.warn('Webhook register failed', wh.topic, err.message || err);
      }
    }

    // Redirect into embedded app inside admin.
    // Shopify will open the embedded URL; use the shop domain so App Bridge can get it.
    // The admin path below will open app in admin for modern shopify admin URL.
    return res.redirect(`${HOST}/?shop=${encodeURIComponent(shop)}`);
  } catch (err) {
    console.error('Auth callback error', err);
    return res.status(500).send('Auth callback error');
  }
});

module.exports = router;
