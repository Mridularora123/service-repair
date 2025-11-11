
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PriceSchema = new Schema({
  categoryId: {type: Schema.Types.ObjectId, ref: 'Category'},
  seriesId: {type: Schema.Types.ObjectId, ref: 'Series'},
  modelId: {type: Schema.Types.ObjectId, ref: 'ModelItem'},
  injuryId: {type: Schema.Types.ObjectId, ref: 'InjuryType', required:true},
  price: {type:String, required:true},
  notes: String
});
module.exports = mongoose.model('PriceCombination', PriceSchema);
