// routes/proxy-widget.js
const express = require('express');
const router = express.Router();

const APP_URL = (process.env.APP_URL || '').replace(/\/+$/, '');

router.get('/proxy/widget', (req, res) => {
  const shop = (req.get('X-Shopify-Shop-Domain') || '').trim();

  // Fallback: if APP_URL not configured, attempt to derive from incoming host (not ideal)
  const scriptBase = APP_URL || (req.protocol + '://' + (process.env.HOST || req.get('host')));

  const scriptSrc = scriptBase.replace(/\/+$/,'') + '/public/widget.js';

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

    // Load widget script from app host (absolute) — avoids 404 from shop origin
    (function(){
      var scriptSrc = ${JSON.stringify(scriptSrc)};
      if(!document.querySelector('script[src="'+scriptSrc+'"]')) {
        var s = document.createElement('script'); s.src = scriptSrc; s.async = true;
        s.onload = function(){
          if(window.ServiceRepairWidget && typeof window.ServiceRepairWidget.init === 'function') {
            try{ window.ServiceRepairWidget.init(document.getElementById('sr-root'), { proxied:true }); }catch(e){ console.error(e); }
          }
        };
        s.onerror = function(){ console.error('Failed to load widget script:', scriptSrc); document.getElementById('sr-root').innerText = 'Failed to load widget.'; };
        document.head.appendChild(s);
      } else if(window.ServiceRepairWidget && typeof window.ServiceRepairWidget.init === 'function') {
        window.ServiceRepairWidget.init(document.getElementById('sr-root'), { proxied:true });
      }
    })();
  </script>
</body>
</html>`);
});

module.exports = router;
