// routes/public.js — temporary stub
const express = require('express');
const router = express.Router();

// accept any body and return success so UI can continue
router.post('/submit', (req, res) => {
  // optional debug log (comment out if noisy):
  // console.log('submit stub', { body: req.body, headers: req.headers });
  return res.json({ ok: true, message: 'stub received (no DB)', received: !!req.body });
});

module.exports = router;
