// routes/proxy-widget.js — widget-script route registered before catch-all
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const WIDGET_FILE = path.join(PUBLIC_DIR, 'widget.js');

function loadWidgetJs() {
  try {
    if (!fs.existsSync(WIDGET_FILE)) {
      console.error('proxy-widget: widget.js not found at', WIDGET_FILE);
      return null;
    }
    return fs.readFileSync(WIDGET_FILE, 'utf8');
  } catch (err) {
    console.error('proxy-widget: error reading widget.js', err);
    return null;
  }
}

function getShop(req) {
  return (req.get('X-Shopify-Shop-Domain') || '').trim();
}

// log incoming proxied requests (helpful)
router.use((req, res, next) => {
  console.log('[proxy-widget] incoming', req.method, req.originalUrl, 'X-Shopify-Shop-Domain=', req.get('X-Shopify-Shop-Domain'));
  next();
});

// ********** Serve the actual JS file FIRST **********
router.get('/widget-script', (req, res) => {
  if (!fs.existsSync(WIDGET_FILE)) {
    console.error('widget-script: file not found at', WIDGET_FILE);
    return res.status(404).type('text/plain').send('widget.js not found');
  }
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=60'
  });
  fs.createReadStream(WIDGET_FILE).pipe(res);
});

// ********** Then handle widget HTML (catch-all) **********
router.get(['/', '/widget', '/*'], (req, res) => {
  const shop = getShop(req);
  const widgetJs = loadWidgetJs();
  const inlineScript = widgetJs ? `<script>\n${widgetJs}\n</script>` : `<script>/* widget.js not found on server */</script>`;

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Service Repair Widget</title>
  <style>html,body{margin:0;height:100%}#sr-root{min-height:320px;padding:12px;font-family:system-ui,Arial,sans-serif}</style>
</head>
<body>
  <div id="sr-root" data-shop="${shop}">Loading Service Repair…</div>

  <script>
    function sendHeight(){
      try{
        var h = document.documentElement.scrollHeight || document.body.scrollHeight;
        parent.postMessage({ type: 'sr_height', height: h }, '*');
      }catch(e){}
    }
    window.addEventListener('load', sendHeight);
    new MutationObserver(sendHeight).observe(document.body, { childList:true, subtree:true, attributes:true });
    setInterval(sendHeight, 500);
  </script>

  ${inlineScript}

  <script>
    try {
      if (window.ServiceRepairWidget && typeof window.ServiceRepairWidget.init === 'function') {
        window.ServiceRepairWidget.init(document.getElementById('sr-root'), { proxied:true });
      }
    } catch (e) { console.error('widget auto-init error', e); }
  </script>
</body>
</html>`);
});

module.exports = router;
