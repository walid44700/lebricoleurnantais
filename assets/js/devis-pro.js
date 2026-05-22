// =========================================================
// OUTIL DE DEVIS PRO — LE BRICOLEUR NANTAIS
// Tout reste en local (localStorage), rien n'est envoyé.
// =========================================================

// --- Configuration ---
// Mot de passe (changeable par Walid en modifiant cette ligne)
// Recommandation : utiliser quelque chose qu'il retient facilement
const PASSWORD = 'walid2026';

const STORAGE_KEY = 'lebricoleurnantais_pro_devis';
const AUTH_KEY = 'lebricoleurnantais_pro_auth';

// --- Catalogue des prestations ---
const CATALOG = {
  cuisineBase: [
    { id: 'forfait', label: 'Forfait de base', desc: 'Déplacement, inventaire, coordination', price: 210, defaultQty: 1, fixed: true },
  ],
  cuisineMeubles: [
    { id: 'meuble_std', label: 'Meuble bas ou haut standard', price: 30 },
    { id: 'meuble_tiroirs', label: 'Meuble avec tiroirs', price: 40 },
    { id: 'casserolier', label: 'Casserolier', price: 45 },
    { id: 'angle', label: 'Meuble d\'angle', price: 50 },
    { id: 'colonne', label: 'Colonne (four, frigo, rangement)', price: 75 },
  ],
  cuisineElectro: [
    { id: 'evier', label: 'Évier raccordé', desc: 'Découpe, fixation, raccordement', price: 65 },
    { id: 'plaque', label: 'Plaque de cuisson', desc: 'Découpe + raccordement', price: 65 },
    { id: 'four', label: 'Four encastrable', price: 35 },
    { id: 'lv', label: 'Lave-vaisselle encastrable', price: 85 },
    { id: 'frigo', label: 'Frigo encastrable', price: 95 },
    { id: 'hotte_simple', label: 'Hotte simple', price: 35 },
    { id: 'hotte_enc', label: 'Hotte encastrable', price: 55 },
  ],
  cuisineFinitions: [
    { id: 'credence', label: 'Pose de crédence (ml)', desc: 'Découpe, ajustement, fixation', price: 18, unit: '€/ml' },
    { id: 'prise', label: 'Adaptation prise sur crédence', price: 10, unit: '€/prise' },
    { id: 'accessoires', label: 'Accessoires (poubelle, panier coulissant…)', price: 15 },
  ],
  cuisineEvac: [
    { id: 'evacuation', label: 'Évacuation déchets', desc: 'Cartons, anciens meubles', price: 30, defaultQty: 0 },
  ],
  solOptions: [
    { id: 'depose_carrelage', label: 'Pose sur carrelage existant (supplément)', price: 30, defaultQty: 0 },
    { id: 'evacuation_sol', label: 'Évacuation déchets', price: 40, defaultQty: 0 },
  ],
  accrochageBase: [
    { id: 'unique', label: '1 élément seul (forfait)', price: 50 },
    { id: 'multi_std', label: 'Étagère / cadre / miroir (dès 2)', price: 25 },
    { id: 'multi_simple', label: 'Étagère très simple (2 vis, dès 2)', price: 18 },
    { id: 'tringle', label: 'Tringle à rideau', price: 25 },
  ],
  accrochageTV: [
    { id: 'tv_fixe', label: 'Support TV fixe', desc: 'Petite à moyenne taille', price: 55 },
    { id: 'tv_orient', label: 'Support TV orientable', price: 75 },
  ],
  accrochageLum: [
    { id: 'lum_simple', label: 'Luminaire / applique simple', price: 50 },
    { id: 'lum_lustre', label: 'Suspension complexe / lustre', price: 75 },
  ],
};

// --- État ---
let state = {
  currentTab: 'cuisine',
  quantities: {}, // {itemId: qty}
  supplements: { cuisine: [], sol: [], meubles: [], accrochage: [] }, // [{label, price}]
  sol: { surface: 0, plinthes: 0, depose: 0 },
  client: { nom: '', adresse: '' },
};

// =========================================================
// AUTHENTIFICATION
// =========================================================
function checkAuth() {
  if (localStorage.getItem(AUTH_KEY) === 'ok') {
    showApp();
  } else {
    showLock();
  }
}

function showLock() {
  document.getElementById('lockScreen').style.display = 'flex';
  document.getElementById('proApp').style.display = 'none';
}

function showApp() {
  document.getElementById('lockScreen').style.display = 'none';
  document.getElementById('proApp').style.display = 'block';
  loadState();
  renderAll();
  updateTotal();
}

document.getElementById('lockForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('passwordInput').value;
  if (pwd === PASSWORD) {
    localStorage.setItem(AUTH_KEY, 'ok');
    document.getElementById('lockError').classList.remove('show');
    showApp();
  } else {
    document.getElementById('lockError').classList.add('show');
    document.getElementById('passwordInput').value = '';
  }
});

document.getElementById('lockBtn').addEventListener('click', () => {
  if (confirm('Verrouiller l\'outil ? Vos données restent enregistrées.')) {
    localStorage.removeItem(AUTH_KEY);
    showLock();
  }
});

// =========================================================
// PERSISTANCE
// =========================================================
function saveState() {
  const toSave = {
    quantities: state.quantities,
    supplements: state.supplements,
    sol: state.sol,
    client: state.client,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.assign(state, data);
    } catch (e) { /* ignore */ }
  }
}

document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Effacer toutes les données du devis en cours ?')) {
    state.quantities = {};
    state.supplements = { cuisine: [], sol: [], meubles: [], accrochage: [] };
    state.sol = { surface: 0, plinthes: 0, depose: 0 };
    state.client = { nom: '', adresse: '' };
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    updateTotal();
  }
});

// =========================================================
// RENDU DES LIGNES PRODUIT
// =========================================================
function createRow(item, sectionId, withQty = true) {
  const qty = state.quantities[item.id] ?? (item.defaultQty !== undefined ? item.defaultQty : 0);
  const subtotal = qty * item.price;
  const unit = item.unit || '';

  const row = document.createElement('div');
  row.className = 'pro-row' + (qty > 0 ? ' has-quantity' : '');
  row.dataset.itemId = item.id;

  row.innerHTML = `
    <div class="pro-row-label">
      ${item.label}
      ${item.desc ? `<span class="desc">${item.desc}</span>` : ''}
    </div>
    <div class="pro-row-price">${item.price} ${unit || '€'}</div>
    <div class="pro-qty-control">
      <button class="pro-qty-btn" data-action="dec" aria-label="Diminuer">−</button>
      <input type="number" class="pro-qty-input" value="${qty}" min="0" step="${unit === '€/ml' ? '0.1' : '1'}">
      <button class="pro-qty-btn" data-action="inc" aria-label="Augmenter">+</button>
    </div>
    <div class="pro-row-subtotal ${subtotal === 0 ? 'zero' : ''}">${subtotal === 0 ? '—' : Math.round(subtotal * 10) / 10 + ' €'}</div>
    <button class="pro-row-remove" data-action="zero" aria-label="Remettre à zéro">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:18px;height:18px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;

  // Forfait fixe : pas de contrôle quantité, juste affiché
  if (item.fixed) {
    row.querySelector('.pro-qty-control').innerHTML = '<span style="font-family: var(--font-mono); color: var(--color-graphite); font-size: 0.85rem;">inclus</span>';
  }

  // Wire up
  const incBtn = row.querySelector('[data-action="inc"]');
  const decBtn = row.querySelector('[data-action="dec"]');
  const zeroBtn = row.querySelector('[data-action="zero"]');
  const input = row.querySelector('.pro-qty-input');

  if (incBtn) incBtn.addEventListener('click', () => {
    const v = (parseFloat(input.value) || 0) + (unit === '€/ml' ? 0.5 : 1);
    input.value = v;
    onQtyChange(item.id, v);
  });
  if (decBtn) decBtn.addEventListener('click', () => {
    const v = Math.max(0, (parseFloat(input.value) || 0) - (unit === '€/ml' ? 0.5 : 1));
    input.value = v;
    onQtyChange(item.id, v);
  });
  if (zeroBtn) zeroBtn.addEventListener('click', () => {
    input.value = 0;
    onQtyChange(item.id, 0);
  });
  if (input) input.addEventListener('input', () => {
    onQtyChange(item.id, parseFloat(input.value) || 0);
  });

  return row;
}

function onQtyChange(itemId, qty) {
  state.quantities[itemId] = qty;
  saveState();
  // Mise à jour visuelle de cette seule ligne
  const row = document.querySelector(`.pro-row[data-item-id="${itemId}"]`);
  if (row) {
    const item = findItem(itemId);
    if (item) {
      const subtotal = qty * item.price;
      const subEl = row.querySelector('.pro-row-subtotal');
      subEl.textContent = subtotal === 0 ? '—' : Math.round(subtotal * 10) / 10 + ' €';
      subEl.classList.toggle('zero', subtotal === 0);
      row.classList.toggle('has-quantity', qty > 0);
    }
  }
  updateTotal();
}

function findItem(itemId) {
  for (const section in CATALOG) {
    const found = CATALOG[section].find(it => it.id === itemId);
    if (found) return found;
  }
  return null;
}

// --- Lignes "supplément" libres ---
function createSupplementRow(supplement, tabKey, index) {
  const row = document.createElement('div');
  row.className = 'pro-row is-custom has-quantity';

  row.innerHTML = `
    <div class="pro-row-label">
      <input type="text" class="pro-custom-input" placeholder="Désignation du supplément" value="${supplement.label || ''}">
    </div>
    <input type="number" class="pro-custom-price" placeholder="0" step="0.01" value="${supplement.price || ''}">
    <div class="pro-row-subtotal">${supplement.price ? Math.round(supplement.price * 10) / 10 + ' €' : '—'}</div>
    <button class="pro-row-remove">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="width:18px;height:18px;"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;

  const labelInput = row.querySelector('.pro-custom-input');
  const priceInput = row.querySelector('.pro-custom-price');
  const subEl = row.querySelector('.pro-row-subtotal');
  const removeBtn = row.querySelector('.pro-row-remove');

  labelInput.addEventListener('input', () => {
    state.supplements[tabKey][index].label = labelInput.value;
    saveState();
  });
  priceInput.addEventListener('input', () => {
    const p = parseFloat(priceInput.value) || 0;
    state.supplements[tabKey][index].price = p;
    subEl.textContent = p === 0 ? '—' : Math.round(p * 10) / 10 + ' €';
    saveState();
    updateTotal();
  });
  removeBtn.addEventListener('click', () => {
    state.supplements[tabKey].splice(index, 1);
    saveState();
    renderSupplements(tabKey);
    updateTotal();
  });

  return row;
}

function renderSupplements(tabKey) {
  const containerId = tabKey + 'Supp';
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  state.supplements[tabKey].forEach((supp, i) => {
    container.appendChild(createSupplementRow(supp, tabKey, i));
  });
}

document.querySelectorAll('[data-add-supp]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.addSupp;
    state.supplements[tab].push({ label: '', price: 0 });
    saveState();
    renderSupplements(tab);
  });
});

// --- Rendu de toutes les sections ---
function renderSection(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  items.forEach(item => container.appendChild(createRow(item, containerId)));
}

function renderAll() {
  renderSection('cuisineBase', CATALOG.cuisineBase);
  renderSection('cuisineMeubles', CATALOG.cuisineMeubles);
  renderSection('cuisineElectro', CATALOG.cuisineElectro);
  renderSection('cuisineFinitions', CATALOG.cuisineFinitions);
  renderSection('cuisineEvac', CATALOG.cuisineEvac);
  renderSection('solOptions', CATALOG.solOptions);
  renderSection('accrochageBase', CATALOG.accrochageBase);
  renderSection('accrochageTV', CATALOG.accrochageTV);
  renderSection('accrochageLum', CATALOG.accrochageLum);

  renderSupplements('cuisine');
  renderSupplements('sol');
  renderSupplements('meubles');
  renderSupplements('accrochage');

  // Sol numeric inputs
  document.getElementById('solSurface').value = state.sol.surface || '';
  document.getElementById('solPlinthes').value = state.sol.plinthes || '';
  document.getElementById('solDepose').value = state.sol.depose || '';

  // Client
  document.getElementById('clientNom').value = state.client.nom || '';
  document.getElementById('clientAdresse').value = state.client.adresse || '';
}

// Sol inputs
['solSurface', 'solPlinthes', 'solDepose'].forEach(id => {
  document.getElementById(id).addEventListener('input', (e) => {
    const key = id.replace('sol', '').toLowerCase();
    state.sol[key === 'surface' ? 'surface' : key === 'plinthes' ? 'plinthes' : 'depose'] = parseFloat(e.target.value) || 0;
    saveState();
    updateTotal();
  });
});

// Client inputs
document.getElementById('clientNom').addEventListener('input', (e) => {
  state.client.nom = e.target.value;
  saveState();
});
document.getElementById('clientAdresse').addEventListener('input', (e) => {
  state.client.adresse = e.target.value;
  saveState();
});

// =========================================================
// CALCUL DU TOTAL
// =========================================================
function calculateLines() {
  const lines = []; // [{section, items: [{label, qty, price, subtotal}]}]
  const tab = state.currentTab;

  if (tab === 'cuisine') {
    const sections = [
      { title: 'Forfait & déplacement', items: CATALOG.cuisineBase },
      { title: 'Meubles', items: CATALOG.cuisineMeubles },
      { title: 'Électroménager', items: CATALOG.cuisineElectro },
      { title: 'Crédence & finitions', items: CATALOG.cuisineFinitions },
      { title: 'Évacuation', items: CATALOG.cuisineEvac },
    ];
    sections.forEach(sec => {
      const usedItems = [];
      sec.items.forEach(it => {
        const qty = state.quantities[it.id] ?? (it.defaultQty || 0);
        if (qty > 0 || it.fixed) {
          usedItems.push({
            label: it.label,
            qty: qty,
            price: it.price,
            subtotal: it.fixed ? it.price : Math.round(qty * it.price * 10) / 10,
            unit: it.unit,
            fixed: it.fixed,
          });
        }
      });
      if (usedItems.length > 0) lines.push({ title: sec.title, items: usedItems });
    });
  } else if (tab === 'sol') {
    const items = [];
    if (state.sol.surface > 0) {
      items.push({ label: `Pose sol stratifié/PVC (${state.sol.surface} m²)`, qty: state.sol.surface, price: 25, subtotal: Math.round(state.sol.surface * 25 * 10) / 10 });
    }
    if (state.sol.plinthes > 0) {
      items.push({ label: `Plinthes (${state.sol.plinthes} ml)`, qty: state.sol.plinthes, price: 6, subtotal: Math.round(state.sol.plinthes * 6 * 10) / 10 });
    }
    if (state.sol.depose > 0) {
      items.push({ label: `Dépose ancien sol (${state.sol.depose} m²)`, qty: state.sol.depose, price: 6, subtotal: Math.round(state.sol.depose * 6 * 10) / 10 });
    }
    CATALOG.solOptions.forEach(it => {
      const qty = state.quantities[it.id] || 0;
      if (qty > 0) items.push({ label: it.label, qty, price: it.price, subtotal: Math.round(qty * it.price * 10) / 10 });
    });
    if (items.length > 0) lines.push({ title: 'Pose de sol', items });
  } else if (tab === 'accrochage') {
    const sections = [
      { title: 'Étagères, cadres, miroirs', items: CATALOG.accrochageBase },
      { title: 'Support TV', items: CATALOG.accrochageTV },
      { title: 'Luminaires', items: CATALOG.accrochageLum },
    ];
    sections.forEach(sec => {
      const usedItems = [];
      sec.items.forEach(it => {
        const qty = state.quantities[it.id] || 0;
        if (qty > 0) {
          usedItems.push({ label: it.label, qty, price: it.price, subtotal: Math.round(qty * it.price * 10) / 10 });
        }
      });
      if (usedItems.length > 0) lines.push({ title: sec.title, items: usedItems });
    });
  }

  // Suppléments
  const supps = state.supplements[tab] || [];
  const validSupps = supps.filter(s => s.label && s.price > 0).map(s => ({
    label: s.label,
    qty: 1,
    price: s.price,
    subtotal: Math.round(s.price * 10) / 10,
  }));
  if (validSupps.length > 0) {
    lines.push({ title: 'Suppléments', items: validSupps });
  }

  return lines;
}

function calculateTotal() {
  const lines = calculateLines();
  let total = 0;
  lines.forEach(sec => sec.items.forEach(it => total += it.subtotal));

  // Minimum chantier pour sol
  if (state.currentTab === 'sol' && total > 0 && total < 200) {
    total = 200;
  }
  // Minimum chantier pour meubles et accrochage
  if ((state.currentTab === 'meubles' || state.currentTab === 'accrochage') && total > 0 && total < 50) {
    total = 50;
  }

  return Math.round(total * 10) / 10;
}

function updateTotal() {
  const total = calculateTotal();
  document.getElementById('grandTotal').textContent = total + ' €';
}

// =========================================================
// ONGLETS
// =========================================================
document.querySelectorAll('.pro-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pro-tab').forEach(t => t.classList.remove('is-active'));
    document.querySelectorAll('.pro-panel').forEach(p => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    const tabName = tab.dataset.tab;
    document.querySelector(`.pro-panel[data-panel="${tabName}"]`).classList.add('is-active');
    state.currentTab = tabName;
    updateTotal();
  });
});

// =========================================================
// GÉNÉRATION DU DEVIS TEXTE
// =========================================================
function generateOutput() {
  const lines = calculateLines();
  const total = calculateTotal();
  const tabLabels = {
    cuisine: 'Pose de cuisine',
    sol: 'Pose de sol',
    meubles: 'Montage de meubles',
    accrochage: 'Accrochage & fixations muraux',
  };

  let out = '';
  out += `DEVIS — LE BRICOLEUR NANTAIS\n`;
  out += `Walid Bouras · 06 15 05 45 57\n`;
  out += `SIRET 92399395000016\n`;
  out += `\n`;
  if (state.client.nom) out += `Pour : ${state.client.nom}\n`;
  if (state.client.adresse) out += `Adresse : ${state.client.adresse}\n`;
  if (state.client.nom || state.client.adresse) out += `\n`;
  out += `PRESTATION : ${tabLabels[state.currentTab]}\n`;
  out += `${'─'.repeat(36)}\n`;

  lines.forEach(sec => {
    sec.items.forEach(it => {
      let label = it.label;
      if (it.qty > 1 && !it.fixed && !it.unit) label += ` × ${it.qty}`;
      // Padding pour aligner les prix
      const priceStr = it.subtotal + ' €';
      const dots = Math.max(2, 36 - label.length - priceStr.length);
      out += `${label}${' '.repeat(dots)}${priceStr}\n`;
    });
  });

  out += `${'─'.repeat(36)}\n`;
  out += `TOTAL : ${total} €\n`;
  out += `\n`;
  out += `TVA non applicable, art. 293 B du CGI.\n`;
  out += `Paiement à la fin du chantier.\n`;
  out += `\n`;
  out += `Devis estimatif valable 30 jours.\n`;

  return out;
}

document.getElementById('generateBtn').addEventListener('click', () => {
  const text = generateOutput();
  document.getElementById('outputText').textContent = text;
  document.getElementById('outputModal').classList.add('is-open');
});

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('outputModal').classList.remove('is-open');
});

document.getElementById('outputModal').addEventListener('click', (e) => {
  if (e.target.id === 'outputModal') {
    document.getElementById('outputModal').classList.remove('is-open');
  }
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = document.getElementById('outputText').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    const label = document.getElementById('copyBtnLabel');
    btn.classList.add('is-copied');
    label.textContent = 'Copié ✓';
    setTimeout(() => {
      btn.classList.remove('is-copied');
      label.textContent = 'Copier le texte';
    }, 2000);
  } catch (e) {
    alert('Erreur lors de la copie. Sélectionnez le texte manuellement.');
  }
});

document.getElementById('smsBtn').addEventListener('click', () => {
  const text = document.getElementById('outputText').textContent;
  // Encodage pour SMS
  const url = `sms:?body=${encodeURIComponent(text)}`;
  window.location.href = url;
});

// =========================================================
// DÉMARRAGE
// =========================================================
checkAuth();
