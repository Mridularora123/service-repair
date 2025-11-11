
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SubmissionSchema = new Schema({
  createdAt: {type:Date, default: Date.now},
  deviceCategory: String,
  seriesName: String,
  modelName: String,
  injuryName: String,
  price: String,
  formData: Schema.Types.Mixed,
  shop: String
});
module.exports = mongoose.model('Submission', SubmissionSchema);
