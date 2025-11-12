const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');

function checkPw(req){
  const pw = req.query.pw || req.get('x-admin-password') || '';
  return process.env.ADMIN_PASSWORD ? (pw === process.env.ADMIN_PASSWORD) : false;
}

router.get('/debug/submissions-count', async (req, res) => {
  if(!checkPw(req)) return res.status(403).json({ ok:false, error:'forbidden' });
  const count = await Submission.countDocuments();
  return res.json({ ok:true, count });
});

router.get('/debug/submissions', async (req, res) => {
  if(!checkPw(req)) return res.status(403).json({ ok:false, error:'forbidden' });
  const rows = await Submission.find().sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ ok:true, rows });
});

module.exports = router;
