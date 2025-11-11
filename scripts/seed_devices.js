
/**
 * scripts/seed_devices.js
 * Usage: NODE_ENV=MONGODB_URI="your_mongodb_uri" node scripts/seed_devices.js data/options.html
 * OR create .env with MONGODB_URI set and run: node scripts/seed_devices.js data/options.html
 *
 * This script will parse an HTML file containing <option ...> elements (exactly like the `data-options` attributes
 * in your Liquid) and import as: Category -> Series -> Model items.
 *
 * The HTML file can contain many <option value="SM-..." data-guid="123">Model name</option> fragments.
 * The script expects a folder 'data' and a file path to parse. It will create categories and series based on a small heuristic:
 * - You should provide a first-line comment in the HTML file that defines the category and series using special markers:
 *   <!-- CATEGORY:Smartphone --> and <!-- SERIES:Galaxy S -->
 * Each time the script sees a new SERIES marker it will attach following <option> entries to that series.
 *
 * If you have many series blocks, ensure the HTML is annotated with those markers. If you prefer, convert the Liquid `data-options`
 * attribute content into separate files per series and run the script for each.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// models path
const Category = require('../models/Category');
const Series = require('../models/Series');
const ModelItem = require('../models/ModelItem');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || null;
if(!MONGODB_URI){
  console.error('Please set MONGODB_URI in your environment or .env file.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=>main())
  .catch(err=>{ console.error('MongoDB connect error', err); process.exit(1); });

async function main(){
  const infile = process.argv[2] || 'data/options.html';
  if(!fs.existsSync(infile)){
    console.error('Input file not found:', infile);
    process.exit(1);
  }
  const raw = fs.readFileSync(infile,'utf8');
  // split by markers <!-- CATEGORY:... --> and <!-- SERIES:... -->
  const categoryRegex = /<!--\s*CATEGORY:\s*(.+?)\s*-->/g;
  const seriesRegex = /<!--\s*SERIES:\s*(.+?)\s*-->/g;

  // We'll parse by lines to respect markers position
  const lines = raw.split(/\r?\n/);
  let currentCategory = null;
  let currentSeries = null;

  for(const line of lines){
    const catMatch = line.match(/<!--\s*CATEGORY:\s*(.+?)\s*-->/i);
    const seriesMatch = line.match(/<!--\s*SERIES:\s*(.+?)\s*-->/i);
    if(catMatch){
      currentCategory = catMatch[1].trim();
      console.log('Category marker:', currentCategory);
      // create or find category
      var cat = await Category.findOne({slug: slugify(currentCategory)});
      if(!cat){
        cat = new Category({name: currentCategory, slug: slugify(currentCategory)});
        await cat.save();
        console.log('Created category', cat.name, cat._id);
      } else {
        console.log('Using existing category', cat.name);
      }
    } else if(seriesMatch){
      currentSeries = seriesMatch[1].trim();
      console.log('Series marker:', currentSeries);
      if(!currentCategory){
        console.error('Series defined before category, skipping:', currentSeries);
        continue;
      }
      const catDoc = await Category.findOne({slug: slugify(currentCategory)});
      var s = await Series.findOne({name: currentSeries, categoryId: catDoc._id});
      if(!s){
        s = new Series({name: currentSeries, categoryId: catDoc._id, slug: slugify(currentSeries)});
        await s.save();
        console.log('Created series', s.name, s._id);
      } else {
        console.log('Using existing series', s.name);
      }
    } else {
      // look for option tags
      const optRegex = /<option\s+([^>]+)>([^<]+)<\/option>/i;
      const m = line.match(optRegex);
      if(m){
        const attrs = m[1];
        const label = m[2].trim();
        // parse value and data-guid if present
        const vMatch = attrs.match(/value=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
        const guidMatch = attrs.match(/data-guid=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
        const val = vMatch ? (vMatch[1]||vMatch[2]||vMatch[3]) : '';
        const guid = guidMatch ? (guidMatch[1]||guidMatch[2]||guidMatch[3]) : '';
        // Ensure we have a series to attach
        if(!currentSeries || !currentCategory){
          console.warn('Skipping model (no current series/category):', label);
          continue;
        }
        const catDoc = await Category.findOne({slug: slugify(currentCategory)});
        const seriesDoc = await Series.findOne({name: currentSeries, categoryId: catDoc._id});
        if(!seriesDoc){
          console.error('Series doc missing for', currentSeries);
          continue;
        }
        const existing = await ModelItem.findOne({seriesId: seriesDoc._id, name: label});
        if(existing){
          console.log('Model exists, skipping:', label);
          continue;
        }
        const model = new ModelItem({seriesId: seriesDoc._id, name: label, sku: val, guid: guid});
        await model.save();
        console.log('Inserted model:', label);
      }
    }
  }

  console.log('Import complete.');
  process.exit(0);
}

function slugify(s){ return s.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
