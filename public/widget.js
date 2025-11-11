
(function(){
  const APP_BASE = (function(){
    const s = document.currentScript && document.currentScript.src || (location.origin);
    return s.replace(/\/public\/widget.js.*/,'') || '';
  })();
  async function fetchStructure(){ const res = await fetch(APP_BASE + '/api/public/structure'); return res.json(); }
  function createEl(tag, attrs, html){ const el = document.createElement(tag); if(attrs) Object.keys(attrs).forEach(k=>el.setAttribute(k, attrs[k])); if(html) el.innerHTML = html; return el; }
  function init(root){
    root.innerHTML = '<div class="rc-loader">Loading...</div>';
    fetchStructure().then(data=>{ root.innerHTML = ''; buildUI(root, data); }).catch(e=>{ root.innerHTML = '<div class="rc-error">Failed to load widget</div>'; console.error(e)});
  }
  function buildUI(root, data){
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
    const stepSeries = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select Series</h3>'); const seriesGrid = createEl('div',{class:'rc-grid'}); stepSeries.appendChild(seriesGrid); root.appendChild(stepSeries);
    const stepModel = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select a model from the list</h3>'); const selectModel = createEl('select',{class:'rc-select'}); selectModel.innerHTML = '<option value="">Bitte wählen…</option>'; selectModel.addEventListener('change', ()=>{ state.modelId = selectModel.value || null; renderInjury(); }); stepModel.appendChild(selectModel); root.appendChild(stepModel);
    const stepInjury = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Select type of injury</h3>'); const injuryGrid = createEl('div',{class:'rc-grid'});
    injuries.forEach(inj=>{ const ic = createEl('div',{class:'rc-card', 'data-id':inj._id}, `<img src="${inj.image||''}" style="height:72px;margin-bottom:6px;"/><div>${inj.name}</div>`); ic.addEventListener('click', ()=>{ state.injuryId = inj._id; Array.from(injuryGrid.children).forEach(x=>x.classList.remove('selected')); ic.classList.add('selected'); fetchPriceAndShow(); }); injuryGrid.appendChild(ic); });
    stepInjury.appendChild(injuryGrid); root.appendChild(stepInjury);
    const stepForm = createEl('div',{class:'rc-section rc-hidden'}, '<h3>Repair form</h3>'); const form = createEl('form');
    const nameField = createEl('input',{type:'text', name:'full_name', placeholder:'Full name', required:true});
    const emailField = createEl('input',{type:'email', name:'email', placeholder:'Email', required:true});
    const phoneField = createEl('input',{type:'tel', name:'phone', placeholder:'Phone'});
    const notes = createEl('textarea',{name:'notes', placeholder:'Describe the issue'});
    const submitBtn = createEl('button',{type:'submit', class:'rc-btn'}, 'Request repair');
    const priceWrap = createEl('div',{}, '<div class="rc-final"><div><strong>Your price:</strong><div class="rc-price">-</div></div></div>');
    form.appendChild(priceWrap); form.appendChild(nameField); form.appendChild(emailField); form.appendChild(phoneField); form.appendChild(notes); form.appendChild(createEl('br')); form.appendChild(submitBtn);
    form.addEventListener('submit', async (ev)=>{ ev.preventDefault(); const payload = { deviceCategory: state.categoryId, seriesId: state.seriesId, modelId: state.modelId, injuryId: state.injuryId, price: state.price, formData: { full_name: nameField.value, email: emailField.value, phone: phoneField.value, notes: notes.value } }; const res = await fetch(APP_BASE + '/api/public/submit', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); const j = await res.json(); if(j.ok) { alert('Request submitted — thank you'); form.reset(); } else alert('Submission failed'); });
    stepForm.appendChild(form); root.appendChild(stepForm);
    function renderSeries(){ seriesGrid.innerHTML = ''; if(!state.categoryId){ stepSeries.classList.add('rc-hidden'); return; } const allSeries = state.series.filter(s => String(s.categoryId) === String(state.categoryId)); allSeries.forEach(s=>{ const sc = createEl('div',{class:'rc-card','data-id':s._id}, `<img src="${s.image||''}" style="height:80px;margin-bottom:6px;"/><div>${s.name}</div>`); sc.addEventListener('click', ()=>{ Array.from(seriesGrid.children).forEach(x=>x.classList.remove('selected')); sc.classList.add('selected'); state.seriesId = s._id; renderModels(); }); seriesGrid.appendChild(sc); }); stepSeries.classList.remove('rc-hidden'); }
    function renderModels(){ selectModel.innerHTML = '<option value="">Bitte wählen…</option>'; const ms = state.models.filter(m => String(m.seriesId) === String(state.seriesId)); ms.forEach(m=>{ const opt = createEl('option',{value:m._id}, m.name); selectModel.appendChild(opt); }); stepModel.classList.remove('rc-hidden'); }
    async function fetchPriceAndShow(){ const res = await fetch(APP_BASE + '/api/public/price', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({categoryId: state.categoryId, seriesId: state.seriesId, modelId: state.modelId, injuryId: state.injuryId})}); const j = await res.json(); state.price = j.price || '0'; const priceEl = root.querySelector('.rc-price'); priceEl.innerText = state.price; root.querySelector('.rc-section.rc-hidden:last-of-type')?.classList.remove('rc-hidden'); form.scrollIntoView({behavior:'smooth', block:'center'}); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{ const roots = document.querySelectorAll('#repair-config-root'); roots.forEach(r=>init(r)); });
})();
