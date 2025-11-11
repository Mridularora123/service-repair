// routes/proxy-widget.js
const express = require('express');
const router = express.Router();

const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '') || null;

// Helper: decide whether this proxied request should serve the widget HTML.
// Shopify may forward different suffixes. We treat any request whose forwarded
// path ends with "widget" (case-insensitive) as the widget request.
function isWidgetPath(req) {
  // req.originalUrl includes the full path (e.g. /proxy/service-repair/widget or /proxy/widget)
  const orig = (req.originalUrl || req.url || '').toLowerCase();
  // strip query params
  const pathOnly = orig.split('?')[0];
  return pathOnly.endsWith('/widget') || pathOnly === '/proxy' || pathOnly === '/proxy/';
}

router.get(['/proxy', '/proxy/*'], (req, res) => {
  // Decide whether to return widget HTML or a default message.
  // For safety, if it's not clearly widget, still serve widget to support store calling /apps/service-repair/widget.
  const shouldServeWidget = isWidgetPath(req) || (req.get('X-Shopify-Shop-Domain') && req.path.toLowerCase().includes('widget'));

  if (!shouldServeWidget) {
    // Optional: return a simple index or 404; keep simple for now.
    return res.status(404).send('Not found');
  }

  // Determine script base (use APP_URL env if set; fallback to host of current request)
  const scriptBase = APP_URL || (req.protocol + '://' + req.get('host'));
  const scriptSrc = (scriptBase.replace(/\/+$/,'') + '/public/widget.js');

  // Shop header (when proxied by Shopify)
  const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

  // Set content type and send widget HTML
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
    // Auto-resize parent iframe by sending height to parent
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

module.exports = router;
