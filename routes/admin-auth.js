
const express = require('express');
const router = express.Router();
router.post('/login', (req,res)=>{
  const {password} = req.body;
  if(password === process.env.ADMIN_PASSWORD) return res.json({ok:true});
  return res.status(401).json({ok:false});
});
module.exports = router;
