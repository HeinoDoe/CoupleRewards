/* Dutzis Bank — dog training plan.
   Every day except the rest day needs one inside and one outside session
   (at least `min` minutes each). Training days alternate between the two
   people, starting with `start` on the first training day of the week.
   Sessions live in S.train as { id: 'YYYY-MM-DD_in' | '_out', d, k, m, by, n, t };
   a '_who' doc { w } swaps whose turn that day is. */
(function () {
  'use strict';

  const D = window.Dutzis;
  const $ = id => document.getElementById(id);
  const S = () => D.state();
  const cloud = () => window.DutzisSync;
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const KINDS = [['in', '🏠', 'Inside'], ['out', '🌳', 'Outside']];
  const other = k => (k === 'a' ? 'b' : 'a');
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => iso(new Date());
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nameOf = k => S().names[k];

  let sel = today();                 // selected day in the editor
  let month = new Date(); month.setDate(1);
  const by = { in: null, out: null };   // who is ticked as "done by" per session

  /* ---------- plan ---------- */
  const isRest = ds => parse(ds).getDay() === +S().dog.rest;
  function planned(ds) {                      // whose turn by the weekly rotation
    const order = [1, 2, 3, 4, 5, 6, 0].filter(d => d !== +S().dog.rest);
    return order.indexOf(parse(ds).getDay()) % 2 === 0 ? S().dog.start : other(S().dog.start);
  }
  function turn(ds) {
    if (isRest(ds)) return null;
    const sw = S().train[ds + '_who'];
    return sw ? sw.w : planned(ds);
  }
  const sess = (ds, k) => S().train[ds + '_' + k];
  const ok = (ds, k) => { const s = sess(ds, k); return !!s && s.m >= +S().dog.min; };
  function firstDay() {                      // days before the first session can't be "missed"
    let f = null;
    Object.values(S().train).forEach(e => { if (e.k !== 'who' && (!f || e.d < f)) f = e.d; });
    return f || today();
  }
  function state(ds) {
    if (isRest(ds)) return 'rest';
    const n = ok(ds, 'in') + ok(ds, 'out');
    if (n === 2) return 'done';
    if (ds < today()) return n ? 'part' : (ds < firstDay() ? 'before' : 'miss');
    return n ? 'part' : 'open';
  }
  function streak() {                         // complete training days in a row; rest days don't break it
    let d = new Date(), n = 0;
    if (state(iso(d)) !== 'done') d = addDays(d, -1);
    for (let i = 0; i < 800; i++, d = addDays(d, -1)) {
      const st = state(iso(d));
      if (st === 'rest' && iso(d) >= firstDay()) continue;
      if (st !== 'done') break;
      n++;
    }
    return n;
  }

  /* ---------- writes ---------- */
  function put(id, doc) {
    if (doc) S().train[id] = doc; else delete S().train[id];
    if (cloud()) { if (doc) cloud().put('train', id, doc); else cloud().del('train', id); }
    D.commit();
  }
  function log(k, m) {
    const note = $('dn-' + k).value.trim();
    put(sel + '_' + k, { id: sel + '_' + k, d: sel, k: k, m: m, by: by[k] || turn(sel) || 'a', n: note, t: Date.now() });
    $('dn-' + k).value = '';
    D.toast((k === 'in' ? '🏠' : '🌳') + ' ' + m + ' min logged 🐕');
  }
  function swap() {
    const t = turn(sel); if (!t) return;
    const nw = other(t);
    put(sel + '_who', nw === planned(sel) ? null : { id: sel + '_who', d: sel, k: 'who', w: nw });
    by.in = by.out = null;
  }
  function setPlan(key, val) {
    S().dog[key] = val;
    if (cloud()) cloud().meta({ dog: S().dog });
    D.commit();
  }

  /* ---------- build ---------- */
  function build() {
    $('sessions').innerHTML = KINDS.map(([k, ico, label]) =>
      '<div class="sess" id="ds-' + k + '">' +
        '<div class="sh"><span class="ico">' + ico + '</span><b>' + label + ' training</b><span class="sst" id="dst-' + k + '"></span></div>' +
        '<div class="sdone" id="dd-' + k + '"></div>' +
        '<div class="sform" id="df-' + k + '">' +
          '<input id="dn-' + k + '" maxlength="80" placeholder="What did you train? (sit, leash, doorbell…)">' +
          '<div class="srow"><span class="who" id="dw-' + k + '"></span><span class="mins">' +
          [5, 10, 15, 20].map(m => '<button data-k="' + k + '" data-m="' + m + '">' + m + '<small>min</small></button>').join('') +
          '</span></div></div>' +
      '</div>').join('');
    document.querySelectorAll('.mins button').forEach(b => b.addEventListener('click', () => log(b.dataset.k, +b.dataset.m)));

    $('dPrev').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); render(); });
    $('dNext').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); render(); });
    $('dToday').addEventListener('click', () => { sel = today(); month = new Date(); month.setDate(1); by.in = by.out = null; render(); });
    $('dSwap').addEventListener('click', swap);

    $('pRest').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => '<option value="' + d + '">' + WD[d] + '</option>').join('');
    $('pRest').addEventListener('change', e => setPlan('rest', +e.target.value));
    $('pStart').addEventListener('change', e => setPlan('start', e.target.value));
    $('pMin').addEventListener('change', e => setPlan('min', Math.max(1, +e.target.value || 5)));
    $('pDog').addEventListener('change', e => setPlan('name', e.target.value.trim() || 'Dutzi'));
  }

  /* ---------- render ---------- */
  function whoChips(k, def) {
    const cur = by[k] || def;
    const el = $('dw-' + k);
    el.innerHTML = 'by ' + ['a', 'b'].map(p =>
      '<button class="chip ' + p + (cur === p ? ' on' : '') + '" data-p="' + p + '">' + esc(nameOf(p)) + '</button>').join('');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { by[k] = b.dataset.p; render(); }));
  }

  function dayCard() {
    const d = parse(sel), t = turn(sel), isToday = sel === today(), future = sel > today();
    const dog = esc(S().dog.name);
    $('dDay').textContent = (isToday ? 'Today · ' : '') + d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    $('dToday').hidden = isToday;
    $('dTurn').className = 'turn ' + (t || 'rest');
    $('dTurn').innerHTML = t
      ? '<b>' + esc(nameOf(t)) + '</b>' + (future ? ' will train ' : (isToday ? ' trains ' : ' trained ')) + dog +
        '<small>' + (S().train[sel + '_who'] ? 'swapped · ' : '') + 'inside + outside, ' + S().dog.min + '+ min each</small>'
      : '😴 Rest day for ' + dog + '<small>no training needed — optional sessions still count</small>';
    $('dSwap').hidden = !t;

    KINDS.forEach(([k]) => {
      const s = sess(sel, k), good = ok(sel, k);
      $('ds-' + k).className = 'sess' + (good ? ' ok' : (s ? ' short' : ''));
      $('dst-' + k).textContent = good ? '✓ done' : (s ? 'under ' + S().dog.min + ' min' : (future ? 'planned' : 'to do'));
      $('dd-' + k).innerHTML = s
        ? '<span>' + s.m + ' min · ' + esc(nameOf(s.by)) + (s.n ? ' · <i>' + esc(s.n) + '</i>' : '') +
          '</span><button class="x" data-k="' + k + '" title="Remove">✕</button>'
        : '';
      $('dd-' + k).hidden = !s;
      $('df-' + k).hidden = !!s || future;
      if (!s && !future) whoChips(k, t || 'a');
    });
    document.querySelectorAll('.sdone .x').forEach(b => b.addEventListener('click', () => {
      if (confirm('Remove this session?')) put(sel + '_' + b.dataset.k, null);
    }));
  }

  function calendar() {
    const y = month.getFullYear(), mo = month.getMonth();
    $('dMonth').textContent = month.toLocaleDateString([], { month: 'long', year: 'numeric' });
    const first = new Date(y, mo, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
    let h = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(w => '<span class="wd">' + w + '</span>').join('');
    for (let i = 0; i < lead; i++) h += '<span></span>';
    for (let n = 1; n <= days; n++) {
      const ds = iso(new Date(y, mo, n)), t = turn(ds), st = state(ds);
      h += '<button class="cd ' + st + ' ' + (t || '') + (ds === today() ? ' now' : '') + (ds === sel ? ' sel' : '') +
        '" data-d="' + ds + '"><span class="dn">' + n + '</span>' +
        (t ? '<span class="ini">' + esc(nameOf(t).slice(0, 1)) + '</span>' : '<span class="ini">😴</span>') +
        '<span class="pp"><i class="' + (ok(ds, 'in') ? 'f' : '') + '"></i><i class="' + (ok(ds, 'out') ? 'f' : '') + '"></i></span></button>';
    }
    $('dCal').innerHTML = h;
    $('dCal').querySelectorAll('.cd').forEach(b => b.addEventListener('click', () => {
      sel = b.dataset.d; by.in = by.out = null; render();
      $('dDay').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('lgA').textContent = nameOf('a') + "'s day"; $('lgB').textContent = nameOf('b') + "'s day";
  }

  function stats() {
    const now = new Date(), mon = addDays(now, -((now.getDay() + 6) % 7));
    let need = 0, got = 0; const mins = { a: 0, b: 0 };
    for (let i = 0; i < 7; i++) {
      const ds = iso(addDays(mon, i));
      if (!isRest(ds)) { need += 2; got += ok(ds, 'in') + ok(ds, 'out'); }
      KINDS.forEach(([k]) => { const s = sess(ds, k); if (s) mins[s.by] += s.m; });
    }
    $('dWeek').textContent = got + ' / ' + need;
    $('dStreak').textContent = '🔥 ' + streak();
    $('dMinA').textContent = mins.a; $('dMinB').textContent = mins.b;
    $('dNmA').textContent = nameOf('a'); $('dNmB').textContent = nameOf('b');
    const pct = need ? Math.round(got / need * 100) : 0;
    $('dBar').style.width = pct + '%';
  }

  function notes() {
    const list = Object.values(S().train).filter(e => e.k !== 'who').sort((x, y) => (y.d + y.k).localeCompare(x.d + x.k)).slice(0, 20);
    $('dNotes').innerHTML = !list.length
      ? '<p class="empty">No sessions yet — ' + esc(S().dog.name) + ' is waiting 🐕</p>'
      : list.map(e => '<div class="row ' + e.by + '"><span class="tag">' + esc(nameOf(e.by)) + '</span><span class="l">' +
          (e.k === 'in' ? '🏠 Inside' : '🌳 Outside') + ' · ' + e.m + ' min' + (e.n ? ' — ' + esc(e.n) : '') +
          '<small>' + parse(e.d).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' }) + '</small></span></div>').join('');
  }

  function render() {
    if (!$('v-dog').classList.contains('on')) return;
    const p = S().dog;
    $('pRest').value = String(p.rest); $('pMin').value = p.min;
    if (document.activeElement !== $('pDog')) $('pDog').value = p.name;
    $('pStart').innerHTML = ['a', 'b'].map(k => '<option value="' + k + '">' + esc(nameOf(k)) + '</option>').join('');
    $('pStart').value = p.start;
    $('dTitle').textContent = '🐕 ' + p.name + "'s training";
    dayCard(); calendar(); stats(); notes();
  }

  build();
  D.onRender(render);
  render();
})();
