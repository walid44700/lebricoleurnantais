// =========================================================
// SIMULATEUR DEVIS PUBLIC — LE BRICOLEUR NANTAIS
// =========================================================

const state = {
  step: 1,
  projectType: null,
  answers: {},
  estimation: { min: 0, max: 0 },
};

// --- Questions dynamiques par type de projet ---
const QUESTIONS = {
  cuisine: [
    {
      id: 'achat',
      label: 'Avez-vous déjà acheté votre cuisine ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui, elle est livrée ou bientôt' },
        { value: 'non', label: 'Non, pas encore' },
      ],
    },
    {
      id: 'taille',
      label: 'Quelle est la taille approximative de votre cuisine ?',
      type: 'radio',
      options: [
        { value: 'petite', label: 'Petite (5 à 8 éléments)' },
        { value: 'standard', label: 'Standard (8 à 12 éléments)' },
        { value: 'grande', label: 'Grande (12+ éléments, îlot, etc.)' },
      ],
    },
    {
      id: 'electromenager',
      label: 'Quel type d\'électroménager prévoyez-vous ?',
      type: 'radio',
      options: [
        { value: 'simple', label: 'Pose libre (frigo, four indépendant)' },
        { value: 'encastrable', label: 'Encastrable (four, plaque, lave-vaisselle…)' },
        { value: 'complet', label: 'Tout encastrable (frigo encastré inclus)' },
      ],
    },
    {
      id: 'credence',
      label: 'Une crédence à poser ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
        { value: 'sais_pas', label: 'Pas encore décidé' },
      ],
    },
  ],
  sol: [
    {
      id: 'surface',
      label: 'Surface approximative à poser (en m²)',
      type: 'number',
      placeholder: 'Exemple : 25',
      help: 'Si vous ne savez pas, donnez une estimation approchée.',
    },
    {
      id: 'type_sol',
      label: 'Quel type de sol ?',
      type: 'radio',
      options: [
        { value: 'stratifie', label: 'Stratifié (effet bois)' },
        { value: 'pvc', label: 'PVC clipsable' },
        { value: 'sais_pas', label: 'Pas encore décidé' },
      ],
    },
    {
      id: 'depose',
      label: 'Un ancien sol à enlever ?',
      type: 'radio',
      options: [
        { value: 'non', label: 'Non, le sol est nu' },
        { value: 'moquette', label: 'Oui (moquette, lino, vieux stratifié)' },
        { value: 'carrelage', label: 'Carrelage existant à conserver (pose dessus)' },
      ],
    },
    {
      id: 'plinthes',
      label: 'Plinthes à poser ?',
      type: 'radio',
      options: [
        { value: 'oui', label: 'Oui, sur tout le périmètre' },
        { value: 'non', label: 'Non, je garde les anciennes' },
      ],
    },
  ],
  meubles: [
    {
      id: 'quantite',
      label: 'Combien de meubles à monter au total ?',
      type: 'number',
      placeholder: 'Exemple : 3',
    },
    {
      id: 'types',
      label: 'Quels types de meubles principalement ?',
      type: 'checkbox',
      options: [
        { value: 'armoire', label: 'Armoire / dressing PAX' },
        { value: 'lit', label: 'Lit / sommier coffre' },
        { value: 'bureau', label: 'Bureau, commode' },
        { value: 'etageres', label: 'Étagères, petits meubles' },
        { value: 'autre', label: 'Autre (table, canapé…)' },
      ],
    },
  ],
  accrochage: [
    {
      id: 'quantite',
      label: 'Combien d\'éléments à fixer environ ?',
      type: 'number',
      placeholder: 'Exemple : 5',
    },
    {
      id: 'types',
      label: 'Quels types principalement ?',
      type: 'checkbox',
      options: [
        { value: 'cadres', label: 'Cadres, miroirs' },
        { value: 'etageres', label: 'Étagères' },
        { value: 'tv', label: 'Support TV' },
        { value: 'luminaire', label: 'Luminaires, suspensions' },
        { value: 'tringles', label: 'Tringles à rideaux' },
        { value: 'autre', label: 'Autre' },
      ],
    },
  ],
  commerce: [
    {
      id: 'projet',
      label: 'Décrivez brièvement votre projet de commerce',
      type: 'textarea',
      placeholder: 'Type de commerce, surface approximative, ce que vous souhaitez aménager…',
    },
    {
      id: 'urgence',
      label: 'À quelle échéance souhaitez-vous démarrer ?',
      type: 'radio',
      options: [
        { value: 'imminent', label: 'Très bientôt (semaines)' },
        { value: 'mois', label: 'Dans les mois qui viennent' },
        { value: 'reflexion', label: 'Je réfléchis encore' },
      ],
    },
  ],
};

const LABELS = {
  cuisine: 'Pose de cuisine',
  sol: 'Pose de sol',
  meubles: 'Montage de meubles',
  accrochage: 'Accrochage muraux',
  commerce: 'Aménagement de commerce',
};

// --- Estimateur par type ---
const ESTIMATORS = {
  cuisine: (a) => {
    let base = 220;
    let min = 0, max = 0;
    if (a.taille === 'petite') { min = 350; max = 600; }
    else if (a.taille === 'standard') { min = 550; max = 950; }
    else if (a.taille === 'grande') { min = 900; max = 1600; }

    if (a.electromenager === 'encastrable') { min += 80; max += 150; }
    else if (a.electromenager === 'complet') { min += 200; max += 350; }

    if (a.credence === 'oui') { min += 80; max += 200; }

    return { min: min + base, max: max + base };
  },
  sol: (a) => {
    const surface = parseFloat(a.surface) || 0;
    if (surface < 1) return { min: 200, max: 400 };
    let min = surface * 25;
    let max = surface * 25;
    // Plinthes (estimer périmètre)
    if (a.plinthes === 'oui') {
      const peri = Math.ceil(4 * Math.sqrt(surface));
      min += peri * 6;
      max += peri * 6;
    }
    if (a.depose === 'moquette') {
      min += surface * 6 + 40;
      max += surface * 8 + 40;
    } else if (a.depose === 'carrelage') {
      // Pose sur carrelage existant : juste +20€ environ
      min += 20;
      max += 40;
    }
    // Minimum chantier
    min = Math.max(min, 200);
    max = Math.max(max, min);
    // Marge d'incertitude
    max = max * 1.1;
    return { min: Math.round(min), max: Math.round(max) };
  },
  meubles: (a) => {
    const q = parseInt(a.quantite) || 1;
    let avg = 65;
    if (a.types) {
      if (a.types.includes('armoire')) avg = 90;
      if (a.types.includes('etageres') && !a.types.includes('armoire')) avg = 40;
    }
    let min = Math.max(50, q * avg * 0.8);
    let max = q * avg * 1.4;
    return { min: Math.round(min), max: Math.round(max) };
  },
  accrochage: (a) => {
    const q = parseInt(a.quantite) || 1;
    let avg = 25;
    if (a.types && a.types.includes('tv')) avg = 50;
    if (a.types && a.types.includes('luminaire')) avg = 55;
    let total = q === 1 ? 50 : q * avg;
    let min = Math.max(50, total);
    let max = total * 1.35;
    return { min: Math.round(min), max: Math.round(max) };
  },
  commerce: () => {
    // Trop variable, on renvoie sur devis
    return { min: 0, max: 0, custom: 'Devis sur visite' };
  },
};

// ===== Fonctions d'interface =====
function setStep(n) {
  state.step = n;
  document.querySelectorAll('.devis-step').forEach(s => s.classList.remove('is-active'));
  const target = document.querySelector(`.devis-step[data-step="${n}"]`);
  if (target) target.classList.add('is-active');

  // Progress bar
  document.querySelectorAll('.devis-progress-step').forEach((el, i) => {
    el.classList.remove('is-current', 'is-done');
    const stepNum = i + 1;
    if (stepNum < n) el.classList.add('is-done');
    else if (stepNum === n) el.classList.add('is-current');
  });

  const progressLabel = document.getElementById('progressLabel');
  const labels = [
    'Étape 1 sur 4 — Type de projet',
    'Étape 2 sur 4 — Détails',
    'Étape 3 sur 4 — Estimation',
    'Étape 4 sur 4 — Vos coordonnées',
    'Demande envoyée',
  ];
  if (progressLabel) progressLabel.textContent = labels[Math.min(n - 1, 4)];

  window.scrollTo({ top: document.querySelector('.devis-progress').offsetTop - 100, behavior: 'smooth' });
}

// ===== Étape 1 : sélection du type =====
document.querySelectorAll('.choice-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    state.projectType = card.dataset.choice;
    document.getElementById('step1Next').disabled = false;
  });
});

document.getElementById('step1Next').addEventListener('click', () => {
  renderQuestions(state.projectType);
  setStep(2);
});

// ===== Étape 2 : Génération dynamique des questions =====
function renderQuestions(type) {
  const container = document.getElementById('dynamicQuestions');
  container.innerHTML = '';
  const questions = QUESTIONS[type] || [];

  questions.forEach(q => {
    const row = document.createElement('div');
    row.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = q.label;
    if (q.id !== 'projet' && q.type !== 'checkbox') {
      const star = document.createElement('span');
      star.style.color = 'var(--color-copper)';
      star.textContent = ' *';
      label.appendChild(star);
    }
    row.appendChild(label);

    if (q.type === 'radio') {
      const wrap = document.createElement('div');
      wrap.className = 'form-options';
      q.options.forEach(opt => {
        const lbl = document.createElement('label');
        lbl.className = 'form-option';
        lbl.innerHTML = `<input type="radio" name="${q.id}" value="${opt.value}"><span>${opt.label}</span>`;
        wrap.appendChild(lbl);
      });
      row.appendChild(wrap);
    } else if (q.type === 'checkbox') {
      const wrap = document.createElement('div');
      wrap.className = 'form-options';
      q.options.forEach(opt => {
        const lbl = document.createElement('label');
        lbl.className = 'form-option';
        lbl.innerHTML = `<input type="checkbox" name="${q.id}" value="${opt.value}"><span>${opt.label}</span>`;
        wrap.appendChild(lbl);
      });
      row.appendChild(wrap);
    } else if (q.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'form-input';
      input.name = q.id;
      input.placeholder = q.placeholder || '';
      input.min = '0';
      row.appendChild(input);
    } else if (q.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'form-textarea';
      ta.name = q.id;
      ta.placeholder = q.placeholder || '';
      row.appendChild(ta);
    }

    if (q.help) {
      const help = document.createElement('span');
      help.className = 'form-help';
      help.textContent = q.help;
      row.appendChild(help);
    }
    container.appendChild(row);
  });

  // Selected state on click
  container.addEventListener('change', (e) => {
    if (e.target.type === 'radio') {
      const name = e.target.name;
      container.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
        inp.closest('.form-option').classList.remove('is-selected');
      });
      e.target.closest('.form-option').classList.add('is-selected');
    } else if (e.target.type === 'checkbox') {
      e.target.closest('.form-option').classList.toggle('is-selected', e.target.checked);
    }
  });
}

// ===== Étape 2 → 3 : Calcul de l'estimation =====
document.getElementById('step2Next').addEventListener('click', () => {
  const container = document.getElementById('dynamicQuestions');
  const answers = {};

  // Collecte les radios
  container.querySelectorAll('input[type="radio"]:checked').forEach(inp => {
    answers[inp.name] = inp.value;
  });
  // Collecte les checkboxes
  container.querySelectorAll('input[type="checkbox"]').forEach(inp => {
    if (inp.checked) {
      if (!answers[inp.name]) answers[inp.name] = [];
      answers[inp.name].push(inp.value);
    }
  });
  // Collecte les number et textarea
  container.querySelectorAll('input[type="number"], textarea').forEach(inp => {
    if (inp.value) answers[inp.name] = inp.value;
  });

  state.answers = answers;
  const est = ESTIMATORS[state.projectType](answers);
  state.estimation = est;

  // Affichage du résultat
  const range = document.getElementById('resultRange');
  const note = document.getElementById('resultNote');
  if (est.custom) {
    range.innerHTML = `<span style="font-size: 1.4rem;">${est.custom}</span>`;
    note.textContent = 'L\'aménagement de commerce nécessite une visite sur place pour comprendre votre projet et établir un devis détaillé. Laissez-moi vos coordonnées, je vous recontacte pour fixer un rendez-vous.';
  } else if (est.min === 0 && est.max === 0) {
    range.innerHTML = `<span style="font-size: 1.4rem;">Sur devis</span>`;
    note.textContent = 'Pour ce projet, un échange est nécessaire pour donner un prix juste.';
  } else {
    range.innerHTML = `Entre <strong>${est.min}</strong> et <strong>${est.max}</strong><span class="currency">€</span>`;
    note.textContent = 'Cette fourchette est indicative et basée sur les éléments que vous m\'avez donnés. Le devis final sera ajusté à votre situation réelle après échange.';
  }

  setStep(3);
});

// ===== Étape 3 → 4 =====
document.getElementById('step3Next').addEventListener('click', () => setStep(4));

// ===== Boutons Retour =====
document.querySelectorAll('[data-prev]').forEach(btn => {
  btn.addEventListener('click', () => setStep(state.step - 1));
});

// ===== Étape 4 : envoi du formulaire =====
const form = document.getElementById('contactForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Envoi en cours…</span>';

  // Remplir les champs cachés
  const est = state.estimation;
  let estStr = est.custom ? est.custom : `Entre ${est.min}€ et ${est.max}€`;
  document.getElementById('hidden_estimation').value = estStr;
  document.getElementById('hidden_type').value = LABELS[state.projectType] || state.projectType;
  document.getElementById('hidden_replyto').value = document.getElementById('email').value;

  // Construire le résumé des réponses
  const detailsLines = [];
  const questions = QUESTIONS[state.projectType] || [];
  questions.forEach(q => {
    const ans = state.answers[q.id];
    if (!ans) return;
    let txt = ans;
    if (Array.isArray(ans)) {
      txt = ans.map(v => {
        const opt = q.options && q.options.find(o => o.value === v);
        return opt ? opt.label : v;
      }).join(', ');
    } else if (q.options) {
      const opt = q.options.find(o => o.value === ans);
      if (opt) txt = opt.label;
    }
    detailsLines.push(`${q.label}: ${txt}`);
  });
  document.getElementById('hidden_details').value = detailsLines.join('\n');

  // Envoi via Web3Forms
  // Note : Web3Forms peut ne pas être configuré (clé d'accès factice).
  // Dans ce cas, on simule un succès pour la démo.
  try {
    const formData = new FormData(form);
    const accessKey = formData.get('access_key');
    if (accessKey && accessKey !== 'REMPLACER_PAR_CLE_WEB3FORMS') {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setStep(5);
      } else {
        throw new Error(data.message || 'Erreur lors de l\'envoi');
      }
    } else {
      // Mode démo : la clé n'est pas configurée, on simule le succès
      console.log('[DEMO] Données qui seraient envoyées :', Object.fromEntries(formData));
      await new Promise(r => setTimeout(r, 800));
      setStep(5);
    }
  } catch (err) {
    alert('Une erreur est survenue lors de l\'envoi. Vous pouvez aussi me joindre directement au 06 15 05 45 57.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});
