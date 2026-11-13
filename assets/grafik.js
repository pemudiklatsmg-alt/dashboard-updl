/* Grafik tambahan: tren bulanan & komposisi untuk tab Ringkasan, Rekap Pembelajaran, dan Evaluasi.
   Semua dihitung di browser dari data yang sudah dimuat (Rendiklat & data evaluasi mentah). */
(function () {
  var A = window.DashApp, D = window.Dash; if (!A || !D) return;
  var $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var BL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var METODE = { ICT: 'Klasikal (ICT)', DL: 'Daring (DL)', BL: 'Blended (BL)', SL: 'Self Learning (SL)', IHT: 'In-House Training (IHT)', HL: 'Hybrid (HL)', '': 'Belum diisi' };
  var G = { pembMode: 'kelas' };

  /* ---------- pembuat grafik (SVG, mengikuti warna tema) ---------- */
  function skala(maks) { if (maks <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(maks))), n = maks / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  // vals: 12 angka/null · bayang: 12 angka (rencana, digambar samar di belakang) · sel: bulan terpilih (1-12)
  function batang(vals, o) {
    o = o || {}; var W = 640, H = o.h || 210, L = 40, R = 8, T = 18, Bm = 24, cw = (W - L - R) / 12;
    var semua = vals.concat(o.bayang || []).filter(function (v) { return v !== null && v !== undefined; });
    var mx = skala(Math.max.apply(null, [0].concat(semua)) * 1.08), y = function (v) { return T + (H - T - Bm) * (1 - v / mx); };
    var s = '<svg class="gx-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Grafik per bulan') + '">';
    for (var g = 0; g <= 4; g++) { var gv = mx * g / 4, gy = y(gv); s += '<line class="gx-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/><text class="gx-ax" x="' + (L - 6) + '" y="' + (gy + 3.5) + '" text-anchor="end">' + esc(o.fmtAx ? o.fmtAx(gv) : D.fmt(gv, 0)) + '</text>'; }
    vals.forEach(function (v, i) {
      var x = L + i * cw + cw * 0.18, w = cw * 0.64, on = o.sel === i + 1, b = o.bayang ? o.bayang[i] : null;
      if (b) s += '<rect' + (o.klik ? ' data-gxm="' + (i + 1) + '"' : '') + ' class="gx-ghost" x="' + x + '" y="' + y(b) + '" width="' + w + '" height="' + (y(0) - y(b)) + '" rx="4"><title>' + BLN[i] + ' · ' + esc(o.namaBayang || 'rencana') + ': ' + D.fmt(b, 0) + '</title></rect>';
      if (v) s += '<path' + (o.klik ? ' data-gxm="' + (i + 1) + '"' : '') + ' class="gx-bar' + (on ? ' on' : '') + '" d="M' + x + ',' + y(0) + 'V' + (y(v) + 4) + 'q0,-4 4,-4h' + (w - 8) + 'q4,0 4,4V' + y(0) + 'z"><title>' + BLN[i] + ': ' + esc(o.fmt ? o.fmt(v) : D.fmt(v, 0)) + (b ? ' dari ' + D.fmt(b, 0) + ' ' + esc(o.namaBayang || 'rencana') : '') + '</title></path>';
      if (v && (on || o.semuaLabel)) s += '<text class="gx-val' + (on ? ' on' : '') + '" x="' + (x + w / 2) + '" y="' + (y(Math.max(v, b || 0)) - 5) + '" text-anchor="middle">' + esc(o.fmt ? o.fmt(v) : D.fmt(v, 0)) + '</text>';
      s += '<text class="gx-ax' + (on ? ' on' : '') + '" x="' + (x + w / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + BL[i] + '</text>';
    });
    return s + '<line class="gx-base" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
  }
  // seri: [{n, v:[12], c:'a'|'b'}] · o.min/o.max · o.target
  function garis(seri, o) {
    o = o || {}; var W = 640, H = o.h || 210, L = 40, R = 12, T = 14, Bm = 24, cw = (W - L - R) / 12;
    var ada = []; seri.forEach(function (sr) { sr.v.forEach(function (v) { if (v !== null && v !== undefined) ada.push(v); }); }); if (o.target) ada.push(o.target);
    if (!ada.length) return '<div class="empty">Belum ada data tahun ini.</div>';
    var mn = Math.min.apply(null, ada), mxv = Math.max.apply(null, ada), st = [0.05, 0.1, 0.25, 0.5, 1].filter(function (x) { return (mxv - mn + 0.1) / x <= 4; })[0] || 1;
    var lo = o.min !== undefined ? o.min : Math.floor((mn - 0.05) / st) * st, hi = o.max !== undefined ? o.max : Math.ceil((mxv + 0.05) / st) * st, nG = Math.round((hi - lo) / st) || 4;
    var y = function (v) { return T + (H - T - Bm) * (1 - (v - lo) / (hi - lo)); }, x = function (i) { return L + i * cw + cw / 2; };
    var s = '<svg class="gx-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Tren per bulan') + '">';
    for (var g = 0; g <= nG; g++) { var gv = lo + st * g, gy = y(gv); s += '<line class="gx-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/><text class="gx-ax" x="' + (L - 6) + '" y="' + (gy + 3.5) + '" text-anchor="end">' + D.fmt(gv, 2) + '</text>'; }
    if (o.sel) s += '<rect class="gx-selcol" x="' + (L + (o.sel - 1) * cw) + '" y="' + T + '" width="' + cw + '" height="' + (H - T - Bm) + '" rx="6"/>';
    if (o.target) s += '<line class="gx-tgt" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(o.target) + '" y2="' + y(o.target) + '"/><text class="gx-tgt-t" x="' + (W - R) + '" y="' + (y(o.target) - 4) + '" text-anchor="end">target ' + D.fmt(o.target, 2) + '</text>';
    seri.forEach(function (sr) {
      var d = '', pen = false;
      sr.v.forEach(function (v, i) { if (v === null || v === undefined) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; });
      s += '<path class="gx-ln ' + sr.c + '" d="' + d + '"/>';
      sr.v.forEach(function (v, i) {
        if (v === null || v === undefined) return;
        s += '<circle class="gx-dot ' + sr.c + (o.sel === i + 1 ? ' on' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (o.sel === i + 1 ? 5.5 : 4) + '"><title>' + BLN[i] + ' · ' + esc(sr.n) + ': ' + D.fmt(v, 2) + '</title></circle>';
        if (o.sel === i + 1) {
          var lain = seri.filter(function (q) { return q !== sr && q.v[i] !== null && q.v[i] !== undefined; })[0], bawah = lain && lain.v[i] > v;
          s += '<text class="gx-val on ' + sr.c + '" x="' + x(i) + '" y="' + (bawah ? y(v) + 18 : y(v) - 9) + '" text-anchor="middle">' + D.fmt(v, 2) + '</text>';
        }
      });
    });
    for (var i = 0; i < 12; i++) s += '<text class="gx-ax' + (o.sel === i + 1 ? ' on' : '') + '" x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + BL[i] + '</text>';
    return s + '</svg>' + (seri.length > 1 ? '<div class="gx-leg">' + seri.map(function (sr) { return '<span><i class="' + sr.c + '"></i>' + esc(sr.n) + '</span>'; }).join('') + '</div>' : '');
  }
  // baris batang mendatar (HTML) · list: [{l, v, sub, st}]
  function mendatar(list, o) {
    o = o || {}; if (!list.length) return '<div class="empty">' + esc(o.kosong || 'Belum ada data.') + '</div>';
    var mx = o.max || Math.max.apply(null, list.map(function (x) { return x.v || 0; })) || 1;
    return '<div class="gx-hb">' + list.map(function (x) {
      return '<div class="gx-hr' + (x.attr ? ' gx-klik' : '') + '"' + (x.st ? ' data-st="' + x.st + '"' : '') + (x.attr ? ' ' + x.attr + ' tabindex="0" role="button" title="Klik untuk daftar kelas"' : '') + '><span class="gx-hl" title="' + esc(x.l) + '">' + esc(x.l) + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' +
        '<span class="gx-ht"><i style="width:' + Math.max(1.5, (x.v || 0) / mx * 100).toFixed(1) + '%"></i>' + (o.target ? '<em style="left:' + (o.target / mx * 100).toFixed(1) + '%" title="target"></em>' : '') + '</span>' +
        '<b class="gx-hv">' + esc(o.fmt ? o.fmt(x.v) : D.fmt(x.v, 0)) + '</b></div>';
    }).join('') + '</div>';
  }
  function panel(judul, desc, isi, ekstra, cls) {
    return '<div class="panel gx-p' + (cls ? ' ' + cls : '') + '"><div class="panel-h"><div><h2>' + esc(judul) + '</h2>' + (desc ? '<div class="desc">' + desc + '</div>' : '') + '</div>' + (ekstra || '') + '</div>' + isi + '</div>';
  }

  /* ---------- data ---------- */
  function perBulanKelas() {
    var S = A.S, y = S.tahun, o = { kelas: [], peserta: [], oh: [], jadwal: [] }, i;
    for (i = 0; i < 12; i++) { o.kelas.push(0); o.peserta.push(0); o.oh.push(0); o.jadwal.push(0); }
    A.kelas().forEach(function (k) { if (k.selesai && k.selesai.getFullYear() === y && k.status !== 'Dibatalkan') o.jadwal[k.selesai.getMonth()]++; });
    D.hitungRendiklat(A.kelas(), y, 12, A.set()).daftar.forEach(function (d) {
      var m = d.k.selesai.getMonth(); o.kelas[m]++; o.peserta[m] += d.peserta; if (d.ikut) o.oh[m] += d.peserta * d.hari;
    });
    return o;
  }
  function perBulanNilai(E, iTgl, iS, iC) {   // nilai rata-rata per bulan (bukan kumulatif)
    var s = [], c = [], y = A.S.tahun, i;
    for (i = 0; i < 12; i++) { s.push(0); c.push(0); }
    ((E && E.pel) || []).forEach(function (p) {
      var t = D.tgl(p[iTgl]); if (!t || t.getFullYear() !== y) return;
      var ps = 0, pc = 0; (p[iS] || []).forEach(function (v) { ps += v || 0; }); (p[iC] || []).forEach(function (v) { pc += v || 0; });
      s[t.getMonth()] += ps; c[t.getMonth()] += pc;
    });
    return s.map(function (v, i) { return c[i] ? v / c[i] : null; });
  }
  function potong(v, m) { return v.map(function (x, i) { return i < m ? x : null; }); }

  /* ---------- Rekap Pembelajaran ---------- */
  function renderPemb() {
    var el = $('gxPemb'); if (!el) return;
    var S = A.S, m = S.bulan, pb = perBulanKelas(), mode = G.pembMode;
    var cfg = { kelas: { v: pb.kelas, n: 'Kelas selesai', bayang: pb.jadwal, nb: 'kelas terjadwal' }, peserta: { v: pb.peserta, n: 'Peserta' }, oh: { v: pb.oh, n: 'Orang-hari pelatihan', fmt: function (v) { return D.fmt(v, 0); } } }[mode];
    var seg = '<div class="seg" role="group" aria-label="Ukuran">' + [['kelas', 'Kelas'], ['peserta', 'Peserta'], ['oh', 'Orang-hari']].map(function (x) { return '<button type="button" data-gxpm="' + x[0] + '" aria-pressed="' + (mode === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var jml = cfg.v.slice(0, m).reduce(function (a, b) { return a + b; }, 0);
    var g1 = panel('Pelatihan per Bulan', esc(cfg.n) + ' tiap bulan ' + S.tahun + (mode === 'kelas' ? '; batang samar = kelas terjadwal (termasuk bulan mendatang)' : '') + '. Total s.d. ' + A.namaBulan(m) + ': <b>' + D.fmt(jml, 0) + '</b>.',
      batang(mode === 'kelas' ? cfg.v.map(function (v, i) { return i < m ? v : 0; }) : potong(cfg.v, m), { sel: m, klik: true, bayang: cfg.bayang, namaBayang: cfg.nb, label: cfg.n + ' per bulan', fmtAx: function (v) { return v >= 10000 ? D.fmt(v / 1000, 0) + 'rb' : D.fmt(v, 0); } }), seg, 'gx-lebar');
    // komposisi metode s.d. bulan terpilih
    var r = D.hitungRendiklat(A.kelas(), S.tahun, m, A.set()), met = {};
    r.daftar.forEach(function (d) { var k = d.k.metode || ''; met[k] = met[k] || { n: 0, p: 0 }; met[k].n++; met[k].p += d.peserta; });
    var ml = Object.keys(met).map(function (k) { return { l: METODE[k] || k, v: met[k].n, sub: D.fmt(met[k].p, 0) + ' peserta', attr: 'data-gxmet="' + esc(k) + '"' }; }).sort(function (a, b) { return b.v - a.v; });
    var g2 = panel('Metode Pembelajaran', 'Kelas selesai s.d. ' + A.namaBulan(m) + ' per metode pelaksanaan.', mendatar(ml, { fmt: function (v) { return D.fmt(v, 0) + ' kelas'; } }));
    // pelatihan dengan peserta terbanyak (judul digabung)
    var jd = {}; r.daftar.forEach(function (d) { var j = String(d.k.judul || '').trim() || '(tanpa judul)'; jd[j] = jd[j] || { p: 0, n: 0 }; jd[j].p += d.peserta; jd[j].n++; });
    var top = Object.keys(jd).map(function (j) { return { l: j, v: jd[j].p, sub: jd[j].n + ' kelas', attr: 'data-gxj="' + esc(j) + '"' }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 7);
    var g3 = panel('Pelatihan dengan Peserta Terbanyak', 's.d. ' + A.namaBulan(m) + ' ' + S.tahun + ', judul yang sama digabung.', mendatar(top, { fmt: function (v) { return D.fmt(v, 0); } }));
    // status pelaksanaan seluruh kelas tahun ini
    var st = {}; A.kelas().forEach(function (k) { if (!k.selesai || k.selesai.getFullYear() !== S.tahun) return; var s = /^(Selesai|Berlangsung|Terjadwal|Ditunda|Dibatalkan)$/.test(k.status) ? k.status : 'Belum diisi'; st[s] = (st[s] || 0) + 1; });
    var urut = ['Selesai', 'Berlangsung', 'Terjadwal', 'Ditunda', 'Dibatalkan', 'Belum diisi'], wst = { Selesai: 'good', Berlangsung: 'info', Terjadwal: 'idle', Ditunda: 'warn', Dibatalkan: 'bad', 'Belum diisi': 'idle' };
    var sl = urut.filter(function (k) { return st[k]; }).map(function (k) { return { l: k, v: st[k], st: wst[k], attr: 'data-gxst="' + esc(k) + '"' }; });
    var g4 = panel('Status Pelaksanaan Kelas', 'Seluruh kelas Rendiklat ' + S.tahun + ' (Januari–Desember) menurut status.', mendatar(sl, { fmt: function (v) { return D.fmt(v, 0) + ' kelas'; } }));
    el.innerHTML = '<div class="gx-row">' + g1 + g2 + '</div><div class="gx-row gx-sama">' + g3 + g4 + '</div>';
  }

  /* ---------- Evaluasi ---------- */
  function renderEval() {
    var el = $('gxEval'); if (!el) return;
    var S = A.S, m = S.bulan, E = S.data.eval || {}, set = A.set();
    var kep = perBulanNilai(E.kepuasan, 0, 3, 4), ins = perBulanNilai(E.instruktur, 1, 5, 6);
    var g1 = panel('Tren Nilai Evaluasi Level 1', 'Rata-rata per bulan (bukan kumulatif), skala 1–5. Arahkan kursor ke titik untuk melihat nilainya.',
      garis([{ n: 'Kepuasan peserta', v: potong(kep, m), c: 'a' }, { n: 'Penilaian instruktur', v: potong(ins, m), c: 'b' }], { sel: m, target: set.targetL1 || null, label: 'Tren kepuasan dan instruktur' }), '', 'gx-lebar');
    var k = A.ev('kepuasan', S.tahun, m);
    var g2 = panel('Kepuasan per Aspek', 'Rata-rata s.d. ' + A.namaBulan(m) + ', skala 1–5.', mendatar(k ? k.aspek.filter(function (a) { return a.nilai !== null; }).map(function (a) { return { l: a.nama, v: a.nilai, st: a.nilai >= 4.2 ? 'good' : a.nilai >= 3.8 ? 'warn' : 'bad' }; }) : [], { max: 5, target: set.targetL1 || null, fmt: function (v) { return D.fmt(v, 2); }, kosong: 'Belum ada data kepuasan.' }));
    var low = k ? k.butir.filter(function (b) { return b.nilai !== null && b.n >= 5; }).sort(function (a, b) { return a.nilai - b.nilai; }).slice(0, 6) : [];
    var g3 = panel('Butir Kepuasan Terendah', 'Enam pertanyaan dengan nilai terendah s.d. ' + A.namaBulan(m) + '. Bahan prioritas perbaikan.', mendatar(low.map(function (b) { return { l: b.label, sub: b.aspek, v: b.nilai, st: b.nilai >= 4.2 ? 'good' : b.nilai >= 3.8 ? 'warn' : 'bad' }; }), { max: 5, fmt: function (v) { return D.fmt(v, 2); }, kosong: 'Belum ada data kepuasan.' }));
    var se = A.ev('sertifikat', S.tahun, m), stN = (E.sertifikat && E.sertifikat.status) || [];
    var wst = ['good', 'info', 'good', 'info', 'idle', 'bad', 'warn'];
    var g4 = panel('Status Sertifikat', 'Sertifikat pelatihan s.d. ' + A.namaBulan(m) + (se && se.total ? ': <b>' + D.fmt(se.terbit, 0) + '</b> dari ' + D.fmt(se.total, 0) + ' sudah terbit (Finish TTE GM).' : '.'),
      mendatar(se ? stN.map(function (n, i) { return { l: n, v: se.cnt[i], st: wst[i] }; }).filter(function (x) { return x.v; }) : [], { fmt: function (v) { return D.fmt(v, 0); }, kosong: 'Belum ada data sertifikat.' }));
    el.innerHTML = '<div class="gx-row">' + g1 + g2 + '</div><div class="gx-row gx-sama">' + g3 + g4 + '</div>';
  }

  /* ---------- Ringkasan: dua grafik tren di bawah angka kunci ---------- */
  function renderRgk() {
    var rgk = $('rgk'); if (!rgk || !rgk.firstChild) return;
    var S = A.S, m = S.bulan, pb = perBulanKelas(), E = S.data.eval || {};
    var kep = perBulanNilai(E.kepuasan, 0, 3, 4);
    var box = document.createElement('div'); box.className = 'gx-row gx-sama gx-rgk';
    box.innerHTML = panel('Kelas Selesai per Bulan', 'Batang samar = kelas terjadwal. <button type="button" class="lnk" data-vt="pembelajaran">Rincian pembelajaran →</button>', batang(pb.kelas.map(function (v, i) { return i < m ? v : 0; }), { sel: m, klik: true, bayang: pb.jadwal, namaBayang: 'kelas terjadwal', h: 190, label: 'Kelas selesai per bulan' })) +
      panel('Kepuasan Peserta per Bulan', 'Rata-rata Evaluasi Level 1 tiap bulan, skala 1–5. <button type="button" class="lnk" data-vt="evaluasi">Rincian evaluasi →</button>', garis([{ n: 'Kepuasan peserta', v: potong(kep, m), c: 'a' }], { sel: m, h: 190, target: A.set().targetL1 || null, label: 'Kepuasan per bulan' }));
    var lama = rgk.querySelector('.gx-rgk'); if (lama) lama.remove();
    rgk.appendChild(box);
  }

  /* ---------- rincian berlapis: daftar kelas (lapis 1) → satu kelas (lapis 2) ---------- */
  var DAFTAR = [];
  function tg(d) { return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; }
  function statusKelas(k) { return /^(Selesai|Berlangsung|Terjadwal|Ditunda|Dibatalkan)$/.test(k.status) ? k.status : 'Belum diisi'; }
  function daftarKelas(judul, desc, saring) {
    var y = A.S.tahun, r = D.hitungRendiklat(A.kelas(), y, 12, A.set()), pes = {};
    r.daftar.forEach(function (d) { pes[A.kelas().indexOf(d.k)] = d; });
    DAFTAR = A.kelas().map(function (k, i) { return { k: k, d: pes[i] || null }; }).filter(function (x) { return x.k.selesai && x.k.selesai.getFullYear() === y && saring(x.k); })
      .sort(function (a, b) { return a.k.selesai - b.k.selesai; });
    var tot = DAFTAR.reduce(function (s, x) { return s + (x.d ? x.d.peserta : 0); }, 0);
    A.openModal('<div class="modal-h"><div><div class="desc">' + esc(desc) + '</div><h3>' + esc(judul) + '</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="kv-g"><div><span>Jumlah kelas</span><b>' + D.fmt(DAFTAR.length, 0) + '</b></div><div><span>Peserta (kelas selesai)</span><b>' + D.fmt(tot, 0) + '</b></div></div>' +
      '<div class="tbl-wrap scroll" style="max-height:55vh"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Selesai</th><th>Metode</th><th class="r">Peserta</th><th>Status</th></tr></thead><tbody>' +
      (DAFTAR.map(function (x, i) {
        var st = statusKelas(x.k);
        return '<tr class="klik" tabindex="0" data-gxk="' + i + '" title="Klik untuk rincian kelas"><td><b>' + esc(x.k.judul || '(tanpa judul)') + '</b><div class="tl-m">' + esc(x.k.id || '') + '</div></td><td>' + tg(x.k.selesai) + '</td><td>' + esc(METODE[x.k.metode] || x.k.metode || '–') + '</td>' +
          '<td class="r num">' + (x.d ? D.fmt(x.d.peserta, 0) + (x.d.sumber === 'perkiraan' ? '*' : '') : '–') + '</td><td><span class="pill ' + ({ Selesai: 'good', Dibatalkan: 'bad', Ditunda: 'warn' }[st] || '') + '">' + esc(st) + '</span></td></tr>';
      }).join('') || '<tr><td colspan="5" class="desc">Tidak ada kelas.</td></tr>') + '</tbody></table></div>' +
      '<p class="note">* perkiraan dari rencana peserta (realisasi belum diisi). Klik baris untuk rincian kelas.</p>', 'wide');
  }
  function rincianKelas(i) {
    var x = DAFTAR[i]; if (!x) return; var k = x.k, d = x.d;
    A.openModal('<div class="modal-h"><div><div class="desc">Rincian kelas · ' + esc(k.id || '') + '</div><h3>' + esc(k.judul || '(tanpa judul)') + '</h3></div><div class="row-gap"><button class="btn" type="button" data-gxkembali>← Kembali</button><button class="btn" data-close>Tutup</button></div></div>' +
      '<div class="kv-g"><div><span>Status</span><b>' + esc(statusKelas(k)) + '</b></div><div><span>Metode</span><b>' + esc(METODE[k.metode] || k.metode || '–') + '</b></div>' +
      '<div><span>Tanggal</span><b>' + tg(k.mulai) + ' – ' + tg(k.selesai) + '</b></div><div><span>JP</span><b>' + (k.jp === null ? '–' : D.fmt(k.jp, 0)) + '</b></div>' +
      '<div><span>Rencana peserta</span><b>' + (k.rencana === null ? '–' : D.fmt(k.rencana, 0)) + '</b></div><div><span>Realisasi peserta</span><b>' + (k.realisasi === null ? 'belum diisi' : D.fmt(k.realisasi, 0)) + '</b>' + (k.koreksi && k.koreksi.realisasi !== null ? '<small>dikoreksi: ' + D.fmt(k.koreksi.realisasi, 0) + '</small>' : '') + '</div>' +
      (d ? '<div><span>Dihitung di dashboard</span><b>' + D.fmt(d.peserta, 0) + ' peserta · ' + D.fmt(d.hari, 0) + ' hari</b><small>' + (d.sumber === 'perkiraan' ? 'perkiraan dari rencana' : d.sumber === 'koreksi' ? 'dari tab Koreksi Rendiklat' : 'dari Rendiklat') + (d.ikut ? '' : ' · tidak ikut HOP') + '</small></div>' : '') + '</div>' +
      (k.koreksi && k.koreksi.alasan ? '<p class="note">Alasan koreksi: ' + esc(k.koreksi.alasan) + '</p>' : ''), 'kelas');
  }
  var LAST = null;
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest || t.closest('#cetakWrap')) return;
    var m = t.closest('[data-gxm]'); if (m) { var b = +m.getAttribute('data-gxm'); LAST = function () { daftarKelas('Kelas ' + BLN[b - 1] + ' ' + A.S.tahun, 'Kelas dengan tanggal selesai di bulan ini', function (k) { return k.selesai.getMonth() + 1 === b && k.status !== 'Dibatalkan'; }); }; return LAST(); }
    var me = t.closest('[data-gxmet]'); if (me) { var kd = me.getAttribute('data-gxmet'); LAST = function () { daftarKelas(METODE[kd] || kd, 'Kelas selesai s.d. ' + A.namaBulan(A.S.bulan) + ' dengan metode ini', function (k) { return (k.metode || '') === kd && k.status === 'Selesai' && k.selesai <= D.akhirBulan(A.S.tahun, A.S.bulan); }); }; return LAST(); }
    var sj = t.closest('[data-gxj]'); if (sj) { var jj = sj.getAttribute('data-gxj'); LAST = function () { daftarKelas(jj, 'Semua kelas dengan judul ini s.d. ' + A.namaBulan(A.S.bulan), function (k) { return String(k.judul || '').trim() === jj && k.status === 'Selesai' && k.selesai <= D.akhirBulan(A.S.tahun, A.S.bulan); }); }; return LAST(); }
    var ss = t.closest('[data-gxst]'); if (ss) { var sv = ss.getAttribute('data-gxst'); LAST = function () { daftarKelas('Kelas ' + sv.toLowerCase(), 'Kelas Rendiklat ' + A.S.tahun + ' dengan status ini', function (k) { return statusKelas(k) === sv; }); }; return LAST(); }
    var kk = t.closest('[data-gxk]'); if (kk) return rincianKelas(+kk.getAttribute('data-gxk'));
    if (t.closest('[data-gxkembali]') && LAST) return LAST();
  });
  function render() {
    if (!A.S.data) return;
    [renderPemb, renderEval, renderRgk].forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error('grafik', e); } });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-gxpm]'); if (!b) return;
    G.pembMode = b.getAttribute('data-gxpm'); renderPemb();
  });
  A.renderGrafik = render;
})();
