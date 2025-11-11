// public/widget.js
(function(){
  // Determine APP_BASE from the script src when loaded from app host
  const APP_BASE = (function(){
    const s = document.currentScript && document.currentScript.src;
    if (s) return s.replace(/\/public\/widget.js.*/,'');
    // fallback to location.origin (less ideal)
    return location.origin;
  })();

  async function fetchStructure(){
    const res = await fetch(APP_BASE + '/api/public/structure', { credentials: 'omit' });
    if (!res.ok) throw new Error('Structure fetch failed: ' + res.status);
    return res.json();
  }

  function createEl(tag, attrs, html){
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
      // for boolean attributes like required, allow true/false
      if (attrs[k] === true) el.setAttribute(k, '');
      else if (attrs[k] === false) {}
      else el.setAttribute(k, attrs[k]);
    });
    if (html) el.innerHTML = html;
    return el;
  }

  function renderError(root, msg){
    root.innerHTML = '<div class="rc-error">Failed to load widget</div>';
    console.error('ServiceRepairWidget error:', msg);
  }

  async function init(root){
    if (!root) return;
    if (root.dataset.srInitialized) return;
    root.dataset.srInitialized = '1';
    root.innerHTML = '<div class="rc-loader">Loading...</div>';

    try {
      const data = await fetchStructure();
      root.innerHTML = '';
      buildUI(root, data);
    } catch (e) {
      renderError(root, e && e.message || e);
    }
  }

  // keep your existing buildUI implementation (copied from original)
  function buildUI(root, data){
    // (paste your full buildUI implementation here)
    // For brevity I'll reuse your code structure from the uploaded widget:
    const categories = data.categories || [];
    const injuries = data.injuries || [];
    const state = {categoryId:null, seriesId:null, modelId:null, injuryId:null, price:'', series: data.series, models: data.models};
    const style = document.createElement('style');
    style.innerHTML = `
      .rc-grid{display:flex;gap:16px;flex-wrap:wrap}
      .rc-card{width:220px;padding:28px;border-radius:8px;background:#e7eefc;text-align:center;cursor:pointer}
      .rc-card.selected{background:#c6cede}
      .rc-hidden{display:none}
      .rc-section{margin-bottom:28px}
      .rc-btn{padding:12px 18px;border-radius:8px;border:none;background:#0b5;cursor:pointer}
      .rc-price{font-weight:700;font-size:20px}
      .rc-final{display:flex;gap:20px;align-items:center}
      .rc-section h3{font-family:Arial,Helvetica,sans-serif}
    `;
    root.appendChild(style);

    const stepCat = createEl('div',{class:'rc-section'}, '<h3>Select device category</h3>');
    const catGrid = createEl('div',{class:'rc-grid'});
    categories.forEach(cat=>{
      const c = createEl('div',{class:'rc-card', 'data-id':cat._id}, `<img src="${cat.image||''}" style="height:80px;margin-bottom:6px;"/><div>${cat.name}</div>`);
      c.addEventListener('click', ()=>{
        state.categoryId = cat._id; state.seriesId = null; state.modelId = null; renderSeries();
        Array.from(catGrid.children).forEach(x=>x.classList.remove('selected')); c.classList.add('selected');
      });
      catGrid.appendChild(c);
    });
    stepCat.appendChild(catGrid); root.appendChild(stepCat);

    const stepSeries = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select Series</h3>');
    const seriesGrid = createEl('div',{class:'rc-grid'}); stepSeries.appendChild(seriesGrid); root.appendChild(stepSeries);

    const stepModel = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select a model from the list</h3>');
    const selectModel = createEl('select',{class:'rc-select'});
    selectModel.innerHTML = '<option value="">Bitte wählen…</option>';
    selectModel.addEventListener('change', ()=>{ state.modelId = selectModel.value || null; renderInjury(); });
    stepModel.appendChild(selectModel); root.appendChild(stepModel);

    const stepInjury = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select type of injury</h3>');
    const injuryGrid = createEl('div',{class:'rc-grid'});
    injuries.forEach(inj=>{
      const ic = createEl('div',{class:'rc-card', 'data-id':inj._id}, `<img src="${inj.image||''}" style="height:72px;margin-bottom:6px;"/><div>${inj.name}</div>`);
      ic.addEventListener('click', ()=>{
        state.injuryId = inj._id;
        Array.from(injuryGrid.children).forEach(x=>x.classList.remove('selected'));
        ic.classList.add('selected');
        fetchPriceAndShow();
      });
      injuryGrid.appendChild(ic);
    });
    stepInjury.appendChild(injuryGrid); root.appendChild(stepInjury);

    const stepForm = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Repair form</h3>');
    const form = createEl('form');
    const nameField = createEl('input',{type:'text', name:'full_name', placeholder:'Full name', required:true});
    const emailField = createEl('input',{type:'email', name:'email', placeholder:'Email', required:true});
    const phoneField = createEl('input',{type:'tel', name:'phone', placeholder:'Phone'});
    const notes = createEl('textarea',{name:'notes', placeholder:'Describe the issue'});
    const submitBtn = createEl('button',{type:'submit', class:'rc-btn'}, 'Request repair');
    const priceWrap = createEl('div',{}, '<div class="rc-final"><div><strong>Your price:</strong><div class="rc-price">-</div></div></div>');
    form.appendChild(priceWrap); form.appendChild(nameField); form.appendChild(emailField); form.appendChild(phoneField); form.appendChild(notes); form.appendChild(createEl('br')); form.appendChild(submitBtn);

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      try {
        const payload = {
          deviceCategory: state.categoryId, seriesId: state.seriesId, modelId: state.modelId, injuryId: state.injuryId,
          price: state.price,
          formData: { full_name: nameField.value, email: emailField.value, phone: phoneField.value, notes: notes.value }
        };
        const res = await fetch(APP_BASE + '/api/public/submit', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), credentials: 'omit'});
        const j = await res.json();
        if (j.ok) { alert('Request submitted — thank you'); form.reset(); } else { alert('Submission failed'); }
      } catch (err) {
        console.error('submit error', err);
        alert('Submission failed — network error');
      }
    });

    stepForm.appendChild(form); root.appendChild(stepForm);

    function renderSeries(){ seriesGrid.innerHTML = ''; if(!state.categoryId){ stepSeries.classList.add('rc-hidden'); return; } const allSeries = (state.series || []).filter(s => String(s.categoryId) === String(state.categoryId)); allSeries.forEach(s=>{ const sc = createEl('div',{class:'rc-card','data-id':s._id}, `<img src="${s.image||''}" style="height:80px;margin-bottom:6px;"/><div>${s.name}</div>`); sc.addEventListener('click', ()=>{ Array.from(seriesGrid.children).forEach(x=>x.classList.remove('selected')); sc.classList.add('selected'); state.seriesId = s._id; renderModels(); }); seriesGrid.appendChild(sc); }); stepSeries.classList.remove('rc-hidden'); }
    function renderModels(){ selectModel.innerHTML = '<option value="">Bitte wählen…</option>'; const ms = (state.models || []).filter(m => String(m.seriesId) === String(state.seriesId)); ms.forEach(m=>{ const opt = createEl('option',{value:m._id}, m.name); selectModel.appendChild(opt); }); stepModel.classList.remove('rc-hidden'); }
    async function fetchPriceAndShow(){
      try {
        const res = await fetch(APP_BASE + '/api/public/price', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({categoryId: state.categoryId, seriesId: state.seriesId, modelId: state.modelId, injuryId: state.injuryId}), credentials: 'omit'});
        const j = await res.json();
        state.price = j.price || '0';
        const priceEl = root.querySelector('.rc-price'); if (priceEl) priceEl.innerText = state.price;
        // show form section
        stepForm.classList.remove('rc-hidden');
        form.scrollIntoView({behavior:'smooth', block:'center'});
      } catch (err) {
        console.error('price fetch error', err);
      }
    }
  }

  // Auto-init for legacy mount points
  document.addEventListener('DOMContentLoaded', ()=>{
    try {
      const nodes = document.querySelectorAll('#repair-config-root, .repair-config-root');
      Array.from(nodes || []).forEach(n => { try{ init(n); }catch(e){ console.error(e); } });
    } catch(e) { console.error(e); }
  });

  // Public API
  window.ServiceRepairWidget = {
    init: function(mountEl, opts){
      try {
        if (!mountEl) return;
        if (typeof mountEl === 'string') mountEl = document.querySelector(mountEl);
        if (!mountEl) return;
        init(mountEl, opts || {});
      } catch (e) {
        console.error('ServiceRepairWidget.init error', e);
      }
    }
  };
})();
