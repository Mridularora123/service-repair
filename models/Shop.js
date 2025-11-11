// models/Shop.js
const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
  shop: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  installedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Shop', ShopSchema);
