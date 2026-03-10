let unit = 'imperial';
let slots = Array(6).fill(null).map(() => ({ input: '', data: null, error: false }));
let debounceTimers = [];

// ─── Init ─────────────────────────────────────────────────────────────
function init() {
  renderHeightInputs();
  renderSlots();
}

// ─── Unit switching ───────────────────────────────────────────────────
function switchUnit(u) {
  unit = u;
  document.getElementById('btn-imperial').classList.toggle('active', u === 'imperial');
  document.getElementById('btn-metric').classList.toggle('active', u === 'metric');
  renderHeightInputs();
}

function renderHeightInputs() {
  const wrap = document.getElementById('height-inputs');
  if (unit === 'imperial') {
    wrap.innerHTML = `
      <div class="input-group">
        <label>Feet</label>
        <input type="number" id="h-ft" min="1" max="9" placeholder="5" value="${wrap._ft || ''}" oninput="wrap._ft=this.value">
      </div>
      <div class="input-group">
        <label>Inches</label>
        <input type="number" id="h-in" min="0" max="11" placeholder="8" value="${wrap._in || ''}" oninput="wrap._in=this.value">
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="input-group">
        <label>Centimeters</label>
        <input type="number" id="h-cm" min="30" max="300" placeholder="172" value="${wrap._cm || ''}" oninput="wrap._cm=this.value">
      </div>`;
  }
  // keep values across unit switch
  const ft = document.getElementById('h-ft');
  const inches = document.getElementById('h-in');
  const cm = document.getElementById('h-cm');
  if (ft) ft.value = wrap._ft || '';
  if (inches) inches.value = wrap._in || '';
  if (cm) cm.value = wrap._cm || '';
}

function getUserHeightCm() {
  const wrap = document.getElementById('height-inputs');
  if (unit === 'imperial') {
    const ft = parseFloat(document.getElementById('h-ft')?.value) || 0;
    const ins = parseFloat(document.getElementById('h-in')?.value) || 0;
    return (ft * 30.48) + (ins * 2.54);
  } else {
    return parseFloat(document.getElementById('h-cm')?.value) || 0;
  }
}

function getUserHeightLabel() {
  const cm = getUserHeightCm();
  if (unit === 'imperial') {
    const ft = Math.floor(cm / 30.48);
    const ins = Math.round((cm % 30.48) / 2.54);
    return `${ft}'${ins}"`;
  }
  return `${Math.round(cm)} cm`;
}

// ─── Slots ────────────────────────────────────────────────────────────
function renderSlots() {
  const grid = document.getElementById('pokemon-grid');
  grid.innerHTML = '';
  slots.forEach((slot, i) => {
    const div = document.createElement('div');
    div.className = 'pokemon-slot' + (slot.data ? ' filled' : '') + (slot.error ? ' error-slot' : '');
    div.id = `slot-${i}`;
    div.innerHTML = `
      <span class="slot-label">Slot ${i + 1}</span>
      ${slot.data ? `<button class="clear-slot" onclick="clearSlot(${i})" title="Remove">✕</button>` : ''}
      <div class="slot-preview" id="slot-preview-${i}">
        ${slot.data
          ? `<img src="${slot.data.sprites.front_default}" alt="${slot.data.name}">`
          : `<span class="empty-icon">◯</span>`}
      </div>
      <input class="slot-input" type="text" placeholder="Pokémon name…"
        value="${slot.input}"
        oninput="onSlotInput(${i}, this.value)"
        onkeydown="if(event.key==='Enter') fetchPokemon(${i})">
      <div class="slot-info ${slot.data ? 'found' : slot.error ? 'err' : ''}" id="slot-info-${i}">
        ${slot.data
          ? `✓ ${capitalize(slot.data.name)} (${formatHeight(slot.data.height * 10)})`
          : slot.error ? '✗ Not found' : ''}
      </div>
      ${slot.data ? `
      <label class="shiny-label" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;margin-top:4px;">
        <input type="checkbox" ${slot.shiny ? 'checked' : ''} onchange="toggleShiny(${i}, this.checked)">
        Shiny
      </label>` : ''}`;
    grid.appendChild(div);
  });
}

function onSlotInput(i, val) {
  slots[i].input = val;
  slots[i].error = false;
  clearTimeout(debounceTimers[i]);
  if (val.trim().length > 1) {
    debounceTimers[i] = setTimeout(() => fetchPokemon(i), 600);
  } else {
    slots[i].data = null;
    updateSlotUI(i);
  }
}

function clearSlot(i) {
  slots[i] = { input: '', data: null, error: false };
  // Full re-render is fine here since user clicked a button, not typing
  rerenderSlot(i);
}

// Full re-render (only call when input is NOT focused)
function rerenderSlot(i) {
  const slot = slots[i];
  const el = document.getElementById(`slot-${i}`);
  if (!el) return;
  el.className = 'pokemon-slot' + (slot.data ? ' filled' : '') + (slot.error ? ' error-slot' : '');
  el.innerHTML = `
    <span class="slot-label">Slot ${i + 1}</span>
    ${slot.data ? `<button class="clear-slot" onclick="clearSlot(${i})" title="Remove">✕</button>` : ''}
    <div class="slot-preview" id="slot-preview-${i}">
      ${slot.data
        ? `<img src="${slot.data.sprites.front_default}" alt="${slot.data.name}">`
        : `<span class="empty-icon">◯</span>`}
    </div>
    <input class="slot-input" type="text" placeholder="Pokémon name…"
      value="${slot.input}"
      oninput="onSlotInput(${i}, this.value)"
      onkeydown="if(event.key==='Enter') fetchPokemon(${i})">
    <div class="slot-info ${slot.data ? 'found' : slot.error ? 'err' : ''}" id="slot-info-${i}">
      ${slot.data
        ? `✓ ${capitalize(slot.data.name)} (${formatHeight(slot.data.height * 10)})`
        : slot.error ? '✗ Not found' : ''}
    </div>
    ${slot.data ? `
    <label class="shiny-label" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;margin-top:4px;">
      <input type="checkbox" ${slot.shiny ? 'checked' : ''} onchange="toggleShiny(${i}, this.checked)">
      Shiny
    </label>` : ''}`;
}

// Partial update — never touches the input element, preserving focus
function updateSlotUI(i) {
  const slot = slots[i];
  const el = document.getElementById(`slot-${i}`);
  if (!el) return;

  // Update classes
  el.className = 'pokemon-slot' + (slot.data ? ' filled' : '') + (slot.error ? ' error-slot' : '');

  // Update preview
  const preview = document.getElementById(`slot-preview-${i}`);
  if (preview) {
    preview.innerHTML = slot.data
      ? `<img src="${slot.data.sprites.front_default}" alt="${slot.data.name}">`
      : `<span class="empty-icon">◯</span>`;
  }

  // Update info text
  const info = document.getElementById(`slot-info-${i}`);
  if (info) {
    info.className = 'slot-info' + (slot.data ? ' found' : slot.error ? ' err' : '');
    info.textContent = slot.data
      ? `✓ ${capitalize(slot.data.name)} (${formatHeight(slot.data.height * 10)})`
      : slot.error ? '✗ Not found' : '';
  }

  // Update clear button
  const existingClear = el.querySelector('.clear-slot');
  if (slot.data && !existingClear) {
    const btn = document.createElement('button');
    btn.className = 'clear-slot';
    btn.title = 'Remove';
    btn.textContent = '✕';
    btn.onclick = () => clearSlot(i);
    el.appendChild(btn);
  } else if (!slot.data && existingClear) {
    existingClear.remove();
  }

  // Update shiny checkbox
  const existingShiny = el.querySelector('.shiny-label');
  if (slot.data && !existingShiny) {
    const label = document.createElement('label');
    label.className = 'shiny-label';
    label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;margin-top:4px;';
    label.innerHTML = `<input type="checkbox" ${slot.shiny ? 'checked' : ''}> Shiny`;
    label.querySelector('input').onchange = (e) => toggleShiny(i, e.target.checked);
    el.appendChild(label);
  } else if (!slot.data && existingShiny) {
    existingShiny.remove();
  }
}

async function fetchPokemon(i) {
  const name = slots[i].input.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    slots[i].data = data;
    slots[i].error = false;
  } catch {
    slots[i].data = null;
    slots[i].error = true;
  }
  updateSlotUI(i);
}

function toggleShiny(i, val) {
  slots[i].shiny = val;
  // Update the slot preview to reflect shiny/default
  const preview = document.getElementById(`slot-preview-${i}`);
  if (preview && slots[i].data) {
    const sprite = val && slots[i].data.sprites.front_shiny
      ? slots[i].data.sprites.front_shiny
      : slots[i].data.sprites.front_default;
    preview.innerHTML = `<img src="${sprite}" alt="${slots[i].data.name}">`;
  }
  // Refresh the scene if it's already visible
  if (document.getElementById('comparison-section').classList.contains('visible')) {
    const userCm = getUserHeightCm();
    const filled = slots.filter(s => s.data);
    buildScene(userCm, filled);
  }
}

// ─── Comparison ───────────────────────────────────────────────────────
async function runComparison() {
  const userCm = getUserHeightCm();
  if (!userCm || userCm < 30) {
    alert('Please enter your height first!');
    return;
  }
  const filled = slots.filter(s => s.data);
  if (filled.length === 0) {
    alert('Add at least one Pokémon to your party!');
    return;
  }

  const section = document.getElementById('comparison-section');
  section.classList.add('visible');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  buildScene(userCm, filled);
  buildStats(userCm, filled);
}

// Track entity order across re-renders
let sceneEntities = [];

function buildScene(userCm, filled) {
  sceneEntities = [
    { name: 'You', heightCm: userCm, isUser: true },
    ...filled.map(s => ({
      name: capitalize(s.data.name),
      heightCm: s.data.height * 10,
      sprite: s.shiny && s.data.sprites.front_shiny ? s.data.sprites.front_shiny : s.data.sprites.front_default,
      data: s.data,
      isUser: false
    }))
  ];
  renderScene();
}

function renderScene() {
  const row = document.getElementById('figures-row');
  row.innerHTML = '';

  const maxCm = Math.max(...sceneEntities.map(e => e.heightCm));
  const minCm = Math.min(...sceneEntities.map(e => e.heightCm));
  const minRenderedPx = 150;
  const maxSceneHeightPx = 500; // prevents giant Pokémon making the scene too tall
  const pxPerCm = Math.min(maxSceneHeightPx / maxCm, Math.max(240 / maxCm, minRenderedPx / minCm));
  const sceneHeightPx = maxCm * pxPerCm;

  (async () => {
    for (const [idx, entity] of sceneEntities.entries()) {
      const scaledPx = Math.round(entity.heightCm * pxPerCm);
      const col = document.createElement('div');
      col.className = 'figure-col';
      col.style.animationDelay = `${idx * 0.08}s`;
      col.dataset.idx = idx;

      let figureHTML = '';
      if (entity.isUser) {
        figureHTML = buildHumanSVG(scaledPx);
        col.draggable = true;
        col.title = 'Drag to reposition';
      } else {
        const croppedSrc = await cropTransparentPadding(entity.sprite);
        figureHTML = `<img src="${croppedSrc}" alt="${entity.name}"
          style="height:${scaledPx}px; width:auto;"
          title="${entity.name}: ${formatHeight(entity.heightCm)}">`;
      }

      col.innerHTML = `
        <div class="figure-img-wrap" style="height:${sceneHeightPx}px; align-items:flex-end; display:flex; justify-content:center;">
          ${figureHTML}
        </div>
        <div class="figure-label">${entity.name}</div>
        <div class="figure-height-tag ${entity.isUser ? 'you' : ''}">${formatHeight(entity.heightCm)}</div>`;

      col.addEventListener('dragstart', onDragStart);
      col.addEventListener('dragend', onDragEnd);
      col.addEventListener('dragover', onDragOver);
      col.addEventListener('dragleave', onDragLeave);
      col.addEventListener('drop', onDrop);

      row.appendChild(col);
    }
  }) ();
}

let dragSrcIdx = null;

function onDragStart(e) {
  dragSrcIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  // Clear any leftover drag-over highlights
  document.querySelectorAll('.figure-col.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (parseInt(target.dataset.idx) !== dragSrcIdx) {
    target.classList.add('drag-over');
  }
}

function onDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  const targetIdx = parseInt(e.currentTarget.dataset.idx);
  e.currentTarget.classList.remove('drag-over');

  if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

  // Reorder sceneEntities
  const moved = sceneEntities.splice(dragSrcIdx, 1)[0];
  sceneEntities.splice(targetIdx, 0, moved);
  dragSrcIdx = null;

  renderScene();
}

function buildHumanSVG(heightPx) {
 
  const w = heightPx;
  const h = heightPx;
  return `<img class="human-figure" src="https://play.pokemonshowdown.com/sprites/trainers/brendan.png" alt="pokemon trainer" style="height:${h}px; width:${w}px; object-fit:contain;">`;
}

function buildStats(userCm, filled) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  filled.forEach((s, i) => {
    const monCm = s.data.height * 10;
    const taller = monCm > userCm;
    const ratio = (monCm / userCm * 100).toFixed(0);
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.animationDelay = `${i * 0.1}s`;
    card.innerHTML = `
      <img class="mon-sprite" src="${s.data.sprites.front_default}" alt="${s.data.name}">
      <div class="mon-name">${capitalize(s.data.name)}</div>
      <div class="mon-stats">
        Height: <span>${formatHeight(monCm)}</span><br>
        Weight: <span>${(s.data.weight / 10).toFixed(1)} kg</span><br>
        vs You: <span>${ratio}%</span>
      </div>
      ${taller ? `<div class="taller-badge">TALLER THAN YOU</div>` : ''}`;
    grid.appendChild(card);
  });
}

// Get rid of transparent padding from Pokemon images
function cropTransparentPadding(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);

      let top = height, bottom = 0, left = width, right = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3];
          if (alpha > 10) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }

      const croppedWidth = right - left + 1;
      const croppedHeight = bottom - top + 1;
      const cropped = document.createElement('canvas');
      cropped.width = croppedWidth;
      cropped.height = croppedHeight;
      cropped.getContext('2d').drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
      resolve(cropped.toDataURL());
    };
    img.src = imgSrc;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatHeight(cm) {
  // always show both
  const ft = Math.floor(cm / 30.48);
  const ins = Math.round((cm % 30.48) / 2.54);
  return `${ft}'${ins}" / ${Math.round(cm)}cm`;
}

// ─── Start ────────────────────────────────────────────────────────────
init();