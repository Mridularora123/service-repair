
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SeriesSchema = new Schema({
  categoryId: {type: Schema.Types.ObjectId, ref: 'Category', required:true},
  name: {type:String, required:true},
  slug: String,
  image: String,
  order: {type:Number, default:0}
});
module.exports = mongoose.model('Series', SeriesSchema);
