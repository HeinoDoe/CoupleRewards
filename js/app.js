/* Dutzis Bank — saved in this browser (localStorage), and shared between
   both phones through Firebase when js/firebase-config.js is filled in (see sync.js). */
(function () {
  'use strict';

  const KEY = 'dutzis_bank_v2';
  const $ = id => document.getElementById(id);
  let S = { names: { a: 'Me', b: 'Her' }, log: [] };
  let me = 'a', showAll = false, saving = true, sync = 'local';
  const cloud = () => window.DutzisSync;

  /* ---------- storage ---------- */
  const hasLS = (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return true; }
                         catch (e) { return false; } })();
  function load() {
    if (!hasLS) { saving = false; return; }
    try { const v = localStorage.getItem(KEY); if (v) S = JSON.parse(v); } catch (e) {}
  }
  function save(entry) {
    if (entry) { S.log.push(entry); if (cloud()) cloud().add(entry); }
    store();
  }
  function store() {
    S.log.sort((x, y) => y.t - x.t);
    if (S.log.length > 1000) S.log.length = 1000;
    if (hasLS) { try { localStorage.setItem(KEY, JSON.stringify(S)); saving = true; } catch (e) { saving = false; } }
    render();
  }

  /* ---------- helpers ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const dayBack = n => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d.getTime()); };
  const bal = k => S.log.reduce((s, e) => s + ((e.w === k || e.w === 'both') ? e.a : 0), 0);
  function weekStart() { const d = new Date(); const j = (d.getDay() + 6) % 7; d.setHours(0,0,0,0); d.setDate(d.getDate() - j); return d.getTime(); }
  function stamp() {
    const v = $('dDate').value;
    if (!v || v === isoToday()) return Date.now();
    const p = v.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0).getTime();
  }
  let tT;
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on');
    clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), 1500); }

  /* ---------- actions ---------- */
  function give(who, label, amount, streak) {
    const t = stamp();
    save({ id: uid(), t: t, w: who, l: label, a: amount, k: streak ? 1 : 0 });
    const back = new Date(t).toDateString() !== new Date().toDateString();
    toast((amount > 0 ? '+' : '') + amount + ' D🐾' + (who === 'both' ? ' each' : '') +
      (back ? ' · ' + new Date(t).toLocaleDateString([], { day: '2-digit', month: 'short' }) : ''));
  }
  function buy(cost, label) {
    if (bal(me) < cost) { toast('Not enough Dutzis yet 🐾'); return; }
    give(me, label, -cost, false);
  }
  function undo(id) { S.log = S.log.filter(e => e.id !== id); if (cloud()) cloud().remove(id); save(null); toast('Removed'); }
  function pick(k) {
    me = k;
    $('bA').classList.toggle('on', k === 'a');
    $('bB').classList.toggle('on', k === 'b');
    $('bA').querySelector('.s').textContent = k === 'a' ? 'Logging for me' : 'Tap to switch';
    $('bB').querySelector('.s').textContent = k === 'b' ? 'Logging for her' : 'Tap to switch';
    render();
  }

  /* ---------- streaks ---------- */
  const streakable = e => e.k === 1;
  function streak(k) {
    const set = new Set();
    S.log.forEach(e => { if (e.a > 0 && streakable(e) && (e.w === k || e.w === 'both')) set.add(dayKey(e.t)); });
    let cur = 0, start = set.has(dayBack(0)) ? 0 : (set.has(dayBack(1)) ? 1 : -1);
    if (start >= 0) { let i = start; while (set.has(dayBack(i))) { cur++; i++; } }
    const days = [...set].map(d => { const p = d.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).getTime(); })
                         .sort((a, b) => a - b);
    let best = 0, run = 0;
    days.forEach((t, i) => { run = (i > 0 && t - days[i - 1] <= 864e5 * 1.5) ? run + 1 : 1; if (run > best) best = run; });
    return { cur: cur, best: best, set: set };
  }

  /* ---------- build ---------- */
  function actRow(it, both) {
    const d = document.createElement('div');
    d.className = 'act' + (both ? ' two' : '');
    d.innerHTML = '<span class="ico">' + it.icon + '</span><span class="nm">' + it.name +
      (it.streak ? ' <em class="fl">🔥</em>' : '') + (it.note ? '<small>' + it.note + '</small>' : '') +
      '</span><span class="btns"></span>';
    const box = d.querySelector('.btns');
    if (it.type === 'time') {
      [15, 30, 60].forEach(m => {
        const b = document.createElement('button');
        b.innerHTML = m + 'm<small>+' + (m / 15) + ' D</small>';
        b.addEventListener('click', () => give(me, it.name + ' ' + m + ' min', m / 15, it.streak));
        box.appendChild(b);
      });
    } else {
      const b = document.createElement('button');
      b.innerHTML = '+' + it.value + '<small>D🐾</small>';
      b.addEventListener('click', () => give(both ? 'both' : me, it.name, it.value, it.streak));
      box.appendChild(b);
    }
    return d;
  }
  function build() {
    const fill = (id, list, both) => { const el = $(id); el.innerHTML = ''; list.forEach(i => el.appendChild(actRow(i, both))); };
    fill('solo', SOLO, false); fill('duo', DUO, true); fill('week', WEEKLY, false);

    $('shop').innerHTML = SHOP.map(p =>
      '<div class="buyrow" data-c="' + p[0] + '"><span class="txt">' + p[1] +
      '</span><span class="cost">' + p[0] + '</span><button>Buy</button></div>').join('');
    document.querySelectorAll('.buyrow').forEach(r => {
      r.querySelector('button').addEventListener('click', () =>
        buy(+r.dataset.c, r.querySelector('.txt').textContent));
    });

    $('bA').addEventListener('click', e => { if (e.target.tagName !== 'INPUT') pick('a'); });
    $('bB').addEventListener('click', e => { if (e.target.tagName !== 'INPUT') pick('b'); });
    $('nA').addEventListener('change', e => { S.names.a = e.target.value.trim() || 'Me'; save(null); if (cloud()) cloud().names(S.names); });
    $('nB').addEventListener('change', e => { S.names.b = e.target.value.trim() || 'Her'; save(null); if (cloud()) cloud().names(S.names); });

    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
      $('p-' + b.dataset.tab).classList.add('on');
      document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); render();
    }));

    $('dDate').value = isoToday();
    $('dDate').addEventListener('change', render);
    $('todayBtn').addEventListener('click', () => { $('dDate').value = isoToday(); render(); });

    document.querySelectorAll('[data-misc]').forEach(b => b.addEventListener('click', () => {
      const el = $('mText'), t = el.value.trim();
      if (!t) { el.focus(); toast('Write what it was first'); return; }
      give(me, '✨ ' + t, +b.dataset.misc, false); el.value = '';
    }));

    $('moreBtn').addEventListener('click', () => { showAll = !showAll; render(); });
    $('backupBtn').addEventListener('click', () => {
      const t = JSON.stringify(S);
      navigator.clipboard.writeText(t).then(() => toast('Backup copied 🐾'), () => {
        const b = $('box'); b.hidden = false; b.value = t; b.select(); toast('Copy this text');
      });
    });
    $('restoreBtn').addEventListener('click', () => {
      const b = $('box');
      if (b.hidden) { b.hidden = false; b.value = ''; toast('Paste backup, press Restore again'); return; }
      try { const d = JSON.parse(b.value); if (!d.log) throw 0; S = d; b.hidden = true; save(null); if (cloud()) { cloud().names(S.names); cloud().replace(S.log); } toast('Restored 🐾'); }
      catch (e) { toast('That backup looks broken'); }
    });
    $('linkBtn').addEventListener('click', () => {
      const l = cloud() && cloud().link();
      if (!l) { toast('Sync is not set up yet'); return; }
      navigator.clipboard.writeText(l).then(() => toast('Link copied — open it on the other phone 🐾'), () => {
        const b = $('box'); b.hidden = false; b.value = l; b.select(); toast('Send this link to the other phone');
      });
    });
    $('wipeBtn').addEventListener('click', () => {
      if (confirm('Delete all Dutzis and start over?' + (cloud() ? ' This also clears them on the other phone.' : ''))) { S = { names: S.names, log: [] }; save(null); if (cloud()) cloud().replace([]); toast('Reset'); }
    });
  }

  /* ---------- render ---------- */
  function dotStrip(el, st) {
    el.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const d = document.createElement('i');
      if (st.set.has(dayBack(i))) d.className = 'f';
      if (i === 0) d.className += ' t';
      el.appendChild(d);
    }
  }
  function card() {
    const A = bal('a'), B = bal('b'), ws = weekStart(), sA = streak('a'), sB = streak('b');
    const wk = k => S.log.filter(e => e.t >= ws && e.a > 0 && (e.w === k || e.w === 'both')).reduce((s, e) => s + e.a, 0);
    const sp = k => -S.log.filter(e => e.a < 0 && (e.w === k || e.w === 'both')).reduce((s, e) => s + e.a, 0);
    $('cNA').textContent = S.names.a; $('cNB').textContent = S.names.b;
    $('cVA').textContent = A; $('cVB').textContent = B;
    $('cFA').textContent = '🔥 ' + sA.cur + ' days'; $('cFB').textContent = '🔥 ' + sB.cur + ' days';
    $('cDate').textContent = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    $('cWeek').textContent = wk('a') + ' · ' + wk('b');
    $('cSpent').textContent = sp('a') + ' · ' + sp('b');
    const tally = {};
    S.log.filter(e => e.a > 0).forEach(e => { const k = e.l.replace(/ \d+ min$/, ''); tally[k] = (tally[k] || 0) + e.a; });
    const top = Object.entries(tally).sort((x, y) => y[1] - x[1])[0];
    $('cTop').textContent = top ? top[0] : '—';
    const best = Math.max(A, B), next = SHOP.find(p => p[0] > best);
    $('cGoal').innerHTML = next ? ('Next up: <b>' + next[1] + '</b><br>' + (next[0] - best) + ' Dutzis to go')
                                : 'Everything in the shop is affordable 👑';
    $('cNote').textContent = NOTES[new Date().getDay() % NOTES.length];
  }
  function render() {
    $('nA').value = S.names.a; $('nB').value = S.names.b;
    $('vA').textContent = bal('a'); $('vB').textContent = bal('b');
    const sA = streak('a'), sB = streak('b');
    $('skA').textContent = '🔥 ' + sA.cur; $('skAB').textContent = 'best: ' + sA.best;
    $('skB').textContent = '🔥 ' + sB.cur; $('skBB').textContent = 'best: ' + sB.best;
    dotStrip($('dtA'), sA); dotStrip($('dtB'), sB);

    document.querySelectorAll('.buyrow').forEach(r => {
      const aff = bal(me) >= +r.dataset.c;
      r.querySelector('button').disabled = !aff;
      r.classList.toggle('hot', aff);
    });

    const list = showAll ? S.log : S.log.slice(0, 10);
    $('moreBtn').textContent = showAll ? 'Show less' : 'Show all (' + S.log.length + ')';
    $('log').innerHTML = !S.log.length
      ? '<p class="empty">Nothing yet — go earn the first Dutzi 🐾</p>'
      : list.map(e => {
          const who = e.w === 'both' ? 'Both' : (e.w === 'a' ? S.names.a : S.names.b), d = new Date(e.t);
          return '<div class="row ' + e.w + '"><span class="tag">' + who + '</span><span class="l">' + e.l +
            '<small>' + d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' · ' +
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</small></span><span class="v' +
            (e.a < 0 ? ' neg' : '') + '">' + (e.a > 0 ? '+' : '') + e.a + '</span>' +
            '<button class="x" data-i="' + e.id + '">✕</button></div>';
        }).join('');
    document.querySelectorAll('.x').forEach(b => b.addEventListener('click', () => undo(b.dataset.i)));

    const dd = $('dDate');
    if (!dd.value) dd.value = isoToday();
    $('daybar').classList.toggle('back', dd.value !== isoToday());

    const ST = {
      local: saving ? 'Saved on this device' : 'Not saving — private mode blocks storage',
      connecting: 'Connecting…', synced: 'Synced with both phones', pending: 'Saved — syncing…',
      offline: 'Offline — will sync when back online', error: 'Sync problem — saved on this device only'
    };
    $('dot').className = 'dot' + ((sync === 'local' ? saving : sync === 'synced') ? '' : ' off');
    $('st').textContent = ST[sync];
    $('linkBtn').hidden = sync === 'local';
    if ($('p-card').classList.contains('on')) card();
  }

  /* ---------- hooks for sync.js ---------- */
  window.Dutzis = {
    state: () => S,
    status: s => { sync = s; render(); },
    remote: (names, log, meta) => {
      S = { names: names, log: log };
      sync = meta.hasPendingWrites ? 'pending' : (meta.fromCache ? 'offline' : 'synced');
      store();
    }
  };

  load(); build(); render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
