/* PowerPoint bulanan dari data Kontrak Manajemen, mengikuti contoh format UPDL:
   (1) Monthly Trajectory — satu slide per indikator: tabel KPI + grafik target vs realisasi Jan–Des.
   (2) Performance Dialog — sampul, tabel Realisasi Kontrak Manajemen, lalu satu slide rincian per indikator.
   Explanation & Action Step diambil dari suntingan di layar Laporan bulanan bila sudah diisi; bila belum, diberi latar kuning. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash;
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var TEAL = '085E74', BIRU = '4472C4', MERAH = 'E8433A', ABU = '4D4D4D', F = 'Arial';
  var IMG = 'assets/ppt/';

  function muat() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = 'assets/vendor/pptxgen-4.0.1.bundle.js'; s.onload = function () { ok(window.PptxGenJS); }; s.onerror = function () { gagal(new Error('pustaka PowerPoint tidak termuat')); }; document.head.appendChild(s); });
  }
  function bersih(t) { return String(t === null || t === undefined ? '' : t).replace(/\s+/g, ' ').trim(); }
  function status(v) { return v === null || v === undefined ? { c: 'A0A6B5', t: 'Belum ada data' } : v >= 0.9999 ? { c: '00B050', t: 'On track' } : v >= 0.95 ? { c: 'FFC000', t: '< 5% underperformance' } : { c: 'FF0000', t: '> 5% underperformance' }; }
  function denganSatuan(d, sat) { d = bersih(d); if (!d) return '–'; sat = bersih(sat); if (sat === '%') return /%$/.test(d) ? d : d + '%'; return sat && !/waktu/i.test(sat) && !/^SM ?\d/i.test(sat) ? d + ' ' + sat : d; }
  /* isi suntingan dari layar Laporan bulanan (bila ada) */
  function suntingan(doc, it) {
    var o = { ket: '', as: '' }; if (!doc) return o;
    var blok = doc.querySelector('.lb-ind[data-baris="' + it.baris + '"]'); if (!blok) return o;
    var ambil = function (sel, label) {
      var p = blok.querySelector(sel); if (!p) return '';
      var c = p.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('.kuning:not(.terisi)'), function (k) { k.remove(); });
      return bersih(c.textContent.replace(label, ''));
    };
    o.as = ambil('.lb-as', /^\s*Action step:\s*/i);
    var ana = blok.querySelector('.lb-ana .kuning.terisi'); if (ana) o.ket = bersih(ana.textContent);
    return o;
  }
  /* deret target & realisasi 12 bulan, skala disamakan (sama seperti grafik laporan) */
  function deret(it) {
    var K = A().K(), BUL = D.BULAN;
    var ang = function (x) { if (x === null || x === undefined || x === '' || /^\d{4}-\d{2}-\d{2}/.test(String(x))) return null; var n = D.num(x); return n === null || isNaN(n) ? null : n; };
    var waktu = /waktu/i.test(it.satuan || '') || K.months.some(function (m) { return it.target[m] && /^\d{4}-\d{2}-\d{2}/.test(String(it.target[m].v)); });
    var persen = /%/.test(it.satuan || ''), t = [], r = [];
    BUL.forEach(function (m) {
      var ada = K.months.indexOf(m) >= 0 && D.hasData(it, m);
      if (waktu) { var c = ada ? D.capaianItem(it, m) : null; t.push(ada ? 100 : null); r.push(c === null || c === undefined ? null : Math.round(c * 1000) / 10); return; }
      var tv = it.target[m] ? ang(it.target[m].v) : null, rv = ada ? ang(it.real[m].v) : null;
      if (!ada && tv === 0) tv = null;
      if (persen && rv !== null && tv !== null) { if (tv > 2 && Math.abs(rv) <= 2) rv *= 100; else if (rv > 2 && Math.abs(tv) <= 2) tv *= 100; }
      t.push(tv); r.push(rv);
    });
    return { t: t, r: r, waktu: waktu };
  }
  function indikator() { return A().K().items.filter(function (it) { return !it.isGroup && !it.pengurang; }); }

  /* ---------------- MONTHLY TRAJECTORY ---------------- */
  function kop(s, judul, pp) {
    s.addImage({ path: IMG + 'danantara.png', x: 0.35, y: 0.28, w: 1.25, h: 0.36 });
    s.addImage({ path: IMG + 'pln.png', x: 11.9, y: 0.22, w: 1.15, h: 0.41 });
    s.addText(judul, { x: 1.8, y: 0.15, w: 9.6, h: 0.65, fontFace: F, fontSize: judul.length > 70 ? 15 : 18, bold: true, color: TEAL, valign: 'middle', margin: 0, isTextBox: true });
    s.addImage({ path: IMG + 'pita.png', x: 0, y: 7.18, w: 13.333, h: 0.32 });
  }
  function legenda(s, y) {
    [['KPI tracked by KBUMN', 'FFFFFF', 'A0A6B5'], ['On track', '00B050'], ['< 5% underperformance', 'FFC000'], ['> 5% underperformance', 'FF0000']].forEach(function (l, i) {
      var x = 5.2 + i * 2.05;
      s.addShape('ellipse', { x: x, y: y + 0.05, w: 0.13, h: 0.13, fill: { color: l[1] }, line: { color: l[2] || l[1], width: 0.75 } });
      s.addText(l[0], { x: x + 0.18, y: y, w: 1.85, h: 0.23, fontFace: F, fontSize: 8, color: ABU, margin: 0, valign: 'middle', isTextBox: true });
    });
  }
  function trajectory(P, doc) {
    var a = A(), Bn = a.B(), S = a.S, bl = BLN[S.bulan - 1] + ' ' + S.tahun, L = indikator();
    var pres = new P(); pres.layout = 'LAYOUT_WIDE'; pres.title = 'Monthly Trajectory ' + bl + ' - UPDL Semarang'; pres.company = 'PLN UPDL Semarang';
    var cap = L.map(function (it) { return D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null; });
    var h = cap.filter(function (v) { return v !== null && v >= 0.9999; }).length, k = cap.filter(function (v) { return v !== null && v >= 0.95 && v < 0.9999; }).length, m = cap.filter(function (v) { return v !== null && v < 0.95; }).length;
    // 1. ringkasan
    var s = pres.addSlide(); kop(s, 'Strategi Pencapaian Kinerja Unit Pelaksana');
    var baris = [[{ text: 'No', options: { bold: true, color: 'FFFFFF', fill: { color: BIRU } } }, { text: 'Indikator kinerja', options: { bold: true, color: 'FFFFFF', fill: { color: BIRU } } }, { text: 'Capaian', options: { bold: true, color: 'FFFFFF', fill: { color: BIRU }, align: 'center' } }, { text: '', options: { fill: { color: BIRU } } }]];
    L.forEach(function (it, i) { var st = status(cap[i]); baris.push([a.labelNo(it), it.pendek || it.nama, { text: cap[i] === null ? '–' : D.pct(cap[i], 0), options: { align: 'center' } }, { text: '●', options: { color: st.c, align: 'center', fontSize: 11 } }]); });
    s.addTable(baris, { x: 0.45, y: 0.95, w: 7.3, colW: [0.5, 5.3, 0.9, 0.6], fontFace: F, fontSize: L.length > 18 ? 7.5 : 8.5, color: '222222', border: { type: 'solid', pt: 0.5, color: 'D0D5DD' }, rowH: 0.24, margin: [1, 4, 1, 4] });
    s.addText([
      { text: 'Kinerja Unit Pelaksana pada tahun ' + S.tahun + ' terdapat ', options: {} }, { text: String(L.length), options: { bold: true } }, { text: ' indikator kinerja.', options: { breakLine: true } },
      { text: ' ', options: { breakLine: true, fontSize: 6 } },
      { text: 'Sampai bulan ' + bl + ', terdapat ' + h + ' indikator pada kategori Hijau (pencapaian ≥ 100%)' + (k ? ', ' + k + ' indikator Kuning (95% – < 100%)' : '') + (m ? ', dan ' + m + ' indikator Merah (< 95%)' : '') + '.', options: { breakLine: true } },
      { text: ' ', options: { breakLine: true, fontSize: 6 } },
      { text: 'Skor Kontrak Manajemen ' + bl + ': ', options: {} }, { text: D.fmt(a.totalSkor(Bn), 2), options: { bold: true, color: TEAL } }, { text: ' (setelah pengurang kepatuhan).', options: {} }
    ], { x: 8.1, y: 1.3, w: 4.8, h: 3.6, fontFace: F, fontSize: 15, color: '222222', valign: 'top', paraSpaceAfter: 6, isTextBox: true });
    // 2. satu slide per indikator
    L.forEach(function (it, i) {
      var s2 = pres.addSlide(), st = status(cap[i]), su = suntingan(doc, it), dr = deret(it);
      kop(s2, a.labelNo(it) + '. ' + it.nama); legenda(s2, 0.85);
      s2.addShape('ellipse', { x: 11.45, y: 0.32, w: 0.26, h: 0.26, fill: { color: st.c }, line: { color: st.c } });
      var hd = ['KPI', 'Units', 'Target Sem II ' + S.tahun, 'Target ' + bl, 'Realisasi ' + bl, 'PIC', 'Explanation', 'Action Step'].map(function (t) { return { text: t, options: { bold: true, color: 'FFFFFF', fill: { color: BIRU }, align: 'center', valign: 'middle' } }; });
      var ket = bersih(it.ket && it.ket[Bn]) || su.ket, as = su.as;
      var kuning = function (t) { return { text: t, options: { highlight: 'FFFF00', color: '5A4A00' } }; };
      s2.addTable([hd, [it.pendek || it.nama, bersih(it.satuan), { text: bersih(it.target2) || '–', options: { align: 'center' } }, { text: bersih(it.target[Bn] && it.target[Bn].d) || '–', options: { align: 'center' } },
        { text: D.hasData(it, Bn) ? bersih(it.real[Bn].d) : '–', options: { align: 'center', bold: true, color: st.c === '00B050' ? '1F7A3A' : st.c === 'FF0000' ? 'C00000' : '222222' } }, { text: bersih(it.pic) || '–', options: { align: 'center' } },
        ket ? ket : { text: [kuning('[isi explanation]')] }, as ? as : { text: [kuning('[isi action step]')] }]],
        { x: 0.45, y: 1.2, w: 12.45, colW: [2.0, 0.95, 1.05, 1.05, 1.05, 0.8, 3.0, 2.55], fontFace: F, fontSize: ket.length > 300 ? 7 : 8.5, color: '222222', valign: 'middle', border: { type: 'solid', pt: 0.5, color: 'BFC6D4' }, margin: [3, 4, 3, 4] });
      var ada = dr.t.concat(dr.r).some(function (v) { return v !== null; });
      if (ada) s2.addChart('bar', [{ name: dr.waktu ? 'Target (%)' : 'Target', labels: BL3, values: dr.t }, { name: dr.waktu ? 'Capaian (%)' : 'Realisasi', labels: BL3, values: dr.r }], {
        x: 0.45, y: (ket.length + as.length) > 200 ? 3.35 : 2.25, w: 12.45, h: (ket.length + as.length) > 200 ? 3.75 : 4.85, barGrouping: 'clustered', barGapWidthPct: 60, chartColors: [BIRU, MERAH],
        showTitle: true, title: it.pendek || it.nama, titleFontFace: F, titleFontSize: 12, titleColor: '333333',
        showLegend: true, legendPos: 't', legendFontSize: 9, legendFontFace: F,
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 7, dataLabelFontFace: F, dataLabelColor: '444444', dataLabelFormatCode: dr.waktu ? '0' : '#,##0.##',
        catAxisLabelColor: '555555', catAxisLabelFontSize: 9, catAxisLabelFontFace: F, valAxisHidden: true, valAxisMinVal: 0, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }
      });
    });
    return pres.writeFile({ fileName: 'Monthly Trajectory ' + bl + ' - UPDL Semarang.pptx' });
  }

  /* ---------------- PERFORMANCE DIALOG ---------------- */
  function kakiPd(s, no) {
    s.addImage({ path: IMG + 'pita.png', x: 0, y: 6.95, w: 11.2, h: 0.55 });
    s.addText([{ text: 'www.pln.co.id', options: {} }, { text: '   |  ' + ('0' + no).slice(-2), options: { color: '7C8399' } }], { x: 11.15, y: 7.0, w: 2.0, h: 0.35, fontFace: F, fontSize: 9, color: '333333', align: 'right', margin: 0, isTextBox: true });
    s.addImage({ path: IMG + 'pln.png', x: 11.9, y: 0.25, w: 1.15, h: 0.41 });
  }
  function performance(P, doc) {
    var a = A(), Bn = a.B(), S = a.S, bl = BLN[S.bulan - 1] + ' ' + S.tahun, blp = BL3[S.bulan - 1] + ' ' + S.tahun, K = a.K(), no = 1;
    var pres = new P(); pres.layout = 'LAYOUT_WIDE'; pres.title = 'Performance Dialog ' + bl + ' - UPDL Semarang'; pres.company = 'PLN UPDL Semarang';
    // sampul
    var s = pres.addSlide(); s.background = { path: IMG + 'sampul.jpg' };
    s.addImage({ path: IMG + 'danantara-putih.png', x: 0.4, y: 0.35, w: 1.6, h: 0.51 });
    s.addImage({ path: IMG + 'pln-putih.png', x: 11.85, y: 0.3, w: 1.2, h: 0.42 });
    s.addText([{ text: 'PERFORMANCE', options: { breakLine: true } }, { text: 'DIALOG', options: { breakLine: true } }, { text: 'UPDL SEMARANG', options: { color: 'F7E82E' } }], { x: 0.55, y: 2.0, w: 6.5, h: 2.4, fontFace: F, fontSize: 40, bold: true, color: 'FFFFFF', valign: 'top', margin: 0, isTextBox: true, lineSpacingMultiple: 0.95 });
    s.addText(bl, { x: 0.55, y: 4.6, w: 6, h: 0.6, fontFace: F, fontSize: 26, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true });
    // tabel realisasi kontrak manajemen (grup + anak), dipecah per slide
    var hd = ['NO', 'INDIKATOR KINERJA', 'POLARITAS', 'FORMULA', 'SATUAN', 'BOBOT SMT II', 'TARGET SMT II', 'TARGET ' + BLN[S.bulan - 1].toUpperCase() + ' ' + S.tahun, 'REALISASI ' + BLN[S.bulan - 1].toUpperCase() + ' ' + S.tahun, 'PENCAPAIAN', 'NILAI']
      .map(function (t) { return { text: t, options: { bold: true, color: 'FFFFFF', fill: { color: '4F81BD' }, align: 'center', valign: 'middle', fontSize: 8 } }; });
    var rows = K.items.filter(function (it) { return !it.pengurang; }).map(function (it) {
      var c = it.isGroup ? null : D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null, pol = String(it.polaritas || '');
      var polT = /min|turun|↓|negatif/i.test(pol) ? '↓' : pol ? '↑' : '';
      return [{ text: it.level ? '' : String(it.no || ''), options: { align: 'center' } }, { text: it.namaAsli || it.nama, options: { bold: !!it.isGroup } }, { text: it.isGroup ? '' : polT, options: { align: 'center', fontSize: 10 } }, bersih(it.formula), { text: bersih(it.satuan), options: { align: 'center' } },
        { text: bersih(it.bobot2), options: { align: 'center' } }, { text: it.isGroup ? '' : bersih(it.target2), options: { align: 'center' } }, { text: it.isGroup ? '' : bersih(it.target[Bn] && it.target[Bn].d), options: { align: 'center' } },
        { text: it.isGroup ? '' : D.hasData(it, Bn) ? bersih(it.real[Bn].d) : '', options: { align: 'center', fill: it.isGroup ? { color: 'E7E9EE' } : undefined } }, { text: c === null ? '' : D.pct(c, 0), options: { align: 'center' } },
        { text: it.skor[Bn] === null || it.skor[Bn] === undefined || it.isGroup ? '' : D.fmt(it.skor[Bn], 2), options: { align: 'center' } }];
    });
    var tinggi = K.items.filter(function (it) { return !it.pengurang; }).map(function (it) { var n = Math.max(1, Math.ceil(String(it.namaAsli || it.nama).length / 40), Math.ceil(bersih(it.formula).length / 48)); return 0.16 * n + 0.09; });
    var potong = [], mulai = 0, jml = 0;
    tinggi.forEach(function (h, j) { if (jml + h > 5.6 && j > mulai) { potong.push([mulai, j]); mulai = j; jml = 0; } jml += h; }); potong.push([mulai, tinggi.length]);
    potong.forEach(function (pt) {
      var i = pt[0], per = pt[1] - pt[0];
      var t = pres.addSlide(); no++;
      t.addText('REALISASI KONTRAK MANAJEMEN', { x: 0.45, y: 0.25, w: 9, h: 0.5, fontFace: F, fontSize: 20, bold: true, color: TEAL, margin: 0, isTextBox: true });
      t.addShape('line', { x: 0.45, y: 0.8, w: 1.2, h: 0, line: { color: TEAL, width: 2 } });
      t.addTable([hd].concat(rows.slice(i, i + per)), { x: 0.45, y: 1.0, w: 12.45, colW: [0.4, 2.6, 0.75, 2.9, 0.85, 0.75, 0.95, 0.95, 0.95, 0.75, 0.6], fontFace: F, fontSize: 8.5, color: '222222', valign: 'middle', border: { type: 'solid', pt: 0.5, color: '9AA3B5' }, margin: [2, 3, 2, 3] });
      kakiPd(t, no);
    });
    // rincian per indikator
    indikator().forEach(function (it) {
      var d = pres.addSlide(), c = D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null, st = status(c), su = suntingan(doc, it); no++;
      d.addText(a.labelNo(it) + '. ' + it.nama, { x: 0.45, y: 0.2, w: 10.6, h: 0.7, fontFace: F, fontSize: it.nama.length > 70 ? 15 : 18, bold: true, color: TEAL, valign: 'middle', margin: 0, isTextBox: true });
      d.addShape('line', { x: 0.45, y: 0.95, w: 1.2, h: 0, line: { color: TEAL, width: 2 } });
      d.addShape('ellipse', { x: 11.4, y: 0.3, w: 0.32, h: 0.32, fill: { color: st.c }, line: { color: st.c } });
      var sat = bersih(it.satuan), ket = bersih(it.ket && it.ket[Bn]) || su.ket;
      var kv = [['Indikator', it.nama], ['Formula', bersih(it.formula) || '–'], ['Target SMT II ' + S.tahun, denganSatuan(it.target2, sat)], ['Target s.d. ' + blp, denganSatuan(it.target[Bn] && it.target[Bn].d, sat)],
        ['Realisasi s.d. ' + blp, D.hasData(it, Bn) ? denganSatuan(it.real[Bn].d, sat) + (c === null ? '' : ' (' + D.pct(c, 0) + ')') : '–'], ['Keterangan', ket || null]];
      var y = 1.35;
      kv.forEach(function (r) {
        var pj = r[1] ? Math.max(1, Math.ceil(r[1].length / 95)) : 1, hh = 0.32 * pj + 0.06;
        d.addText(r[0], { x: 1.0, y: y, w: 2.3, h: hh, fontFace: F, fontSize: 12, bold: true, color: TEAL, valign: 'top', margin: 0, isTextBox: true });
        d.addText(':', { x: 3.3, y: y, w: 0.2, h: hh, fontFace: F, fontSize: 12, color: TEAL, valign: 'top', margin: 0, isTextBox: true });
        d.addText(r[1] ? r[1] : [{ text: '[isi keterangan]', options: { highlight: 'FFFF00', color: '5A4A00' } }], { x: 3.55, y: y, w: 8.6, h: hh, fontFace: F, fontSize: 12, color: '333333', valign: 'top', align: 'justify', margin: 0, isTextBox: true });
        y += hh + 0.1;
      });
      if (su.as) { d.addText([{ text: 'Action step: ', options: { bold: true, color: TEAL } }, { text: su.as }], { x: 1.0, y: Math.min(y + 0.1, 6.2), w: 11.15, h: 0.6, fontFace: F, fontSize: 11, color: '333333', valign: 'top', margin: 0, isTextBox: true }); }
      kakiPd(d, no);
    });
    return pres.writeFile({ fileName: 'Performance Dialog ' + bl + ' - UPDL Semarang.pptx' });
  }

  /* ---------------- PRATINJAU ----------------
     Perekam tiruan PptxGenJS: fungsi trajectory/performance yang sama dijalankan, tetapi setiap addText/addTable/…
     dicatat lalu digambar ulang sebagai HTML. Jadi pratinjau selalu sama dengan isi file yang akan diunduh. */
  function Rekam() { this.slides = []; }
  Rekam.prototype.addSlide = function () {
    var s = { el: [], bg: null }, o = {
      addImage: function (p) { s.el.push(['img', p]); }, addText: function (t, p) { s.el.push(['txt', t, p || {}]); },
      addShape: function (k, p) { s.el.push(['shp', k, p || {}]); }, addTable: function (r, p) { s.el.push(['tbl', r, p || {}]); },
      addChart: function (k, d, p) { s.el.push(['cht', d, p || {}]); }
    };
    Object.defineProperty(o, 'background', { set: function (v) { s.bg = v; } });
    this.slides.push(s); return o;
  };
  Rekam.prototype.writeFile = function () { return Promise.resolve(this.slides); };
  var W = 13.333, H = 7.5;
  function e(t) { return String(t === null || t === undefined ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function kotakCss(o) { return 'left:' + (o.x / W * 100) + '%;top:' + (o.y / H * 100) + '%;width:' + (o.w / W * 100) + '%;height:' + ((o.h || 0) / H * 100) + '%;'; }
  function fz(pt) { return 'font-size:calc(' + (pt || 12) + ' * 100cqw / 960);'; }
  function warna(c) { return c ? '#' + c : 'inherit'; }
  function runs(t, base) {
    if (!Array.isArray(t)) return e(t).replace(/\n/g, '<br>');
    return t.map(function (r) {
      var o = r.options || {}, st = (o.bold ? 'font-weight:700;' : '') + (o.color ? 'color:#' + o.color + ';' : '') + (o.highlight ? 'background:#' + o.highlight + ';' : '') + (o.fontSize ? fz(o.fontSize) : '');
      return '<span style="' + st + '">' + e(r.text) + '</span>' + (o.breakLine ? '<br>' : '');
    }).join('');
  }
  function sel(c, def, mg) {
    var o = {}, t = c; if (c && typeof c === 'object' && !Array.isArray(c)) { o = c.options || {}; t = c.text; }
    var st = 'padding:' + mg.map(function (m) { return 'calc(' + m + ' * 100cqw / 960)'; }).join(' ') + ';text-align:' + (o.align || 'left') + ';vertical-align:' + (o.valign === 'middle' ? 'middle' : o.valign === 'bottom' ? 'bottom' : def.valign === 'middle' ? 'middle' : 'top') + ';' +
      (o.fill && o.fill.color ? 'background:#' + o.fill.color + ';' : '') + (o.bold ? 'font-weight:700;' : '') + (o.color ? 'color:#' + o.color + ';' : '') + (o.fontSize ? fz(o.fontSize) : '');
    return '<td style="' + st + '">' + runs(t) + '</td>';
  }
  function grafik(d, o) {
    var w = o.w * 72, h = o.h * 72, top = (o.showTitle ? 22 : 6) + (o.showLegend ? 16 : 0), bot = 18, ih = h - top - bot, n = d[0].labels.length, gw = (w - 20) / n;
    var mx = 0; d.forEach(function (s) { s.values.forEach(function (v) { if (v !== null && v > mx) mx = v; }); }); if (!mx) mx = 1;
    var bw = gw * 0.62 / d.length, cs = o.chartColors || ['4472C4', 'E8433A'], g = '';
    if (o.showTitle) g += '<text x="' + w / 2 + '" y="15" text-anchor="middle" font-size="' + (o.titleFontSize || 12) + '" fill="#333">' + e(o.title) + '</text>';
    if (o.showLegend) d.forEach(function (s, i) { var lx = w / 2 - 70 + i * 90; g += '<rect x="' + lx + '" y="' + (top - 13) + '" width="8" height="8" fill="#' + cs[i] + '"/><text x="' + (lx + 12) + '" y="' + (top - 6) + '" font-size="9" fill="#444">' + e(s.name) + '</text>'; });
    d[0].labels.forEach(function (l, j) {
      var x0 = 10 + j * gw + gw * 0.19;
      d.forEach(function (s, i) {
        var v = s.values[j]; if (v === null || v === undefined) return;
        var bh = Math.max(0, ih * 0.9 * v / mx), x = x0 + i * bw, y = top + ih - bh;
        g += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 1).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="#' + cs[i] + '"/>';
        g += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" text-anchor="middle" font-size="7" fill="#444">' + D.fmt(v, v % 1 ? 2 : 0) + '</text>';
      });
      g += '<text x="' + (10 + j * gw + gw / 2).toFixed(1) + '" y="' + (h - 5) + '" text-anchor="middle" font-size="9" fill="#555">' + e(l) + '</text>';
    });
    g += '<line x1="10" x2="' + (w - 10) + '" y1="' + (top + ih) + '" y2="' + (top + ih) + '" stroke="#BFC6D4" stroke-width=".75"/>';
    return '<svg class="pp-el" style="' + kotakCss(o) + '" viewBox="0 0 ' + w + ' ' + h + '" font-family="Arial">' + g + '</svg>';
  }
  function gambarSlide(s) {
    var h = '';
    s.el.forEach(function (x) {
      var k = x[0], o = x[k === 'img' ? 1 : 2];
      if (k === 'img') h += '<img class="pp-el" alt="" src="' + e(o.path) + '" style="' + kotakCss(o) + '">';
      else if (k === 'txt') {
        var jv = o.valign === 'middle' ? 'center' : o.valign === 'bottom' ? 'flex-end' : 'flex-start';
        h += '<div class="pp-el pp-tx" style="' + kotakCss(o) + 'justify-content:' + jv + ';text-align:' + (o.align === 'justify' ? 'justify' : o.align || 'left') + ';' + fz(o.fontSize) + 'color:' + warna(o.color) + ';' + (o.bold ? 'font-weight:700;' : '') + (o.lineSpacingMultiple ? 'line-height:' + o.lineSpacingMultiple + ';' : '') + '"><div>' + runs(x[1]) + '</div></div>';
      } else if (k === 'shp') {
        if (x[1] === 'line') h += '<div class="pp-el" style="' + kotakCss(o) + 'border-top:' + (((o.line || {}).width || 1) / 72 / W * 100) + 'cqw solid #' + ((o.line || {}).color || '000') + ';"></div>';
        else h += '<div class="pp-el" style="' + kotakCss(o) + 'border-radius:50%;background:#' + ((o.fill || {}).color || 'ccc') + ';box-shadow:inset 0 0 0 1px #' + ((o.line || {}).color || 'ccc') + ';"></div>';
      } else if (k === 'tbl') {
        var cw = o.colW || [], mg = o.margin || [2, 3, 2, 3];
        h += '<table class="pp-el pp-tb" style="' + kotakCss(o).replace(/height:[^;]*;/, '') + fz(o.fontSize) + 'color:#' + (o.color || '222') + ';--bd:#' + ((o.border || {}).color || 'ccc') + ';"><colgroup>' + cw.map(function (c) { return '<col style="width:' + (c / o.w * 100) + '%">'; }).join('') + '</colgroup>' +
          x[1].map(function (r) { return '<tr' + (o.rowH ? ' style="height:calc(' + (o.rowH * 72) + ' * 100cqw / 960)"' : '') + '>' + r.map(function (c) { return sel(c, o, mg); }).join('') + '</tr>'; }).join('') + '</table>';
      } else if (k === 'cht') h += grafik(x[1], o);
    });
    return '<div class="pp-sl"' + (s.bg && s.bg.path ? ' style="background-image:url(\'' + e(s.bg.path) + '\')"' : '') + '>' + h + '</div>';
  }

  window.DashPpt = {
    pratinjau: function (jenis, doc) {
      if (!A().konmanAda(A().B())) return Promise.reject(new Error('realisasi Konman bulan ini belum diisi'));
      return (jenis === 'traj' ? trajectory(Rekam, doc) : performance(Rekam, doc)).then(function (sl) { return { n: sl.length, html: sl.map(function (x, i) { return '<figure class="pp-f">' + gambarSlide(x) + '<figcaption>Slide ' + (i + 1) + '</figcaption></figure>'; }).join('') }; });
    },
    unduh: function (jenis, doc) {
      if (!A().konmanAda(A().B())) return Promise.reject(new Error('realisasi Konman bulan ini belum diisi'));
      return muat().then(function (P) { return jenis === 'traj' ? trajectory(P, doc) : performance(P, doc); }).then(function () { A().toast('PowerPoint terunduh. Bagian berlatar kuning masih perlu diisi.', 6000); });
    }
  };
})();
