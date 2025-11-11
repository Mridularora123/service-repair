
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Series = require('../models/Series');
const ModelItem = require('../models/ModelItem');
const InjuryType = require('../models/InjuryType');
const PriceCombination = require('../models/PriceCombination');
const Submission = require('../models/Submission');

// PUBLIC: fetch structure for widget
router.get('/public/structure', async (req,res)=>{
  try{
    const categories = await Category.find({}).sort('order');
    const series = await Series.find({}).sort('order');
    const models = await ModelItem.find({}).sort('order');
    const injuries = await InjuryType.find({});
    res.json({categories, series, models, injuries});
  }catch(e){ res.status(500).json({error:e.message}); }
});

// PUBLIC: get price for a specific combination
router.post('/public/price', async (req,res)=>{
  try{
    const {categoryId, seriesId, modelId, injuryId} = req.body;
    let pc = null;
    if(modelId) pc = await PriceCombination.findOne({modelId, injuryId});
    if(!pc && seriesId) pc = await PriceCombination.findOne({seriesId, injuryId});
    if(!pc && categoryId) pc = await PriceCombination.findOne({categoryId, injuryId});
    if(pc) return res.json({price: pc.price, notes: pc.notes});
    const injury = await InjuryType.findById(injuryId);
    return res.json({price: injury ? injury.defaultPrice : '0'});
  }catch(e){ res.status(500).json({error:e.message}); }
});

// PUBLIC: submit form
router.post('/public/submit', async (req,res)=>{
  try{
    const payload = req.body;
    const sub = new Submission({
      deviceCategory: payload.deviceCategory,
      seriesName: payload.seriesName,
      modelName: payload.modelName,
      injuryName: payload.injuryName,
      price: payload.price,
      formData: payload.formData,
      shop: payload.shop || ''
    });
    await sub.save();
    res.json({ok:true, id: sub._id});
  }catch(e){ console.error(e); res.status(500).json({ok:false, error:e.message}); }
});

// simple adminGuard
const adminGuard = (req,res,next)=>{
  const pass = req.headers['x-admin-password'];
  if(!process.env.ADMIN_PASSWORD) return res.status(500).json({error:'admin password not set'});
  if(pass !== process.env.ADMIN_PASSWORD) return res.status(401).json({error:'unauthorized'});
  next();
};

// Categories CRUD
router.get('/admin/categories', adminGuard, async (req,res)=>{ res.json(await Category.find({}).sort('order')); });
router.post('/admin/categories', adminGuard, async (req,res)=>{ const c = new Category(req.body); await c.save(); res.json(c); });
router.put('/admin/categories/:id', adminGuard, async (req,res)=>{ const c = await Category.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(c); });
router.delete('/admin/categories/:id', adminGuard, async (req,res)=>{ await Category.findByIdAndDelete(req.params.id); res.json({ok:true}); });

// Series CRUD
router.get('/admin/series', adminGuard, async (req,res)=>{ res.json(await Series.find({}).sort('order')); });
router.post('/admin/series', adminGuard, async (req,res)=>{ const c = new Series(req.body); await c.save(); res.json(c); });
router.put('/admin/series/:id', adminGuard, async (req,res)=>{ const c = await Series.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(c); });
router.delete('/admin/series/:id', adminGuard, async (req,res)=>{ await Series.findByIdAndDelete(req.params.id); res.json({ok:true}); });

// Models CRUD
router.get('/admin/models', adminGuard, async (req,res)=>{ res.json(await ModelItem.find({}).sort('order')); });
router.post('/admin/models', adminGuard, async (req,res)=>{ const c = new ModelItem(req.body); await c.save(); res.json(c); });
router.put('/admin/models/:id', adminGuard, async (req,res)=>{ const c = await ModelItem.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(c); });
router.delete('/admin/models/:id', adminGuard, async (req,res)=>{ await ModelItem.findByIdAndDelete(req.params.id); res.json({ok:true}); });

// Injuries CRUD
router.get('/admin/injuries', adminGuard, async (req,res)=>{ res.json(await InjuryType.find({})); });
router.post('/admin/injuries', adminGuard, async (req,res)=>{ const c = new InjuryType(req.body); await c.save(); res.json(c); });
router.put('/admin/injuries/:id', adminGuard, async (req,res)=>{ const c = await InjuryType.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(c); });
router.delete('/admin/injuries/:id', adminGuard, async (req,res)=>{ await InjuryType.findByIdAndDelete(req.params.id); res.json({ok:true}); });

// PriceCombination CRUD
router.get('/admin/prices', adminGuard, async (req,res)=>{ res.json(await PriceCombination.find({}).populate('categoryId seriesId modelId injuryId')); });
router.post('/admin/prices', adminGuard, async (req,res)=>{ const c = new PriceCombination(req.body); await c.save(); res.json(c); });
router.put('/admin/prices/:id', adminGuard, async (req,res)=>{ const c = await PriceCombination.findByIdAndUpdate(req.params.id, req.body, {new:true}); res.json(c); });
router.delete('/admin/prices/:id', adminGuard, async (req,res)=>{ await PriceCombination.findByIdAndDelete(req.params.id); res.json({ok:true}); });

module.exports = router;
