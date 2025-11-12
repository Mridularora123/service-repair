// routes/public.js — temporary submit stub (no DB)
const express = require('express');
const router = express.Router();

// Accept any body and return success so frontend can continue testing.
// Keep this temporary — we'll replace with DB-backed code when you're ready.
router.post('/submit', (req, res) => {
  // Optional: uncomment to log incoming data in server logs
  // console.log('submit stub received:', { body: req.body, headers: req.headers });
  return res.json({ ok: true, message: 'stub received (no DB)', received: !!req.body });
});

module.exports = router;
