
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const InjurySchema = new Schema({
  name: {type:String, required:true},
  image: String,
  defaultPrice: {type:String, default:'0'}
});
module.exports = mongoose.model('InjuryType', InjurySchema);
