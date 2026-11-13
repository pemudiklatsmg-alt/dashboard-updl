/* Bersama: pemuatan data + pengurai + perhitungan */
(function () {
  var BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  var BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function cap(s) { s = String(s || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim();
    if (!s) return null;
    var pct = /%$/.test(s);
    s = s.replace('%', '').replace(/\s/g, '');
    if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    var n = Number(s);
    if (!isFinite(n)) return null;
    return pct ? n / 100 : n;
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return '–';
    return Number(n).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d });
  }
  function pct(n, d) { return n === null || n === undefined ? '–' : fmt(n * 100, d === undefined ? 1 : d) + '%'; }

  /* Tabel 2D (baris pertama = header) -> array objek */
  function rows(table) {
    if (!table || !table.length) return [];
    var h = table[0].map(function (x) { return String(x).trim(); });
    return table.slice(1).filter(function (r) { return r.some(function (v) { return v !== '' && v !== null; }); })
      .map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i] === undefined ? '' : r[i]; }); return o; });
  }

  /* ---------------- KONMAN ---------------- */
  function parseKonman(k) {
    var V = (k && k.values) || [], Dd = (k && k.display) || [];
    if (V.length < 3) return { months: [], items: [] };
    var h1 = V[0], h2 = V[1], ff = [], last = '';
    for (var c = 0; c < h1.length; c++) { var t = String(h1[c] || '').trim().toUpperCase(); if (t) last = t; ff.push(last); }
    var col = { target: {}, real: {}, skor: {}, ket: {}, capai: {}, sesuai: {} };
    for (c = 0; c < h1.length; c++) {
      var a = String(h1[c] || '').trim().toUpperCase(), b = String(h2[c] || '').trim().toUpperCase(), f = ff[c];
      BULAN.forEach(function (B) {
        if (a === 'TARGET ' + B) col.target[B] = c;
        if (a === 'REALISASI ' + B) col.real[B] = c;
        if (a === 'SKOR ' + B) col.skor[B] = c;
        if (a === 'KET ' + B) col.ket[B] = c;
        if (f.indexOf('PENCAPAIAN') === 0 && b === B) col.capai[B] = c;
        if (f.indexOf('PENYESUAIAN') === 0 && b === B) col.sesuai[B] = c;
      });
    }
    function idx(name) { for (var i = 0; i < h1.length; i++) if (String(h1[i]).trim().toUpperCase() === name) return i; return -1; }
    var cNo = 0, cNama = 1, cPendek = idx('INDIKATOR KINERJA'), cPic = idx('PIC'), cPol = idx('POLARITAS'), cFor = idx('FORMULA'),
      cSat = idx('SATUAN'), cB1 = idx('BOBOT SMT I'), cB2 = idx('BOBOT SMT II'), cT1 = idx('TARGET SMT I'), cT2 = idx('TARGET SMT II');
    var months = BULAN.filter(function (B) { return col.real[B] !== undefined; });
    var items = [], parent = null;
    for (var r = 2; r < V.length; r++) {
      var row = V[r], disp = Dd[r] || [];
      var nama = String(row[cNama] || '').trim();
      if (!nama) continue;
      var no = num(row[cNo]);
      var it = {
        baris: r + 1, no: no, nama: nama.replace(/^[a-z]\.\s*/, ''), namaAsli: nama,
        pendek: String(row[cPendek] || nama).replace(/^[a-z]\.\s*/, '').trim(),
        pic: row[cPic] || '', polaritas: row[cPol], formula: row[cFor] || '', satuan: row[cSat] || '',
        bobot1: row[cB1], bobot2: row[cB2], target1: disp[cT1] || row[cT1], target2: disp[cT2] || row[cT2],
        target: {}, real: {}, skor: {}, ket: {}, capai: {}, sesuai: {}, children: []
      };
      it.pengurang = /max/i.test(String(row[cB1] || '') + String(row[cB2] || ''));
      it.maksPengurang = it.pengurang ? Math.abs(num(String(row[cB2] || row[cB1]).replace(/[^0-9.,]/g, '')) || 0) : null;
      months.forEach(function (B) {
        it.target[B] = { v: row[col.target[B]], d: disp[col.target[B]] };
        it.real[B] = { v: row[col.real[B]], d: disp[col.real[B]] };
        it.skor[B] = num(row[col.skor[B]]);
        it.ket[B] = col.ket[B] !== undefined ? row[col.ket[B]] : '';
        it.capai[B] = col.capai[B] !== undefined ? num(row[col.capai[B]]) : null;
        it.sesuai[B] = col.sesuai[B] !== undefined ? num(row[col.sesuai[B]]) : null;
      });
      if (no !== null) { it.level = 0; parent = it; items.push(it); }
      else if (parent) { it.level = 1; it.parent = parent; parent.children.push(it); items.push(it); }
    }
    items.forEach(function (it) { it.isGroup = it.level === 0 && it.children.length > 0; });
    return { months: months, items: items, col: col };
  }

  function bobotFor(it, B) { var smt1 = BULAN.indexOf(B) <= 5; return num(smt1 ? it.bobot1 : it.bobot2); }

  /* Nilai pencapaian (0..n) untuk sebuah indikator pada bulan B */
  function capaianItem(it, B) {
    if (it.isGroup) {
      var s = 0, w = 0, any = false;
      it.children.forEach(function (c) {
        if (c.pengurang) return;
        var sk = c.skor[B], bw = bobotFor(c, B);
        if (sk !== null && bw) { s += sk; w += bw; any = true; }
      });
      return any && w ? s / w : null;
    }
    var v = it.sesuai[B];
    if (v === null || v === undefined) v = it.capai[B];
    return v;
  }

  function hasData(it, B) {
    var r = it.real[B]; return r && r.v !== '' && r.v !== null && r.v !== undefined;
  }

  /* ---------------- TANGGAL ---------------- */
  function tgl(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }
  function hariKerja(a, b) {
    if (!a || !b || b < a) return 0;
    var n = 0, d = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    while (d <= b) { var w = d.getDay(); if (w !== 0 && w !== 6) n++; d.setDate(d.getDate() + 1); }
    return n;
  }
  function akhirBulan(y, m) { return new Date(y, m, 0); }       // m = 1..12
  function kunciKelas(id, judul, mulai) {
    var t = tgl(mulai), iso = t ? t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2) : String(mulai || '').trim();
    return [String(id || '').replace(/^'/, '').trim(), String(judul || '').trim().toUpperCase(), iso].join('|');
  }

  /* ---------------- RENDIKLAT: kelas + koreksi ---------------- */
  function parseRendiklat(table, koreksiTable) {
    var kor = {};
    rows(koreksiTable).forEach(function (r) {
      kor[kunciKelas(r['ID REN'], r['Judul Pelatihan'], r['Tgl Mulai'])] = {
        realisasi: num(r['Realisasi Peserta (koreksi)']), hari: num(r['Hari Kerja (koreksi)']),
        ikut: String(r['Ikut HOP?'] || 'Ya').trim().toUpperCase() !== 'TIDAK', alasan: r['Alasan']
      };
    });
    return rows(table).map(function (r) {
      var k = kor[kunciKelas(r['ID REN'], r['nm_judul'], r['R.Tgl Mulai'])] || null;
      return {
        id: r['ID REN'], judul: r['nm_judul'], metode: String(r['laks_diklat'] || '').trim(), status: String(r['Status Pelaksanaan'] || '').trim(),
        mulai: tgl(r['R.Tgl Mulai']), selesai: tgl(r['R.Tgl Selesai']), rencana: num(r['Rencana Peserta']),
        realisasi: num(r['Realisasi Peserta']), jp: num(r['JP']), koreksi: k
      };
    });
  }

  /* Hitung kelas, peserta dan orang-hari kumulatif s.d. akhir bulan m tahun y */
  function hitungRendiklat(kelas, y, m, set) {
    var akhir = akhirBulan(y, m), awalTahun = new Date(y, 0, 1);
    var o = { kelas: 0, kelasBulan: 0, terjadwal: 0, peserta: 0, rencanaPeserta: 0, pakaiRencana: 0, tanpaPeserta: 0, dikoreksi: 0, orangHari: 0, daftar: [] };
    kelas.forEach(function (k) {
      if (!k.selesai || k.selesai.getFullYear() !== y || k.selesai > akhir) return;
      if (k.status !== 'Dibatalkan') o.terjadwal++;
      if (k.status !== 'Selesai') return;
      o.kelas++;
      if (k.selesai.getMonth() + 1 === m) o.kelasBulan++;
      var p = k.realisasi, sumber = 'Rendiklat';
      if (k.koreksi && k.koreksi.realisasi !== null) { p = k.koreksi.realisasi; sumber = 'koreksi'; o.dikoreksi++; }
      else if (p === null && set.tanpaRealisasi.indexOf('RENCANA') >= 0 && k.rencana !== null) { p = k.rencana; sumber = 'perkiraan'; o.pakaiRencana++; }
      if (p === null) { o.tanpaPeserta++; p = 0; sumber = 'kosong'; }
      o.peserta += p;
      if (k.rencana !== null) o.rencanaPeserta += k.rencana;
      var mulai = k.mulai || k.selesai;
      if (!set.hitungHariSebelumTahun && mulai < awalTahun) mulai = awalTahun;
      var hari = k.koreksi && k.koreksi.hari !== null ? k.koreksi.hari : hariKerja(mulai, k.selesai);
      var ikut = !(k.koreksi && !k.koreksi.ikut) && !(set.kecualikanSL && k.metode === 'SL');
      if (ikut) o.orangHari += p * hari;
      o.daftar.push({ k: k, peserta: p, sumber: sumber, hari: hari, ikut: ikut });
    });
    return o;
  }

  /* Baris tabel bertanggal (rekap evaluasi) -> baris tahun y s.d. bulan m */
  function rekapSampai(table, kolTgl, y, m) {
    var akhir = akhirBulan(y, m);
    return rows(table).map(function (r) { r._t = tgl(r[kolTgl]); return r; })
      .filter(function (r) { return r._t && r._t.getFullYear() === y && r._t <= akhir; });
  }
  function rataTertimbang(list, kolNilai, kolBobot) {
    var s = 0, w = 0, n = 0;
    list.forEach(function (r) {
      var v = num(r[kolNilai]); if (v === null) return;
      var b = kolBobot ? num(r[kolBobot]) : null; if (b === null || b <= 0) b = 1;
      s += v * b; w += b; n++;
    });
    return n ? { nilai: s / w, n: n } : null;
  }

  /* ---------------- EVALUASI dari data mentah (ringkasan dibuat Apps Script) ---------------- */
  /* Semua dihitung kumulatif Januari s.d. akhir bulan m tahun y, berdasarkan tanggal selesai pelatihan */
  function dalam(iso, y, m) { var t = tgl(iso); return !!t && t.getFullYear() === y && t <= akhirBulan(y, m); }
  function nol(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function jumlah(a) { return a.reduce(function (s, x) { return s + (x || 0); }, 0); }

  function evalKepuasan(E, y, m) {
    if (!E || !E.butir) return null;
    var nb = E.butir.length, s = nol(nb), c = nol(nb), pel = [], resp = 0;
    (E.pel || []).forEach(function (p) {
      if (!dalam(p[0], y, m)) return;
      for (var k = 0; k < nb; k++) { s[k] += p[3][k] || 0; c[k] += p[4][k] || 0; }
      var ps = jumlah(p[3]), pc = jumlah(p[4]); resp += p[2];
      pel.push({ tg: p[0], judul: p[1], n: p[2], nilai: pc ? ps / pc : null });
    });
    var S = jumlah(s), C = jumlah(c), asp = {}, urut = [];
    var butir = E.butir.map(function (b, k) {
      var a = E.aspek[k] || 'Lainnya';
      if (!asp[a]) { asp[a] = { nama: a, s: 0, c: 0 }; urut.push(a); }
      asp[a].s += s[k]; asp[a].c += c[k];
      return { label: b, aspek: a, nilai: c[k] ? s[k] / c[k] : null, n: c[k] };
    });
    return { nilai: C ? S / C : null, responden: resp, pelatihan: pel.length, butir: butir, pel: pel,
      aspek: urut.map(function (a) { return { nama: a, nilai: asp[a].c ? asp[a].s / asp[a].c : null, n: asp[a].c }; }) };
  }

  function evalInstruktur(E, y, m) {
    if (!E || !E.butir) return null;
    var nb = E.butir.length;
    var ins = (E.instruktur || []).map(function (x, i) { return { i: i, nama: x[0], tipe: x[1], s: 0, c: 0, n: 0, pel: [], bs: nol(nb), bc: nol(nb) }; });
    (E.pel || []).forEach(function (p) {
      var o = ins[p[0]]; if (!o || !dalam(p[1], y, m)) return;
      for (var k = 0; k < nb; k++) { o.bs[k] += p[5][k] || 0; o.bc[k] += p[6][k] || 0; }
      var ps = jumlah(p[5]), pc = jumlah(p[6]); o.s += ps; o.c += pc; o.n += p[4];
      o.pel.push({ tg: p[1], judul: p[2], angkatan: p[3], n: p[4], nilai: pc ? ps / pc : null });
    });
    var list = ins.filter(function (o) { return o.pel.length; }).map(function (o) {
      o.nilai = o.c ? o.s / o.c : null;
      o.butir = E.butir.map(function (b, k) { return { label: b, nilai: o.bc[k] ? o.bs[k] / o.bc[k] : null }; });
      return o;
    });
    var S = jumlah(list.map(function (o) { return o.s; })), C = jumlah(list.map(function (o) { return o.c; }));
    return { nilai: C ? S / C : null, instruktur: list, penilaian: jumlah(list.map(function (o) { return o.n; })) };
  }

  function evalKsa(E, y, m) {
    if (!E || !E.pel) return null;
    var pel = [], n = 0, s = 0, semua = 0;
    E.pel.forEach(function (p) {
      if (!dalam(p[0], y, m)) return;
      n += p[2]; s += p[3]; semua += p[4];
      pel.push({ tg: p[0], judul: p[1], n: p[2], semua: p[4], nilai: p[2] ? p[3] / p[2] : null });
    });
    return { nilai: n ? s / n : null, peserta: n, semua: semua, pel: pel };
  }

  function evalCc(E, y, m) {
    if (!E || !E.pel) return null;
    var pel = [], n = 0, sc = 0, nc = 0, sm = 0, nm = 0;
    E.pel.forEach(function (p) {
      if (!dalam(p[0], y, m)) return;
      n += p[2]; sc += p[3]; nc += p[4]; sm += p[5]; nm += p[6];
      pel.push({ tg: p[0], judul: p[1], n: p[2], conf: p[4] ? p[3] / p[4] : null, comm: p[6] ? p[5] / p[6] : null });
    });
    var conf = nc ? sc / nc : null, comm = nm ? sm / nm : null;
    return { conf: conf, comm: comm, nilai: conf !== null && comm !== null ? (conf + comm) / 2 : (conf !== null ? conf : comm), n: n, pel: pel };
  }

  /* Sertifikat: terbit = status pertama (Finish TTE GM), dihitung dari Tgl.Terbit.
     Yang belum terbit ditempatkan pada periode menurut tanggal selesai pelatihan. */
  function evalSert(E, y, m) {
    if (!E || !E.status) return null;
    var cnt = nol(E.status.length), kum = 0, bln = 0, total = 0;
    (E.rows || []).forEach(function (r) {
      var terbit = r[0] === 0, d = terbit ? (r[1] || r[2]) : (r[2] || r[1]);
      if (!dalam(d, y, m)) return;
      total++; cnt[r[0]]++;
      if (terbit) { kum++; if (tgl(d).getMonth() + 1 === m) bln++; }
    });
    return { status: E.status, cnt: cnt, terbit: kum, bulan: bln, total: total, pct: total ? kum / total : null };
  }

  /* ---------------- SESI LOGIN ---------------- */
  var SESI_KEY = 'dash-sesi', CACHE_KEY = 'dash-cache-v4';
  /* Sesi disimpan di localStorage (berlaku sampai token habis, maks. 6 jam) supaya menutup tab tidak memaksa login ulang. */
  function sesi() {
    try {
      var s = JSON.parse(localStorage.getItem(SESI_KEY) || sessionStorage.getItem(SESI_KEY) || 'null');
      return s && s.exp > Date.now() ? s : null;
    } catch (e) { return null; }
  }
  function simpanSesi(s) { try { localStorage.setItem(SESI_KEY, JSON.stringify(s)); } catch (e) { try { sessionStorage.setItem(SESI_KEY, JSON.stringify(s)); } catch (x) {} } }
  function hapusSesi() {
    try { localStorage.removeItem(SESI_KEY); sessionStorage.removeItem(SESI_KEY); sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem('dash-cache-v3'); sessionStorage.removeItem('dash-input-token'); } catch (e) {}
    MEM = null; idbHapus();
  }

  function api(body) {
    var url = String((window.DASH_CONFIG || {}).API_URL || '').trim();
    if (!url) return Promise.reject(new Error('Alamat Apps Script belum diatur di config.js.'));
    return fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.text(); }, function () { throw new Error('Tidak bisa terhubung ke Google Sheets. Periksa koneksi internet lalu coba lagi.'); })
      .then(function (t) {
        var d; try { d = JSON.parse(t); } catch (e) { throw new Error('Apps Script belum diperbarui. Tempel Code.gs versi 4 lalu Deploy versi baru (lihat README).'); }
        if (!d.ok) {
          var er = new Error(d.error || (d.perluLogin ? 'Silakan masuk.' : 'Gagal.')); er.login = !!d.login; throw er;
        }
        return d;
      });
  }

  /* ---------------- SIMPANAN DATA DI BROWSER (IndexedDB) ----------------
     Data terakhir disimpan per pengguna. Saat dibuka lagi, dashboard langsung tampil dari simpanan
     ini, lalu data terbaru diambil di belakang layar. Dihapus saat keluar. */
  var MEM = null, IDB_NAMA = 'updl-dash';
  function idb() {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open(IDB_NAMA, 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  }
  function idbTx(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction('kv', mode), st = tx.objectStore('kv'), q = fn(st), hasil = null;
        if (q) q.onsuccess = function () { hasil = q.result; };
        tx.oncomplete = function () { res(hasil); }; tx.onerror = tx.onabort = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function idbHapus() { return idbTx('readwrite', function (st) { st.delete('data'); }); }
  /* data tersimpan untuk pengguna yang sedang masuk (Promise -> data | null) */
  function dataTersimpan() {
    var s = sesi(); if (!s) return Promise.resolve(null);
    if (MEM) return Promise.resolve(MEM);
    return idbTx('readonly', function (st) { return st.get('data'); }).then(function (r) {
      if (!r || r.user !== s.user || r.peran !== s.peran || !r.d) return null;
      r.d.meta = r.d.meta || {}; r.d.meta.dariSimpanan = r.t; MEM = r.d; return r.d;
    });
  }

  /* ---------------- LOAD ---------------- */
  function loadData() {
    var s = sesi();
    if (!s) { var e0 = new Error('Silakan masuk.'); e0.login = true; return Promise.reject(e0); }
    return api({ aksi: 'data', token: s.token })
      .then(function (d) {
        if (!d.meta || !(d.meta.versi >= 4)) throw new Error('Apps Script masih versi lama. Tempel Code.gs terbaru lalu buat versi deployment baru.');
        MEM = d;
        idbTx('readwrite', function (st) { st.put({ user: s.user, peran: s.peran, t: Date.now(), d: d }, 'data'); });
        return d;
      })
      .catch(function (err) {
        if (err.login) throw err;
        return dataTersimpan().then(function (c) {
          if (c) { c.meta.stale = String(err.message || err); return c; }
          throw new Error('Gagal memuat dari Google Sheets: ' + (err.message || err) + ' Coba klik Muat ulang beberapa saat lagi.');
        });
      });
  }
  function cachedData() { return MEM; }
  function hapusCache() { /* data lama tetap tampil sampai data baru datang */ }

  window.Dash = {
    BULAN: BULAN, BLN3: BLN3, cap: cap, num: num, esc: esc, fmt: fmt, pct: pct, rows: rows,
    parseKonman: parseKonman, capaianItem: capaianItem, bobotFor: bobotFor, hasData: hasData,
    tgl: tgl, hariKerja: hariKerja, akhirBulan: akhirBulan, parseRendiklat: parseRendiklat, hitungRendiklat: hitungRendiklat,
    rekapSampai: rekapSampai, rataTertimbang: rataTertimbang, loadData: loadData, cachedData: cachedData, dataTersimpan: dataTersimpan, hapusCache: hapusCache,
    evalKepuasan: evalKepuasan, evalInstruktur: evalInstruktur, evalKsa: evalKsa, evalCc: evalCc, evalSert: evalSert,
    sesi: sesi, simpanSesi: simpanSesi, hapusSesi: hapusSesi, api: api
  };
})();
