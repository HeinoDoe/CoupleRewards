/* Dutzis Bank — shared sync through Firebase Firestore.
   Both phones type the same shared password; its SHA-256 hash is the bank id.
   banks/{id} holds names + dog plan, banks/{id}/log/* one doc per points entry,
   banks/{id}/train/* one doc per training session, so two people writing at
   the same time never overwrite each other. */
import { firebaseConfig } from './firebase-config.js';

const V = '12.19.0';
const PAIR_KEY = 'dutzis_pair';
const D = window.Dutzis;
const $ = id => document.getElementById(id);
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };

async function hash(pw) {
  const norm = pw.trim().toLowerCase().replace(/\s+/g, ' ');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dutzis:' + norm));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Ask for the shared password until one is given. */
function askPassword() {
  return new Promise(done => {
    $('gate').hidden = false;
    $('gateForm').addEventListener('submit', async e => {
      e.preventDefault();
      const pw = $('gatePw').value;
      if (pw.trim().length < 8) { $('gateMsg').textContent = 'At least 8 characters, please'; return; }
      $('gate').hidden = true;
      done(await hash(pw));
    });
    setTimeout(() => $('gatePw').focus(), 50);
  });
}

(async () => {
  if (!firebaseConfig.apiKey) return;           // not set up yet → local only

  /* ---------- which bank ---------- */
  const m = location.hash.match(/pair=([a-z0-9]{20,})/);
  if (m) { lsSet(PAIR_KEY, m[1]); history.replaceState(null, '', location.pathname); }
  let code = lsGet(PAIR_KEY);
  if (!code) { D.status('locked'); code = await askPassword(); lsSet(PAIR_KEY, code); }
  const mergedKey = 'dutzis_merged_' + code;

  D.status('connecting');
  let fb;
  try {
    const [appM, fsM] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    fb = { ...appM, ...fsM };
  } catch (e) { return D.status('offline'); }

  const app = fb.initializeApp(firebaseConfig);
  const db = fb.initializeFirestore(app, {
    localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() })
  });
  const bank = fb.doc(db, 'banks', code);
  const col = name => fb.collection(bank, name);

  /* Write in chunks — Firestore batches are capped at 500 operations. */
  async function batched(ops) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = fb.writeBatch(db);
      ops.slice(i, i + 400).forEach(op => op(b));
      await b.commit();
    }
  }

  /* First time this phone opens this bank: offer to add what it already has. */
  if (lsGet(mergedKey) !== '1') {
    const S = D.state();
    try {
      const snap = await fb.getDoc(bank);
      if (!snap.exists()) await fb.setDoc(bank, { names: S.names, dog: S.dog, created: Date.now() });
      const train = Object.values(S.train);
      const n = S.log.length + train.length;
      if (n && (!snap.exists() || confirm('Add the ' + n + ' entries saved on this phone to the shared bank?\n' +
                                          'Press Cancel to only use what is already shared.'))) {
        await batched([
          ...S.log.map(e => b => b.set(fb.doc(col('log'), e.id), e)),
          ...train.map(e => b => b.set(fb.doc(col('train'), e.id), e))
        ]);
      }
      lsSet(mergedKey, '1');
    } catch (e) { console.error(e); return D.status('error'); }
  }

  /* ---------- hooks the app calls ---------- */
  const fail = e => { console.error(e); D.status('error'); };
  window.DutzisSync = {
    put: (c, id, data) => fb.setDoc(fb.doc(col(c), id), data).catch(fail),
    del: (c, id) => fb.deleteDoc(fb.doc(col(c), id)).catch(fail),
    meta: obj => fb.setDoc(bank, obj, { merge: true }).catch(fail),
    replace: async (c, docs) => {
      try {
        const cur = await fb.getDocs(col(c));
        const keep = new Set(docs.map(e => e.id));
        await batched([
          ...cur.docs.filter(d => !keep.has(d.id)).map(d => b => b.delete(d.ref)),
          ...docs.map(e => b => b.set(fb.doc(col(c), e.id), e))
        ]);
      } catch (e) { fail(e); }
    },
    link: () => location.origin + location.pathname + '#pair=' + code,
    leave: () => { lsDel(PAIR_KEY); location.reload(); }
  };

  /* ---------- live updates ---------- */
  let meta = null, log = null, train = null;
  const push = md => {
    if (!meta || !log || !train) return;
    const cur = D.state();
    D.remote({ names: meta.names || cur.names, dog: meta.dog || cur.dog, log: log, train: train }, md);
  };
  const opts = { includeMetadataChanges: true };
  fb.onSnapshot(bank, opts, s => { meta = s.data() || {}; push(s.metadata); }, fail);
  fb.onSnapshot(col('log'), opts, s => { log = s.docs.map(d => d.data()); push(s.metadata); }, fail);
  fb.onSnapshot(col('train'), opts, s => {
    train = {}; s.docs.forEach(d => { train[d.id] = d.data(); }); push(s.metadata);
  }, fail);
})();
