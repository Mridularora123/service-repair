
        # Service Repair — Updated (seed scripts, CSS, Render manifest)

This update adds:

- `scripts/seed_devices.js` — parser + importer for HTML option lists (Liquid `data-options` output). Use it to bulk-import the Galaxy lists into MongoDB.
- `public/widget.css` — improved CSS to match the screenshots (cards, spacing, sizes). Include this in theme or serve from app.
- `render.yaml` — Render manifest: drop this into repo root and Render will use it for declarative deployments.
- `scripts/README_import.md` — instructions on preparing `data/options.html` and running the importer.

## Quick usage reminders

1. Install dependencies locally:
   ```bash
   npm install
   ```

2. Create `.env` in repo root containing at least:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   ADMIN_PASSWORD=your_admin_password
   ```

3. Prepare your HTML file with markers and options (see `scripts/README_import.md`) and place at `data/options.html`.

4. Run the import script:
   ```bash
   node scripts/seed_devices.js data/options.html
   ```

5. Verify inserted documents with the admin UI at `/admin` or via MongoDB Atlas.

6. To deploy on Render, push to GitHub and ensure `render.yaml` contains your repo URL. Render will pick it up when creating a new service from repo or you can create the service in the Render UI and link the repo.

If you want, I can now:
- convert your Liquid `data-options` HTML automatically (I can parse the HTML you pasted earlier and prepare `data/options.html` pre-filled), or
- open the zip for download with these updates included.

Which do you want next?
