// routes/proxy-widget.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Helper: normalize host-provided shop header
function getShop(req) {
  return (req.get('X-Shopify-Shop-Domain') || '').trim();
}

// Serve widget HTML (safe to be framed by Shopify)
router.get(['/', '/widget', '/*'], (req, res) => {
  const shop = getShop(req);
  // Use a proxied script URL so the browser requests the JS under the shop domain,
  // which causes Shopify to forward the request to /proxy/widget-script on your app.
  const scriptSrc = '/proxy/widget-script';

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
    // send height up to parent iframe for theme resizing
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

  <script>
    (function(){
      var scriptSrc = ${JSON.stringify(scriptSrc)};
      var s = document.createElement('script'); s.src = scriptSrc; s.async = true;
      s.onload = function(){
        try {
          if (window.ServiceRepairWidget && typeof window.ServiceRepairWidget.init === 'function') {
            window.ServiceRepairWidget.init(document.getElementById('sr-root'), { proxied:true });
          }
        } catch(e) { console.error(e); }
      };
      s.onerror = function(){
        console.error('Failed to load widget script:', scriptSrc);
        document.getElementById('sr-root').innerText = 'Failed to load widget.';
      };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`);
});

// Serve the actual widget JS file (proxied). Shopify will forward shop-domain requests
// for /proxy/widget-script to your app at /proxy/widget-script, so the browser gets the JS
// under the shop origin and avoids cross-origin / CSP issues.
router.get('/widget-script', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'widget.js');
  // If file doesn't exist, return 404 so you can see it clearly in logs
  if (!fs.existsSync(filePath)) {
    console.error('widget-script: file not found at', filePath);
    return res.status(404).type('text/plain').send('widget.js not found');
  }

  // Stream the JS file with proper headers
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=60' // small cache for speed, safe to change
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('widget-script stream error', err);
    if (!res.headersSent) res.status(500).send('error reading widget.js');
  });
  stream.pipe(res);
});

module.exports = router;
