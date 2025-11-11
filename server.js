
// server.js — minimal Express + MongoDB app
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({limit: '1mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('tiny'));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/repair-app';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>console.log('MongoDB connected'))
  .catch(err=>{ console.error('MongoDB error', err); process.exit(1);});
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/theme', express.static(path.join(__dirname, 'theme')));
app.use('/api', require('./routes/api'));
app.use('/admin-auth', require('./routes/admin-auth'));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});
app.get('/health', (req,res)=>res.json({ok:true}));
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));
