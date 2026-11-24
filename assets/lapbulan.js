/* Laporan bulanan: (1) Kontrak Manajemen — desain formal biru PLN, (2) Manajemen Risiko — desain merah marun.
   Alur: susun draf otomatis dari data → sunting singkat langsung di pratinjau (bagian berlatar kuning wajib dicek/diisi)
   → unduh Word (.docx, bisa diedit) atau PDF (lewat dialog cetak, A4). */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var $ = function (id) { return document.getElementById(id); };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var L = { jenis: 'konman', ttd: ['mgr'] };
  var TEMA = { konman: { ac: '0B3B6F', ac2: 'F5C400', soft: 'EAF1F8', nama: 'Kontrak Manajemen' }, risiko: { ac: '7B1E3A', ac2: 'E8B04B', soft: 'F7ECEF', nama: 'Manajemen Risiko' } };
  var LV = ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'], LV_BG = ['8FD19E', 'B5EBEE', 'F5D66B', 'F4A259', 'E5625E'], LV_FG = ['18233F', '18233F', '18233F', '18233F', 'FFFFFF'];
  var KM = { 'SANGAT KECIL': 1, 'KECIL': 2, 'SEDANG': 3, 'BESAR': 4, 'SANGAT BESAR': 5 }, DM = { 'TIDAK SIGNIFIKAN': 1, 'MINOR': 2, 'MEDIUM': 3, 'SIGNIFIKAN': 4, 'SANGAT SIGNIFIKAN': 5 };
  var KM_N = ['Sangat Kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat Besar'], DM_N = ['Tidak Signifikan', 'Minor', 'Medium', 'Signifikan', 'Sangat Signifikan'];


  /* gaya dokumen: dipakai di pratinjau dan saat dicetak ke PDF */
  var CSS = [
    '.lb-doc{font:10pt/1.45 Arial,Helvetica,sans-serif;color:#18233F;counter-reset:pg}',
    '.lb-pg{background:#fff;width:210mm;min-height:297mm;box-sizing:border-box;padding:18mm 20mm;margin:0 auto 21px;box-shadow:0 2px 13px rgba(15,25,50,.14);position:relative}',
    '.lb-pg.landscape{width:297mm;min-height:210mm;padding:14mm 16mm}',
    '.lb-pg-cov{padding-top:0}.lb-cov{width:calc(100% + 40mm);margin:0 -20mm 13px;border-collapse:collapse}.lb-cov td{padding:34mm 20mm 21mm;background:var(--lb-ac);color:#fff}',
    '.lb-cov p{margin:0 0 8px}.lb-kk{color:var(--lb-ac2);font-size:10pt;letter-spacing:.06em}.lb-judul{font-size:26pt;line-height:1.15;margin:21px 0 8px!important}.lb-sub{font-size:13pt;opacity:.9}',
    '.lb-cov [data-sz="64"]{font-size:32pt;color:var(--lb-ac2)}.lb-cov [data-sz="56"]{font-size:28pt;color:var(--lb-ac2)}',
    '.lb-doc h2{font-size:15pt;color:var(--lb-ac);margin:21px 0 8px;padding-bottom:5px;border-bottom:2px solid var(--lb-ac2)}.lb-doc h2:first-child{margin-top:0}',
    '.lb-doc h3{font-size:11.5pt;margin:13px 0 5px}.lb-doc p{margin:0 0 8px}.lb-doc [data-align=just]{text-align:justify}.lb-doc [data-align=center]{text-align:center}',
    '.lb-doc ol,.lb-doc ul{margin:0 0 8px;padding-left:21px;text-align:justify}',
    '.lb-t{width:100%;border-collapse:collapse;margin:5px 0 13px;page-break-inside:auto}.lb-t th{background:var(--lb-ac);color:#fff;font-weight:700;text-align:left;padding:5px 6px;font-size:9pt}',
    '.lb-t td{border:1px solid #D8DBE4;padding:5px 6px;vertical-align:middle}.lb-t tr{page-break-inside:avoid}.lb-t .c{text-align:center}.lb-kecil{font-size:8.5pt}.lb-rr{font-size:8pt}.lb-kartu td{font-size:10pt;text-align:center}',
    '.lb-peta{width:auto;margin:0 auto 8px}.lb-peta td{width:21mm;height:11mm;text-align:center;font-size:11pt}.lb-peta td:first-child{width:24mm;text-align:right}',
    '.lb-chip{display:inline-block;padding:1px 6px;border-radius:8px;font-weight:700;font-size:7.5pt;white-space:nowrap}',
    '.lb-chart{display:block;width:100%;height:auto;margin:5px 0}.lb-cap{font-size:8.5pt;color:#5A6380;margin:0 0 8px}',
    '.lb-ind{page-break-inside:avoid;border-top:1px solid #E3E6EE;padding-top:8px;margin-top:8px}',
    '.lb-ttd{width:100%;border-collapse:collapse;margin-top:21px;page-break-inside:avoid}.lb-ttd td{width:50%;vertical-align:top;padding:0 8px;border:0}.lb-ttd p{margin:0 0 3px}.lb-ruang{height:55px}.lb-tengah{width:50%;margin:21px auto 0}',
    '.kuning{background:#FFF176;border-radius:2px;padding:0 2px;color:#5A4A00}.kuning.terisi{background:none;color:inherit;padding:0}',
    '@media print{@page{size:A4;margin:0}@page land{size:A4 landscape;margin:0}body{margin:0}.lb-pg{box-shadow:none;margin:0;page-break-after:always;min-height:0}.lb-pg.landscape{page:land}.lb-pg:last-child{page-break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
  ].join('\n');
  (function () { var st = document.createElement('style'); st.id = 'lbCssCetak'; st.textContent = CSS; document.head.appendChild(st); })();

  /* ---------- bantuan ---------- */
  function per() { var S = A().S; return { m: S.bulan, y: S.tahun, nama: BLN[S.bulan - 1] + ' ' + S.tahun, bl: BLN[S.bulan - 1] }; }
  function tglHariIni() { var d = new Date(); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  function kuning(ph) { return '<span class="kuning" data-ph="' + esc(ph) + '">[' + esc(ph) + ']</span>'; }
  function lvIdx(t) { t = String(t || '').toLowerCase(); return /ekstrem/.test(t) ? 4 : /sangat tinggi/.test(t) ? 3 : /tinggi/.test(t) ? 2 : /moderat|sedang|medium/.test(t) ? 1 : /rendah/.test(t) ? 0 : -1; }
  function chip(t) { var i = lvIdx(t); return i < 0 ? esc(t || '–') : '<span class="lb-chip" data-bg="' + LV_BG[i] + '" data-fg="' + LV_FG[i] + '" style="background:#' + LV_BG[i] + ';color:#' + LV_FG[i] + '">' + esc(LV[i]) + '</span>'; }
  function td(isi, o) { o = o || {}; return '<td' + (o.bg ? ' data-bg="' + o.bg + '" style="background:#' + o.bg + (o.fg ? ';color:#' + o.fg : '') + '"' : '') + (o.fg ? ' data-fg="' + o.fg + '"' : '') + (o.span ? ' colspan="' + o.span + '"' : '') + (o.cls ? ' class="' + o.cls + '"' : '') + (o.w ? ' data-w="' + o.w + '"' : '') + '>' + isi + '</td>'; }
  function th(isi, w) { return '<th' + (w ? ' data-w="' + w + '"' : '') + '>' + isi + '</th>'; }
  function tabel(kepala, baris, cls) { return '<table class="lb-t' + (cls ? ' ' + cls : '') + '"><thead><tr>' + kepala.join('') + '</tr></thead><tbody>' + baris.join('') + '</tbody></table>'; }
  function teks(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); }
  function potong(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }

  /* grafik batang SVG sederhana (dikonversi ke PNG saat diunduh ke Word) */
  function svgBatang(label, seri, garis, o) {
    o = o || {}; var W = o.w || 640, H = o.h || 210, pl = 34, pr = 8, pt = 16, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
    var maks = 0; seri.forEach(function (s) { s.v.forEach(function (v) { if (v !== null && v > maks) maks = v; }); }); if (garis && garis > maks) maks = garis; maks = maks * 1.15 || 1;
    var bw = iw / label.length, n = seri.length, g = '';
    for (var i = 0; i <= 4; i++) { var y = pt + ih - ih * i / 4; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#E3E6EE" stroke-width="1"/><text x="' + (pl - 4) + '" y="' + (y + 3) + '" font-size="9" text-anchor="end" fill="#7C8399">' + D.fmt(maks * i / 4, maks < 10 ? 1 : 0) + '</text>'; }
    label.forEach(function (lb, i) {
      seri.forEach(function (s, j) {
        var v = s.v[i]; if (v === null || v === undefined) return;
        var h = ih * v / maks, x = pl + i * bw + bw * 0.14 + j * (bw * 0.72 / n), w = bw * 0.72 / n - 2;
        g += '<rect x="' + x.toFixed(1) + '" y="' + (pt + ih - h).toFixed(1) + '" width="' + Math.max(2, w).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="#' + (s.warnaV ? s.warnaV(v, i) : s.warna) + '"/>';
        if (s.label) g += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (pt + ih - h - 3).toFixed(1) + '" font-size="8.5" text-anchor="middle" fill="#18233F">' + D.fmt(v, s.des === undefined ? 1 : s.des) + '</text>';
      });
      g += '<text x="' + (pl + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" font-size="9" text-anchor="middle" fill="#4A5470">' + esc(lb) + '</text>';
    });
    if (garis) { var yg = pt + ih - ih * garis / maks; g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yg + '" y2="' + yg + '" stroke="#C53030" stroke-width="1.2" stroke-dasharray="5 4"/><text x="' + (W - pr) + '" y="' + (yg - 4) + '" font-size="9" text-anchor="end" fill="#C53030">Target ' + D.fmt(garis, 0) + '</text>'; }
    var leg = seri.length > 1 ? '<g>' + seri.map(function (s, j) { return '<rect x="' + (pl + j * 130) + '" y="2" width="9" height="9" rx="2" fill="#' + s.warna + '"/><text x="' + (pl + j * 130 + 13) + '" y="10" font-size="9" fill="#4A5470">' + esc(s.nama) + '</text>'; }).join('') + '</g>' : '';
    return '<svg class="lb-chart" contenteditable="false" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Arial, sans-serif">' + leg + g + '</svg>';
  }

  /* tanda tangan: 1 orang kanan; 2 orang tinggi kiri–rendah kanan; 3 orang + tengah bawah (sama dengan laporan Cetak) */
  function ttd() {
    var P = window.DashLap, RANK = { mgr: 0, asman: 1, tl: 2 };
    var S = L.ttd.slice().sort(function (a, b) { return RANK[a] - RANK[b]; }).map(P.penandatangan);
    if (!S.length) return '';
    var k = function (p) { return p ? '<p data-align="center">' + esc(p.peran) + ',</p><p data-align="center"><b>' + esc(p.jab) + '</b></p><p class="lb-ruang">&nbsp;</p><p data-align="center"><b><u>' + (p.nama ? esc(p.nama) : kuning('nama')) + '</u></b></p>' + (p.nip ? '<p data-align="center"><small>NIP ' + esc(p.nip) + '</small></p>' : '') : '&nbsp;'; };
    var rows = S.length === 1 ? [[null, S[0]]] : S.length === 2 ? [[S[0], S[1]]] : [[S[1], S[2]], ['tengah', S[0]]];
    var tgl = '<p data-align="center">Semarang, ' + esc(tglHariIni()) + '</p>';
    return '<table class="lb-ttd" data-tanpa-garis="1"><tbody>' + rows.map(function (r, i) {
      return r[0] === 'tengah' ? '<tr><td colspan="2"><div class="lb-tengah">' + k(r[1]) + '</div></td></tr>' : '<tr><td data-w="50">' + (i ? '' : '<p>&nbsp;</p>') + k(r[0]) + '</td><td data-w="50">' + (i ? '' : tgl) + k(r[1]) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function sampul(T, judul, sub, isiKanan) {
    return '<table class="lb-cov" data-tanpa-garis="1"><tbody><tr>' + td('<p class="lb-kk" data-warna="' + T.ac2 + '" data-sz="20"><b>PT PLN (PERSERO) · UNIT PELAKSANA PENDIDIKAN DAN PELATIHAN SEMARANG</b></p>' +
      '<p class="lb-judul" data-warna="FFFFFF" data-sz="52"><b>' + esc(judul) + '</b></p><p class="lb-sub" data-warna="FFFFFF" data-sz="26">' + esc(sub) + '</p>' + (isiKanan || ''), { bg: T.ac, fg: 'FFFFFF' }) + '</tr></tbody></table>';
  }

  /* ======================= LAPORAN KONTRAK MANAJEMEN ======================= */
  function laporanKonman() {
    var a = A(), S = a.S, Bn = a.B(), p = per(), T = TEMA.konman, K = a.K();
    if (!a.konmanAda(Bn)) return '<section class="lb-pg"><p>' + kuning('Realisasi Konman ' + p.nama + ' belum diisi. Isi dulu di tab Konman, lalu buat ulang laporan.') + '</p></section>';
    var skor = a.totalSkor(Bn), ind = K.items.filter(function (it) { return !it.isGroup && !it.pengurang; });
    var cap = ind.map(function (it) { return { it: it, v: D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null }; });
    var hijau = cap.filter(function (x) { return x.v !== null && x.v >= 0.9999; }).length, kuningN = cap.filter(function (x) { return x.v !== null && x.v >= 0.95 && x.v < 0.9999; }).length, merah = cap.filter(function (x) { return x.v !== null && x.v < 0.95; }).length;
    var pg = a.pengurang(Bn) || 0;
    var bln = K.months.filter(function (m) { return a.konmanAda(m); }), idxNow = K.months.indexOf(Bn);
    var stTeks = function (v) { return v === null ? ['Belum ada data', 'EEF0F4', '7C8399'] : v >= 0.9999 ? ['Tercapai', 'E3F4EA', '1F8A4C'] : v >= 0.95 ? ['Hampir tercapai', 'FBF0DC', 'B7791F'] : ['Di bawah target', 'FBE5E5', 'C53030']; };
    var h = '';
    // 1. sampul
    h += '<section class="lb-pg lb-pg-cov">' + sampul(T, 'Laporan Bulanan Kontrak Manajemen', 'Periode ' + p.nama + ' · kumulatif Januari s.d. ' + p.bl,
      '<p data-warna="FFFFFF" data-sz="20">&nbsp;</p><p data-warna="' + T.ac2 + '" data-sz="64"><b>' + D.fmt(skor, 2) + '</b></p><p data-warna="FFFFFF" data-sz="20">Skor Kontrak Manajemen setelah pengurang kepatuhan</p>') +
      '<p>&nbsp;</p>' + tabel([th('Indikator tercapai', 25), th('Hampir tercapai', 25), th('Di bawah target', 25), th('Pengurang kepatuhan', 25)],
        ['<tr>' + td('<b>' + hijau + '</b> dari ' + cap.length, { bg: 'E3F4EA' }) + td('<b>' + kuningN + '</b>', { bg: 'FBF0DC' }) + td('<b>' + merah + '</b>', { bg: 'FBE5E5' }) + td('<b>' + (pg ? '−' + D.fmt(pg, 2) : 'Tidak ada') + '</b>') + '</tr>'], 'lb-kartu') +
      '<p>&nbsp;</p><p><b>Tagline / tema bulan ini:</b> ' + kuning('tuliskan tema atau pesan utama bulan ini') + '</p></section>';
    // 2. ringkasan eksekutif
    var nar = window.DashLap.narasi();
    h += '<section class="lb-pg"><h2>1. Ringkasan Eksekutif</h2>' + nar.map(function (x) {
      return typeof x === 'string' ? '<p data-align="just">' + esc(x) + '</p>' : '<p data-align="just">' + esc(x.intro) + '</p><ol>' + x.butir.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ol>' + (x.tutup ? '<p data-align="just">' + esc(x.tutup) + '</p>' : '');
    }).join('') + '<p data-align="just">' + kuning('tambahkan catatan manajemen bila perlu (konteks kebijakan, kejadian khusus bulan ini)') + '</p>' +
      '<h3>Capaian skor Kontrak Manajemen per bulan</h3>' + svgBatang(bln.map(function (m) { return D.cap(m).slice(0, 3); }), [{ nama: 'Skor', v: bln.map(function (m) { return a.totalSkor(m); }), warna: T.ac, label: true, des: 1, warnaV: function (v) { return v >= 100 ? '1F8A4C' : v >= 95 ? 'B7791F' : 'C53030'; } }], 100) +
      '<p class="lb-cap">Garis putus-putus merah = target 100. Hijau ≥ 100, kuning 95–99, merah &lt; 95.</p></section>';
    // 3. capaian per indikator
    h += '<section class="lb-pg"><h2>2. Capaian per Indikator · ' + esc(p.nama) + '</h2>' + tabel([th('No', 5), th('Indikator', 27), th('Satuan', 10), th('Bobot', 7), th('Target Smt II', 10), th('Target ' + esc(p.bl), 10), th('Realisasi', 10), th('Capaian', 9), th('Status', 12)],
      cap.map(function (x) {
        var it = x.it, st = stTeks(x.v);
        return '<tr>' + td(esc(a.labelNo(it))) + td(esc(it.nama)) + td(esc(it.satuan || '')) + td(esc(it.bobot2 || it.bobot1 || '')) + td(esc(it.target2 || '')) + td(esc(it.target[Bn] ? it.target[Bn].d : '')) +
          td(esc(D.hasData(it, Bn) ? it.real[Bn].d : '')) + td('<b>' + (x.v === null ? '–' : D.pct(x.v, 1)) + '</b>') + td(st[0], { bg: st[1], fg: st[2] }) + '</tr>';
      }), 'lb-kecil') + '</section>';
    // 4. analisa & action step per indikator
    h += '<section class="lb-pg"><h2>3. Analisa dan Action Step per Indikator</h2><p class="lb-cap">Analisa disusun otomatis dari data. Keterangan dan action step berlatar kuning perlu dilengkapi PIC.</p>';
    cap.forEach(function (x, n) {
      var it = x.it, st = stTeks(x.v), mPrev = idxNow > 0 ? K.months[idxNow - 1] : null, vPrev = mPrev && D.hasData(it, mPrev) ? D.capaianItem(it, mPrev) : null;
      var ana = x.v === null ? 'Realisasi ' + p.bl + ' belum diisi.' : 'Realisasi ' + p.bl + ' ' + (it.real[Bn].d || '–') + ' terhadap target ' + (it.target[Bn].d || '–') + ' (capaian ' + D.pct(x.v, 1) + ', ' + st[0].toLowerCase() + ')' +
        (vPrev !== null ? ', ' + (Math.abs(x.v - vPrev) < 0.0005 ? 'sama dengan' : x.v > vPrev ? 'naik dari' : 'turun dari') + ' ' + D.pct(vPrev, 1) + ' pada bulan sebelumnya' : '') + '.';
      var ms = K.months.slice(0, idxNow + 1);
      h += '<div class="lb-ind"><h3>' + esc(a.labelNo(it)) + '. ' + esc(it.nama) + '</h3>' +
        tabel([th('PIC', 16), th('Satuan', 16), th('Target Smt II', 16), th('Target ' + esc(p.bl), 16), th('Realisasi', 16), th('Status', 20)],
          ['<tr>' + td(esc(it.pic || '–')) + td(esc(it.satuan || '–')) + td(esc(it.target2 || '–')) + td(esc(it.target[Bn] ? it.target[Bn].d : '–')) + td(esc(D.hasData(it, Bn) ? it.real[Bn].d : '–')) + td(st[0] + (x.v === null ? '' : ' · ' + D.pct(x.v, 1)), { bg: st[1], fg: st[2] }) + '</tr>'], 'lb-kecil') +
        (ms.length > 1 ? svgBatang(ms.map(function (m) { return D.cap(m).slice(0, 3); }), [
          { nama: 'Target', v: ms.map(function (m) { return it.target[m] ? D.num(it.target[m].v) : null; }), warna: 'B9C3D6' },
          { nama: 'Realisasi', v: ms.map(function (m) { return D.hasData(it, m) ? D.num(it.real[m].v) : null; }), warna: T.ac }], null, { w: 640, h: 150 }) : '') +
        '<p data-align="just"><b>Analisa:</b> ' + esc(ana) + ' ' + (it.ket && it.ket[Bn] ? esc(it.ket[Bn]) : kuning('jelaskan penyebab capaian bulan ini')) + '</p>' +
        '<p data-align="just"><b>Action step:</b> ' + kuning(x.v !== null && x.v >= 0.9999 ? 'langkah mempertahankan capaian' : 'langkah perbaikan, PIC, dan tenggat') + '</p></div>';
    });
    h += '</section>';
    // 5. kepatuhan + penutup
    var kep = (a.kepRows ? a.kepRows() : []).map(function (r) { var v = a.kepVal ? a.kepVal(r, Bn) : null; return { nama: String(r['Aspek Kepatuhan'] || '').trim(), maks: r['Maks Pengurang'], v: v }; }).filter(function (x) { return x.nama; });
    h += '<section class="lb-pg"><h2>4. Kepatuhan</h2>' + (kep.length ? tabel([th('Aspek kepatuhan', 60), th('Maks pengurang', 20), th(esc(p.bl), 20)], kep.map(function (x) {
      var ada = x.v !== null && x.v !== undefined && x.v !== '' && Number(x.v) !== 0;
      return '<tr>' + td(esc(x.nama)) + td(esc(x.maks || '–')) + td(x.v === null || x.v === undefined || x.v === '' ? '–' : esc(D.fmt(Number(x.v), 2)), ada ? { bg: 'FBE5E5', fg: 'C53030' } : { bg: 'E3F4EA', fg: '1F8A4C' }) + '</tr>';
    }), 'lb-kecil') : '<p>Data kepatuhan belum tersedia.</p>') +
      '<h2>5. Penutup</h2><h3>Kesimpulan</h3><p data-align="just">Skor Kontrak Manajemen ' + esc(p.nama) + ' sebesar ' + D.fmt(skor, 2) + ' dengan ' + hijau + ' dari ' + cap.length + ' indikator mencapai target' + (merah ? ' dan ' + merah + ' indikator masih di bawah 95%' : '') + '. ' + kuning('tambahkan kesimpulan manajemen') + '</p>' +
      '<h3>Tindak lanjut</h3>' + tabel([th('No', 6), th('Tindak lanjut', 54), th('PIC', 20), th('Tenggat', 20)], cap.filter(function (x) { return x.v !== null && x.v < 0.9999; }).map(function (x, i) {
        return '<tr>' + td(String(i + 1)) + td('Perbaikan capaian ' + esc(x.it.pendek || x.it.nama) + ': ' + kuning('rencana tindak lanjut')) + td(esc(x.it.pic || '') || kuning('PIC')) + td(kuning('tanggal')) + '</tr>';
      }).concat(['<tr>' + td('+') + td(kuning('tindak lanjut lain bila ada')) + td(kuning('PIC')) + td(kuning('tanggal')) + '</tr>']), 'lb-kecil') + '<p>&nbsp;</p>' + ttd() + '</section>';
    return h;
  }

  /* ======================= LAPORAN MANAJEMEN RISIKO ======================= */
  function petaHtml(rows, kunciK, kunciD, kunciL, judul) {
    var hit = {}, lvSel = {};
    rows.forEach(function (r) { var k = KM[String(r[kunciK]).toUpperCase()], d = DM[String(r[kunciD]).toUpperCase()]; if (!k || !d) return; var key = k + '|' + d; (hit[key] = hit[key] || []).push(r); var li = lvIdx(r[kunciL]); if (li >= 0) lvSel[key] = Math.max(lvSel[key] === undefined ? -1 : lvSel[key], li); });
    var lvDef = function (k, d) { var s = k * d; return s >= 20 ? 4 : s >= 15 ? 3 : s >= 8 ? 2 : s >= 4 ? 1 : 0; };
    var b = '';
    for (var k = 5; k >= 1; k--) {
      b += '<tr>' + td('<small>' + KM_N[k - 1] + '</small>', { bg: 'F4F5F8', w: 16 });
      for (var d = 1; d <= 5; d++) { var key = k + '|' + d, li = lvSel[key] !== undefined ? lvSel[key] : lvDef(k, d), n = (hit[key] || []).length; b += td(n ? '<b>' + n + '</b>' : '&nbsp;', { bg: LV_BG[li], fg: LV_FG[li], cls: 'c', w: 16.8 }); }
      b += '</tr>';
    }
    b += '<tr>' + td('<small>Kemungkinan ↑ / Dampak →</small>', { bg: 'F4F5F8' }) + DM_N.map(function (x) { return td('<small>' + x + '</small>', { bg: 'F4F5F8', cls: 'c' }); }).join('') + '</tr>';
    return '<p class="lb-cap"><b>' + esc(judul) + '</b></p><table class="lb-t lb-peta"><tbody>' + b + '</tbody></table>';
  }
  function laporanRisiko() {
    var a = A(), S = a.S, p = per(), T = TEMA.risiko, RR = S.data.rr;
    if (!RR || RR.error || !RR.rows || !RR.rows.length) return '<section class="lb-pg"><p>' + kuning('Risk Register belum terbaca' + (RR && RR.error ? ': ' + RR.error : '') + '. Pastikan Apps Script terbaru sudah dipasang.') + '</p></section>';
    var R = RR.rows, PT = RR.pantau || {}, n = function (f) { return R.filter(f).length; };
    var hitLv = function (k) { var o = [0, 0, 0, 0, 0]; R.forEach(function (r) { var i = lvIdx(r[k]); if (i >= 0) o[i]++; }); return o; };
    var I = hitLv('inh'), Rs = hitLv('res'), Tg = hitLv('tgt');
    var turun = n(function (r) { return lvIdx(r.res) >= 0 && lvIdx(r.res) < lvIdx(r.inh); }), capaiTgt = n(function (r) { return lvIdx(r.res) >= 0 && lvIdx(r.tgt) >= 0 && lvIdx(r.res) <= lvIdx(r.tgt); });
    var tinggi = R.filter(function (r) { return lvIdx(r.res) >= 2; });
    var kri = (a.kriRows ? a.kriRows() : []).map(function (k) { return { k: k, ak: a.kriAkhir(k) }; }), kriMerah = kri.filter(function (x) { return x.ak && x.ak.st === 'bad'; });
    var kriIdMerah = {}; kriMerah.forEach(function (x) { kriIdMerah[String(x.k.id || '').trim()] = true; });
    var adaPantau = Object.keys(PT).length;
    var h = '';
    // sampul dengan peta risiko residu
    h += '<section class="lb-pg lb-pg-cov">' + sampul(T, 'Laporan Bulanan Manajemen Risiko', 'Periode ' + p.nama + ' · Profil Risiko UPDL Semarang ' + p.y,
      '<p data-warna="FFFFFF" data-sz="20">&nbsp;</p><p data-warna="' + T.ac2 + '" data-sz="56"><b>' + R.length + ' risiko</b></p><p data-warna="FFFFFF" data-sz="20">' + Rs[4] + ' ekstrem · ' + Rs[3] + ' sangat tinggi · ' + Rs[2] + ' tinggi (level residu)</p>') +
      '<p>&nbsp;</p>' + petaHtml(R, 'resK', 'resD', 'res', 'Peta risiko residu ' + p.nama + ' (angka = jumlah risiko)') + '</section>';
    // 1. ringkasan
    h += '<section class="lb-pg"><h2>1. Ringkasan</h2>' +
      '<p data-align="just">Profil Risiko UPDL Semarang ' + p.y + ' memuat ' + R.length + ' risiko' + (n(function (r) { return /peluang|opportun/i.test(r.jenis); }) ? ' (termasuk ' + n(function (r) { return /peluang|opportun/i.test(r.jenis); }) + ' peluang)' : '') + '. Setelah kontrol eksisting, ' + turun + ' risiko turun level dari inheren ke residu, dan ' + capaiTgt + ' risiko sudah berada pada atau di bawah level target. ' +
      'Saat ini ' + tinggi.length + ' risiko masih berlevel residu Tinggi ke atas' + (kriMerah.length ? ', dan ' + kriMerah.length + ' KRI berstatus merah' : '') + '.</p>' +
      (S.data.fra && S.data.fra.ringkas ? '<p data-align="just">Risiko fraud (FRA): ' + S.data.fra.ringkas.n + ' risiko, ' + S.data.fra.ringkas.redflag + ' red flag muncul, ' + S.data.fra.ringkas.kejadian + ' kejadian tercatat.</p>' : '') +
      '<p data-align="just">' + kuning('catatan manajemen risiko bulan ini: perubahan profil, risiko baru, atau keputusan penting') + '</p>' +
      tabel([th('Level', 28)].concat(LV.map(function (x) { return th(x, 14.4); })), [['Inheren', I], ['Residu', Rs], ['Target', Tg]].map(function (b) { return '<tr>' + td('<b>' + b[0] + '</b>') + b[1].map(function (v, i) { return td(String(v), { bg: LV_BG[i], fg: LV_FG[i], cls: 'c' }); }).join('') + '</tr>'; }), 'lb-kecil') +
      '<h2>2. Peta Risiko</h2>' + petaHtml(R, 'inhK', 'inhD', 'inh', 'Inheren (sebelum kontrol)') + '<p>&nbsp;</p>' + petaHtml(R, 'resK', 'resD', 'res', 'Residu (setelah kontrol eksisting)') + '</section>';
    // 3. risk register bulanan (lanskap)
    h += '<section class="lb-pg landscape"><h2>3. Risk Register Bulanan · ' + esc(p.nama) + '</h2>' +
      '<p class="lb-cap">' + (adaPantau ? 'Progres diambil dari sheet Bulanan-Pemantauan Perlakuan' + (RR.judulPantau ? ' (' + esc(RR.judulPantau) + ')' : '') + '.' : 'Sheet Bulanan-Pemantauan Perlakuan belum diisi; kolom progres dan status berlatar kuning perlu dilengkapi pemilik risiko.') + ' Rincian penyebab, dampak, dan kontrol ada di lampiran Profil Risiko.</p>' +
      tabel([th('ID', 9), th('Risiko · pemilik', 22), th('Inheren', 7), th('Residu', 7), th('Target', 7), th('Rencana perlakuan · PIC · waktu', 24), th('Progres ' + esc(p.bl), 16), th('Status', 8)], R.map(function (r) {
        var q = PT[r.id] || {}, pem = String(r.pemilik || '').split(/\n/)[0];
        return '<tr>' + td('<small>' + esc(r.id) + '</small>') + td(esc(r.des) + (pem ? '<br><small>' + esc(pem) + '</small>' : '')) + td(chip(r.inh)) + td(chip(r.res)) + td(chip(r.tgt)) +
          td('<small>' + esc(potong(r.rencana.replace(/Mitigasi (penyebab|dampak):/gi, ''), 170)) + (r.pic ? '<br><b>PIC:</b> ' + esc(potong(r.pic, 60)) : '') + (r.waktu ? '<br>' + esc(r.waktu) : '') + '</small>') +
          td(q.catatan ? '<small>' + esc(q.catatan) + '</small>' : kuning('progres bulan ini')) + td(q.status ? esc(q.status) : kuning('status')) + '</tr>';
      }), 'lb-kecil lb-rr') + '</section>';
    // 4. perhatian + 5. KRI + 6. FRA + penutup
    var perlu = R.filter(function (r) { var q = PT[r.id] || {}; return lvIdx(r.res) >= 2 || kriIdMerah[r.id] || /terlambat|belum/i.test(q.status || '') || /^ya/i.test(q.perluTL || ''); });
    h += '<section class="lb-pg"><h2>4. Risiko yang Perlu Perhatian</h2><p class="lb-cap">Residu Tinggi ke atas, KRI merah, atau perlakuan terlambat/perlu tindak lanjut.</p>' +
      (perlu.length ? tabel([th('ID', 16), th('Risiko', 34), th('Residu', 12), th('Alasan', 18), th('Tindak lanjut', 20)], perlu.map(function (r) {
        var q = PT[r.id] || {}, al = [lvIdx(r.res) >= 2 ? 'Residu ' + r.res : '', kriIdMerah[r.id] ? 'KRI merah' : '', /terlambat|belum/i.test(q.status || '') ? 'Perlakuan ' + q.status.toLowerCase() : ''].filter(Boolean).join(', ');
        return '<tr>' + td('<small>' + esc(r.id) + '</small>') + td(esc(r.des)) + td(chip(r.res)) + td(esc(al || 'Perlu tindak lanjut')) + td(q.tl ? esc(q.tl) : kuning('tindak lanjut & tenggat')) + '</tr>';
      }), 'lb-kecil') : '<p>Tidak ada risiko yang memerlukan perhatian khusus bulan ini.</p>') +
      '<h2>5. Pemantauan Key Risk Indicator (KRI)</h2>' + (kri.length ? tabel([th('ID risiko', 18), th('KRI / peristiwa', 40), th('Nilai terakhir', 14), th('Status', 12), th('PIC', 16)], kri.map(function (x) {
        var k = x.k, ak = x.ak, st = ak ? ak.st : null, warna = { good: ['E3F4EA', '1F8A4C', 'Hijau'], warn: ['FBF0DC', 'B7791F', 'Kuning'], bad: ['FBE5E5', 'C53030', 'Merah'] }[st] || ['EEF0F4', '7C8399', 'Belum diukur'];
        return '<tr>' + td('<small>' + esc(k.id || '') + '</small>') + td(esc(k.peristiwa || '')) + td(ak ? esc(a.kriFmt(k, ak.v)) + ' <small>(' + BLN[ak.m].slice(0, 3) + ')</small>' : '–') + td(warna[2], { bg: warna[0], fg: warna[1] }) + td(esc(String(k.pic || '').replace(/\s*\(R\)$/, ''))) + '</tr>';
      }), 'lb-kecil') : '<p>Data KRI belum tersedia.</p>') +
      (S.data.fra && S.data.fra.ringkas ? '<h2>6. Ringkasan Risiko Fraud (FRA)</h2>' + (function (F) {
        var lv = Object.keys(F.res || {});
        return tabel([th('Jumlah risiko', 20), th('Red flag muncul', 20), th('Kejadian', 20), th('Rencana aksi selesai', 20), th('Proses / belum', 20)],
          ['<tr>' + td('<b>' + F.n + '</b>') + td(String(F.redflag), F.redflag ? { bg: 'FBF0DC', fg: 'B7791F' } : {}) + td(String(F.kejadian), F.kejadian ? { bg: 'FBE5E5', fg: 'C53030' } : {}) + td(String(F.aksi.Selesai)) + td(F.aksi.Proses + ' / ' + F.aksi.Belum) + '</tr>'], 'lb-kecil') +
          (lv.length ? '<p class="lb-cap">Level residu: ' + lv.map(function (k) { return k + ' ' + F.res[k]; }).join(' · ') + '</p>' : '');
      })(S.data.fra.ringkas) : '') +
      '<h2>' + (S.data.fra && S.data.fra.ringkas ? '7' : '6') + '. Penutup</h2><p data-align="just">Secara umum, ' + tinggi.length + ' dari ' + R.length + ' risiko masih memerlukan perhatian dengan level residu Tinggi ke atas. ' + kuning('kesimpulan dan arahan manajemen') + '</p>' +
      '<p data-align="just"><b>Keputusan yang diperlukan:</b> ' + kuning('keputusan atau dukungan yang diminta dari manajemen') + '</p><p>&nbsp;</p>' + ttd() + '</section>';
    return h;
  }

  /* ======================= TAMPILAN SUNTING ======================= */
  function buka() {
    if (!A().admin()) return A().toast('Laporan bulanan hanya untuk akun Admin.');
    var w = $('lbWrap');
    if (!w) {
      w = document.createElement('div'); w.id = 'lbWrap'; w.className = 'lb-wrap'; w.hidden = true;
      document.body.appendChild(w);
      w.addEventListener('click', klik); w.addEventListener('input', function (e) {
        var k = e.target.closest && e.target.closest('.kuning'); if (k) k.classList.toggle('terisi', teks(k.innerHTML) && teks(k.innerHTML) !== '[' + k.getAttribute('data-ph') + ']');
      });
      w.addEventListener('change', function (e) { if (e.target.matches('[data-lbttd]')) { L.ttd = Array.prototype.filter.call(w.querySelectorAll('[data-lbttd]'), function (x) { return x.checked; }).map(function (x) { return x.value; }); susun(true); } });
    }
    w.hidden = false; document.body.classList.add('lb-buka'); susun();
  }
  function susun(hanyaTtd) {
    var w = $('lbWrap'), p = per(), T = TEMA[L.jenis];
    if (hanyaTtd && w.querySelector('.lb-ttd')) { Array.prototype.forEach.call(w.querySelectorAll('.lb-ttd'), function (t) { t.outerHTML = ttd() || '<p></p>'; }); return; }
    var isi = '';
    try { isi = L.jenis === 'konman' ? laporanKonman() : laporanRisiko(); } catch (e) { isi = '<section class="lb-pg"><p>Laporan gagal disusun: ' + esc(e.message) + '</p></section>'; }
    var cek = function (k, t) { return '<label><input type="checkbox" data-lbttd value="' + k + '"' + (L.ttd.indexOf(k) >= 0 ? ' checked' : '') + '> ' + t + '</label>'; };
    w.innerHTML = '<div class="lb-bar"><div class="seg" role="group" aria-label="Jenis laporan"><button type="button" data-lbj="konman" aria-pressed="' + (L.jenis === 'konman') + '">Kontrak Manajemen</button><button type="button" data-lbj="risiko" aria-pressed="' + (L.jenis === 'risiko') + '">Manajemen Risiko</button></div>' +
      '<div class="lb-info"><b>' + esc(p.nama) + '</b> · Klik teks untuk menyunting. Bagian <mark>kuning</mark> perlu diisi; latar kuning hilang setelah diisi.</div>' +
      '<div class="lb-ttdpil">Tanda tangan: ' + cek('tl', 'TL EPMK') + cek('asman', 'Asman') + cek('mgr', 'Manajer') + '</div>' +
      '<div class="lb-aksi"><button type="button" class="btn" data-lba="ulang" title="Buang suntingan dan susun ulang dari data">Susun ulang</button><button type="button" class="btn primary" data-lba="word">Unduh Word</button><button type="button" class="btn primary" data-lba="pdf">Unduh PDF</button><button type="button" class="btn" data-lba="tutup">Tutup</button></div></div>' +
      '<div class="lb-scroll"><article class="lb-doc" data-tema="' + L.jenis + '" style="--lb-ac:#' + T.ac + ';--lb-ac2:#' + T.ac2 + ';--lb-soft:#' + T.soft + '" contenteditable="true" spellcheck="false">' + isi + '</article></div>';
  }
  function klik(e) {
    var j = e.target.closest('[data-lbj]'); if (j) { L.jenis = j.getAttribute('data-lbj'); return susun(); }
    var b = e.target.closest('[data-lba]'); if (!b) return;
    var x = b.getAttribute('data-lba');
    if (x === 'tutup') { $('lbWrap').hidden = true; document.body.classList.remove('lb-buka'); }
    if (x === 'ulang') susun();
    if (x === 'pdf') cetakPdf();
    if (x === 'word') { b.disabled = true; var t0 = b.textContent; b.textContent = 'Menyiapkan…'; unduhWord().catch(function (er) { A().toast('Word gagal dibuat: ' + er.message, 7000); }).then(function () { b.disabled = false; b.textContent = t0; }); }
  }
  function namaFile(ext) { var p = per(); return 'Laporan ' + TEMA[L.jenis].nama + ' ' + p.nama + ' - UPDL Semarang.' + ext; }

  /* ---------- PDF: cetak isi pratinjau lewat iframe (A4, halaman risk register lanskap) ---------- */
  function cssLaporan() { var s = document.getElementById('lbCssCetak'); return s ? s.textContent : ''; }
  function cetakPdf() {
    var doc = $('lbWrap').querySelector('.lb-doc').cloneNode(true); doc.removeAttribute('contenteditable');
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(namaFile('pdf').replace(/\.pdf$/, '')) + '</title><style>' + cssLaporan() + '</style></head><body class="lb-cetak">' + doc.outerHTML + '</body></html>'); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { A().toast('Dialog cetak tidak bisa dibuka: ' + e.message); } setTimeout(function () { f.remove(); }, 60000); }, 400);
    A().toast('Pilih "Simpan sebagai PDF" di dialog cetak, ukuran kertas A4.', 6000);
  }

  /* ---------- WORD: susun .docx dari isi pratinjau (termasuk suntingan) ---------- */
  function muatDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = 'assets/vendor/docx-9.8.1.iife.js'; s.onload = function () { ok(window.docx); }; s.onerror = function () { gagal(new Error('pustaka Word tidak termuat')); }; document.head.appendChild(s); });
  }
  function svgKePng(svg) {
    return new Promise(function (ok) {
      var W = +svg.getAttribute('width') || 640, H = +svg.getAttribute('height') || 200, img = new Image(), sk = 2;
      img.onload = function () { var c = document.createElement('canvas'); c.width = W * sk; c.height = H * sk; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b.arrayBuffer().then(function (ab) { ok({ data: new Uint8Array(ab), w: W, h: H }); }); }, 'image/png'); };
      img.onerror = function () { ok(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
  }
  function unduhWord() {
    var root = $('lbWrap').querySelector('.lb-doc'), T = TEMA[L.jenis], svgs = Array.prototype.slice.call(root.querySelectorAll('svg.lb-chart'));
    return muatDocx().then(function (X) {
      return Promise.all(svgs.map(svgKePng)).then(function (png) {
        var PNG = new Map(); svgs.forEach(function (s, i) { PNG.set(s, png[i]); });
        var nOl = 0, FONT = 'Arial';
        var hexOk = function (h) { return /^[0-9A-Fa-f]{6}$/.test(h || '') ? h.toUpperCase() : undefined; };
        function runs(el, f) {
          var out = [];
          Array.prototype.forEach.call(el.childNodes, function (n) {
            if (n.nodeType === 3) { var t = n.nodeValue.replace(/\s+/g, ' '); if (t) out.push(new X.TextRun({ text: t, bold: f.b, italics: f.i, underline: f.u ? {} : undefined, color: f.c, size: f.sz, font: FONT, highlight: f.k ? 'yellow' : undefined })); return; }
            if (n.nodeType !== 1) return;
            var tg = n.tagName, g = { b: f.b, i: f.i, u: f.u, c: f.c, sz: f.sz, k: f.k };
            if (tg === 'BR') { out.push(new X.TextRun({ text: '', break: 1 })); return; }
            if (tg === 'svg' || tg === 'SVG') return;
            if (tg === 'B' || tg === 'STRONG') g.b = true;
            if (tg === 'I' || tg === 'EM') g.i = true;
            if (tg === 'U') g.u = true;
            if (tg === 'SMALL') g.sz = Math.max(14, (f.sz || 20) - 3);
            if (tg === 'MARK' || (n.classList.contains('kuning') && !n.classList.contains('terisi'))) g.k = true;
            if (n.classList.contains('lb-chip')) { g.b = true; g.c = hexOk(n.getAttribute('data-fg')); }
            if (n.getAttribute('data-warna')) g.c = hexOk(n.getAttribute('data-warna'));
            out = out.concat(runs(n, g));
          });
          return out;
        }
        function para(el, f, extra) {
          f = f || {};
          var al = el.getAttribute && el.getAttribute('data-align'), sz = el.getAttribute && +el.getAttribute('data-sz');
          var g = { b: f.b, c: hexOk(el.getAttribute && el.getAttribute('data-warna')) || f.c, sz: sz || f.sz };
          return new X.Paragraph(Object.assign({ children: runs(el, g), keepNext: f.tahan || undefined, keepLines: f.tahan || undefined, spacing: { after: 100, line: (g.sz || 20) > 30 ? undefined : 276 },
            alignment: al === 'center' ? X.AlignmentType.CENTER : al === 'right' ? X.AlignmentType.RIGHT : al === 'just' ? X.AlignmentType.JUSTIFIED : undefined }, extra || {}));
        }
        function tabelDocx(tb, lebar) {
          var tanpa = tb.hasAttribute('data-tanpa-garis'), sampulT = tb.classList.contains('lb-cov'), tahan = tb.classList.contains('lb-ttd'), trs = Array.prototype.slice.call(tb.querySelectorAll(':scope > thead > tr, :scope > tbody > tr'));
          var pertama = trs[0] ? Array.prototype.slice.call(trs[0].children) : [], kolom = 0; pertama.forEach(function (c) { kolom += +(c.getAttribute('colspan') || 1); });
          var ws = []; pertama.forEach(function (c) { var w = +c.getAttribute('data-w'), sp = +(c.getAttribute('colspan') || 1); for (var i = 0; i < sp; i++) ws.push(w ? w / sp : 0); });
          var tot = ws.reduce(function (s, x) { return s + x; }, 0), kosong = ws.filter(function (x) { return !x; }).length;
          ws = ws.map(function (x) { return x || (tot < 100 && kosong ? (100 - tot) / kosong : 100 / ws.length); });
          var jum = ws.reduce(function (s, x) { return s + x; }, 0); var dxa = ws.map(function (x) { return Math.round(lebar * x / jum); });
          var garis = tanpa ? { style: X.BorderStyle.NONE, size: 0, color: 'FFFFFF' } : { style: X.BorderStyle.SINGLE, size: 4, color: 'D8DBE4' };
          var rows = trs.map(function (tr) {
            var ci = 0, kepala = tr.parentNode.tagName === 'THEAD';
            return new X.TableRow({ tableHeader: kepala, cantSplit: true, children: Array.prototype.map.call(tr.children, function (c) {
              var sp = +(c.getAttribute('colspan') || 1), w = 0; for (var i = 0; i < sp; i++) w += dxa[ci + i] || 0; ci += sp;
              var chipEl = c.querySelector('.lb-chip'), bg = hexOk(c.getAttribute('data-bg')) || (chipEl ? hexOk(chipEl.getAttribute('data-bg')) : undefined) || (kepala ? T.ac : undefined), fg = hexOk(c.getAttribute('data-fg')) || (kepala ? 'FFFFFF' : undefined);
              var isi = []; blok(c, isi, w - 160, { b: kepala, c: fg, sz: tb.classList.contains('lb-kecil') ? 17 : undefined, tengah: c.classList.contains('c') || !!chipEl, tahan: tahan });
              if (!isi.length) isi.push(new X.Paragraph({ children: [] }));
              return new X.TableCell({ children: isi, columnSpan: sp > 1 ? sp : undefined, width: { size: w, type: X.WidthType.DXA }, verticalAlign: X.VerticalAlign.CENTER,
                shading: bg ? { fill: bg, type: X.ShadingType.CLEAR, color: 'auto' } : undefined, margins: sampulT ? { top: 1700, bottom: 1100, left: 560, right: 560 } : { top: 60, bottom: 60, left: 80, right: 80 },
                borders: { top: garis, bottom: garis, left: garis, right: garis } });
            }) });
          });
          return new X.Table({ rows: rows, columnWidths: dxa, width: { size: lebar, type: X.WidthType.DXA }, layout: X.TableLayoutType.FIXED });
        }
        function blok(el, out, lebar, f) {
          f = f || {};
          var inline = [];
          var siram = function () { if (!inline.length) return; var tmp = document.createElement('p'); inline.forEach(function (n) { tmp.appendChild(n.cloneNode(true)); }); if (teks(tmp.innerHTML)) out.push(para(tmp, f, f.tengah ? { alignment: X.AlignmentType.CENTER } : null)); inline = []; };
          Array.prototype.forEach.call(el.childNodes, function (n) {
            if (n.nodeType === 3) { if (n.nodeValue.trim()) inline.push(n); return; }
            if (n.nodeType !== 1) return;
            var tg = n.tagName.toUpperCase();
            if (/^(B|STRONG|I|EM|U|SPAN|SMALL|MARK|A|BR)$/.test(tg)) { inline.push(n); return; }
            siram();
            if (tg === 'SVG') { var im = PNG.get(n); if (im) { var sk = Math.min(1, (lebar / 15) / im.w); out.push(new X.Paragraph({ alignment: X.AlignmentType.CENTER, spacing: { after: 80 }, children: [new X.ImageRun({ type: 'png', data: im.data, transformation: { width: Math.round(im.w * sk), height: Math.round(im.h * sk) } })] })); } return; }
            if (tg === 'H1' || tg === 'H2' || tg === 'H3') { out.push(new X.Paragraph({ heading: tg === 'H3' ? X.HeadingLevel.HEADING_2 : X.HeadingLevel.HEADING_1, keepNext: true, children: runs(n, {}) })); return; }
            if (tg === 'P') { if (n.classList.contains('lb-ruang')) { out.push(new X.Paragraph({ keepNext: true, spacing: { before: 700 }, children: [] })); return; } out.push(para(n, f, f.tengah ? { alignment: X.AlignmentType.CENTER } : null)); return; }
            if (tg === 'OL' || tg === 'UL') { var inst = ++nOl; Array.prototype.forEach.call(n.children, function (li) { out.push(new X.Paragraph({ children: runs(li, f), numbering: { reference: tg === 'OL' ? 'ol' : 'ul', level: 0, instance: inst }, spacing: { after: 60 }, alignment: X.AlignmentType.JUSTIFIED })); }); return; }
            if (tg === 'TABLE') { out.push(tabelDocx(n, lebar)); out.push(new X.Paragraph({ spacing: { after: 80 }, children: [] })); return; }
            blok(n, out, lebar, f);   // div, section, dll.
          });
          siram();
        }
        var sections = Array.prototype.map.call(root.querySelectorAll(':scope > .lb-pg'), function (pg) {
          var land = pg.classList.contains('landscape'), mg = land ? 900 : 1134, lebar = (land ? 16838 : 11906) - 2 * mg, isi = [];
          blok(pg, isi, lebar, {});
          return { properties: { page: { size: { width: 11906, height: 16838, orientation: land ? X.PageOrientation.LANDSCAPE : X.PageOrientation.PORTRAIT }, margin: { top: 1000, bottom: 1000, left: mg, right: mg } } },
            footers: { default: new X.Footer({ children: [new X.Paragraph({ alignment: X.AlignmentType.RIGHT, children: [new X.TextRun({ text: 'Laporan ' + T.nama + ' · ' + per().nama + ' · UPDL Semarang', size: 16, color: '7C8399', font: FONT })] })] }) },
            children: isi };
        });
        var dok = new X.Document({
          creator: 'Dashboard UPDL Semarang', title: namaFile('docx').replace(/\.docx$/, ''),
          styles: { default: { document: { run: { font: FONT, size: 20 } } },
            paragraphStyles: [
              { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: T.ac }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } },
              { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 23, bold: true, color: '18233F' }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true } }] },
          numbering: { config: [
            { reference: 'ol', levels: [{ level: 0, format: X.LevelFormat.DECIMAL, text: '%1.', alignment: X.AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } } } }] },
            { reference: 'ul', levels: [{ level: 0, format: X.LevelFormat.BULLET, text: '•', alignment: X.AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 300 } } } }] }] },
          sections: sections
        });
        return X.Packer.toBlob(dok);
      });
    }).then(function (blob) {
      var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = namaFile('docx'); document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
      A().toast('Word terunduh. Bagian berlatar kuning masih perlu diisi.', 6000);
    });
  }
  window.DashLapBulan = { buka: buka, _susun: susun, _word: unduhWord, opsi: L };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#lapBulanBtn')) { buka(); } });
})();
