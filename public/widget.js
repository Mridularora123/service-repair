// public/widget.js — Service Repair Widget (final version)
(function() {
  // 👇 Force your Render app base URL when embedded through Shopify proxy
  // (this ensures API calls go to your app, not the shop domain)
  window.__SERVICE_REPAIR_APP_BASE = "https://service-repair.onrender.com";

  // APP base: prefer explicit global -> script src -> fallback to location.origin
  const APP_BASE = (function() {
    if (window.__SERVICE_REPAIR_APP_BASE) {
      return String(window.__SERVICE_REPAIR_APP_BASE).replace(/\/+$/, '');
    }
    const s = document.currentScript && document.currentScript.src;
    if (s) return s.replace(/\/public\/widget.js.*/, '').replace(/\/+$/, '');
    return location.origin.replace(/\/+$/, '');
  })();

  // simple fetch of structure
  async function fetchStructure() {
    const r = await fetch(APP_BASE + '/api/public/structure');
    if (!r.ok) throw new Error('structure fetch ' + r.status);
    return r.json();
  }

  // tiny DOM helper
  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    if (html) e.innerHTML = html;
    return e;
  }

  // render a very small UI and attach submit
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

    // Minimal UI: show first category + form
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
        <h3>${cat.name}</h3>
        <p><small>${cat.description || ''}</small></p>
      </div>`;

    // Repair form
    const form = el('form', {});
    form.innerHTML = `
      <input name="name" placeholder="Full name" required
        style="display:block;margin:8px 0;padding:8px;width:100%">
      <input name="email" type="email" placeholder="Email" required
        style="display:block;margin:8px 0;padding:8px;width:100%">
      <textarea name="notes" placeholder="Describe issue"
        style="display:block;margin:8px 0;padding:8px;width:100%"></textarea>
      <button type="submit"
        style="padding:10px 14px;border-radius:6px;background:#0b5;color:#fff;border:0;cursor:pointer">
        Request repair
      </button>
      <div class="sr-msg" style="margin-top:8px;font-size:14px;color:#333"></div>`;

    // Handle form submission
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = form.querySelector('.sr-msg');
      msg.textContent = 'Sending…';
      const payload = {
        deviceCategory: cat._id,
        formData: {
          full_name: form.name.value,
          email: form.email.value,
          notes: form.notes.value
        }
      };
      try {
        const res = await fetch(APP_BASE + '/api/public/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await res.json();
        if (j && j.ok) {
          msg.textContent = 'Submitted — thank you!';
          form.reset();
        } else {
          msg.textContent = 'Submission failed';
          console.error('Submit error:', j);
        }
      } catch (err) {
        msg.textContent = 'Network error';
        console.error('Submit network error:', err);
      }
    });

    // Render to DOM
    root.innerHTML = '';
    root.appendChild(container);
    root.appendChild(form);
  }

  // public init helper
  function init(mount) {
    if (!mount) return;
    if (mount.dataset.srInitialized) return;
    mount.dataset.srInitialized = '1';
    initEl(mount);
  }

  // auto-init on common selectors
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

  // expose API for manual init (optional)
  window.ServiceRepairWidget = window.ServiceRepairWidget || {};
  window.ServiceRepairWidget.init = function(m, opts) {
    if (!m) return;
    if (typeof m === 'string') m = document.querySelector(m);
    init(m);
  };
})();
