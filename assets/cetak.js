/* Cetak / Simpan PDF: laporan disusun khusus untuk kertas A4 tegak (sama di Safari & Chrome).
   Pilihan: Ringkas 1 halaman · Lengkap per bagian · Halaman yang sedang dibuka. */
(function () {
  var A = window.DashApp, D = window.Dash; if (!A || !D) return;
  var $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var LEBAR = 900;                  // lebar tata letak isi (px) sebelum diperkecil ke kertas
  var MM = 96 / 25.4;               // px per mm
  var KERTAS = { w: 190 * MM, h: 277 * MM };   // A4 tegak dikurangi margin 10 mm

  var BAG = [
    { k: ['bulanan'], n: 'Capaian Kinerja per Bulan' }, { k: ['indikator'], n: 'Indikator Kinerja & Maturity' },
    { k: ['kepatuhan'], n: 'Kepatuhan & Perbaikan Berkelanjutan' }, { k: ['ringkasan', 'evaluasi'], n: 'Pembelajaran & Evaluasi' },
    { k: ['pengembangan'], n: 'Pengembangan Pegawai & Inovasi' }, { k: ['isu'], n: 'Isu & Pihak Berkepentingan' },
    { k: ['risiko'], n: 'Peta Risiko' }, { k: ['kri'], n: 'Key Risk Indicator' }, { k: ['fraud'], n: 'Risiko Fraud (FRA)' }
  ];
  var TAB = { kinerja: ['bulanan', 'indikator', 'kepatuhan'], pembelajaran: ['ringkasan'], evaluasi: ['evaluasi'], sdm: ['pengembangan'], risiko: ['isu', 'risiko', 'kri', 'fraud'] };

  function salin(el) {
    var c = el.cloneNode(true); c.hidden = false; c.removeAttribute('id');
    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
    Array.prototype.forEach.call(c.querySelectorAll('[hidden]'), function (x) { if (!x.closest('.modal')) x.hidden = false; });
    return c;
  }
  function sec(k) { return document.querySelector('main [data-bagian="' + k + '"]'); }
  function kop(judul) {
    var S = A.S, m = S.data.meta || {};
    return '<div class="cp-kop"><span class="cp-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/></svg></span>' +
      '<div><b>' + esc(m.judul || 'Dashboard Kinerja UPDL Semarang') + '</b><span>' + esc(judul) + '</span></div>' +
      '<div class="cp-per"><b>' + A.namaBulan(S.bulan) + ' ' + S.tahun + '</b><span>dicetak ' + new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + (m.user ? ' · ' + esc(m.user) : '') + '</span></div></div>';
  }
  function halaman(judul, isiHtmlAtauEl) {
    var pg = document.createElement('div'); pg.className = 'cp-page';
    pg.innerHTML = kop(judul) + '<div class="cp-body"><div class="cp-isi"></div></div><div class="cp-foot"><span>Sumber: spreadsheet Data Dashboard UPDL Semarang, Konman, Rendiklat, MLI Probis, Profil Risiko</span><span class="cp-no"></span></div>';
    var isi = pg.querySelector('.cp-isi');
    (Array.isArray(isiHtmlAtauEl) ? isiHtmlAtauEl : [isiHtmlAtauEl]).forEach(function (x) { if (typeof x === 'string') isi.insertAdjacentHTML('beforeend', x); else if (x) isi.appendChild(x); });
    return pg;
  }
  /* halaman ringkas: angka utama, tren, 6 angka kunci, perhatian, indikator di bawah target */
  function halRingkas() {
    var S = A.S, Bn = A.B(), rgk = $('rgk'), out = [];
    var top = rgk.querySelector('.rgk-hero'), tiles = rgk.querySelector('.rgk-t');
    var P = A.perhatian().slice(0, 6);
    var bawah = A.konmanAda(Bn) ? A.K().items.filter(function (it) { return !it.isGroup && !it.pengurang && D.hasData(it, Bn); })
      .map(function (it) { return { it: it, v: D.capaianItem(it, Bn) }; }).filter(function (x) { return x.v !== null && x.v !== undefined && x.v < 0.9999; })
      .sort(function (a, b) { return a.v - b.v; }) : [];
    if (top) out.push(salin(top));
    if (tiles) out.push(salin(tiles));
    var r2 = sec('bulanan'); if (r2) out.push(salin(r2));
    var ev = sec('evaluasi'); if (ev) out.push(salin(ev));
    out.push('<div class="cp-dua"><div class="cp-box"><h4>Perlu perhatian</h4>' + (P.length ? '<ul class="cp-ul">' + P.map(function (x) { return '<li data-st="' + x.c + '"><i></i><span>' + x.t + '</span></li>'; }).join('') + '</ul>' : '<p class="cp-ok">Tidak ada yang perlu perhatian.</p>') + '</div>' +
      '<div class="cp-box"><h4>Indikator belum mencapai target · ' + A.namaBulan(S.bulan) + '</h4>' + (bawah.length ? '<table class="cp-tb"><tbody>' + bawah.map(function (x) {
        var st = A.status(x.v); return '<tr><td>' + esc(A.labelNo ? A.labelNo(x.it) : '') + '</td><td>' + esc(x.it.pendek) + '</td><td class="' + st.c + '"><b>' + D.fmt(x.v * 100, 1) + '%</b></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="cp-ok">Semua indikator mencapai target.</p>') + '</div></div>');
    return halaman('Ringkasan kinerja', out);
  }
  function halBagian(b) {
    var el = b.k.map(sec).filter(Boolean).map(salin); if (!el.length) return null;
    return halaman(b.n, el);
  }
  function susun(jenis) {
    var w = $('cetakWrap'); w.innerHTML = '';
    var pages = [];
    if (jenis === 'ringkas') pages.push(halRingkas());
    else if (jenis === 'lengkap') { pages.push(halRingkas()); BAG.forEach(function (b) { if (b.k[0] === 'bulanan') return; var p = halBagian(b); if (p) pages.push(p); }); }   // grafik bulanan sudah ada di halaman ringkas
    else {
      var t = A.S.vt || 'semua';
      if (t === 'ringkasan') pages.push(halRingkas());
      else if (t === 'tugas') pages.push(halaman('Tugas Tim EPMK', salin($('tugas'))));
      else BAG.filter(function (b) { return t === 'semua' || b.k.some(function (k) { return (TAB[t] || []).indexOf(k) >= 0; }); })
        .forEach(function (b) { var p = halBagian({ k: t === 'semua' ? b.k : b.k.filter(function (k) { return TAB[t].indexOf(k) >= 0; }), n: b.n }); if (p) pages.push(p); });
    }
    pages.forEach(function (p, i) { p.querySelector('.cp-no').textContent = 'Halaman ' + (i + 1) + ' dari ' + pages.length; w.appendChild(p); });
    // skala tiap halaman: isi ditata pada lebar LEBAR lalu diperkecil agar muat satu kertas
    w.hidden = false;
    pages.forEach(function (p) {
      var body = p.querySelector('.cp-body'), isi = p.querySelector('.cp-isi');
      var ruangH = body.clientHeight, ruangW = body.clientWidth;
      isi.style.width = LEBAR + 'px'; isi.style.transform = '';
      var s = Math.min(ruangW / LEBAR, ruangH / isi.scrollHeight);
      isi.style.transform = 'scale(' + s.toFixed(4) + ')';
    });
    return pages.length;
  }
  function cetak(jenis) {
    var n = susun(jenis);
    document.body.classList.add('cetak-mode');
    var selesai = function () { document.body.classList.remove('cetak-mode'); $('cetakWrap').hidden = true; window.removeEventListener('afterprint', selesai); };
    window.addEventListener('afterprint', selesai);
    setTimeout(function () { window.print(); }, 120);
    return n;
  }
  function openCetak() {
    if (!A.S.data) return;
    var nama = { semua: 'Semua bagian', ringkasan: 'Ringkasan', kinerja: 'Kinerja Unit', pembelajaran: 'Rekap Pembelajaran', evaluasi: 'Evaluasi', sdm: 'SDM & Inovasi', risiko: 'Risiko & Mutu', tugas: 'Tugas Tim EPMK' }[A.S.vt || 'semua'];
    var pil = function (k, j, d, on) { return '<label class="cp-opt"><input type="radio" name="cpJenis" value="' + k + '"' + (on ? ' checked' : '') + '><span><b>' + j + '</b><small>' + d + '</small></span></label>'; };
    A.openModal('<div class="modal-h"><div><div class="desc">A4 tegak · ' + A.namaBulan(A.S.bulan) + ' ' + A.S.tahun + '</div><h3>Cetak / Simpan PDF</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="cp-opts">' + pil('ringkas', 'Ringkas 1 halaman', 'Capaian, tren, 6 angka kunci, perlu perhatian, indikator di bawah target. Cocok untuk pimpinan.', true) +
      pil('lengkap', 'Lengkap per bagian', 'Halaman ringkas + satu halaman untuk tiap bagian (sekitar 9 halaman). Cocok untuk arsip & rapat.') +
      pil('ini', 'Halaman yang sedang dibuka', 'Hanya bagian: ' + esc(nama) + '.') + '</div>' +
      '<div class="cp-aksi"><button class="btn primary" type="button" id="cpGo">Cetak / Simpan PDF</button></div>' +
      '<p class="note">Di jendela cetak, pilih <b>Simpan sebagai PDF</b> (Safari: tombol PDF di kiri bawah → Simpan sebagai PDF). Agar lebih rapi, matikan pilihan <b>Header dan footer</b> bila tersedia.</p>', 'cetak');
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('#cpGo'); if (!g) return;
    var r = document.querySelector('input[name="cpJenis"]:checked'), j = r ? r.value : 'ringkas';
    var m = document.querySelector('.modal [data-close]'); if (m) m.click();
    setTimeout(function () { cetak(j); }, 200);
  });
  /* Ctrl/Cmd+P atau menu cetak browser: pakai laporan ringkas */
  window.addEventListener('beforeprint', function () {
    if (document.body.classList.contains('cetak-mode') || !A.S.data) return;
    susun('ringkas'); document.body.classList.add('cetak-mode');
    var selesai = function () { document.body.classList.remove('cetak-mode'); $('cetakWrap').hidden = true; window.removeEventListener('afterprint', selesai); };
    window.addEventListener('afterprint', selesai);
  });
  var w = document.createElement('div'); w.id = 'cetakWrap'; w.hidden = true; document.body.appendChild(w);
  A.openCetak = openCetak; A.susunCetak = susun;
})();
