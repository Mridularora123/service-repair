// public/widget.js — Service Repair Widget (FINAL STABLE VERSION)
// Includes SAFE iframe auto-height system — NO infinite growth

(function() {

  // Force Render base when served via Shopify proxy
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

  function detectShopDomain() {
    try {
      if (window.Shopify && window.Shopify.shop) return window.Shopify.shop;
    } catch (_) {}
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

      const name = (form.name.value || '').trim();
      const email = (form.email.value || '').trim();
      const problem = (form.problem.value || '').trim();
      const deviceSku = (form.deviceSku.value || '').trim();

      const payload = {
        name,
        email,
        problem,
        deviceSku,
        deviceCategory: cat._id || '',
        shop: detectShopDomain(),
        formData: { full_name: name, email, problem, deviceSku }
      };

      try {
        const res = await fetch(APP_BASE + '/api/public/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Shop-Domain': detectShopDomain()
          },
          body: JSON.stringify(payload)
        });

        let j;
        try { j = await res.json(); } catch (_) { j = null; }

        if (res.ok && j && j.ok) {
          msg.textContent = 'Submitted — thank you!';
          form.reset();
        } else {
          msg.textContent = 'Submission failed: ' + ((j && (j.error || j.message)) || ('HTTP ' + res.status));
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
    if (!mount || mount.dataset.srInitialized) return;
    mount.dataset.srInitialized = '1';
    initEl(mount);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['#sr-root', '#repair-config-root', '.repair-config-root'].forEach(sel => {
      document.querySelectorAll(sel).forEach(node => init(node));
    });
  });

  window.ServiceRepairWidget = window.ServiceRepairWidget || {};
  window.ServiceRepairWidget.init = init;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  
  // --------------------------------------------------------------
  //  ⭐ FINAL — STABLE AUTO-RESIZE SYSTEM (NO MORE LOOPS)
  // --------------------------------------------------------------
  let lastHeight = 0;
  let resizeTimer = null;

  function sendHeightSafe() {
    const h =
      document.documentElement.scrollHeight ||
      document.body.scrollHeight ||
      0;

    if (Math.abs(h - lastHeight) < 5) return; // ignore tiny changes
    lastHeight = h;

    parent.postMessage({ type: 'sr_height', height: h }, '*');
  }

  // send when content changes
  const mo = new MutationObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sendHeightSafe, 80);
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true });

  // send after load
  window.addEventListener('load', () => {
    sendHeightSafe();
    setTimeout(sendHeightSafe, 200);
    setTimeout(sendHeightSafe, 800);
  });

  // images loading
  Array.from(document.images).forEach(img => {
    if (!img.complete) img.addEventListener('load', sendHeightSafe);
  });

})();
