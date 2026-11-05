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

  /* ---------------- LOAD ---------------- */
  var CACHE_KEY = 'dash-cache-v2';
  function loadData(opts) {
    opts = opts || {};
    var cfg = window.DASH_CONFIG || {};
    var api = String(cfg.API_URL || '').trim();
    if (!api) return loadSnapshot('API belum diatur');
    return fetch(api + (api.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (d && d.error) throw new Error(d.error);
        if (!d.meta || d.meta.versi !== 2) throw new Error('Apps Script masih versi lama. Tempel Code.gs versi 2 lalu buat versi deployment baru.');
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
        return d;
      })
      .catch(function (err) {
        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch (e) {}
        if (cached) { cached.meta.stale = String(err.message || err); return cached; }
        return loadSnapshot('Gagal memuat dari Google Sheets: ' + (err.message || err));
      });
  }
  function cachedData() { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function loadSnapshot(reason) {
    var done = function (d) { d.meta = d.meta || {}; d.meta.source = 'snapshot'; d.meta.reason = reason; return d; };
    if (window.__SNAPSHOT__) return Promise.resolve(done(window.__SNAPSHOT__));
    // Tidak ada salinan data di website: tampilkan pesan, bukan angka contoh
    return Promise.reject(new Error(reason + '. Coba klik Muat ulang beberapa saat lagi.'));
  }

  window.Dash = {
    BULAN: BULAN, BLN3: BLN3, cap: cap, num: num, esc: esc, fmt: fmt, pct: pct, rows: rows,
    parseKonman: parseKonman, capaianItem: capaianItem, bobotFor: bobotFor, hasData: hasData,
    tgl: tgl, hariKerja: hariKerja, akhirBulan: akhirBulan, parseRendiklat: parseRendiklat, hitungRendiklat: hitungRendiklat,
    rekapSampai: rekapSampai, rataTertimbang: rataTertimbang, loadData: loadData, cachedData: cachedData
  };
})();
