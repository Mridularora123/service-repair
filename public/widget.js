// public/widget.js — Service Repair Widget (updated)
// Sends top-level name/email/problem (so server validation passes)
// Also keeps nested formData for full raw data.
(function() {
  // Force your Render app base URL when embedded through Shopify proxy
  window.__SERVICE_REPAIR_APP_BASE = "https://service-repair.onrender.com";

  const APP_BASE = (function() {
    if (window.__SERVICE_REPAIR_APP_BASE) {
      return String(window.__SERVICE_REPAIR_APP_BASE).replace(/\/+$/, '');
    }
    const s = document.currentScript && document.currentScript.src;
    if (s) return s.replace(/\/public\/widget.js.*/, '').replace(/\/+$/, '');
    return location.origin.replace(/\/+$/, '');
  })();

  async function fetchStructure() {
    const r = await fetch(APP_BASE + '/api/public/structure');
    if (!r.ok) throw new Error('structure fetch ' + r.status);
    return r.json();
  }

  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if (html) e.innerHTML = html;
    return e;
  }

  // try to determine shop domain (Shopify preview / storefront)
  function detectShopDomain() {
    // Shopify exposes window.Shopify in most storefronts; fallback to location.host
    try {
      if (window.Shopify && window.Shopify.shop) return window.Shopify.shop;
      if (window.Shopify && window.Shopify.locale && window.Shopify.locale.shop) return window.Shopify.locale.shop;
    } catch (e) {}
    return location.hostname || '';
  }

  async function initEl(root) {
    root.innerHTML = 'Loading…';
    let data;
    try {
      data = await fetchStructure();
    } catch (err) {
      root.innerHTML = 'Failed to load widget';
      console.error('Widget load failed:', err);
      return;
    }

    const cat = (data.categories && data.categories[0]) || null;
    const container = document.createElement('div');
    if (!cat) {
      container.innerHTML = '<div>No categories</div>';
      root.innerHTML = '';
      root.appendChild(container);
      return;
    }

    container.innerHTML = `
      <div style="padding:12px;font-family:system-ui,Arial,sans-serif">
        <h3 style="margin:0 0 8px 0">${escapeHtml(cat.name)}</h3>
        <p style="margin:0 0 12px 0"><small>${escapeHtml(cat.description || '')}</small></p>
      </div>`;

    const form = el('form', {});
    form.innerHTML = `
      <input name="name" placeholder="Full name" required
        style="display:block;margin:8px 0;padding:8px;width:100%">
      <input name="email" type="email" placeholder="Email" required
        style="display:block;margin:8px 0;padding:8px;width:100%">
      <textarea name="problem" placeholder="Describe issue"
        style="display:block;margin:8px 0;padding:8px;width:100%"></textarea>
      <input name="deviceSku" placeholder="Device SKU (optional)"
        style="display:block;margin:8px 0;padding:8px;width:100%">
      <button type="submit"
        style="padding:10px 14px;border-radius:6px;background:#0b5;color:#fff;border:0;cursor:pointer">
        Request repair
      </button>
      <div class="sr-msg" style="margin-top:8px;font-size:14px;color:#333"></div>`;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = form.querySelector('.sr-msg');
      msg.textContent = 'Sending…';

      // top-level fields (server expects these for validation)
      const name = (form.name.value || '').trim();
      const email = (form.email.value || '').trim();
      const problem = (form.problem.value || '').trim();
      const deviceSku = (form.deviceSku.value || '').trim();

      // Build payload with both top-level required fields and nested formData
      const payload = {
        // server-side validation checks for name/email/problem/phone at top-level
        name: name,
        email: email,
        problem: problem,
        // helpful metadata
        deviceSku: deviceSku,
        deviceCategory: cat._id || '',
        shop: detectShopDomain(),
        // preserve full form data for later inspection
        formData: {
          full_name: name,
          email: email,
          problem: problem,
          deviceSku: deviceSku
        }
      };

      try {
        const res = await fetch(APP_BASE + '/api/public/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // include shop header so backend can pick it up from header if needed
            'X-Shopify-Shop-Domain': detectShopDomain()
          },
          body: JSON.stringify(payload)
        });

        // if server sends non-json (rare), handle safely
        let j;
        try { j = await res.json(); } catch (err) { j = null; }

        if (res.ok && j && j.ok) {
          msg.textContent = 'Submitted — thank you!';
          form.reset();
        } else {
          // if server returned structured error, show it; otherwise show generic
          const serverMsg = j && (j.error || j.message) ? (j.error || j.message) : ('HTTP ' + res.status);
          msg.textContent = 'Submission failed: ' + serverMsg;
          console.error('Submit error:', res.status, j);
        }
      } catch (err) {
        msg.textContent = 'Network error';
        console.error('Submit network error:', err);
      }
    });

    root.innerHTML = '';
    root.appendChild(container);
    root.appendChild(form);
  }

  function init(mount) {
    if (!mount) return;
    if (mount.dataset.srInitialized) return;
    mount.dataset.srInitialized = '1';
    initEl(mount);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['#sr-root', '#repair-config-root', '.repair-config-root'].forEach(sel => {
      document.querySelectorAll(sel).forEach(node => {
        try {
          init(node);
        } catch (e) {
          console.error('Init error', e);
        }
      });
    });
  });

  window.ServiceRepairWidget = window.ServiceRepairWidget || {};
  window.ServiceRepairWidget.init = function(m, opts) {
    if (!m) return;
    if (typeof m === 'string') m = document.querySelector(m);
    init(m);
  };

  // small helper to avoid XSS when inserting simple strings
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function(m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }
})();
