// routes/public.js — DB-backed submit handler
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission'); // ensure path is correct
const rateLimit = require('express-rate-limit');

const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { ok:false, error:'rate_limited' }
});

function sanitizeString(s){ return typeof s === 'string' ? s.trim() : ''; }

router.post('/submit', submitLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    // basic required-check
    if(!body.email && !body.phone && !body.problem && !body.name){
      return res.status(400).json({ ok:false, error:'missing_contact_or_problem' });
    }

    const doc = {
      name: sanitizeString(body.name || ''),
      email: sanitizeString(body.email || ''),
      phone: sanitizeString(body.phone || ''),
      problem: sanitizeString(body.problem || ''),
      address: sanitizeString(body.address || ''),
      preferredDate: body.preferredDate ? new Date(body.preferredDate) : null,

      categoryId: body.categoryId || null,
      seriesId: body.seriesId || null,
      modelId: body.modelId || null,
      deviceSku: sanitizeString(body.deviceSku || body.sku || ''),
      deviceGuid: sanitizeString(body.deviceGuid || body.guid || ''),

      raw: body,
      meta: { ref: body.ref || null, utm: body.utm || null },

      shop: sanitizeString(body.shop || req.get('x-shopify-shop-domain') || ''),
      source: sanitizeString(body.source || 'widget'),
      ip: req.headers['x-forwarded-for'] || req.ip || '',
      userAgent: req.get('user-agent') || ''
    };

    const submission = new Submission(doc);
    await submission.save();

    return res.json({ ok:true, id: submission._id, message:'submission_saved' });
  } catch (err) {
    console.error('submit err', err);
    return res.status(500).json({ ok:false, error:'server_error' });
  }
});

module.exports = router;
