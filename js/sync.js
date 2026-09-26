/* Dutzis Bank — shared sync through Firebase Firestore.
   Both phones point at the same bank: banks/{pairCode} holds the names,
   banks/{pairCode}/log/{entryId} holds one document per entry, so two
   people logging at the same time never overwrite each other. */
import { firebaseConfig } from './firebase-config.js';

const V = '12.19.0';
const PAIR_KEY = 'dutzis_pair';
const D = window.Dutzis;

(async () => {
  if (!firebaseConfig.apiKey) return;           // not set up yet → local only

  /* ---------- pair code ---------- */
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const newCode = () => [...crypto.getRandomValues(new Uint8Array(15))]
    .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 24);

  const m = location.hash.match(/pair=([a-z0-9]{20,})/);
  let joined = false;
  if (m) {
    const had = lsGet(PAIR_KEY);
    if (m[1] !== had) {
      if (!confirm('Link this phone to the shared Dutzis Bank?\nEntries on this phone will be added to it.')) {
        history.replaceState(null, '', location.pathname); return D.status('local');
      }
      lsSet(PAIR_KEY, m[1]); joined = true;
    }
    history.replaceState(null, '', location.pathname);
  }
  let code = lsGet(PAIR_KEY);
  if (!code) { code = newCode(); lsSet(PAIR_KEY, code); }
  const mergedKey = 'dutzis_merged_' + code;

  D.status('connecting');
  let fb;
  try {
    const [appM, authM, fsM] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`)
    ]);
    fb = { ...appM, ...authM, ...fsM };
  } catch (e) { return D.status('offline'); }

  const app = fb.initializeApp(firebaseConfig);
  const db = fb.initializeFirestore(app, {
    localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() })
  });
  const auth = fb.getAuth(app);
  try { await fb.signInAnonymously(auth); }
  catch (e) { console.error(e); return D.status('error'); }

  const bank = fb.doc(db, 'banks', code);
  const logCol = fb.collection(bank, 'log');

  /* Write in chunks — Firestore batches are capped at 500 operations. */
  async function batched(ops) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = fb.writeBatch(db);
      ops.slice(i, i + 400).forEach(op => op(b));
      await b.commit();
    }
  }

  /* First time this phone uses this bank: upload what it already has. */
  if (lsGet(mergedKey) !== '1') {
    const S = D.state();
    try {
      await fb.setDoc(bank, joined ? { created: Date.now() } : { names: S.names, created: Date.now() }, { merge: true });
      await batched(S.log.map(e => b => b.set(fb.doc(logCol, e.id), e)));
      lsSet(mergedKey, '1');
    } catch (e) { console.error(e); return D.status('error'); }
  }

  /* ---------- hooks the app calls ---------- */
  const fail = e => { console.error(e); D.status('error'); };
  window.DutzisSync = {
    add: e => fb.setDoc(fb.doc(logCol, e.id), e).catch(fail),
    remove: id => fb.deleteDoc(fb.doc(logCol, id)).catch(fail),
    names: n => fb.setDoc(bank, { names: n }, { merge: true }).catch(fail),
    replace: async (log) => {
      try {
        const cur = await fb.getDocs(logCol);
        const keep = new Set(log.map(e => e.id));
        await batched([
          ...cur.docs.filter(d => !keep.has(d.id)).map(d => b => b.delete(d.ref)),
          ...log.map(e => b => b.set(fb.doc(logCol, e.id), e))
        ]);
      } catch (e) { fail(e); }
    },
    link: () => location.origin + location.pathname + '#pair=' + code
  };

  /* ---------- live updates ---------- */
  let names = null, log = null;
  const push = meta => { if (names && log) D.remote(names, log, meta); };
  fb.onSnapshot(bank, { includeMetadataChanges: true }, s => {
    names = (s.data() || {}).names || D.state().names; push(s.metadata);
  }, fail);
  fb.onSnapshot(logCol, { includeMetadataChanges: true }, s => {
    log = s.docs.map(d => d.data()); push(s.metadata);
  }, fail);
})();
