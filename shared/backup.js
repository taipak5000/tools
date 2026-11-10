// 全ツールのデータをまとめて書き出し・復元する。
// どのツールも同じドメイン上の localStorage と IndexedDB に保存しているので、
// その2つを丸ごと1つのJSONファイルにする。写真などの画像・動画（Blob）もBase64で含める。
(function () {
  var FORMAT = 'tools-backup';
  var VERSION = 1;

  function req(r) {
    return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; });
  }

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { rej(fr.error); };
      fr.readAsDataURL(blob);
    });
  }
  function base64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // JSONにできない値（Blob・File・Date・ArrayBuffer）を印付きの形に変える
  async function encode(v) {
    if (v === null || typeof v !== 'object') return v;
    if (typeof File !== 'undefined' && v instanceof File) return { __t: 'file', name: v.name, type: v.type, lastModified: v.lastModified, data: await blobToBase64(v) };
    if (v instanceof Blob) return { __t: 'blob', type: v.type, data: await blobToBase64(v) };
    if (v instanceof Date) return { __t: 'date', v: v.toISOString() };
    if (v instanceof ArrayBuffer) return { __t: 'ab', data: await blobToBase64(new Blob([v])) };
    if (ArrayBuffer.isView(v)) return { __t: 'u8', data: await blobToBase64(new Blob([v])) };
    if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length; i++) a.push(await encode(v[i])); return a; }
    var o = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = await encode(v[k]);
    return o;
  }
  function decode(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(decode);
    switch (v.__t) {
      case 'file': return new File([base64ToBytes(v.data)], v.name, { type: v.type, lastModified: v.lastModified });
      case 'blob': return new Blob([base64ToBytes(v.data)], { type: v.type });
      case 'date': return new Date(v.v);
      case 'ab': return base64ToBytes(v.data).buffer;
      case 'u8': return base64ToBytes(v.data);
    }
    var o = {};
    for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = decode(v[k]);
    return o;
  }

  async function listDatabases() {
    if (indexedDB.databases) {
      var list = await indexedDB.databases();
      return list.filter(function (d) { return d.name; });
    }
    // databases() が無いブラウザ向けに、各ツールのDB名を直接指定する
    return [{ name: 'kirokuCalendarDB' }, { name: 'meibo' }];
  }

  async function dumpDatabase(name) {
    var db = await req(indexedDB.open(name));
    try {
      var out = { name: name, version: db.version, stores: [] };
      var names = Array.prototype.slice.call(db.objectStoreNames);
      for (var i = 0; i < names.length; i++) {
        var tx = db.transaction(names[i], 'readonly');
        var st = tx.objectStore(names[i]);
        var info = {
          name: names[i], keyPath: st.keyPath, autoIncrement: st.autoIncrement,
          indexes: Array.prototype.map.call(st.indexNames, function (n) {
            var ix = st.index(n); return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry };
          }),
          records: []
        };
        // 値と主キーを集める（Blobの変換は取引の外で行う）
        var raw = await new Promise(function (res, rej) {
          var rows = [];
          var c = st.openCursor();
          c.onsuccess = function () {
            var cur = c.result;
            if (cur) { rows.push({ k: cur.primaryKey, v: cur.value }); cur.continue(); } else res(rows);
          };
          c.onerror = function () { rej(c.error); };
        });
        for (var j = 0; j < raw.length; j++) {
          info.records.push({ k: st.keyPath === null ? await encode(raw[j].k) : undefined, v: await encode(raw[j].v) });
        }
        out.stores.push(info);
      }
      return out;
    } finally { db.close(); }
  }

  async function exportAll() {
    var ls = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
    var dbs = [];
    var list = await listDatabases();
    for (var j = 0; j < list.length; j++) {
      try { dbs.push(await dumpDatabase(list[j].name)); } catch (e) { /* 開けないDBは飛ばす */ }
    }
    return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), localStorage: ls, indexedDB: dbs };
  }

  function deleteDatabase(name) {
    return new Promise(function (res, rej) {
      var r = indexedDB.deleteDatabase(name);
      r.onsuccess = function () { res(); };
      r.onerror = function () { rej(r.error); };
      r.onblocked = function () { rej(new Error('「' + name + '」を使っている画面が開いたままです。他のタブを閉じてからやり直してください。')); };
    });
  }

  async function restoreDatabase(d) {
    await deleteDatabase(d.name);
    var open = indexedDB.open(d.name, d.version || 1);
    open.onupgradeneeded = function () {
      var db = open.result;
      d.stores.forEach(function (s) {
        var st = db.createObjectStore(s.name, s.keyPath === null ? { autoIncrement: s.autoIncrement } : { keyPath: s.keyPath, autoIncrement: s.autoIncrement });
        (s.indexes || []).forEach(function (ix) { st.createIndex(ix.name, ix.keyPath, { unique: ix.unique, multiEntry: ix.multiEntry }); });
      });
    };
    var db = await req(open);
    try {
      for (var i = 0; i < d.stores.length; i++) {
        var s = d.stores[i];
        if (!s.records.length) continue;
        var tx = db.transaction(s.name, 'readwrite');
        var st = tx.objectStore(s.name);
        s.records.forEach(function (r) {
          if (s.keyPath === null) st.put(decode(r.v), decode(r.k)); else st.put(decode(r.v));
        });
        await new Promise(function (res, rej) { tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error); }; });
      }
    } finally { db.close(); }
  }

  async function importAll(data) {
    if (!data || data.format !== FORMAT) throw new Error('このファイルはツールのバックアップではありません。');
    // 先にIndexedDBを戻し、失敗したら localStorage には手を付けない
    for (var i = 0; i < (data.indexedDB || []).length; i++) await restoreDatabase(data.indexedDB[i]);
    var ls = data.localStorage || {};
    Object.keys(ls).forEach(function (k) { localStorage.setItem(k, ls[k]); });
  }

  window.ToolsBackup = { exportAll: exportAll, importAll: importAll };
})();
