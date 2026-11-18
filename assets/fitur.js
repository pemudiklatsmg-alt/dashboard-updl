/* Fitur tambahan: tautan langsung ke bagian (#risiko), mode presentasi, cetak ringkasan 1 halaman,
   dan ringkasan login untuk Admin. Memakai window.DashApp dari dashboard.js. */
(function () {
  var $ = function (id) { return document.getElementById(id); }, A = window.DashApp, D = window.Dash, esc = D.esc;
  var BAGIAN = { ringkasan: 'Pembelajaran', evaluasi: 'Evaluasi pembelajaran', bulanan: 'Capaian per bulan', indikator: 'Indikator & Maturity', kepatuhan: 'Kepatuhan & Perbaikan', pengembangan: 'IDP & Inovasi', isu: 'Isu & Pihak Berkepentingan', risiko: 'Peta Risiko', kri: 'Key Risk Indicator', fraud: 'Risiko Fraud' };
  function bagian(n) { return document.querySelector('[data-bagian="' + n + '"]'); }
  function siap() { return !!(A.S.data) && !$('app').hidden; }

  /* ---------- tautan langsung ke bagian ---------- */
  function ke(n, halus) {
    if (n === 'organisasi') { var o = document.querySelector('#mainMenu [data-act="org"]'); if (o && siap()) o.click(); return; }
    if (A.tabUntuk && siap()) A.tabUntuk(n);
    var e = bagian(n); if (!e || !siap()) return;
    var h = $('top') ? $('top').getBoundingClientRect().height : 0;
    var y = n === 'ringkasan' ? 0 : e.getBoundingClientRect().top + window.scrollY - h - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: halus && !kurangiGerak() ? 'smooth' : 'auto' });
    e.classList.remove('sorot'); void e.offsetWidth; e.classList.add('sorot');
    setTimeout(function () { e.classList.remove('sorot'); }, 1600);
  }
  function kurangiGerak() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function dariHash() { var n = decodeURIComponent((location.hash || '').slice(1)).toLowerCase(); return BAGIAN[n] || n === 'organisasi' ? n : ''; }
  function setHash(n) { try { history.replaceState(null, '', '#' + n); } catch (e) { location.hash = n; } }
  var awal = true;
  document.addEventListener('dash:periode', function () {
    if (!awal) return; awal = false;
    // saat dibuka selalu mulai dari Ringkasan paling atas: tanda bagian (#...) dari kunjungan sebelumnya dihapus, tidak dilompati
    if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* abaikan */ } }
    window.scrollTo(0, 0);
  });
  window.addEventListener('hashchange', function () { var n = dariHash(); if (n) ke(n, true); });
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var a = t.closest('.mjump a, [data-loncat]');
    if (!a) return;
    e.preventDefault();
    var n = a.getAttribute('data-loncat') || a.getAttribute('href').slice(1);
    if (a.closest('.mjump') && !$('mainMenu').hidden) $('menuScrim').click();
    setHash(n);
    setTimeout(function () { ke(n, true); }, a.closest('.mjump') ? 200 : 0);   // tunggu menu menutup
  });

  /* ---------- mode presentasi ---------- */
  /* Slide disusun otomatis: bagian sejenis yang pendek digabung, bagian dua-panel yang padat dipecah
     per panel, lalu tiap slide diskalakan (CSS zoom) agar mengisi layar. Batas baca: tidak lebih kecil dari ~80%. */
  var KELOMPOK = [['rgk'], ['bulanan', 'kepatuhan', 'indikator'], ['ringkasan', 'evaluasi', 'pengembangan'], ['isu', 'risiko', 'kri', 'fraud']];
  var MIN_BACA = 0.8, URUT = [];
  function el1(x) { x = x.split('#')[0]; return x === 'rgk' ? $('rgk') : bagian(x); }
  function slideEls(sl) { return sl.map(el1).filter(Boolean); }
  function namaSlide(sl) {
    return sl.map(function (u) {
      var x = u.split('#')[0], k = u.split('#')[1], e = el1(u);
      if (x === 'rgk' && k) return k === 'b' ? 'Ringkasan · Grafik bulanan' : 'Ringkasan';
      if (k !== undefined && e) { var h = e.querySelectorAll(':scope > .panel h2')[parseInt(k, 10)]; if (h && /[ab]$/.test(k)) return h.textContent.trim() + (k.slice(-1) === 'a' ? ' · Ringkasan' : ' · Daftar isu'); if (h) return h.textContent.trim(); }
      return x === 'rgk' ? 'Ringkasan' : x === 'ringkasan' ? 'Pembelajaran' : BAGIAN[x];
    }).join(' · ');
  }
  function ruangLayar() { var atas = $('top') ? $('top').getBoundingClientRect().bottom : 0; return window.innerHeight - atas - 24 - 96; }
  function aturSolo(e, k) { e.classList.remove('solo-0', 'solo-1', 'solo-a', 'solo-b', 'solo-0a', 'solo-0b'); if (k && /^[01][ab]$/.test(k)) e.classList.add('solo-' + k.charAt(0)); if (k !== undefined && k !== null) e.classList.add('solo-' + k); }
  /* skala seragam untuk semua slide: huruf berukuran sama di setiap slide (mengikuti lebar layar, bukan isi slide) */
  var TOLERANSI = 0.92, MIN_DARURAT = 0.78;
  function skalaSeragam() { return Math.max(1, Math.min(1.4, window.innerWidth / 1366)); }
  function susun() {
    var ruang = ruangLayar(), Z = skalaSeragam(), out = [];
    var muat = function (t) { return t * Z * TOLERANSI <= ruang; };
    KELOMPOK.forEach(function (g) {
      var unit = [];
      g.forEach(function (x) {
        var e = el1(x); if (!e) return;
        e.hidden = false; e.style.zoom = ''; aturSolo(e, null);
        var t = e.getBoundingClientRect().height; if (!t) return;
        // bagian dua-panel yang tidak muat pada skala seragam dipecah menjadi satu panel per slide
        if (!muat(t) && x === 'rgk' && e.querySelector(':scope > .gx-rgk')) {
          // Ringkasan terlalu tinggi: kartu angka di slide pertama, grafik di slide berikutnya
          ['a', 'b'].forEach(function (k) { aturSolo(e, k); unit.push({ u: x + '#' + k, t: e.getBoundingClientRect().height }); });
          aturSolo(e, null);
        } else if (!muat(t) && e.classList.contains('pair') && e.querySelectorAll(':scope > .panel').length === 2) {
          [0, 1].forEach(function (k) { aturSolo(e, k); var tk = e.getBoundingClientRect().height;
            if (!muat(tk) && x === 'isu' && k === 0 && e.querySelector('.kx-list')) { ['0a', '0b'].forEach(function (kk) { aturSolo(e, kk); unit.push({ u: x + '#' + kk, t: e.getBoundingClientRect().height }); }); }
            else unit.push({ u: x + '#' + k, t: tk }); });
          aturSolo(e, null);
        } else unit.push({ u: x, t: t });
      });
      var cur = [], jml = 0;
      unit.forEach(function (o) {
        var t = o.t + (cur.length ? 18 : 0);
        if (cur.length && (!muat(jml + t) || o.u.indexOf('#') >= 0 || cur[0].indexOf('#') >= 0)) { out.push(cur); cur = []; jml = 0; t = o.t; }
        cur.push(o.u); jml += t;
      });
      if (cur.length) out.push(cur);
    });
    URUT = out;
  }
  function tinggiSlide(E) { return E[E.length - 1].getBoundingClientRect().bottom - E[0].getBoundingClientRect().top; }
  function pasSlide() {
    if (!P.on) return;
    var E = slideEls(URUT[P.i] || []); if (!E.length) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    var ruang = ruangLayar(), Z = skalaSeragam(), lo = Z * MIN_DARURAT, hi = Z;
    var coba = function (v) { E.forEach(function (e) { e.style.zoom = Math.abs(v - 1) < 0.001 ? '' : v.toFixed(3); }); return tinggiSlide(E); };
    // skala seragam bila muat; hanya bila satu panel memang terlalu panjang, diperkecil sedikit (paling kecil 78%)
    if (coba(Z) <= ruang) lo = Z;
    else for (var k = 0; k < 7; k++) { var z = (lo + hi) / 2; if (coba(z) <= ruang) lo = z; else hi = z; }
    P.zDasar = lo; terapkanZoom();
  }
  /* perbesar/perkecil manual (+ / –) di atas skala otomatis; halaman bisa digulir bila melebihi layar */
  function terapkanZoom() {
    var E = slideEls(URUT[P.i] || []), z = (P.zDasar || 1) * (P.zManual || 1);
    E.forEach(function (e) { e.style.zoom = Math.abs(z - 1) < 0.001 ? '' : z.toFixed(3); });
    var t = $('presZoom'); if (t) { t.textContent = Math.round((P.zManual || 1) * 100) + '%'; t.classList.toggle('pz-auto', Math.abs((P.zManual || 1) - 1) < 0.001); }
  }
  function ubahZoom(arah) {
    if (arah === 0) P.zManual = 1;
    else P.zManual = Math.max(0.7, Math.min(2.2, Math.round(((P.zManual || 1) + arah * 0.15) * 100) / 100));
    if (arah > 0) jeda(true);
    terapkanZoom();
  }
  /* fokus: klik satu panel untuk membesarkannya memenuhi layar */
  var tirai = document.createElement('div'); tirai.className = 'fokus-tirai'; tirai.hidden = true; document.body.appendChild(tirai);
  function fokusPanel(pn) {
    tutupFokus();
    // salinan panel ditaruh langsung di <body> agar tidak terjebak lapisan efek kaca (yang membuat tampilan buram)
    var asli = pn; pn = asli.cloneNode(true);
    Array.prototype.forEach.call(pn.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); }); pn.removeAttribute('id');
    pn.classList.add('pres-fokus', 'pres-salin'); document.body.appendChild(pn);
    P.fokus = pn; P.fokusSec = null; tirai.hidden = false; jeda(true);
    var atas = ($('top') ? $('top').getBoundingClientRect().bottom : 0) + 14, ruangH = window.innerHeight - atas - 96, lo = 0.5, hi = 2.4, z;
    var lebar = Math.min(1320, window.innerWidth - 48);
    hi = Math.max(1, Math.min(hi, lebar / 980));   // jaga lebar isi minimal ~980px agar tata letak panel tidak menyempit
    // dengan CSS zoom, ukuran milik elemen ikut dikali zoom, jadi posisi & lebar dibagi z
    var coba = function (v) { pn.style.zoom = v.toFixed(3); pn.style.width = (lebar / v) + 'px'; pn.style.left = ((window.innerWidth - lebar) / 2 / v) + 'px'; pn.style.top = (atas / v) + 'px'; return pn.scrollHeight * v; };
    for (var k = 0; k < 8; k++) { z = (lo + hi) / 2; if (coba(z) <= ruangH) lo = z; else hi = z; }
    coba(lo); pn.style.maxHeight = (ruangH / lo) + 'px';
  }
  function tutupFokus() {
    if (!P.fokus) return;
    if (P.fokus.classList.contains('pres-salin')) P.fokus.remove();
    else { P.fokus.classList.remove('pres-fokus'); ['zoom', 'top', 'left', 'width', 'maxHeight'].forEach(function (k) { P.fokus.style[k] = ''; }); }
    if (P.fokusSec) P.fokusSec.style.zoom = P.zSec || '';
    P.fokus = null; tirai.hidden = true;
  }
  tirai.addEventListener('click', tutupFokus);
  document.addEventListener('click', function (e) {
    if (!P.on || modalTerbuka()) return;
    var t = e.target; if (!t.closest || t.closest('.pres-bar')) return;
    if (P.fokus) { if (!t.closest('button, a, input, select, [data-fr], [data-r], [data-pb], tr.klik, .ind-row, .chart .hit')) tutupFokus(); return; }
    if (t.closest('button, a, input, select, [data-fr], [data-r], [data-pb], tr.klik, .ind-row, .chart .hit, .rgk-tile, .ph-i')) return;
    var pn = t.closest('main .panel, main .rgk-hero, main .rgk-ph'); if (pn) fokusPanel(pn);
  }, true);
  window.addEventListener('resize', function () { if (!P.on) return; tutupFokus(); var n = URUT[P.i] && URUT[P.i][0]; susun(); var j = 0; URUT.forEach(function (sl, i) { if (sl.indexOf(n) >= 0) j = i; }); tampil(j); });
  var P = { on: false, i: 0, jeda: false, t: null, dur: 20000, layar: false, kunci: null };
  var bar = document.createElement('div');
  bar.className = 'pres-bar'; bar.id = 'presBar'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Kontrol presentasi');
  bar.innerHTML = '<button type="button" data-p="prev" aria-label="Bagian sebelumnya" title="Sebelumnya (←)">‹</button>' +
    '<span class="pres-t"><b id="presNama"></b><small id="presNo"></small></span>' +
    '<button type="button" data-p="jeda" id="presJeda" aria-label="Jeda" title="Jeda / lanjut (P)"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg></button>' +
    '<button type="button" data-p="next" aria-label="Bagian berikutnya" title="Berikutnya (→ atau spasi)">›</button>' +
    '<span class="pres-sep" aria-hidden="true"></span><button type="button" data-p="kecil" aria-label="Perkecil" title="Perkecil (–)">−</button><button type="button" data-p="nol" class="pz pz-auto" id="presZoom" title="Kembali ke ukuran otomatis (0)">100%</button><button type="button" data-p="besar" aria-label="Perbesar" title="Perbesar (+)">+</button>' +
    '<button type="button" data-p="keluar" class="x" aria-label="Keluar dari mode presentasi" title="Keluar (Esc)">✕</button>' +
    '<span class="pres-prog" aria-hidden="true"><i id="presProg"></i></span>';
  document.body.appendChild(bar);

  function modalTerbuka() { return Array.prototype.some.call(document.querySelectorAll('.modal'), function (m) { return !m.hidden; }); }
  function jadwal() {
    clearTimeout(P.t);
    var pr = $('presProg'); pr.style.animation = 'none'; void pr.offsetWidth;
    if (P.jeda) return;
    pr.style.animation = 'presjalan ' + P.dur + 'ms linear forwards';
    P.t = setTimeout(function () { if (modalTerbuka()) return jadwal(); tampil(P.i + 1); }, P.dur);
  }
  function tampil(i) {
    P.i = (i + URUT.length) % URUT.length;
    tutupFokus(); P.zManual = 1;
    var sl = URUT[P.i], E = slideEls(sl);
    $('presNama').textContent = namaSlide(sl); $('presNo').textContent = (P.i + 1) + ' / ' + URUT.length;
    Array.prototype.forEach.call(document.querySelectorAll('main [data-bagian], #rgk'), function (sec) {
      var aktif = E.indexOf(sec) >= 0; sec.hidden = !aktif; sec.classList.toggle('pres-on', aktif); if (!aktif) sec.style.zoom = ''; aturSolo(sec, null);
    });
    sl.forEach(function (u) { var k = u.split('#')[1]; if (k !== undefined) aturSolo(el1(u), k); });
    pasSlide();
    if (sl.indexOf('bulanan') >= 0 && A.renderChart) { A.renderChart(); pasSlide(); }   // grafik menyesuaikan tinggi panel analisis
    jadwal();
  }
  function jeda(v) {
    P.jeda = v === undefined ? !P.jeda : v;
    $('presJeda').innerHTML = P.jeda ? '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>'; $('presJeda').setAttribute('aria-label', P.jeda ? 'Lanjut' : 'Jeda');
    bar.classList.toggle('jeda', P.jeda); jadwal();
  }
  function mulai() {
    if (!siap() || P.on) return;
    P.tabLama = A.S.vt || 'semua';
    P.on = true; P.jeda = false; document.body.classList.add('pres'); bar.hidden = false;
    var el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      try { var pr = el.requestFullscreen(); P.layar = true; if (pr && pr.catch) pr.catch(function () { P.layar = false; }); } catch (e) { P.layar = false; }
    }
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (k) { P.kunci = k; }, function () {}); } catch (e) {}
    $('presJeda').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>'; bar.classList.remove('jeda');
    setTimeout(function () { susun(); tampil(0); }, 250);
  }
  function berhenti() {
    if (!P.on) return;
    P.on = false; clearTimeout(P.t); document.body.classList.remove('pres'); bar.hidden = true;
    tutupFokus();
    Array.prototype.forEach.call(document.querySelectorAll('main [data-bagian], #rgk'), function (sec) { sec.style.zoom = ''; sec.classList.remove('pres-on'); aturSolo(sec, null); });
    if (A.pilihTab) A.pilihTab(P.tabLama || 'semua');
    if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) {} }
    if (P.kunci) { try { P.kunci.release(); } catch (e) {} P.kunci = null; }
    P.layar = false;
  }
  $('presBtn').addEventListener('click', function () { setTimeout(mulai, 180); });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    var a = b.getAttribute('data-p');
    if (a === 'prev') tampil(P.i - 1); else if (a === 'next') tampil(P.i + 1); else if (a === 'jeda') jeda();
    else if (a === 'besar') ubahZoom(1); else if (a === 'kecil') ubahZoom(-1); else if (a === 'nol') ubahZoom(0); else berhenti();
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && P.on && P.layar) berhenti(); });
  document.addEventListener('keydown', function (e) {
    if (!P.on || modalTerbuka() || (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); tampil(P.i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); tampil(P.i - 1); }
    else if (e.key === 'p' || e.key === 'P') jeda();
    else if (e.key === '+' || e.key === '=') ubahZoom(1);
    else if (e.key === '-' || e.key === '_') ubahZoom(-1);
    else if (e.key === '0') ubahZoom(0);
    else if (e.key === 'Escape') { if (P.fokus) tutupFokus(); else berhenti(); }
  });

  /* ---------- cetak ringkasan 1 halaman ---------- */
  function isiCetak() {
    var S = A.S; if (!S.data) return;
    $('printJudul').textContent = $('judul').textContent;
    $('printInfo').textContent = 'Periode ' + A.namaBulan(S.bulan) + ' ' + S.tahun + ' · dicetak ' + new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' · ' + $('who').textContent;
  }
  window.addEventListener('beforeprint', isiCetak);
  $('printBtn').addEventListener('click', function () { if (A.openCetak) return A.openCetak(); isiCetak(); setTimeout(function () { window.print(); }, 250); });

  /* ---------- ringkasan login (Admin) ---------- */
  function tgl(iso) { var d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function grafik(h) {
    var mx = Math.max.apply(null, h.map(function (x) { return x[1]; }).concat([1]));
    return '<div class="lg-chart" role="img" aria-label="Jumlah login berhasil per hari, 30 hari terakhir">' + h.map(function (x) {
      return '<i style="height:' + Math.max(x[1] ? 8 : 2, x[1] / mx * 100) + '%" class="' + (x[1] ? '' : 'nol') + '" title="' + esc(x[0] + ': ' + x[1] + ' login') + '"></i>';
    }).join('') + '</div><div class="lg-ax"><span>' + esc(h[0] ? new Date(h[0][0] + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '') + '</span><span>hari ini</span></div>';
  }
  function tampilLog(L) {
    var kepala = '<div class="modal-h"><div><div class="desc">Tab Log Login · ' + L.hari + ' hari terakhir · tidak mencatat password</div><h3>Ringkasan Login</h3></div><button class="btn" data-close>Tutup</button></div>';
    var sum = '<div class="mini-sum"><div><b class="num">' + L.total + '</b><span>login berhasil</span></div><div><b class="num">' + L.akun.length + '</b><span>akun aktif</span></div><div><b class="num ' + (L.gagal.n ? 'warn' : 'good') + '">' + L.gagal.n + '</b><span>percobaan gagal</span></div></div>';
    var akun = L.akun.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Akun</th><th>Peran</th><th class="r">Login</th><th>Terakhir</th><th>Perangkat</th></tr></thead><tbody>' + L.akun.map(function (a) {
      return '<tr><td><b>' + esc(a.akun) + '</b></td><td>' + esc(a.peran) + '</td><td class="r num">' + a.n + '</td><td>' + esc(tgl(a.terakhir)) + '</td><td>' + esc(a.perangkat || '–') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty">Belum ada login berhasil dalam ' + L.hari + ' hari terakhir.</div>';
    var gagal = L.gagal.daftar.length ? '<div class="sub-h">Percobaan gagal terakhir</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Username diketik</th><th>Hasil</th><th>Perangkat</th></tr></thead><tbody>' + L.gagal.daftar.map(function (g) {
      return '<tr><td>' + esc(tgl(g[0])) + '</td><td>' + esc(g[1]) + '</td><td>' + esc(g[2]) + '</td><td>' + esc(g[3] || '–') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '';
    A.openModal(kepala + sum + '<div class="sub-h">Login berhasil per hari</div>' + grafik(L.harian) + '<div class="sub-h">Per akun</div>' + akun + gagal +
      '<div class="note">Rincian lengkap ada di ' + A.sheetLink('Google Sheets', 'Log Login') + '. Percobaan gagal berulang dari username yang tidak dikenal bisa berarti ada yang mencoba menebak password.</div>');
  }
  $('logBtn').addEventListener('click', function () {
    var s = D.sesi(); if (!s) return;
    A.openModal('<div class="modal-h"><div><h3>Ringkasan Login</h3></div><button class="btn" data-close>Tutup</button></div><div class="empty">Memuat…</div>');
    D.api({ aksi: 'log', token: s.token }).then(function (d) { tampilLog(d.log); }).catch(function (e) {
      if (e.login) return A.keluar(e.message);
      var m = /tidak dikenal/i.test(e.message) ? 'Fitur ini butuh Apps Script versi 5. Tempel Code.gs terbaru lalu Deploy versi baru.' : e.message;
      A.openModal('<div class="modal-h"><div><h3>Ringkasan Login</h3></div><button class="btn" data-close>Tutup</button></div><div class="empty">' + esc(m) + '</div>');
    });
  });

  window.DashFitur = { ke: ke, mulai: mulai, berhenti: berhenti, tampil: tampil };
  /* tandai saat kepala halaman menempel di atas layar */
  (function () {
    var top = document.getElementById('top'), jalan = false;
    function cek() { jalan = false; if (!top) return; var n = window.scrollY > 4 && top.getBoundingClientRect().top <= (parseFloat(getComputedStyle(top).top) || 0) + 1; document.body.classList.toggle('top-nempel', n); }
    window.addEventListener('scroll', function () { if (!jalan) { jalan = true; requestAnimationFrame(cek); } }, { passive: true });
    window.addEventListener('resize', cek); cek();
  })();
})();
