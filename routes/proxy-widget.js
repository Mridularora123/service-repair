// routes/proxy-widget.js — corrected to request the script via the shop-facing /apps/service-repair/* path
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// NOTE: this must match your app proxy subpath configured in Partner Dashboard:
// App Proxy: subpath prefix = apps, subpath = service-repair
const APP_PROXY_PREFIX = '/apps/service-repair';

// helper to normalize shop header
function getShop(req) {
  return (req.get('X-Shopify-Shop-Domain') || '').trim();
}

// Serve proxied widget HTML (this is requested by Shopify as /proxy/widget)
router.get(['/', '/widget', '/*'], (req, res) => {
  const shop = getShop(req);

  // IMPORTANT: use the shop-facing app proxy path (so the browser requests
  // https://<shop-domain>/apps/service-repair/widget-script and Shopify will forward
  // that to your app at /proxy/widget-script)
  const shopFacingScriptSrc = (APP_PROXY_PREFIX + '/widget-script');

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

  <script>
    (function(){
      var scriptSrc = ${JSON.stringify(shopFacingScriptSrc)};
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

// Serve the actual JS file on your app at /proxy/widget-script
// Shopify will forward shop requests for /apps/service-repair/widget-script to your app /proxy/widget-script
router.get('/widget-script', (req, res) => {
  const filePath = path.join(PUBLIC_DIR, 'widget.js');
  if (!fs.existsSync(filePath)) {
    console.error('widget-script: file not found at', filePath);
    return res.status(404).type('text/plain').send('widget.js not found');
  }

  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=60'
  });

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('widget-script stream error', err);
    if (!res.headersSent) res.status(500).send('error reading widget.js');
  });
  stream.pipe(res);
});

module.exports = router;
