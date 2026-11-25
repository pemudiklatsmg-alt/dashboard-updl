/* Laporan bulanan: (1) Kontrak Manajemen — desain formal biru PLN, (2) Manajemen Risiko — desain merah marun.
   Alur: susun draf otomatis dari data → sunting singkat langsung di pratinjau (bagian berlatar kuning wajib dicek/diisi)
   → unduh Word (.docx, bisa diedit) atau PDF (lewat dialog cetak, A4). */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var $ = function (id) { return document.getElementById(id); };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var L = { jenis: 'konman', ttd: ['mgr'] };
  var TEMA = { konman: { ac: '0B3B6F', ac2: 'F5C400', soft: 'EAF1F8', ac3: '1572B6', nama: 'Kontrak Manajemen', judul: 'Laporan Kontrak Manajemen' }, risiko: { ac: '7B1E3A', ac2: 'E8B04B', soft: 'F7ECEF', ac3: 'B23A5A', nama: 'Pemantauan Risiko', judul: 'Laporan Pemantauan Risiko' } };
  var LV = ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'], LV_BG = ['8FD19E', 'B5EBEE', 'F5D66B', 'F4A259', 'E5625E'], LV_FG = ['18233F', '18233F', '18233F', '18233F', 'FFFFFF'];
  var KM = { 'SANGAT KECIL': 1, 'KECIL': 2, 'SEDANG': 3, 'BESAR': 4, 'SANGAT BESAR': 5 }, DM = { 'TIDAK SIGNIFIKAN': 1, 'MINOR': 2, 'MEDIUM': 3, 'SIGNIFIKAN': 4, 'SANGAT SIGNIFIKAN': 5 };
  var KM_N = ['Sangat Kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat Besar'], DM_N = ['Tidak Signifikan', 'Minor', 'Medium', 'Signifikan', 'Sangat Signifikan'];


  /* gaya dokumen: dipakai di pratinjau dan saat dicetak ke PDF */
  var CSS = [
    '.lb-doc{font:10pt/1.45 Arial,Helvetica,sans-serif;color:#18233F;counter-reset:pg}',
    '.lb-pg{background:#fff;width:210mm;min-height:297mm;box-sizing:border-box;padding:21mm 21mm;margin:0 auto 21px;box-shadow:0 2px 13px rgba(15,25,50,.14);position:relative}',
    '.lb-pg.landscape{width:297mm;min-height:210mm;padding:13mm 21mm}',
    '.lb-banner{margin:0 0 13px}.lb-pg>.lb-banner:first-child{width:calc(100% + 42mm);max-width:none;margin:-21mm -21mm 21px}',
    '.lb-doc h2{position:relative;font-size:13pt;color:#fff;background:linear-gradient(90deg,var(--lb-ac),var(--lb-ac3));margin:21px 0 8px;padding:8px 13px;border-radius:8px;overflow:hidden}.lb-doc h2:first-child{margin-top:0}',
    '.lb-doc h2::after{content:"";position:absolute;right:21px;top:0;bottom:0;width:13px;background:var(--lb-ac2);transform:skewX(-28deg)}.lb-doc h2::before{content:"";position:absolute;right:34px;top:0;bottom:0;width:6px;background:rgba(255,255,255,.35);transform:skewX(-28deg)}',
    '.lb-doc h3{font-size:11pt;margin:13px 0 5px}.lb-doc p{margin:0 0 8px}.lb-doc [data-align=just]{text-align:justify}.lb-doc [data-align=center]{text-align:center}',
    '.lb-doc ol,.lb-doc ul{margin:0 0 8px;padding-left:21px;text-align:justify}',
    '.lb-t{width:100%;border-collapse:collapse;margin:5px 0 13px;page-break-inside:auto}.lb-t th{background:var(--lb-ac);color:#fff;font-weight:700;text-align:left;padding:5px 8px;font-size:9pt}',
    '.lb-t td{border:1px solid #D8DBE4;padding:5px 8px;vertical-align:middle}.lb-t tr{page-break-inside:avoid}.lb-t .c{text-align:center}.lb-kecil{font-size:8.5pt}.lb-rr{font-size:8pt}.lb-kartu td{font-size:10pt;text-align:center}',
    '.lb-peta{width:auto;margin:0 auto 8px}.lb-peta td{width:21mm;height:8mm;padding:2px 4px;text-align:center;font-size:10.5pt}.lb-peta td:first-child{width:24mm;text-align:right}',
    '.lb-chip{display:inline-block;padding:2px 8px;border-radius:8px;font-weight:700;font-size:7.5pt;white-space:nowrap}',
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
  /* banner ilustrasi bergaya materi PLN (langit biru, sapuan diagonal, aksen kuning, menara transmisi) */
  function banner(jenis, judul, sub) {
    var R = jenis === 'risiko', T = TEMA[jenis], W = 794, H = 172, F = 'Inter, \'Segoe UI\', Arial, sans-serif';
    var bg = R ? ['#EAF4FB', '#F7DCE2'] : ['#E4F4FC', '#A7DCF3'], p1 = '#' + T.ac, p2 = '#' + T.ac3;
    var ikonJudul = R ? '<path d="M43 41l13 5v9c0 8-6 13-13 15-7-2-13-7-13-15v-9z" fill="none" stroke="' + p1 + '" stroke-width="2.6" stroke-linejoin="round"/><path d="M43 49v8" stroke="' + p1 + '" stroke-width="2.8" stroke-linecap="round"/><circle cx="43" cy="62" r="1.7" fill="' + p1 + '"/>'
      : '<rect x="33" y="41" width="20" height="27" rx="3" fill="none" stroke="' + p1 + '" stroke-width="2.6"/><rect x="38" y="38" width="10" height="6" rx="2" fill="' + p1 + '"/><path d="M37 55l4 4 7-8" fill="none" stroke="' + p1 + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    var gedung = [[440, 46], [458, 70], [472, 34], [490, 58], [506, 80], [520, 44], [536, 66], [552, 52], [566, 74]].map(function (g) { return '<rect x="' + g[0] + '" y="' + (140 - g[1]) + '" width="13" height="' + g[1] + '" fill="#7FC1E3" opacity=".55"/>'; }).join('');
    var menara = function (x, s) {   // menara transmisi garis
      var t = 140 - 112 * s, w = 22 * s, L = function (a, b, c, d) { return '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '"/>'; }, o = '';
      o += L(x - w, 140, x - 4 * s, t) + L(x + w, 140, x + 4 * s, t);
      [0.22, 0.42].forEach(function (f) { var y = t + 112 * s * f, a = 4 * s + (w - 4 * s) * f; o += L(x - a - 20 * s, y, x + a + 20 * s, y) + L(x - a - 20 * s, y, x - a - 20 * s, y + 7 * s) + L(x + a + 20 * s, y, x + a + 20 * s, y + 7 * s); });
      for (var f = 0.1; f < 0.95; f += 0.15) { var y1 = t + 112 * s * f, y2 = t + 112 * s * (f + 0.15), a1 = 4 * s + (w - 4 * s) * f, a2 = 4 * s + (w - 4 * s) * Math.min(1, f + 0.15); o += L(x - a1, y1, x + a2, y2) + L(x + a1, y1, x - a2, y2); }
      return '<g stroke="#0F4C81" stroke-width="' + (1.4 * s).toFixed(2) + '" opacity=".85">' + o + '</g>';
    };
    var kartu = R
      ? '<path d="M520 40l20 8v14c0 13-9 21-20 24-11-3-20-11-20-24V48z" fill="' + p1 + '"/><path d="M520 52v12" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="520" cy="72" r="2.6" fill="#fff"/>' +
        [0, 1, 2].map(function (r) { return [0, 1, 2].map(function (c) { var w = ['#8FD19E', '#F5D66B', '#E5625E', '#B5EBEE', '#F5D66B', '#F4A259', '#8FD19E', '#B5EBEE', '#F5D66B'][r * 3 + c]; return '<rect x="' + (556 + c * 13) + '" y="' + (44 + r * 13) + '" width="11" height="11" rx="2" fill="' + w + '"/>'; }).join(''); }).join('') +
        '<circle cx="586" cy="92" r="11" fill="#F5C400"/><path d="M581 92l4 4 6-7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<rect x="500" y="34" width="38" height="50" rx="5" fill="#fff" stroke="' + p1 + '" stroke-width="2"/><rect x="511" y="30" width="16" height="8" rx="3" fill="' + p1 + '"/>' +
        [46, 58, 70].map(function (y) { return '<path d="M506 ' + y + 'l3 3 5-6" fill="none" stroke="#1F8A4C" stroke-width="2.2" stroke-linecap="round"/><line x1="518" y1="' + (y + 1) + '" x2="532" y2="' + (y + 1) + '" stroke="#B9C3D6" stroke-width="2.4" stroke-linecap="round"/>'; }).join('') +
        [[552, 18], [565, 28], [578, 40]].map(function (b) { return '<rect x="' + b[0] + '" y="' + (84 - b[1]) + '" width="10" height="' + b[1] + '" rx="2" fill="' + p2 + '"/>'; }).join('') +
        '<path d="M550 58l14-9 12 4 16-14" fill="none" stroke="#F5C400" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M586 38l7 0 0 7" fill="none" stroke="#F5C400" stroke-width="3" stroke-linecap="round"/>';
    return '<svg class="lb-chart lb-banner" contenteditable="false" xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + F + '">' +
      '<defs><linearGradient id="bgL' + jenis + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></linearGradient>' +
      '<linearGradient id="pl' + jenis + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + p1 + '"/><stop offset="1" stop-color="' + p2 + '"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#bgL' + jenis + ')"/>' +
      '<path d="M380 0h140L380 ' + H + 'H240z" fill="#fff" opacity=".42"/><path d="M490 0h36L386 ' + H + 'h-36z" fill="#1FA2C8" opacity=".14"/><path d="M744 0h50v50z" fill="#fff" opacity=".5"/>' +
      '<path d="M640 0h34l-13 13h-34zM680 0h16l-13 13h-16z" fill="#F5C400"/>' +
      '<g transform="translate(64,8)">' +
      gedung + '<path d="M430 140c40-6 80-6 300 0v24H430z" fill="#5FB0DA" opacity=".35"/>' +
      '<path d="M598 62C560 80 500 84 430 80M598 82C560 98 500 100 430 98" fill="none" stroke="#0F4C81" stroke-width=".8" opacity=".5"/>' + menara(642, 0.92) + menara(462, 0.55) +
      '<rect x="488" y="22" width="114" height="84" rx="13" fill="#fff" opacity=".9"/>' + kartu +
      '<path d="M660 112l9 9-9 9M672 112l9 9-9 9" fill="none" stroke="' + p2 + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="12" y="20" font-size="9.5" font-weight="600" letter-spacing="1.6" fill="' + p1 + '">PT PLN (PERSERO) · UPDL SEMARANG</text>' +
      '<rect x="8" y="32" width="414" height="56" rx="14" fill="url(#pl' + jenis + ')"/><rect x="16" y="39" width="42" height="42" rx="10" fill="#fff"/><g transform="translate(-6,1)">' + ikonJudul + '</g>' +
      '<text x="72" y="68" font-size="24" font-weight="700" letter-spacing="-0.4" fill="#fff">' + esc(judul) + '</text>' +
      '<rect x="8" y="98" width="' + Math.max(240, 58 + sub.length * 6.9) + '" height="30" rx="15" fill="#fff" opacity=".94"/><rect x="19" y="105" width="15" height="14" rx="3" fill="none" stroke="' + p1 + '" stroke-width="1.7"/><line x1="19" y1="110" x2="34" y2="110" stroke="' + p1 + '" stroke-width="1.7"/>' +
      '<text x="42" y="118" font-size="12.5" font-weight="600" fill="' + p1 + '">' + esc(sub) + '</text></g>' +
      '<path d="M0 ' + (H - 6) + 'h360l-6 6H0z" fill="#F5C400"/><path d="M360 ' + (H - 6) + 'h' + (W - 360) + 'v6H354z" fill="' + p2 + '" opacity=".75"/></svg>';
  }

  /* ======================= LAPORAN KONTRAK MANAJEMEN ======================= */
  /* Grafik per indikator. Target & realisasi dinormalkan ke skala yang sama (mis. realisasi 1 = 100% saat target ditulis 100).
     Indikator berjenis waktu/tanggal atau tanpa target angka ditampilkan sebagai capaian (%) per bulan dengan garis 100%. */
  function angka(x) { if (x === null || x === undefined || x === '') return null; if (/^\d{4}-\d{2}-\d{2}/.test(String(x))) return null; var n = D.num(x); return n === null || isNaN(n) ? null : n; }
  function grafikIndikator(it, ms, T) {
    var lbl = ms.map(function (m) { return D.cap(m).slice(0, 3); });
    var tv = ms.map(function (m) { return it.target[m] ? angka(it.target[m].v) : null; }), rv = ms.map(function (m) { return D.hasData(it, m) ? angka(it.real[m].v) : null; });
    var waktu = /waktu/i.test(it.satuan || '') || ms.some(function (m) { return it.target[m] && /^\d{4}-\d{2}-\d{2}/.test(String(it.target[m].v)); });
    var persen = /%/.test(it.satuan || '');
    ms.forEach(function (m, i) {
      if (rv[i] === null && tv[i] === 0) tv[i] = null;
      if (persen && rv[i] !== null && tv[i] !== null) { if (tv[i] > 2 && Math.abs(rv[i]) <= 2) rv[i] *= 100; else if (rv[i] > 2 && Math.abs(tv[i]) <= 2) tv[i] *= 100; }
    });
    var cocok = ms.filter(function (m, i) { return tv[i] !== null && rv[i] !== null; }).length;
    if (waktu || !cocok) {
      var cp = ms.map(function (m) { var v = D.hasData(it, m) ? D.capaianItem(it, m) : null; return v === null || v === undefined ? null : v * 100; });
      if (!cp.some(function (v) { return v !== null; })) return '';
      return svgBatang(lbl, [{ nama: 'Capaian (%)', v: cp, warna: T.ac, label: true, des: 0 }], 100, { w: 640, h: 140 }) + '<p class="lb-cap">Capaian (%) per bulan; garis merah = 100%.</p>';
    }
    return svgBatang(lbl, [{ nama: 'Target', v: tv, warna: 'B9C3D6' }, { nama: 'Realisasi', v: rv, warna: T.ac }], null, { w: 640, h: 140 });
  }
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
    // 1. banner + ringkasan eksekutif (halaman pertama langsung berisi)
    var nar = window.DashLap.narasi();
    h += '<section class="lb-pg">' + banner('konman', T.judul, 'Periode ' + p.nama + ' · UPDL Semarang') +
      tabel([th('Skor Kontrak Manajemen', 24), th('Indikator tercapai', 19), th('Hampir tercapai', 19), th('Di bawah target', 19), th('Pengurang kepatuhan', 19)],
        ['<tr>' + td('<b>' + D.fmt(skor, 2) + '</b>', { bg: T.soft, cls: 'c' }) + td('<b>' + hijau + '</b> dari ' + cap.length, { bg: 'E3F4EA', cls: 'c' }) + td('<b>' + kuningN + '</b>', { bg: 'FBF0DC', cls: 'c' }) + td('<b>' + merah + '</b>', { bg: 'FBE5E5', cls: 'c' }) + td('<b>' + (pg ? '−' + D.fmt(pg, 2) : 'Tidak ada') + '</b>', { cls: 'c' }) + '</tr>'], 'lb-kartu') +
      '<h2>1. Ringkasan Eksekutif</h2>' + nar.map(function (x) {
      return typeof x === 'string' ? '<p data-align="just">' + esc(x) + '</p>' : '<p data-align="just">' + esc(x.intro) + '</p><ol>' + x.butir.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ol>' + (x.tutup ? '<p data-align="just">' + esc(x.tutup) + '</p>' : '');
    }).join('') + '<p data-align="just">' + kuning('tambahkan catatan manajemen bila perlu (konteks kebijakan, kejadian khusus bulan ini)') + '</p>' +
      '<h3>Capaian skor Kontrak Manajemen per bulan</h3>' + svgBatang(bln.map(function (m) { return D.cap(m).slice(0, 3); }), [{ nama: 'Skor', v: bln.map(function (m) { return a.totalSkor(m); }), warna: T.ac, label: true, des: 1, warnaV: function (v) { return v >= 100 ? '1F8A4C' : v >= 95 ? 'B7791F' : 'C53030'; } }], 100, { h: 170 }) +
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
      h += '<div class="lb-ind" data-baris="' + it.baris + '"><h3>' + esc(a.labelNo(it)) + '. ' + esc(it.nama) + '</h3>' +
        tabel([th('PIC', 16), th('Satuan', 16), th('Target Smt II', 16), th('Target ' + esc(p.bl), 16), th('Realisasi', 16), th('Status', 20)],
          ['<tr>' + td(esc(it.pic || '–')) + td(esc(it.satuan || '–')) + td(esc(it.target2 || '–')) + td(esc(it.target[Bn] ? it.target[Bn].d : '–')) + td(esc(D.hasData(it, Bn) ? it.real[Bn].d : '–')) + td(st[0] + (x.v === null ? '' : ' · ' + D.pct(x.v, 1)), { bg: st[1], fg: st[2] }) + '</tr>'], 'lb-kecil') +
        (ms.length > 1 ? grafikIndikator(it, ms, T) : '') +
        '<p data-align="just" class="lb-ana"><b>Analisa:</b> ' + esc(ana) + ' ' + (it.ket && it.ket[Bn] ? esc(it.ket[Bn]) : kuning('jelaskan penyebab capaian bulan ini')) + '</p>' +
        '<p data-align="just" class="lb-as"><b>Action step:</b> ' + kuning(x.v !== null && x.v >= 0.9999 ? 'langkah mempertahankan capaian' : 'langkah perbaikan, PIC, dan tenggat') + '</p></div>';
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
  /* Pemantauan Risiko Fraud (FRA): ringkasan, profil per proses, risiko yang perlu perhatian, progres rencana aksi per PIC */
  var SKEMA = { Corruption: 'Korupsi', AssetMisappropriation: 'Penyalahgunaan aset', FraudulentStatement: 'Kecurangan laporan', ScammingDataTheft: 'Penipuan / pencurian data' };
  function fraHtml(F) {
    var G = F.ringkas, rs = F.risiko || [], ak = F.aksi || [], totA = G.aksi.Selesai + G.aksi.Proses + G.aksi.Belum;
    var ya = function (t) { return /^(ya|terjadi|muncul)/i.test(String(t || '').trim()); };
    var turun = rs.filter(function (r) { return /turun/i.test(r.perubahan || ''); }).length, modRes = rs.filter(function (r) { return lvIdx(r.res) >= 1; });
    var rf = rs.filter(function (r) { return ya(r.rfMuncul); }), kj = rs.filter(function (r) { return ya(r.kejadian); });
    var h = '<h2>6. Pemantauan Risiko Fraud (FRA)</h2>' + (F.periode ? '<p class="lb-cap">Periode pemantauan FRA: <b>' + esc(F.periode) + '</b>.</p>' : '') +
      tabel([th('Risiko fraud', 20), th('Red flag muncul', 20), th('Kejadian fraud', 20), th('Residu ≥ Moderat', 20), th('Rencana aksi selesai', 20)],
        ['<tr>' + td('<b>' + G.n + '</b>', { cls: 'c' }) + td('<b>' + G.redflag + '</b>', G.redflag ? { bg: 'FBF0DC', fg: 'B7791F', cls: 'c' } : { bg: 'E3F4EA', cls: 'c' }) + td('<b>' + G.kejadian + '</b>', G.kejadian ? { bg: 'FBE5E5', fg: 'C53030', cls: 'c' } : { bg: 'E3F4EA', cls: 'c' }) +
          td('<b>' + modRes.length + '</b>', { cls: 'c' }) + td('<b>' + G.aksi.Selesai + '</b> dari ' + totA + (totA ? ' (' + D.fmt(G.aksi.Selesai / totA * 100, 0) + '%)' : ''), { cls: 'c' }) + '</tr>'], 'lb-kartu lb-kecil') +
      '<p data-align="just">Dari ' + G.n + ' risiko fraud yang dipantau, ' + turun + ' risiko turun level dari inheren ke residu' + (modRes.length ? ' dan ' + modRes.length + ' risiko masih berlevel residu Moderat ke atas' : '; seluruh risiko berlevel residu Rendah') + '. ' +
      (rf.length ? 'Red flag muncul pada ' + rf.map(function (r) { return r.id; }).join(', ') + '. ' : 'Tidak ada red flag yang muncul. ') + (kj.length ? kj.length + ' kejadian fraud tercatat dan perlu ditindaklanjuti. ' : 'Tidak ada kejadian fraud yang tercatat. ') +
      'Dari ' + totA + ' rencana aksi mitigasi, ' + G.aksi.Selesai + ' selesai, ' + G.aksi.Proses + ' dalam proses, dan ' + G.aksi.Belum + ' belum dimulai.</p>';
    var pr = Object.keys(G.proses || {});
    if (pr.length) h += '<h3>Profil risiko fraud per proses bisnis</h3>' + tabel([th('Proses bisnis', 40), th('Jumlah', 12), th('Inheren ≥ Moderat', 16), th('Residu ≥ Moderat', 16), th('Residu tertinggi', 16)], pr.map(function (k) {
      var x = G.proses[k], jml = 0, im = 0, rm = 0, top = -1;
      LV.forEach(function (l, i) { jml += x.inh[l] || 0; if (i >= 1) { im += x.inh[l] || 0; rm += x.res[l] || 0; } if ((x.res[l] || 0) > 0) top = i; });
      return '<tr>' + td(esc(k)) + td(String(jml), { cls: 'c' }) + td(String(im), { cls: 'c' }) + td(String(rm), rm ? { bg: 'FBF0DC', cls: 'c' } : { cls: 'c' }) + td(top >= 0 ? chip(LV[top]) : '–', { cls: 'c' }) + '</tr>';
    }), 'lb-kecil') + '<p class="lb-cap">Skema fraud: ' + Object.keys(G.skema || {}).map(function (k) { return esc(SKEMA[k] || k) + ' ' + G.skema[k]; }).join(' · ') + '.</p>';
    var perlu = rs.filter(function (r) { return lvIdx(r.res) >= 1 || ya(r.rfMuncul) || ya(r.kejadian); });
    h += '<h3>Risiko fraud yang perlu perhatian</h3>' + (perlu.length ? tabel([th('ID', 8), th('Risiko fraud', 32), th('Inheren → residu', 16), th('Red flag / kejadian', 14), th('Progres mitigasi', 18), th('PIC', 12)], perlu.map(function (r) {
      var tanda = [ya(r.rfMuncul) ? 'Red flag muncul' : '', ya(r.kejadian) ? 'Kejadian' : ''].filter(Boolean).join(', ') || 'Tidak ada';
      return '<tr>' + td('<small>' + esc(r.id) + '</small>') + td(esc(r.des) + '<br><small>' + esc(r.proses || '') + '</small>') + td(chip(r.inh) + ' → ' + chip(r.res)) + td(esc(tanda), tanda === 'Tidak ada' ? {} : { bg: 'FBF0DC', fg: 'B7791F' }) +
        td(r.progres ? '<small>' + esc(r.progres) + '</small>' : kuning('progres mitigasi')) + td('<small>' + esc(r.pic || '') + '</small>') + '</tr>';
    }), 'lb-kecil') : '<p>Seluruh risiko fraud berlevel residu Rendah tanpa red flag maupun kejadian.</p>');
    var pic = {}; ak.forEach(function (a) { var k = String(a[4] || '–').trim() || '–', st = /selesai/i.test(a[7]) ? 0 : /proses/i.test(a[7]) ? 1 : 2; (pic[k] = pic[k] || [0, 0, 0])[st]++; });
    var pk = Object.keys(pic).sort(function (a, b) { return (pic[b][1] + pic[b][2]) - (pic[a][1] + pic[a][2]); });
    if (pk.length) h += '<h3>Progres rencana aksi mitigasi per PIC</h3>' + tabel([th('PIC', 40), th('Selesai', 15), th('Proses', 15), th('Belum', 15), th('Total', 15)], pk.map(function (k) {
      var x = pic[k]; return '<tr>' + td(esc(k)) + td(String(x[0]), { cls: 'c', bg: x[0] ? 'E3F4EA' : '' }) + td(String(x[1]), { cls: 'c' }) + td(String(x[2]), x[2] ? { cls: 'c', bg: 'FBE5E5', fg: 'C53030' } : { cls: 'c' }) + td('<b>' + (x[0] + x[1] + x[2]) + '</b>', { cls: 'c' }) + '</tr>';
    }), 'lb-kecil');
    return h;
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
    // 1. ringkasan
    h += '<section class="lb-pg">' + banner('risiko', T.judul, 'Periode ' + p.nama + ' · Profil Risiko UPDL Semarang ' + p.y) +
      tabel([th('Jumlah risiko', 20), th('Residu Ekstrem', 20), th('Residu Sangat Tinggi', 20), th('Residu Tinggi', 20), th('KRI merah', 20)],
        ['<tr>' + td('<b>' + R.length + '</b>', { bg: T.soft, cls: 'c' }) + td('<b>' + Rs[4] + '</b>', { bg: Rs[4] ? 'FBE5E5' : 'F4F5F8', cls: 'c' }) + td('<b>' + Rs[3] + '</b>', { bg: Rs[3] ? 'FDEBDD' : 'F4F5F8', cls: 'c' }) + td('<b>' + Rs[2] + '</b>', { bg: Rs[2] ? 'FBF0DC' : 'F4F5F8', cls: 'c' }) + td('<b>' + kriMerah.length + '</b>', { bg: kriMerah.length ? 'FBE5E5' : 'E3F4EA', cls: 'c' }) + '</tr>'], 'lb-kartu') +
      '<h2>1. Ringkasan</h2>' +
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
      (S.data.fra && S.data.fra.ringkas ? fraHtml(S.data.fra) : '') +
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
    if (w.hidden) { try { history.pushState({ updlLap: 1 }, ''); } catch (e) { /* abaikan */ } }
    w.hidden = false; document.body.classList.add('lb-buka'); susun();
  }
  // tutup laporan; tombol Kembali memakai riwayat browser agar tombol back browser/HP juga kembali ke dashboard
  function tutupLap(dariPop) {
    var w = $('lbWrap'); if (!w || w.hidden) return;
    if (!dariPop && history.state && history.state.updlLap) { history.back(); return; }
    w.hidden = true; document.body.classList.remove('lb-buka');
  }
  window.addEventListener('popstate', function () { if (history.state && history.state.updlLap) return; tutupLap(true); });
  function susun(hanyaTtd) {
    var w = $('lbWrap'), p = per(), T = TEMA[L.jenis];
    if (hanyaTtd && w.querySelector('.lb-ttd')) { Array.prototype.forEach.call(w.querySelectorAll('.lb-ttd'), function (t) { t.outerHTML = ttd() || '<p></p>'; }); return; }
    var isi = '';
    try { isi = L.jenis === 'konman' ? laporanKonman() : laporanRisiko(); } catch (e) { isi = '<section class="lb-pg"><p>Laporan gagal disusun: ' + esc(e.message) + '</p></section>'; }
    var cek = function (k, t) { return '<label><input type="checkbox" data-lbttd value="' + k + '"' + (L.ttd.indexOf(k) >= 0 ? ' checked' : '') + '> ' + t + '</label>'; };
    w.innerHTML = '<div class="lb-bar"><button type="button" class="btn lb-kembali" data-lba="tutup">← Kembali ke dashboard</button><div class="seg" role="group" aria-label="Jenis laporan"><button type="button" data-lbj="konman" aria-pressed="' + (L.jenis === 'konman') + '">Kontrak Manajemen</button><button type="button" data-lbj="risiko" aria-pressed="' + (L.jenis === 'risiko') + '">Manajemen Risiko</button></div>' +
      '<div class="lb-info"><b>' + esc(p.nama) + '</b> · Klik teks untuk menyunting. Bagian <mark>kuning</mark> perlu diisi; latar kuning hilang setelah diisi.</div>' +
      '<div class="lb-ttdpil">Tanda tangan: ' + cek('tl', 'TL EPMK') + cek('asman', 'Asman') + cek('mgr', 'Manajer') + '</div>' +
      '<div class="lb-aksi"><button type="button" class="btn" data-lba="ulang" title="Buang suntingan dan susun ulang dari data">Susun ulang</button><button type="button" class="btn primary" data-lba="word">Unduh Word</button><button type="button" class="btn primary" data-lba="pdf">Unduh PDF</button>' + (L.jenis === 'konman' ? '<button type="button" class="btn" data-lba="traj" title="PowerPoint Monthly Trajectory per indikator">PPT Trajectory</button><button type="button" class="btn" data-lba="pd" title="PowerPoint Performance Dialog">PPT Performance Dialog</button>' : '') + '</div></div>' +
      '<div class="lb-scroll"><article class="lb-doc" data-tema="' + L.jenis + '" style="--lb-ac:#' + T.ac + ';--lb-ac3:#' + T.ac3 + ';--lb-ac2:#' + T.ac2 + ';--lb-soft:#' + T.soft + '" contenteditable="true" spellcheck="false">' + isi + '</article></div>';
  }
  function klik(e) {
    var j = e.target.closest('[data-lbj]'); if (j) { L.jenis = j.getAttribute('data-lbj'); return susun(); }
    var b = e.target.closest('[data-lba]'); if (!b) return;
    var x = b.getAttribute('data-lba');
    if (x === 'tutup') tutupLap();
    if (x === 'ulang') susun();
    if (x === 'pdf') cetakPdf();
    if ((x === 'traj' || x === 'pd') && window.DashPpt) { b.disabled = true; var t1 = b.textContent; b.textContent = 'Menyiapkan…'; window.DashPpt.unduh(x, $('lbWrap').querySelector('.lb-doc')).catch(function (er) { A().toast('PPT gagal dibuat: ' + er.message, 7000); }).then(function () { b.disabled = false; b.textContent = t1; }); }
    if (x === 'word') { b.disabled = true; var t0 = b.textContent; b.textContent = 'Menyiapkan…'; unduhWord().catch(function (er) { A().toast('Word gagal dibuat: ' + er.message, 7000); }).then(function () { b.disabled = false; b.textContent = t0; }); }
  }
  function namaFile(ext) { var p = per(); return 'Laporan ' + TEMA[L.jenis].nama + ' ' + p.nama + ' - UPDL Semarang.' + ext; }

  /* ---------- PDF: cetak isi pratinjau lewat iframe (A4, halaman risk register lanskap) ---------- */
  function cssLaporan() { var s = document.getElementById('lbCssCetak'); return s ? s.textContent : ''; }
  function cetakPdf() {
    var doc = $('lbWrap').querySelector('.lb-doc').cloneNode(true); doc.removeAttribute('contenteditable');
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(namaFile('pdf').replace(/\.pdf$/, '')) + '</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700&display=swap"><style>' + cssLaporan() + '</style></head><body class="lb-cetak">' + doc.outerHTML + '</body></html>'); d.close();
    var siap = d.fonts && d.fonts.ready ? Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, 2500); })]) : Promise.resolve();
    siap.then(function () { return new Promise(function (r) { setTimeout(r, 300); }); }).then(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { A().toast('Dialog cetak tidak bisa dibuka: ' + e.message); } setTimeout(function () { f.remove(); }, 60000); });
    A().toast('Pilih "Simpan sebagai PDF" di dialog cetak, ukuran kertas A4.', 6000);
  }

  /* ---------- WORD: susun .docx dari isi pratinjau (termasuk suntingan) ---------- */
  function muatDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = 'assets/vendor/docx-9.8.1.iife.js'; s.onload = function () { ok(window.docx); }; s.onerror = function () { gagal(new Error('pustaka Word tidak termuat')); }; document.head.appendChild(s); });
  }
  /* Inter disematkan ke SVG banner agar hasil PNG (Word) tetap rapi meski Inter tidak terpasang di komputer */
  var fontP = null;
  function fontInter() {
    if (fontP) return fontP;
    var b64 = function (ab) { var u = new Uint8Array(ab), t = ''; for (var i = 0; i < u.length; i += 8192) t += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(t); };
    fontP = fetch('https://fonts.googleapis.com/css2?family=Inter:wght@600;700&display=swap').then(function (r) { return r.text(); }).then(function (css) {
      var blok = css.split('@font-face').filter(function (x) { return /U\+0000-00FF/.test(x); });
      return Promise.all(blok.map(function (x) {
        var url = (x.match(/url\(([^)]+)\)/) || [])[1], w = (x.match(/font-weight:\s*(\d+)/) || [])[1];
        return url ? fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return '@font-face{font-family:Inter;font-weight:' + w + ';src:url(data:font/woff2;base64,' + b64(ab) + ') format("woff2")}'; }) : '';
      }));
    }).then(function (L) { return L.join(''); }).catch(function () { return ''; });
    return fontP;
  }
  function svgKePng(svg) {
    if (svg.classList.contains('lb-banner') && !svg.__font) return fontInter().then(function (css) { var c = svg.cloneNode(true); c.__font = 1; if (css) { var st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = css; c.insertBefore(st, c.firstChild); } c.classList.add('lb-banner'); return svgKePng2(c); });
    return svgKePng2(svg);
  }
  function svgKePng2(svg) {
    return new Promise(function (ok) {
      var W = +svg.getAttribute('width') || 640, H = +svg.getAttribute('height') || 200, img = new Image(), sk = svg.classList.contains('lb-banner') ? 3 : 2;
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
          var tanpa = tb.hasAttribute('data-tanpa-garis'), sampulT = tb.classList.contains('lb-cov'), tahan = tb.classList.contains('lb-ttd') || tb.classList.contains('lb-peta'), trs = Array.prototype.slice.call(tb.querySelectorAll(':scope > thead > tr, :scope > tbody > tr'));
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
              var chips = c.querySelectorAll('.lb-chip'), chipEl = chips.length === 1 ? chips[0] : null, bg = hexOk(c.getAttribute('data-bg')) || (chipEl ? hexOk(chipEl.getAttribute('data-bg')) : undefined) || (kepala ? T.ac : undefined), fg = hexOk(c.getAttribute('data-fg')) || (kepala ? 'FFFFFF' : undefined);
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
            if (tg === 'SVG' && n.classList.contains('lb-banner')) { var ib = PNG.get(n); if (ib) out.push(new X.Paragraph({ spacing: { after: 0 }, children: [new X.ImageRun({ type: 'png', data: ib.data, transformation: { width: 794, height: Math.round(794 * ib.h / ib.w) },
              floating: { horizontalPosition: { relative: X.HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: X.VerticalPositionRelativeFrom.PAGE, offset: 0 }, wrap: { type: X.TextWrappingType.TOP_AND_BOTTOM }, allowOverlap: true, lockAnchor: true } })] })); return; }
            if (tg === 'SVG') { var im = PNG.get(n); if (im) { var sk = Math.min(1, (lebar / 15) / im.w); out.push(new X.Paragraph({ alignment: X.AlignmentType.CENTER, spacing: { after: 80 }, children: [new X.ImageRun({ type: 'png', data: im.data, transformation: { width: Math.round(im.w * sk), height: Math.round(im.h * sk) } })] })); } return; }
            if (tg === 'H2') { out.push(new X.Paragraph({ heading: X.HeadingLevel.HEADING_1, keepNext: true, shading: { fill: T.ac, type: X.ShadingType.CLEAR, color: 'auto' }, indent: { left: 120, right: 120 }, border: { right: { style: X.BorderStyle.SINGLE, size: 48, color: T.ac2, space: 6 } }, spacing: { before: 280, after: 120, line: 300 }, children: [new X.TextRun({ text: '  ', font: 'Arial' })].concat(runs(n, { c: 'FFFFFF', b: true, sz: 26 })) })); return; }
            if (tg === 'H1' || tg === 'H3') { out.push(new X.Paragraph({ heading: X.HeadingLevel.HEADING_2, keepNext: true, children: runs(n, {}) })); return; }
            if (tg === 'P') { if (n.classList.contains('lb-ruang')) { out.push(new X.Paragraph({ keepNext: true, spacing: { before: 700 }, children: [] })); return; } out.push(para(n, f, Object.assign(f.tengah ? { alignment: X.AlignmentType.CENTER } : {}, n.classList.contains('lb-cap') ? { keepNext: true } : {}))); return; }
            if (tg === 'OL' || tg === 'UL') { var inst = ++nOl; Array.prototype.forEach.call(n.children, function (li) { out.push(new X.Paragraph({ children: runs(li, f), numbering: { reference: tg === 'OL' ? 'ol' : 'ul', level: 0, instance: inst }, spacing: { after: 60 }, alignment: X.AlignmentType.JUSTIFIED })); }); return; }
            if (tg === 'TABLE') { out.push(tabelDocx(n, lebar)); out.push(new X.Paragraph({ spacing: { after: 80 }, children: [] })); return; }
            blok(n, out, lebar, f);   // div, section, dll.
          });
          siram();
        }
        var sections = Array.prototype.map.call(root.querySelectorAll(':scope > .lb-pg'), function (pg) {
          var land = pg.classList.contains('landscape'), mg = 1191, lebar = (land ? 16838 : 11906) - 2 * mg, isi = [];
          blok(pg, isi, lebar, {});
          return { properties: { page: { size: { width: 11906, height: 16838, orientation: land ? X.PageOrientation.LANDSCAPE : X.PageOrientation.PORTRAIT }, margin: { top: land ? 737 : 1191, bottom: land ? 737 : 1191, left: mg, right: mg } } },
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
