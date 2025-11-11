// routes/proxy-widget.js (INLINE widget.js approach — fastest)
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/proxy/widget', (req, res) => {
  const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

  // Read the widget file from disk (public/widget.js) and inline it.
  let widgetJs = '';
  try {
    widgetJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'widget.js'), 'utf8');
  } catch (err) {
    console.error('Could not read public/widget.js for inlining', err);
    widgetJs = 'console.error("Inline widget not available on server");';
  }

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
    // Auto-resize parent iframe (sends height)
    function sendHeight(){ try{ var h = document.documentElement.scrollHeight || document.body.scrollHeight; parent.postMessage({ type: 'sr_height', height: h }, '*'); }catch(e){} }
    window.addEventListener('load', sendHeight);
    new MutationObserver(sendHeight).observe(document.body, { childList:true, subtree:true, attributes:true });
    setInterval(sendHeight, 500);
  </script>

  <!-- INLINED WIDGET JS -->
  <script>
  ${widgetJs.replace(/<\/script>/g,'<\\/script>')}
  // Try to init after inline
  try {
    if (window.ServiceRepairWidget && typeof window.ServiceRepairWidget.init === 'function') {
      window.ServiceRepairWidget.init(document.getElementById('sr-root'), { proxied: true });
    } else {
      // if widget auto-inits itself it may already have run
      console.warn('ServiceRepairWidget.init not found after inlining.');
    }
  } catch (e) { console.error(e); }
  </script>
</body>
</html>`);
});

module.exports = router;
