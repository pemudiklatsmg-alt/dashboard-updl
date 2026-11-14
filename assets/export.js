/* Export laporan ke Excel (.xlsx) berformat rapi, memakai ExcelJS (dimuat saat dibutuhkan).
   Periode = Tahun & Bulan di header. Sheet Ringkasan memuat gambar tampilan dashboard + tabel angka. */
(function () {
  var D = window.Dash, A = function () { return window.DashApp; }, $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  var PILIHAN = [
    ['ringkasan', 'Ringkasan', 'Gambar dashboard + tabel ukuran utama dengan status', 1],
    ['indikator', 'Indikator Kinerja', 'Bobot, target, realisasi, pencapaian, skor, status', 1],
    ['tren', 'Tren Bulanan', 'Capaian, kelas, peserta, orang-hari, HOP per bulan', 1],
    ['evaluasi', 'Evaluasi Pembelajaran', 'Kepuasan, instruktur, KSA, C&C, L3, L4, ROTI, sertifikat', 1],
    ['kepatuhan', 'Kepatuhan & Perbaikan Berkelanjutan', 'Pengurang per aspek dan status temuan', 1],
    ['maturity', 'Maturity & Risiko', 'Skor per key element dan daftar risiko', 1],
    ['idp', 'Pengembangan Pegawai (IDP)', 'Realisasi jalur 10-20-70 per pegawai', 1],
    ['inovasi', 'Pengembangan Inovasi', 'Daftar inovasi tahun terpilih, tahap, status, nilai manfaat', 1],
    ['konteks', 'Isu & Pihak Berkepentingan', 'Isu internal/eksternal dengan kaitan risiko, dan matriks pihak berkepentingan', 1],
    ['organisasi', 'Struktur Organisasi', 'Pegawai PLN per jabatan dan tenaga alih daya', 0],
    ['kelas', 'Lampiran: Daftar Kelas', 'Semua kelas Selesai (ratusan baris)', 0]
  ];
  $('expChk').innerHTML = PILIHAN.map(function (p) { return '<label><input type="checkbox" value="' + p[0] + '"' + (p[3] ? ' checked' : '') + '><span>' + esc(p[1]) + '<small>' + esc(p[2]) + '</small></span></label>'; }).join('');

  /* ---------- buka / tutup ---------- */
  function namaFile() { var S = A().S; return 'Laporan Dashboard UPDL Semarang - ' + A().namaBulan(S.bulan) + ' ' + S.tahun + '.xlsx'; }
  function bukaExport() {
    if (!A() || !A().S.data) { A() && A().toast('Data dashboard belum termuat.'); return; }
    if (!A().admin()) { A().toast('Export hanya untuk akun Admin.'); return; }
    $('expName').textContent = namaFile(); $('expErr').hidden = true;
    $('inputModal').hidden = true;
    var baru = $('exportModal').hidden; asalEx = G ? G.catat() : null;
    $('exportModal').hidden = false; $('expGo').focus({ preventScroll: true });
    if (baru && G) { G.bersih($('exportModal')); G.pudar($('exportModal'), true); G.jalan($('exportModal').querySelector('.modal-c'), G.balik(asalEx), true); }
  }
  var G = window.Genie, asalEx = null, menutup = 0;
  function tutup() {
    if ($('exportModal').hidden || menutup) return;
    var token = menutup = Date.now();
    function selesai() { if (menutup !== token) return; menutup = 0; $('exportModal').hidden = true; if (G) G.bersih($('exportModal')); var mb = $('menuBtn'); if (mb) mb.focus({ preventScroll: true }); }
    if (!G) return selesai();
    G.pudar($('exportModal'), false); G.jalan($('exportModal').querySelector('.modal-c'), G.balik(asalEx), false).then(selesai);
  }
  $('exportBtn').addEventListener('click', bukaExport);
  document.addEventListener('click', function (e) { if (e.target.closest && (e.target.closest('#exportModal [data-tutup]') || e.target === $('exportModal'))) tutup(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('exportModal').hidden) tutup(); });
  document.addEventListener('dash:periode', function () { $('expName').textContent = A() && A().S.data ? namaFile() : ''; });

  var libP = null;
  function muatLib() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (libP) return libP;
    libP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = LIB; s.onload = function () { ok(window.ExcelJS); }; s.onerror = function () { libP = null; no(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet lalu coba lagi.')); }; document.head.appendChild(s); });
    return libP;
  }

  $('expGo').addEventListener('click', function () {
    var dipilih = Array.prototype.filter.call($('expChk').querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
    if (!dipilih.length) { $('expErr').hidden = false; $('expErr').textContent = 'Pilih minimal satu isi laporan.'; return; }
    var b = this; b.disabled = true; b.textContent = 'Menyiapkan…'; $('expErr').hidden = true;
    buatBuku(dipilih).then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = namaFile();
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      tutup(); A().toast('Laporan Excel diunduh: ' + namaFile());
    }).catch(function (er) { $('expErr').hidden = false; $('expErr').textContent = (er && er.message) || String(er); })
      .then(function () { b.disabled = false; b.textContent = '⬇ Unduh Excel'; });
  });

  /* Dipakai juga untuk uji: menghasilkan isi file .xlsx (ArrayBuffer) */
  function buatBuku(dipilih) {
    return muatLib().then(function (EX) {
      var wb = new EX.Workbook(); wb.creator = 'Dashboard Kinerja UPDL Semarang'; wb.created = new Date();
      dipilih.forEach(function (k) { SHEET[k](wb); });
      return wb.xlsx.writeBuffer();
    });
  }
  window.DashExport = { buatBuku: buatBuku };

  /* ====================================================================== */
  /*  GAYA                                                                   */
  /* ====================================================================== */
  var C = { maroon: 'FF7B1E3A', ink: 'FF18233F', muted: 'FF7C8399', line: 'FFD8DBE4', soft: 'FFF6E9EE', zebra: 'FFF7F8FA', white: 'FFFFFFFF' };
  var ST = {   // [latar, teks]
    'Tercapai': ['FFE3F4EA', 'FF1F8A4C'], 'Patuh': ['FFE3F4EA', 'FF1F8A4C'], 'Selesai': ['FFE3F4EA', 'FF1F8A4C'], 'Rendah': ['FF8FD19E', 'FF18233F'],
    'Hampir tercapai': ['FFFBF0DC', 'FFB7791F'], 'Berjalan': ['FFFBF0DC', 'FFB7791F'], 'OFI': ['FFFBF0DC', 'FFB7791F'], 'Proses Tindak Lanjut': ['FFFBF0DC', 'FFB7791F'], 'Sudah Dilaporkan': ['FFE3F4EA', 'FF1F8A4C'], 'Moderat': ['FFB5EBEE', 'FF18233F'], 'Ada pengurang': ['FFFBE5E5', 'FFC53030'],
    'Di bawah target': ['FFFBE5E5', 'FFC53030'], 'Belum Dimulai': ['FFFBE5E5', 'FFC53030'], 'Tinggi': ['FFF5D66B', 'FF18233F'], 'Sangat Tinggi': ['FFF4A259', 'FF18233F'], 'Ekstrem': ['FFE5625E', 'FFFFFFFF'],
    'Belum ada data': ['FFEEF0F4', 'FF7C8399'], 'Tanpa target': ['FFEEF0F4', 'FF7C8399'], 'Belum diisi': ['FFEEF0F4', 'FF7C8399'],
    'Selesai tepat waktu': ['FFE3F4EA', 'FF1F8A4C'], 'Selesai terlambat': ['FFFBF0DC', 'FFB7791F'], 'Lewat target, belum selesai': ['FFFBE5E5', 'FFC53030'],
    'Tertunda': ['FFFBF0DC', 'FFB7791F'], 'Belum dimulai': ['FFEEF0F4', 'FF7C8399'], 'Dihentikan': ['FFEEF0F4', 'FF7C8399'], 'Belum lengkap': ['FFFBF0DC', 'FFB7791F'],
    'Struktural': ['FFEEF1F8', 'FF3A4F8C'], 'Fungsional': ['FFF3EFF8', 'FF6B5B95']
  };
  var FONT = 'Arial', tipis = { style: 'thin', color: { argb: C.line } }, KOTAK = { top: tipis, left: tipis, bottom: tipis, right: tipis };
  function isi(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } }; }
  function status(p) { return p === null || p === undefined || !isFinite(p) ? 'Belum ada data' : p >= 0.9999 ? 'Tercapai' : p >= 0.95 ? 'Hampir tercapai' : 'Di bawah target'; }
  function per() { var S = A().S; return { y: S.tahun, m: S.bulan, Bn: D.BULAN[S.bulan - 1], label: A().namaBulan(S.bulan) + ' ' + S.tahun }; }
  function subjudul() {
    var p = per(), t = new Date();
    return 'Periode ' + p.label + ' (kumulatif Januari s.d. ' + A().namaBulan(p.m) + ') · diunduh ' + t.toLocaleDateString('id-ID') + ' ' + t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' · sumber: Konman, Rendiklat, MLI Probis, Profil Risiko, Data Dashboard';
  }
  function lembar(wb, nama, lebar, opsi) {
    opsi = opsi || {};
    var ws = wb.addWorksheet(nama, {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: opsi.tegak ? 'portrait' : 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 } },
      headerFooter: { oddFooter: '&L&8Dashboard Kinerja UPDL Semarang · ' + per().label + '&R&8Hal &P dari &N' }
    });
    lebar.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    var n = lebar.length;
    function pita(r, teks, font, fl, h) {
      ws.mergeCells(r, 1, r, n); var c = ws.getCell(r, 1); c.value = teks; c.font = font; c.alignment = { vertical: 'middle', indent: 1 };
      if (fl) for (var i = 1; i <= n; i++) ws.getCell(r, i).fill = isi(fl);
      if (h) ws.getRow(r).height = h;
    }
    pita(1, 'DASHBOARD KINERJA UPDL SEMARANG', { name: FONT, size: 9, bold: true, color: { argb: C.white } }, C.maroon, 18);
    pita(2, opsi.judul || nama, { name: FONT, size: 16, bold: true, color: { argb: C.ink } }, null, 26);
    pita(3, subjudul(), { name: FONT, size: 9, color: { argb: C.muted } });
    ws._r = 5; ws._n = n;
    return ws;
  }
  function judulKolom(ws, cols) {
    var r = ws._r++, row = ws.getRow(r);
    cols.forEach(function (h, i) { var c = row.getCell(i + 1); c.value = h; c.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } }; c.fill = isi(C.ink); c.border = KOTAK; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
    row.height = 30; return r;
  }
  function seksi(ws, teks) {
    var r = ws._r++; ws.mergeCells(r, 1, r, ws._n);
    var c = ws.getCell(r, 1); c.value = teks.toUpperCase(); c.font = { name: FONT, size: 10, bold: true, color: { argb: C.maroon } }; c.alignment = { vertical: 'middle', indent: 1 };
    for (var i = 1; i <= ws._n; i++) { ws.getCell(r, i).fill = isi(C.soft); ws.getCell(r, i).border = KOTAK; }
    ws.getRow(r).height = 20; return r;
  }
  /* vals: nilai per kolom; fmt: {kolom: numFmt}; o: {tebal, zebra, bungkus:[kolom], tengah:[kolom], latar} */
  function baris(ws, vals, fmt, o) {
    o = o || {}; var r = ws._r++, row = ws.getRow(r);
    for (var i = 0; i < ws._n; i++) {
      var v = vals[i], c = row.getCell(i + 1);
      c.value = v === undefined || v === null || (typeof v === 'number' && !isFinite(v)) ? null : v;
      c.font = { name: FONT, size: 10, bold: !!o.tebal, color: { argb: C.ink } }; c.border = KOTAK;
      var angka = typeof v === 'number' || (v && typeof v === 'object' && v.formula);
      c.alignment = { vertical: 'top', wrapText: (o.bungkus || []).indexOf(i + 1) >= 0, horizontal: (o.tengah || []).indexOf(i + 1) >= 0 ? 'center' : angka ? 'right' : 'left' };
      if (fmt && fmt[i + 1]) c.numFmt = fmt[i + 1];
      if (o.latar) c.fill = isi(o.latar); else if (o.zebra) c.fill = isi(C.zebra);
    }
    return r;
  }
  function tandai(ws, r, kol, st) {
    var c = ws.getCell(r, kol), w = ST[st] || ST['Belum ada data'];
    c.value = st; c.fill = isi(w[0]); c.font = { name: FONT, size: 10, bold: true, color: { argb: w[1] } }; c.alignment = { horizontal: 'center', vertical: 'top' };
  }
  function catatan(ws, teks) { var r = ws._r++; var c = ws.getCell(r, 1); c.value = teks; c.font = { name: FONT, size: 9, color: { argb: C.muted } }; }
  function bekukan(ws, baris, kolom) { ws.views = [{ showGridLines: false, state: 'frozen', ySplit: baris, xSplit: kolom || 0 }]; }
  function rumus(f, hasil) { return { formula: f, result: hasil === null || hasil === undefined || !isFinite(hasil) ? undefined : hasil }; }
  function kolomHuruf(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function tglTeks(v) { var t = v instanceof Date ? v : D.tgl(v); return t ? ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + '/' + t.getFullYear() : String(v || ''); }
  function rekap(key, kolTgl) { var S = A().S; return D.rekapSampai(S.data[key], kolTgl, S.tahun, S.bulan); }

  /* ====================================================================== */
  /*  ANGKA RINGKASAN (dipakai tabel dan gambar)                             */
  /* ====================================================================== */
  function hitung() {
    var a = A(), S = a.S, p = per(), set = a.set(), Bn = p.Bn, ada = a.konmanAda(Bn);
    var r = D.hitungRendiklat(a.kelas(), S.tahun, S.bulan, set), H = a.hop(S.tahun, S.bulan);
    function kt(re) { var it = a.find(re); return it && ada ? D.num(it.target[Bn].v) : null; }
    var tot = ada ? a.totalSkor(Bn) : null;
    var Kp = a.ev('kepuasan'), In = a.ev('instruktur'), Ks = a.ev('ksa'), Cc = a.ev('cc'), Se = a.ev('sertifikat');
    var L1 = Kp && Kp.nilai !== null ? { nilai: Kp.nilai, n: Kp.pelatihan } : null, INS = In && In.nilai !== null ? { nilai: In.nilai, n: In.instruktur.length } : null;
    var KSA = Ks && Ks.nilai !== null ? { nilai: Ks.nilai, n: Ks.pel.length } : null, CC = Cc && Cc.nilai !== null ? { nilai: Cc.nilai, n: Cc.pel.length } : null;
    var skCC = set.skalaCC || 4;
    var L3 = D.rataTertimbang(rekap('l3', 'Tanggal Evaluasi'), 'Skor (0-100)'), L4 = D.rataTertimbang(rekap('l4', 'Tanggal Evaluasi'), 'Skor (0-100)');
    var RO = D.rataTertimbang(rekap('roti', 'Tanggal'), 'Nilai ROTI (%)');
    var sertP = Se && Se.total ? Se.pct * 100 : null;
    var M = S.data.maturity || [], mv = M.map(function (x) { var v = D.num(x[3]); return v !== null ? v : D.num(x[2]); });
    var mAvg = mv.length ? mv.reduce(function (s, v) { return s + (v || 0); }, 0) / mv.length : null;
    var itM = a.find(/Pengelolaan Proses Bisnis/i), mT = itM ? (ada ? D.num(itM.target[Bn].v) : null) : null;
    if (itM && mT === null) mT = D.num(S.bulan <= 6 ? itM.target1 : itM.target2);
    var TL = a.tlRows().filter(function (x) { return a.tlStatus(x) !== 'OFI'; }), tlS = TL.filter(function (x) { return a.tlStatus(x) === 'Selesai'; }).length;
    var kepRows = a.kepRows(), kepIsi = kepRows.filter(function (x) { return a.kepVal(x, Bn) !== null; }).length;
    function n2(o) { return o ? o.nilai : null; }
    return {
      bulanAda: ada,
      kelompok: [
        ['Kinerja Utama', [
          { n: 'Capaian Kinerja (skor Konman)', v: tot, t: ada ? 100 : null, sat: 'skor', f: '0.0', cat: ada ? 'Setelah pengurang kepatuhan ' + D.fmt(a.pengurang(Bn), 2) : 'Tidak ada data Konman bulan ini' },
          { n: 'Total Kelas Selesai', v: r.kelas, t: r.terjadwal || null, sat: 'kelas', f: '#,##0', cat: 'Target = kelas terjadwal s.d. bulan ini · +' + r.kelasBulan + ' kelas di ' + a.namaBulan(S.bulan) },
          { n: 'Total Peserta', v: r.peserta, t: null, sat: 'orang', f: '#,##0', cat: r.pakaiRencana ? r.pakaiRencana + ' kelas memakai rencana peserta (perkiraan)' : (r.tanpaPeserta ? r.tanpaPeserta + ' kelas tanpa angka peserta' : '') },
          { n: 'Hari Orang Pelatihan (HOP)', v: H.nilai, t: kt(/Tingkat Pelaksanaan Pembelajaran/i), sat: 'hari/pegawai', f: '0.000', cat: 'Pegawai ' + a.namaBulan(S.bulan) + ': ' + (H.pegawai === null ? 'belum diisi' : D.fmt(H.pegawai, 0)) + (H.disesuaikan ? ' · ada penyesuaian' : '') }
        ]],
        ['Evaluasi Pembelajaran', [
          { n: 'Kepuasan Peserta (L1)', v: n2(L1), t: set.targetL1, sat: 'skala 1–5', f: '0.00', cat: L1 ? D.fmt(Kp.responden, 0) + ' responden · ' + L1.n + ' pelatihan · rata-rata semua butir' : 'Belum diisi' },
          { n: 'Penilaian Instruktur (L1)', v: n2(INS), t: set.targetInstruktur, sat: 'skala 1–5', f: '0.00', cat: INS ? INS.n + ' instruktur · ' + D.fmt(In.penilaian, 0) + ' penilaian' : 'Belum diisi' },
          { n: 'Peningkatan KSA (L2 formatif)', v: n2(KSA), t: set.targetKSA, sat: 'skala 0–100', f: '0.0', cat: KSA ? D.fmt(Ks.peserta, 0) + ' peserta Hadir & Lulus · ' + KSA.n + ' pelatihan' : 'Belum diisi' },
          { n: 'Confidence & Commitment (L2 sumatif)', v: n2(CC), t: set.targetCC, sat: 'skala 1–' + skCC, f: '0.00', cat: CC ? 'Confidence ' + D.fmt(Cc.conf, 2) + ' · Commitment ' + D.fmt(Cc.comm, 2) + ' · ' + D.fmt(Cc.n, 0) + ' pengisian' : 'Belum diisi' },
          { n: 'Dampak Perilaku (L3)', v: n2(L3), t: kt(/Perubahan Perilaku/i), sat: 'skor 0–100', f: '0.00', cat: L3 ? L3.n + ' pengukuran' : 'Belum diisi' },
          { n: 'Dampak Kinerja (L4)', v: n2(L4), t: kt(/Pada Kinerja/i), sat: 'skor 0–100', f: '0.00', cat: L4 ? L4.n + ' pengukuran' : 'Belum diisi' },
          { n: 'ROTI', v: n2(RO), t: null, sat: '%', f: '0.0', cat: RO ? RO.n + ' pengukuran' : 'Belum diisi' },
          { n: 'Sertifikat Terbit (Finish TTE GM)', v: sertP, t: set.targetSertifikat, sat: '%', f: '0.0', cat: Se && Se.total ? D.fmt(Se.terbit, 0) + ' dari ' + D.fmt(Se.total, 0) + ' sertifikat · +' + D.fmt(Se.bulan, 0) + ' terbit di ' + a.namaBulan(S.bulan) : 'Belum ada data' }
        ]],
        ['Tata Kelola', [
          { n: 'Maturity Level Proses Bisnis', v: mAvg, t: mT, sat: 'skala 0–5', f: '0.00', cat: M.length + ' key element (sheet SMG, verifikasi)' },
          { n: 'Perbaikan Berkelanjutan selesai', v: TL.length ? tlS / TL.length * 100 : null, t: TL.length ? 100 : null, sat: '%', f: '0', cat: tlS + ' dari ' + TL.length + ' masukan yang perlu tindakan (Selesai + Sudah Dilaporkan; OFI tidak dihitung)' },
          { n: 'Total pengurang kepatuhan', v: ada || kepIsi ? a.pengurang(Bn) : null, t: null, sat: 'poin', f: '0.00', cat: kepIsi ? kepIsi + ' dari ' + kepRows.length + ' aspek terisi' : 'Belum diisi', kep: true }
        ]]
      ],
      r: r, H: H, L1: L1, INS: INS, KSA: KSA, CC: CC, skCC: skCC, L3: L3, L4: L4, RO: RO, sert: sertP, Se: Se, tot: tot, set: set, mAvg: mAvg, mT: mT
    };
  }

  /* ====================================================================== */
  /*  GAMBAR (kanvas, tema terang, 2x untuk cetak tajam)                      */
  /* ====================================================================== */
  var W = { ink: '#18233f', ink2: '#4a5470', ink3: '#7c8399', line: '#d8dbe4', track: '#e7e9ef', good: '#1f8a4c', warn: '#b7791f', bad: '#c53030', idle: '#8a90a3', bar: '#3a4f8c', accent: '#0077b6', sheet: '#ffffff' };
  var FN = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';
  function kanvas(w, h) { var c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; var g = c.getContext('2d'); g.scale(2, 2); g.fillStyle = W.sheet; g.fillRect(0, 0, w, h); g.textBaseline = 'alphabetic'; return { c: c, g: g, w: w, h: h }; }
  function warnaStatus(p) { return p === null || p === undefined || !isFinite(p) ? W.idle : p >= 0.9999 ? W.good : p >= 0.95 ? W.warn : W.bad; }
  function kotak(g, x, y, w, h) { g.strokeStyle = W.line; g.lineWidth = 1; var r = 8; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.stroke(); }
  function teks(g, t, x, y, size, warna, berat, rata, maxW) {
    g.font = (berat || 400) + ' ' + size + 'px ' + FN; g.fillStyle = warna; g.textAlign = rata || 'left';
    t = String(t); if (maxW) while (g.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -2) + '…';
    g.fillText(t, x, y);
  }
  function cincin(g, cx, cy, R, f, warna, label) {
    g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = W.track; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    if (f !== null && isFinite(f) && f > 0) { g.strokeStyle = warna; g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f)); g.stroke(); }
    teks(g, label, cx, cy + 4.5, 12, W.ink, 700, 'center');
  }
  function busur(g, cx, cy, R, f, warna, label) {
    g.lineWidth = 11; g.lineCap = 'round'; g.strokeStyle = W.track; g.beginPath(); g.arc(cx, cy, R, Math.PI, 0); g.stroke();
    if (f !== null && isFinite(f) && f > 0) { g.strokeStyle = warna; g.beginPath(); g.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * Math.min(1, f)); g.stroke(); }
    var t = Math.PI + Math.PI * (1 / 1.2); g.strokeStyle = W.ink; g.lineWidth = 2; g.lineCap = 'butt'; g.beginPath(); g.moveTo(cx + (R - 9) * Math.cos(t), cy + (R - 9) * Math.sin(t)); g.lineTo(cx + (R + 9) * Math.cos(t), cy + (R + 9) * Math.sin(t)); g.stroke();
    teks(g, label, cx, cy - 2, 17, W.ink, 700, 'center');
  }
  function pctT(f) { return f === null || f === undefined || !isFinite(f) ? '–' : D.fmt(f * 100, 0) + '%'; }
  function ubin(g, x, y, w, h, o) {
    kotak(g, x, y, w, h);
    teks(g, o.judul, x + 12, y + 20, 12, W.ink2, 600, 'left', w - 24);
    teks(g, o.sub, x + 12, y + 34, 9.5, W.ink3, 400, 'left', w - 24);
    if (o.busur) { busur(g, x + w / 2, y + h - 30, 42, o.f === null ? null : o.f / 1.2, warnaStatus(o.f), o.nilai); }
    else { teks(g, o.nilai, x + 12, y + h / 2 + 18, o.kecil ? 19 : 24, W.ink, 600, 'left', w - 90); cincin(g, x + w - 38, y + h / 2 + 6, 24, o.f, o.warna || warnaStatus(o.f), pctT(o.f)); }
    teks(g, o.kaki, x + 12, y + h - 10, 10, o.warnaKaki || warnaStatus(o.f), 600, 'left', w - 24);
  }
  function gambarKartu(h) {
    var Wd = 1080, k = kanvas(Wd, 316), g = k.g, p = per(), S = A().S;
    teks(g, 'Ringkasan ' + p.label, 0, 18, 15, W.ink, 700);
    var gap = 10, w5 = (Wd - gap * 4) / 5, y1 = 30, h1 = 130;
    var r = h.r, H = h.H, tH = h.kelompok[0][1][3].t, pK = r.terjadwal ? r.kelas / r.terjadwal : null, pP = r.rencanaPeserta ? r.peserta / r.rencanaPeserta : null, hc = H.nilai !== null && tH ? H.nilai / tH : null;
    var f1 = h.L1 ? (h.set.targetL1 ? h.L1.nilai / h.set.targetL1 : h.L1.nilai / 5) : null;
    var tv = h.tot === null ? null : h.tot / 100;
    var U = [
      { judul: 'Capaian Kinerja', sub: 'Skor Konman ' + p.label, busur: true, f: tv, nilai: tv === null ? '–' : D.fmt(tv * 100, 1) + '%', kaki: tv === null ? 'Belum ada data' : status(tv) },
      { judul: 'Total Peserta', sub: 'Rendiklat s.d. ' + A().namaBulan(p.m), nilai: D.fmt(r.peserta, 0), f: pP, warna: r.pakaiRencana ? W.warn : null, kaki: r.pakaiRencana ? r.pakaiRencana + ' kelas memakai rencana' : pctT(pP) + ' dari rencana', warnaKaki: r.pakaiRencana ? W.warn : null },
      { judul: 'Total Kelas', sub: 'Status Selesai s.d. ' + A().namaBulan(p.m), nilai: D.fmt(r.kelas, 0), f: pK, kaki: pctT(pK) + ' dari ' + D.fmt(r.terjadwal, 0) + ' terjadwal' },
      { judul: 'Hari Orang Pelatihan', sub: 'Rendiklat ÷ jumlah pegawai', nilai: H.nilai === null ? '–' : D.fmt(H.nilai, 3), f: hc, kaki: tH ? pctT(hc) + ' dari target ' + D.fmt(tH, 3) : 'Target Konman belum ada' },
      { judul: 'Kepuasan Peserta', sub: 'EL1 · rata-rata semua butir', nilai: h.L1 ? D.fmt(h.L1.nilai, 2) + ' / 5' : '–', f: f1, kecil: true, kaki: h.L1 ? h.L1.n + ' pelatihan' + (h.INS ? ' · instruktur ' + D.fmt(h.INS.nilai, 2) : '') : 'Belum ada data', warnaKaki: h.L1 ? null : W.idle }
    ];
    U.forEach(function (o, i) { ubin(g, i * (w5 + gap), y1, w5, h1, o); });
    var w6 = (Wd - gap * 5) / 6, y2 = y1 + h1 + gap, h2 = 116;
    function ev(judul, sub, o, target, skala, fmtV) {
      var f = !o ? null : target ? o / target : o / skala;
      return { judul: judul, sub: sub, nilai: o === null || o === undefined ? '–' : fmtV(o), f: f, kecil: true, warna: !o ? W.idle : target ? warnaStatus(f) : (f >= 0.8 ? W.good : f >= 0.6 ? W.warn : W.bad), kaki: o === null || o === undefined ? 'Belum diisi' : target ? (f >= 0.9999 ? 'Mencapai target' : 'Target ' + D.fmt(target, 2)) : 'Tanpa target', warnaKaki: o === null || o === undefined || !target ? W.idle : warnaStatus(f) };
    }
    var E = h.kelompok[1][1];
    [ev('Peningkatan KSA', 'L2 · Hadir & Lulus', h.KSA && h.KSA.nilai, E[2].t, 100, function (v) { return D.fmt(v, 1); }),
     ev('Dampak Perilaku', 'L3', h.L3 && h.L3.nilai, E[4].t, 100, function (v) { return D.fmt(v, 2); }),
     ev('ROTI', 'Return on Training Inv.', h.RO && h.RO.nilai, null, 100, function (v) { return D.fmt(v, 1) + '%'; }),
     ev('Confidence & Commit.', 'L2 sumatif · rata-rata', h.CC && h.CC.nilai, E[3].t, h.skCC, function (v) { return D.fmt(v, 2); }),
     ev('Dampak Kinerja', 'L4', h.L4 && h.L4.nilai, E[5].t, 100, function (v) { return D.fmt(v, 2); }),
     ev('Sertifikat Terbit', 'Finish TTE GM', h.sert, E[7].t, 100, function (v) { return D.fmt(v, 1) + '%'; })
    ].forEach(function (o, i) { ubin(g, i * (w6 + gap), y2, w6, h2, o); });
    void S;
    return k;
  }
  function gambarGrafik() {
    var a = A(), K = a.K(), Wd = 1080, Ht = 290, k = kanvas(Wd, Ht), g = k.g, p = per();
    teks(g, 'Capaian Kinerja per Bulan ' + p.y, 0, 18, 15, W.ink, 700);
    teks(g, 'Total skor Kontrak Manajemen setelah pengurang kepatuhan · garis putus-putus = target 100', 0, 36, 10.5, W.ink3, 400);
    var bulan = D.BULAN, vals = bulan.map(function (Bn) { return K.months.indexOf(Bn) >= 0 ? a.totalSkor(Bn) : null; });
    var maxV = Math.ceil(Math.max.apply(null, [120].concat(vals.filter(function (v) { return v !== null; }))) / 20) * 20;
    var L = 36, T = 56, B = Ht - 28, iw = Wd - L - 10, ih = B - T, step = iw / 12, bw = Math.min(46, step * 0.56);
    function y(v) { return B - v / maxV * ih; }
    g.textAlign = 'right';
    for (var v = 0; v <= maxV; v += 20) { g.strokeStyle = W.line; g.lineWidth = 1; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(Wd - 10, y(v)); g.stroke(); teks(g, v, L - 6, y(v) + 3.5, 10, W.ink3, 400, 'right'); }
    vals.forEach(function (v, i) {
      var cx = L + step * i + step / 2, sel = i === p.m - 1;
      if (v === null) { g.setLineDash([3, 3]); g.strokeStyle = '#c9cfe0'; g.strokeRect(cx - bw / 2, y(maxV * 0.3), bw, B - y(maxV * 0.3)); g.setLineDash([]); }
      else { var top = y(Math.max(0, v)); g.fillStyle = sel ? W.accent : W.bar; g.beginPath(); g.moveTo(cx - bw / 2, B); g.lineTo(cx - bw / 2, top + 4); g.quadraticCurveTo(cx - bw / 2, top, cx - bw / 2 + 4, top); g.lineTo(cx + bw / 2 - 4, top); g.quadraticCurveTo(cx + bw / 2, top, cx + bw / 2, top + 4); g.lineTo(cx + bw / 2, B); g.fill(); teks(g, D.fmt(v, 1), cx, top - 5, 10.5, W.ink2, 600, 'center'); }
      teks(g, D.BLN3[i], cx, Ht - 10, 10.5, sel ? W.ink : W.ink3, sel ? 700 : 400, 'center');
    });
    g.setLineDash([6, 4]); g.strokeStyle = W.good; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, y(100)); g.lineTo(Wd - 10, y(100)); g.stroke(); g.setLineDash([]);
    teks(g, 'Target 100', Wd - 12, y(100) - 5, 10, W.good, 600, 'right');
    return k;
  }
  function pasangGambar(wb, ws, k) {
    var id = wb.addImage({ base64: k.c.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), extension: 'png' });
    var r0 = ws._r, tinggi = 20, baris = Math.ceil(k.h / tinggi) + 1;
    for (var i = 0; i < baris; i++) ws.getRow(r0 + i).height = 15;
    ws.addImage(id, { tl: { col: 0.15, row: r0 - 1 + 0.2 }, ext: { width: k.w, height: k.h } });
    ws._r = r0 + baris;
  }

  /* ====================================================================== */
  /*  SHEET                                                                   */
  /* ====================================================================== */
  var SHEET = {
    ringkasan: function (wb) {
      var ws = lembar(wb, 'Ringkasan', [40, 13, 13, 11, 17, 14, 48], { judul: 'Ringkasan Kinerja' }), h = hitung();
      seksi(ws, 'Tampilan dashboard · ' + per().label);
      pasangGambar(wb, ws, gambarKartu(h)); pasangGambar(wb, ws, gambarGrafik());
      ws._r++;
      seksi(ws, 'Tabel ukuran utama');
      var hr = judulKolom(ws, ['Ukuran', 'Realisasi', 'Target', 'Capaian', 'Status', 'Satuan', 'Catatan']);
      h.kelompok.forEach(function (kel) {
        seksi(ws, kel[0]);
        kel[1].forEach(function (u) {
          var r = ws._r, adaT = u.t !== null && u.t !== undefined && u.t !== 0 && u.v !== null;
          baris(ws, [u.n, u.v, u.t, adaT ? rumus('B' + r + '/C' + r, u.v / u.t) : '—', null, u.sat, u.cat], { 2: u.f, 3: u.f, 4: '0.0%' }, { bungkus: [7] });
          ws.getCell(r, 4).font = { name: FONT, size: 10, bold: true, color: { argb: C.ink } };
          if (!adaT) ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'top' };
          tandai(ws, r, 5, u.kep ? (u.v === null ? 'Belum diisi' : u.v === 0 ? 'Patuh' : 'Ada pengurang') : u.v === null ? 'Belum ada data' : adaT ? status(u.v / u.t) : 'Tanpa target');
        });
      });
      ws._r++;
      catatan(ws, 'Status: Tercapai ≥ 100% · Hampir tercapai 95–99% · Di bawah target < 95% dari target. Target evaluasi diambil dari Konman atau tab Pengaturan.');
      ws.pageSetup.printTitlesRow = hr + ':' + hr;
    },
    indikator: function (wb) {
      var a = A(), Bn = per().Bn, ws = lembar(wb, 'Indikator Kinerja', [6, 46, 10, 15, 8, 12, 12, 12, 9, 17, 50], { judul: 'Indikator Kinerja (Kontrak Manajemen)' });
      var hr = judulKolom(ws, ['No', 'Indikator', 'PIC', 'Satuan', 'Bobot', 'Target', 'Realisasi', 'Pencapaian', 'Skor', 'Status', 'Keterangan']);
      if (!a.konmanAda(Bn)) { catatan(ws, 'Tidak ada data Konman untuk ' + per().label + '.'); return; }
      function sel(o) {   // nilai + format dari Konman (persen disimpan 1 = 100%)
        var d = String(o.d || '').trim(), v = o.v;
        if (v === '' || v === null || v === undefined) return [null, null];
        if (/%$/.test(d) && typeof v === 'number') return [v, '0%'];
        if (typeof v === 'number') return [v, '#,##0.###'];
        return [d || String(v), null];
      }
      var awal = ws._r, i = 0, sk = 0;
      a.K().items.forEach(function (it) {
        if (it.isGroup || it.pengurang) return;
        var has = D.hasData(it, Bn), cap = has ? D.capaianItem(it, Bn) : null, t = sel(it.target[Bn]), rl = has ? sel(it.real[Bn]) : [null, null];
        if (rl[1] === '0%' && typeof t[0] === 'number' && t[0] > 1.5) t = [t[0] / 100, '0%'];   // target persen ditulis 100 di Konman, realisasinya 1 = 100%
        var f = { 5: '#,##0.##', 8: '0%', 9: '0.00' }; if (t[1]) f[6] = t[1]; if (rl[1]) f[7] = rl[1];
        var r = baris(ws, [a.labelNo(it), it.nama, it.pic, it.satuan, D.bobotFor(it, Bn), t[0], rl[0], cap, it.skor[Bn], null, String(it.ket[Bn] || '').replace(/\s*\(input web:[^)]*\)/g, '').trim()], f, { bungkus: [2, 4, 11], zebra: i++ % 2 === 1 });
        tandai(ws, r, 10, has ? status(cap) : 'Belum diisi');
        if (it.skor[Bn] !== null) sk += it.skor[Bn];
      });
      var akhir = ws._r - 1, peng = a.pengurang(Bn);
      var r1 = baris(ws, ['', 'Total skor', '', '', '', '', '', '', rumus('SUM(I' + awal + ':I' + akhir + ')', sk), '', ''], { 9: '0.00' }, { tebal: true });
      var r2 = baris(ws, ['', 'Pengurang kepatuhan', '', '', '', '', '', '', peng, '', 'Rincian di sheet Kepatuhan & Perbaikan'], { 9: '0.00' });
      baris(ws, ['', 'CAPAIAN KINERJA', '', '', '', '', '', '', rumus('I' + r1 + '-I' + r2, sk - peng), '', ''], { 9: '0.00' }, { tebal: true, latar: C.soft });
      bekukan(ws, hr, 2); ws.pageSetup.printTitlesRow = hr + ':' + hr;
    },
    tren: function (wb) {
      var a = A(), S = a.S, m = S.bulan, ws = lembar(wb, 'Tren Bulanan', [34, 14].concat(new Array(m).fill(11)), { judul: 'Tren Bulanan ' + S.tahun });
      var hr = judulKolom(ws, ['Ukuran', 'Satuan'].concat(D.BLN3.slice(0, m)));
      var kum = [], hopv = [];
      for (var i = 1; i <= m; i++) { kum.push(D.hitungRendiklat(a.kelas(), S.tahun, i, a.set())); hopv.push(a.hop(S.tahun, i)); }
      function f(fm) { var o = {}; for (var j = 3; j <= m + 2; j++) o[j] = fm; return o; }
      var rows = [
        ['Capaian Kinerja', 'skor', D.BULAN.slice(0, m).map(function (Bn) { return a.konmanAda(Bn) ? a.totalSkor(Bn) : null; }), '0.0'],
        ['Kelas selesai (bulan itu)', 'kelas', kum.map(function (x, j) { return x.kelas - (j ? kum[j - 1].kelas : 0); }), '#,##0'],
        ['Kelas selesai (kumulatif)', 'kelas', kum.map(function (x) { return x.kelas; }), '#,##0'],
        ['Peserta (kumulatif)', 'orang', kum.map(function (x) { return x.peserta; }), '#,##0'],
        ['Orang-hari (kumulatif)', 'orang-hari', hopv.map(function (x) { return x.orangHari; }), '#,##0'],
        ['Jumlah pegawai', 'orang', hopv.map(function (x) { return x.pegawai; }), '#,##0'],
        ['HOP', 'hari/pegawai', hopv.map(function (x) { return x.nilai; }), '0.000'],
        ['Pengurang kepatuhan', 'poin', D.BULAN.slice(0, m).map(function (Bn) { return a.pengurang(Bn); }), '0.00']
      ];
      rows.forEach(function (x, j) { baris(ws, [x[0], x[1]].concat(x[2]), f(x[3]), { zebra: j % 2 === 1 }); });
      ws._r++; catatan(ws, 'Sel kosong = data belum diisi. HOP = orang-hari kumulatif (termasuk penyesuaian) ÷ jumlah pegawai bulan itu.');
      bekukan(ws, hr, 2);
    },
    evaluasi: function (wb) {
      var a = A(), ws = lembar(wb, 'Evaluasi Pembelajaran', [12, 50, 14, 14, 14, 36], { judul: 'Evaluasi Pembelajaran', tegak: true });
      function kosong() { baris(ws, ['', 'Belum ada data s.d. ' + per().label, '', '', '', ''], {}, {}); ws._r++; }
      function total(vals, fm) { baris(ws, vals, fm, { tebal: true, latar: C.soft }); ws._r++; }
      function urut(L) { return L.slice().sort(function (x, y) { return x.tg < y.tg ? -1 : x.tg > y.tg ? 1 : 0; }); }

      var Kp = a.ev('kepuasan');
      seksi(ws, 'Level 1 · Kepuasan Peserta (rata-rata semua butir, kolom -Val tidak dihitung)'); judulKolom(ws, ['Selesai', 'Judul Pelatihan', 'Responden', 'Nilai (1–5)', '', '']);
      if (!Kp || !Kp.pel.length) kosong(); else {
        urut(Kp.pel).forEach(function (x, j) { baris(ws, [tglTeks(x.tg), x.judul, x.n, x.nilai, '', ''], { 3: '#,##0', 4: '0.00' }, { bungkus: [2], zebra: j % 2 === 1 }); });
        total(['', 'Rata-rata semua jawaban', Kp.responden, Kp.nilai, '', ''], { 3: '#,##0', 4: '0.00' });
        seksi(ws, 'Kepuasan per aspek'); judulKolom(ws, ['', 'Aspek', 'Jawaban', 'Nilai (1–5)', '', '']);
        Kp.aspek.forEach(function (x, j) { baris(ws, ['', x.nama, x.n, x.nilai, '', ''], { 3: '#,##0', 4: '0.00' }, { zebra: j % 2 === 1 }); });
        ws._r++;
      }

      var In = a.ev('instruktur');
      seksi(ws, 'Level 1 · Penilaian Instruktur (rata-rata semua butir)'); judulKolom(ws, ['', 'Instruktur', 'Pelatihan', 'Penilaian', 'Nilai (1–5)', 'Tipe']);
      if (!In || !In.instruktur.length) kosong(); else {
        In.instruktur.slice().sort(function (x, y) { return (y.nilai || 0) - (x.nilai || 0); }).forEach(function (x, j) {
          baris(ws, [j + 1, x.nama, x.pel.length, x.n, x.nilai, x.tipe], { 3: '#,##0', 4: '#,##0', 5: '0.00' }, { bungkus: [2, 6], zebra: j % 2 === 1, tengah: [1] });
        });
        total(['', 'Rata-rata ' + In.instruktur.length + ' instruktur', '', In.penilaian, In.nilai, ''], { 4: '#,##0', 5: '0.00' });
      }

      var Ks = a.ev('ksa');
      seksi(ws, 'Level 2 · Peningkatan KSA (hanya Hadir & Lulus)'); judulKolom(ws, ['Selesai', 'Judul Pelatihan', 'Hadir & Lulus', 'Semua peserta', 'Rata-rata', '']);
      if (!Ks || !Ks.pel.length) kosong(); else {
        urut(Ks.pel).forEach(function (x, j) { baris(ws, [tglTeks(x.tg), x.judul, x.n, x.semua, x.nilai, ''], { 3: '#,##0', 4: '#,##0', 5: '0.0' }, { bungkus: [2], zebra: j % 2 === 1 }); });
        total(['', 'Rata-rata (per peserta)', Ks.peserta, Ks.semua, Ks.nilai, ''], { 3: '#,##0', 4: '#,##0', 5: '0.0' });
      }

      var Cc = a.ev('cc');
      seksi(ws, 'Level 2 · Confidence & Commitment (skala 1–' + (a.set().skalaCC || 4) + ')'); judulKolom(ws, ['Selesai', 'Judul Pelatihan', 'Pengisian', 'Confidence', 'Commitment', '']);
      if (!Cc || !Cc.pel.length) kosong(); else {
        urut(Cc.pel).forEach(function (x, j) { baris(ws, [tglTeks(x.tg), x.judul, x.n, x.conf, x.comm, ''], { 3: '#,##0', 4: '0.00', 5: '0.00' }, { bungkus: [2], zebra: j % 2 === 1 }); });
        total(['', 'Rata-rata (per pengisian)', Cc.n, Cc.conf, Cc.comm, ''], { 3: '#,##0', 4: '0.00', 5: '0.00' });
      }

      [['Level 3 · Dampak Perilaku', 'l3', 'Tanggal Evaluasi', 'Judul Pelatihan', 'Skor (0-100)', 'Skor (0–100)', '0.00'],
       ['Level 4 · Dampak Kinerja', 'l4', 'Tanggal Evaluasi', 'Judul Pelatihan', 'Skor (0-100)', 'Skor (0–100)', '0.00'],
       ['ROTI', 'roti', 'Tanggal', 'Judul / Program', 'Nilai ROTI (%)', 'ROTI (%)', '0.0']].forEach(function (d) {
        seksi(ws, d[0]); judulKolom(ws, ['Tanggal', d[3] === 'Judul / Program' ? 'Program' : 'Judul Pelatihan', 'Unit', d[5], '', 'Keterangan']);
        var rows = rekap(d[1], d[2]), s0 = ws._r;
        if (!rows.length) return kosong();
        rows.forEach(function (x, j) { baris(ws, [tglTeks(x._t || x[d[2]]), x[d[3]] || '', x['Unit'] || '', D.num(x[d[4]]), '', String(x['Keterangan'] || '').replace(/\s*\(input web:[^)]*\)/g, '').trim()], { 4: d[6] }, { bungkus: [2, 6], zebra: j % 2 === 1 }); });
        total(['', 'Rata-rata', '', rumus('IFERROR(AVERAGE(D' + s0 + ':D' + (ws._r - 1) + '),"")'), '', ''], { 4: d[6] });
      });

      var Se = a.ev('sertifikat');
      seksi(ws, 'Sertifikat (terbit = Finish TTE GM, menurut Tgl.Terbit)'); judulKolom(ws, ['', 'Status', 'Jumlah', '% dari total', '', '']);
      if (!Se || !Se.total) kosong(); else {
        var s1 = ws._r;
        Se.status.forEach(function (st, j) { var r = baris(ws, ['', st, Se.cnt[j], null, '', ''], { 3: '#,##0', 4: '0.0%' }, { zebra: j % 2 === 1 }); ws.getCell(r, 4).value = rumus('IF($C$' + (s1 + Se.status.length) + '=0,"",C' + r + '/$C$' + (s1 + Se.status.length) + ')', Se.cnt[j] / Se.total); });
        total(['', 'Total sertifikat', rumus('SUM(C' + s1 + ':C' + (ws._r - 1) + ')', Se.total), '', '', ''], { 3: '#,##0' });
        catatan(ws, 'Terbit s.d. ' + per().label + ': ' + D.fmt(Se.terbit, 0) + ' · terbit di bulan ' + A().namaBulan(per().m) + ' saja: ' + D.fmt(Se.bulan, 0) + ' · ' + D.fmt(Se.pct * 100, 1) + '% terbit');
      }
    },
    kepatuhan: function (wb) {
      var a = A(), Bn = per().Bn, ws = lembar(wb, 'Kepatuhan & Perbaikan', [6, 50, 16, 14, 16, 16, 42], { judul: 'Kepatuhan & Perbaikan Berkelanjutan' });
      seksi(ws, 'Kepatuhan · ' + per().label); judulKolom(ws, ['No', 'Aspek Kepatuhan', 'Maks Pengurang', 'Nilai', 'Status', '', 'Keterangan']);
      var s = ws._r;
      a.kepRows().forEach(function (x, j) {
        var v = a.kepVal(x, Bn);
        var r = baris(ws, [j + 1, x['Aspek Kepatuhan'], D.num(x['Maks Pengurang']), v, null, '', String(x['Keterangan'] || '')], { 3: '0', 4: '0.00' }, { bungkus: [2, 7], zebra: j % 2 === 1 });
        tandai(ws, r, 5, v === null ? 'Belum diisi' : v === 0 ? 'Patuh' : 'Ada pengurang');
      });
      if (ws._r > s) baris(ws, ['', 'Total pengurang', rumus('SUM(C' + s + ':C' + (ws._r - 1) + ')'), rumus('SUM(D' + s + ':D' + (ws._r - 1) + ')', a.pengurang(Bn)), '', '', ''], { 3: '0', 4: '0.00' }, { tebal: true, latar: C.soft });
      ws._r++;
      seksi(ws, 'Perbaikan Berkelanjutan'); judulKolom(ws, ['No', 'Komentar / Temuan', 'Pelatihan', 'PIC', 'Status', 'Sumber', 'Keterangan']);
      var semua = a.tlRows(), TL = semua.filter(function (x) { return a.tlStatus(x) !== 'OFI'; }), c = { 'Selesai': 0, 'Proses': 0, 'Belum Dimulai': 0 };
      TL.forEach(function (x, j) {
        c[a.tlStatus(x)]++;
        var r = baris(ws, [j + 1, x['Komentar'], x['Judul Diklat'], x['PIC'], null, x['Sumber'], String(x['Keterangan'] || '')], {}, { bungkus: [2, 3, 6, 7], zebra: j % 2 === 1, tengah: [1] });
        tandai(ws, r, 5, a.tlAsli(x));
      });
      if (!TL.length) baris(ws, ['', 'Belum ada komentar atau temuan', '', '', '', '', ''], {});
      ws._r++;
      catatan(ws, 'Hanya masukan yang perlu tindakan (' + TL.length + ' dari ' + semua.length + '; OFI tidak ditampilkan). Selesai (Selesai + Sudah Dilaporkan) ' + c['Selesai'] + ' · Proses ' + c['Proses'] + ' · Belum dimulai ' + c['Belum Dimulai'] + (TL.length ? ' · ' + D.fmt(c['Selesai'] / TL.length * 100, 0) + '% tuntas' : ''));
    },
    maturity: function (wb) {
      var a = A(), h = hitung(), ws = lembar(wb, 'Maturity & Risiko', [8, 52, 18, 18, 18, 17], { judul: 'Maturity Level & Peta Risiko' });
      seksi(ws, 'Maturity Level Proses Bisnis' + (h.mT !== null ? ' · target ' + D.fmt(h.mT, 2) : ''));
      judulKolom(ws, ['No', 'Key Element', 'Level SA', 'Level Verifikasi', 'Target', 'Status']);
      var s = ws._r, M = a.S.data.maturity || [];
      M.forEach(function (x, j) {
        var sa = D.num(x[2]), ve = D.num(x[3]), v = ve !== null ? ve : sa;
        var r = baris(ws, [x[0], x[1], sa, ve, h.mT, null], { 3: '0.00', 4: '0.00', 5: '0.00' }, { zebra: j % 2 === 1, tengah: [1] });
        tandai(ws, r, 6, h.mT === null || v === null ? 'Tanpa target' : v >= h.mT ? 'Tercapai' : 'Di bawah target');
      });
      if (M.length) baris(ws, ['', 'Rata-rata ' + M.length + ' key element', rumus('AVERAGE(C' + s + ':C' + (ws._r - 1) + ')'), rumus('AVERAGE(D' + s + ':D' + (ws._r - 1) + ')', h.mAvg), h.mT, ''], { 3: '0.00', 4: '0.00', 5: '0.00' }, { tebal: true, latar: C.soft });
      ws._r++;
      var Rk = a.S.data.risiko || {}, R = D.rows(Rk.rows || []);
      seksi(ws, 'Peta Risiko' + (Rk.tampilan ? ' · ' + Rk.tampilan : ''));
      judulKolom(ws, ['No', 'Risiko', 'Inheren', 'Residual', 'Target', 'Level Target']);
      R.forEach(function (x, j) {
        var m = String(x['Target'] || '').match(/^(.*?)\s*\(/);
        var r = baris(ws, [D.num(x['No']), x['Deskripsi Risiko'], x['Inheren'], x['Residual'], x['Target'], null], {}, { bungkus: [2], zebra: j % 2 === 1, tengah: [1, 3, 4, 5] });
        tandai(ws, r, 6, m ? m[1].trim() : 'Belum ada data');
      });
      if (!R.length) catatan(ws, 'File Profil Risiko belum terbaca.');
    },
    idp: function (wb) {
      var a = A(), L = a.idpRows(), J = a.JALUR, jn = a.judulNama;
      var ws = lembar(wb, 'IDP', [30, 24, 11, 32, 32, 32, 15], { judul: 'Pengembangan Pegawai (IDP)' });
      catatan(ws, 'Selesai = semua jalur yang direncanakan sudah ada realisasinya. Data IDP tidak mengikuti filter bulan.'); ws._r++;
      seksi(ws, 'Ringkasan per jalur');
      var h1 = judulKolom(ws, ['Jalur', 'Pegawai direncanakan', 'Sudah realisasi', 'Persen', '', '', '']);
      J.forEach(function (x, i) {
        var ren = L.filter(function (p) { return p.j[i].ren; }).length, done = L.filter(function (p) { return p.j[i].ren && p.j[i].real; }).length, r = ws._r;
        baris(ws, [x[0], ren, done, rumus('IF(B' + r + '=0,"",C' + r + '/B' + r + ')', ren ? done / ren : null), '', '', ''], { 4: '0%' }, { zebra: i % 2 === 1 });
      });
      void h1; ws._r++;
      seksi(ws, 'Per pegawai · ' + L.length + ' pegawai · ' + L.filter(function (p) { return p.selesai; }).length + ' selesai');
      var hr = judulKolom(ws, ['Pegawai', 'Unit / Bidang', 'Kelompok', J[0][0], J[1][0], J[2][0], 'Status']);
      L.slice().sort(function (x, y) { return String(x.r[0]).localeCompare(String(y.r[0]), 'id'); }).forEach(function (p, j) {
        var sel = J.map(function (x, i) { var q = p.j[i]; if (!q.ren) return '–'; return q.real ? 'Sudah: ' + p.r[x[2]] + (q.tg ? ' (' + tglTeks(q.tg) + ')' : '') : 'Belum · rencana: ' + p.r[x[1]]; });
        var r = baris(ws, [jn(p.r[0]), p.r[1] || p.r[2], p.kel].concat(sel).concat([null]), {}, { bungkus: [4, 5, 6], zebra: j % 2 === 1, tengah: [3] });
        tandai(ws, r, 7, !p.ada ? 'Belum diisi' : p.selesai ? 'Selesai' : 'Belum lengkap');
      });
      if (!L.length) catatan(ws, 'Tab Data - IDP masih kosong.');
      bekukan(ws, hr, 1); ws.pageSetup.printTitlesRow = hr + ':' + hr;
    },
    inovasi: function (wb) {
      var a = A(), L = a.inoRows(), T = a.TAHAP;
      var ws = lembar(wb, 'Inovasi', [40, 11, 20, 20, 22, 10, 12, 22, 17], { judul: 'Pengembangan Inovasi · ' + a.S.tahun });
      catatan(ws, 'Kategori Kinerja = dihitung untuk Konman no. 9; UPDL = inovasi internal. Persen Konman no. 9 tetap diambil dari tab Konman.'); ws._r++;
      var hr = judulKolom(ws, ['Judul Inovasi', 'Kategori', 'Bidang / PIC', 'Ketua Tim', 'Tahap', 'Progres', 'Target Selesai', 'Status', 'Nilai Manfaat (Rp/tahun)']);
      L.forEach(function (x, j) {
        var r0 = x.r, pr = D.num(r0['Progres (%)']);
        var r = baris(ws, [r0['Judul Inovasi'], x.kinerja ? 'Kinerja' : 'UPDL', r0['Bidang / PIC'], r0['Ketua Tim'], x.tahap ? T[x.tahap - 1] : '–', pr === null ? null : pr / 100, x.tgt ? tglTeks(x.tgt) : '–', null, x.nilai || null], { 6: '0%', 9: '#,##0' }, { bungkus: [1, 3, 4, 5], zebra: j % 2 === 1, tengah: [2, 7] });
        tandai(ws, r, 8, x.w[0]);
      });
      if (L.length) baris(ws, ['Total ' + L.length + ' inovasi', '', '', '', '', '', '', '', rumus('SUM(I' + (hr + 1) + ':I' + (ws._r - 1) + ')', L.reduce(function (s, x) { return s + (x.nilai || 0); }, 0))], { 9: '#,##0' }, { tebal: true, latar: C.soft });
      else catatan(ws, 'Belum ada inovasi untuk tahun ' + a.S.tahun + ' di tab Data - Inovasi.');
      bekukan(ws, hr, 1); ws.pageSetup.printTitlesRow = hr + ':' + hr;
    },
    konteks: function (wb) {
      var a = A(), I = a.kIsu(), P = a.kPihak(), SS = a.kSasaran();
      var ws = lembar(wb, 'Isu & Pihak', [10, 46, 22, 18, 26, 14, 14, 30], { judul: 'Isu Internal & Eksternal dan Pihak Berkepentingan ' + a.S.tahun });
      catatan(ws, 'Sumber: file Profil Risiko, tab 2c. Isu & Kaitan Risiko dan 2b. Pihak Berkepentingan. No. risiko merujuk kolom No di RISK REGISTER.'); ws._r++;
      seksi(ws, 'Isu · ' + I.length + ' isu');
      var h1 = judulKolom(ws, ['Kode', 'Isu', 'Jenis', 'Sasaran strategis', 'No. risiko terkait', 'Pihak terkait', '', 'Keterangan']);
      I.forEach(function (x, j) { baris(ws, [x.kode, x.isu, x.jenis, x.sas, x.rk, x.pb, '', x.ket], {}, { bungkus: [2, 4, 5, 6, 8], zebra: j % 2 === 1, tengah: [1] }); });
      if (!I.length) catatan(ws, 'Data isu belum terbaca.');
      var ks = Object.keys(SS);
      if (ks.length) { ws._r++; seksi(ws, 'Sasaran strategis'); ks.forEach(function (k, j) { baris(ws, [k, SS[k], '', '', '', '', '', ''], {}, { zebra: j % 2 === 1, tengah: [1] }); }); }
      ws._r++;
      seksi(ws, 'Pihak berkepentingan · ' + P.length + ' pihak');
      var h2 = judulKolom(ws, ['Kode', 'Pihak berkepentingan', 'Kategori', 'PIC', 'Risiko terkait', 'Progres', 'Status', 'Tinjauan pemenuhan']);
      P.forEach(function (x, j) {
        var r = baris(ws, [x.kode, x.nama, x.kat, x.pic, x.rk, x.pr === null ? null : x.pr / 100, null, String(x.r['Tinjauan Pemenuhan'] || '')], { 6: '0%' }, { bungkus: [2, 5, 8], zebra: j % 2 === 1, tengah: [1] });
        tandai(ws, r, 7, /tercapai/i.test(x.st) ? 'Tercapai' : /berjalan/i.test(x.st) ? 'Berjalan' : 'Belum Dimulai');
      });
      if (!P.length) catatan(ws, 'Data pihak berkepentingan belum terbaca.');
      void h1; void h2; bekukan(ws, 0, 0);
    },
    organisasi: function (wb) {
      var a = A(), O = a.S.data.org || {}, jn = a.judulNama;
      var ws = lembar(wb, 'Struktur Organisasi', [6, 44, 30, 40, 14], { judul: 'Struktur Organisasi PLN UPDL Semarang' + (O.periode ? ' · ' + O.periode : '') });
      var P = (O.pegawai || []).map(function (r) { return { nama: String(r[0] || '').trim(), jab: String(r[1] || '').trim(), atas: String(r[2] || '').trim(), lvl: String(r[3] || '') }; }).filter(function (p) { return p.nama || p.jab; });
      seksi(ws, 'Pegawai PLN · ' + P.length + ' orang (urut menurut garis atasan, lalu abjad jabatan dan nama)');
      var hr = judulKolom(ws, ['No', 'Jabatan', 'Nama', 'Atasan Langsung', 'Level']);
      var ada = {}; P.forEach(function (p) { ada[p.jab.toUpperCase()] = 1; });
      function urut(x, y) { return x.jab.localeCompare(y.jab, 'id') || x.nama.localeCompare(y.nama, 'id'); }
      var dipakai = [], no = 0;
      function tulis(p, d) {
        if (dipakai.indexOf(p) >= 0) return; dipakai.push(p);
        var r = baris(ws, [++no, jn(p.jab), jn(p.nama), p.atas && p.atas !== '-' ? jn(p.atas) : '–', null], {}, { zebra: no % 2 === 0, tengah: [1] });
        ws.getCell(r, 2).alignment = { vertical: 'top', wrapText: true, indent: Math.min(d * 2, 8) };
        tandai(ws, r, 5, /FUNGSIONAL/i.test(p.lvl) ? 'Fungsional' : 'Struktural');
        P.filter(function (q) { return q !== p && q.atas.toUpperCase() === p.jab.toUpperCase(); }).sort(urut).forEach(function (q) { tulis(q, d + 1); });
      }
      P.filter(function (p) { return !ada[p.atas.toUpperCase()]; }).sort(urut).forEach(function (p) { tulis(p, 0); });
      P.filter(function (p) { return dipakai.indexOf(p) < 0; }).sort(urut).forEach(function (p) { tulis(p, 0); });
      if (!P.length) catatan(ws, 'Tab Data - Pegawai belum terbaca.');
      ws._r++;
      var AD = (O.alihDaya || []).slice().sort(function (x, y) { return String(x[1]).localeCompare(String(y[1]), 'id') || String(x[2]).localeCompare(String(y[2]), 'id') || String(x[0]).localeCompare(String(y[0]), 'id'); });
      seksi(ws, 'Tenaga alih daya · ' + AD.length + ' orang (urut perusahaan, bagian, nama)');
      judulKolom(ws, ['No', 'Perusahaan', 'Bagian', 'Nama', 'Lokasi']);
      AD.forEach(function (r, j) { baris(ws, [j + 1, jn(r[1]), jn(r[2]), jn(r[0]), jn(r[3])], {}, { zebra: j % 2 === 1, tengah: [1] }); });
      if (!AD.length) catatan(ws, 'Tab Data - Alih Daya belum terbaca.');
      bekukan(ws, hr, 0);
    },
    kelas: function (wb) {
      var a = A(), S = a.S, r = D.hitungRendiklat(a.kelas(), S.tahun, S.bulan, a.set());
      var ws = lembar(wb, 'Daftar Kelas', [30, 60, 9, 12, 12, 10, 18, 11, 12], { judul: 'Lampiran: Daftar Kelas Selesai (Rendiklat)' });
      var hr = judulKolom(ws, ['ID REN', 'Judul', 'Metode', 'Mulai', 'Selesai', 'Peserta', 'Sumber angka peserta', 'Hari kerja', 'Dihitung di HOP']);
      var SUMBER = { 'Rendiklat': 'Rendiklat', 'koreksi': 'Koreksi', 'perkiraan': 'Rencana (perkiraan)', 'kosong': 'Kosong' };
      r.daftar.slice().sort(function (x, y) { return x.k.selesai - y.k.selesai; }).forEach(function (x, j) {
        baris(ws, [String(x.k.id || '').replace(/^'/, ''), x.k.judul, x.k.metode, tglTeks(x.k.mulai), tglTeks(x.k.selesai), x.peserta, SUMBER[x.sumber] || x.sumber, x.hari, x.ikut ? 'Ya' : 'Tidak'], { 6: '#,##0', 8: '0' }, { bungkus: [2], zebra: j % 2 === 1, tengah: [3, 4, 5, 9] });
      });
      var e = ws._r - 1;
      baris(ws, ['', 'Total ' + r.daftar.length + ' kelas', '', '', '', rumus('SUM(F' + (hr + 1) + ':F' + e + ')', r.peserta), '', '', ''], { 6: '#,##0' }, { tebal: true, latar: C.soft });
      bekukan(ws, hr, 0); ws.pageSetup.printTitlesRow = hr + ':' + hr;
    }
  };
  void kolomHuruf;
})();
