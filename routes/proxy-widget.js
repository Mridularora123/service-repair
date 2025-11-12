// routes/proxy-widget.js — Fixed version
const express = require('express');
const router = express.Router();

const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '') || null;

// Detect widget request
function isWidgetPath(req) {
  const orig = (req.originalUrl || req.url || '').toLowerCase();
  const pathOnly = orig.split('?')[0];
  return pathOnly.endsWith('/widget');
}

// Serve widget HTML when Shopify proxy calls /apps/service-repair/widget
router.get(['/', '/widget', '/*'], (req, res) => {
  const shouldServeWidget = isWidgetPath(req) || true;
  const scriptBase = APP_URL || (req.protocol + '://' + req.get('host'));
  const scriptSrc = (scriptBase.replace(/\/+$/, '') + '/public/widget.js');
  const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

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
