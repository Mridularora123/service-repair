
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ModelSchema = new Schema({
  seriesId: {type: Schema.Types.ObjectId, ref: 'Series', required:true},
  name: {type:String, required:true},
  sku: String,
  guid: String,
  order: {type:Number, default:0}
});
module.exports = mongoose.model('ModelItem', ModelSchema);
