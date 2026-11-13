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
    var n = dariHash(); if (n) setTimeout(function () { ke(n, false); }, 80);
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
  /* Slide disusun otomatis: bagian sejenis yang pendek digabung dalam satu slide, lalu tiap slide
     diperbesar atau diperkecil (CSS zoom) agar mengisi satu layar tanpa terpotong. */
  var KELOMPOK = [['rgk'], ['bulanan', 'kepatuhan', 'indikator'], ['ringkasan', 'evaluasi', 'pengembangan'], ['isu', 'risiko', 'kri', 'fraud']];
  var URUT = [];
  function el1(x) { return x === 'rgk' ? $('rgk') : bagian(x); }
  function slideEls(sl) { return sl.map(el1).filter(Boolean); }
  function namaSlide(sl) { return sl.map(function (x) { return x === 'rgk' ? 'Ringkasan' : x === 'ringkasan' ? 'Pembelajaran' : BAGIAN[x]; }).join(' · '); }
  function ruangLayar() { var atas = $('top') ? $('top').getBoundingClientRect().bottom : 0; return window.innerHeight - atas - 24 - 96; }
  function susun() {
    var semua = [].concat.apply([], KELOMPOK), tinggi = {};
    semua.forEach(function (x) { var e = el1(x); if (e) { e.hidden = false; e.style.zoom = ''; } });
    semua.forEach(function (x) { var e = el1(x); tinggi[x] = e ? e.getBoundingClientRect().height : 0; });
    var ruang = ruangLayar(), out = [];
    KELOMPOK.forEach(function (g) {
      var cur = [], jml = 0;
      g.forEach(function (x) {
        if (!el1(x) || !tinggi[x]) return;
        var t = tinggi[x] + (cur.length ? 18 : 0);
        // gabung selama hasilnya masih terbaca (diperkecil paling banyak ke 66%)
        if (cur.length && (jml + t) * 0.66 > ruang) { out.push(cur); cur = []; jml = 0; t = tinggi[x]; }
        cur.push(x); jml += t;
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
    var ruang = ruangLayar(), lo = 0.45, hi = 1.2, z = 1;   // diperbesar paling banyak 120% agar tata letak tidak pecah
    var coba = function (v) { E.forEach(function (e) { e.style.zoom = v === 1 ? '' : v.toFixed(3); }); return tinggiSlide(E); };
    if (coba(1) <= ruang) lo = 1; else hi = 1;
    for (var k = 0; k < 7; k++) { z = (lo + hi) / 2; if (coba(z) <= ruang) lo = z; else hi = z; }
    coba(lo);
  }
  window.addEventListener('resize', function () { if (!P.on) return; var n = URUT[P.i] && URUT[P.i][0]; susun(); var j = 0; URUT.forEach(function (sl, i) { if (sl.indexOf(n) >= 0) j = i; }); tampil(j); });
  var P = { on: false, i: 0, jeda: false, t: null, dur: 20000, layar: false, kunci: null };
  var bar = document.createElement('div');
  bar.className = 'pres-bar'; bar.id = 'presBar'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Kontrol presentasi');
  bar.innerHTML = '<button type="button" data-p="prev" aria-label="Bagian sebelumnya" title="Sebelumnya (←)">‹</button>' +
    '<span class="pres-t"><b id="presNama"></b><small id="presNo"></small></span>' +
    '<button type="button" data-p="jeda" id="presJeda" aria-label="Jeda" title="Jeda / lanjut (P)">❚❚</button>' +
    '<button type="button" data-p="next" aria-label="Bagian berikutnya" title="Berikutnya (→ atau spasi)">›</button>' +
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
    var sl = URUT[P.i], E = slideEls(sl);
    $('presNama').textContent = namaSlide(sl); $('presNo').textContent = (P.i + 1) + ' / ' + URUT.length;
    Array.prototype.forEach.call(document.querySelectorAll('main [data-bagian], #rgk'), function (sec) {
      var aktif = E.indexOf(sec) >= 0; sec.hidden = !aktif; sec.classList.toggle('pres-on', aktif); if (!aktif) sec.style.zoom = '';
    });
    if (sl.indexOf('bulanan') >= 0 && A.renderChart) A.renderChart();
    pasSlide(); jadwal();
  }
  function jeda(v) {
    P.jeda = v === undefined ? !P.jeda : v;
    $('presJeda').textContent = P.jeda ? '▶' : '❚❚'; $('presJeda').setAttribute('aria-label', P.jeda ? 'Lanjut' : 'Jeda');
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
    $('presJeda').textContent = '❚❚'; bar.classList.remove('jeda');
    setTimeout(function () { susun(); tampil(0); }, 250);
  }
  function berhenti() {
    if (!P.on) return;
    P.on = false; clearTimeout(P.t); document.body.classList.remove('pres'); bar.hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll('main [data-bagian], #rgk'), function (sec) { sec.style.zoom = ''; sec.classList.remove('pres-on'); });
    if (A.pilihTab) A.pilihTab(P.tabLama || 'semua');
    if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) {} }
    if (P.kunci) { try { P.kunci.release(); } catch (e) {} P.kunci = null; }
    P.layar = false;
  }
  $('presBtn').addEventListener('click', function () { setTimeout(mulai, 180); });
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-p]'); if (!b) return;
    var a = b.getAttribute('data-p');
    if (a === 'prev') tampil(P.i - 1); else if (a === 'next') tampil(P.i + 1); else if (a === 'jeda') jeda(); else berhenti();
  });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && P.on && P.layar) berhenti(); });
  document.addEventListener('keydown', function (e) {
    if (!P.on || modalTerbuka() || (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); tampil(P.i + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); tampil(P.i - 1); }
    else if (e.key === 'p' || e.key === 'P') jeda();
    else if (e.key === 'Escape') berhenti();
  });

  /* ---------- cetak ringkasan 1 halaman ---------- */
  function isiCetak() {
    var S = A.S; if (!S.data) return;
    $('printJudul').textContent = $('judul').textContent;
    $('printInfo').textContent = 'Periode ' + A.namaBulan(S.bulan) + ' ' + S.tahun + ' · dicetak ' + new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' · ' + $('who').textContent;
  }
  window.addEventListener('beforeprint', isiCetak);
  $('printBtn').addEventListener('click', function () { isiCetak(); setTimeout(function () { window.print(); }, 250); });

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
})();
