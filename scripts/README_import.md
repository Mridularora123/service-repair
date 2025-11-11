
# Importing device lists into MongoDB using scripts/seed_devices.js

The repository includes a utility script that can parse an HTML file containing <option> elements (like the `data-options` strings in your Liquid)
and load them into the database as Category -> Series -> Model records.

How to prepare the input HTML file:
- Create a folder `data` in the repo root.
- For each block of options, add markers to the HTML to indicate the category and series:
  Example (data/options.html):
    <!-- CATEGORY:Smartphone -->
    <!-- SERIES:Galaxy S -->
    <option value="">Bitte wählen…</option>
    <option value="SM-S936BZSGEUB" data-guid="848">Galaxy S25+ (512 GB)</option>
    <option value="SM-S936B/DS" data-guid="844">Galaxy S25+ (256 GB)</option>
    <!-- SERIES:Galaxy Flip -->
    <option value="SM-F741BZSHEUB" data-guid="822">Galaxy Z Flip6 (512 GB)</option>

Running the importer:
- Ensure you have installed dependencies: `npm install`
- Provide a MongoDB connection via env:
    export MONGODB_URI="your_mongodb_connection_string"
  or create a `.env` file with:
    MONGODB_URI=your_mongodb_connection_string
    ADMIN_PASSWORD=your_admin_password
- Run the importer:
    node scripts/seed_devices.js data/options.html

The script will create Categories and Series (if not present) and insert ModelItem documents under the series.
