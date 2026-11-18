/* Penyempurnaan tampilan ala apple.com:
   1) Pencarian cepat (ikon kaca pembesar / ⌘K / Ctrl+K) atas semua kartu & daftar di dashboard
   2) Angka menghitung naik saat pertama muncul
   3) Panah teks (→ ↗) di tombol diganti ikon garis */
(function () {
  var A = window.DashApp, D = window.Dash; if (!A || !D) return;
  var esc = D.esc, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG = function (d) { return '<svg class="ik-s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var PANAH = SVG('<path d="M5 12h14M13 6l6 6-6 6"/>'), LUAR = SVG('<path d="M7 17L17 7M9 7h8v8"/>');

  /* ---------- 1. pencarian ---------- */
  var KELOMPOK = [
    ['Kartu & grafik', 'main .panel h2, main .card h3, main .rgk-tile .rgk-lbl'],
    ['Indikator Kinerja', 'main .ind-row .ind-n, main .ind-row'],
    ['Maturity Level', 'main #mlList .ml-row'],
    ['Evaluasi', 'main .gx-hr .gx-hl'],
    ['Isu & risiko', 'main .kx-row .kx-t, main #kriPanel tbody tr td:first-child b, main .ph-i span'],
    ['Pengembangan', 'main #idpPanel tr td:first-child, main .ino-l li, main .tl-body .bars .r > span:first-child']
  ];
  function indeks() {
    var out = [], lihat = {};
    KELOMPOK.forEach(function (g) {
      Array.prototype.forEach.call(document.querySelectorAll(g[1]), function (el) {
        var t = (el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim(); if (!t || t.length < 3) return;
        t = t.slice(0, 90); var sec = el.closest('[data-bagian]'), kartu = el.closest('.panel, .card, .rgk-tile, .rgk-hero, #rgk');
        if (!kartu) return; var key = g[0] + '|' + t; if (lihat[key]) return; lihat[key] = 1;
        var judul = (kartu.querySelector('h2, h3, .rgk-lbl') || {}).textContent || '';
        out.push({ g: g[0], t: t, j: judul.replace(/\s+/g, ' ').trim(), el: el, sec: sec ? sec.getAttribute('data-bagian') : 'rgk' });
      });
    });
    return out;
  }
  var box = document.createElement('div'); box.className = 'cari-wrap'; box.hidden = true;
  box.innerHTML = '<div class="cari-box" role="dialog" aria-label="Cari di dashboard"><div class="cari-in"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" id="cariQ" placeholder="Cari indikator, kelas, isu, risiko, KRI…" autocomplete="off"><kbd>esc</kbd></div><div class="cari-hasil" id="cariHasil"></div></div>';
  document.body.appendChild(box);
  var IDX = [], pilih = 0;
  function bukaCari() {
    IDX = indeks();   // bagian yang tersembunyi di tab lain tetap ikut terindeks
    box.hidden = false; var q = document.getElementById('cariQ'); q.value = ''; tampil(''); setTimeout(function () { q.focus(); }, 30);
  }
  function tutupCari() { box.hidden = true; }
  function tampil(q) {
    q = q.trim().toLowerCase(); var h = document.getElementById('cariHasil');
    if (!q) { h.innerHTML = '<p class="cari-kosong">Ketik minimal 2 huruf. Contoh: <b>HOP</b>, <b>Digital</b>, <b>KRI</b>, <b>Maturity</b></p>'; return; }
    var cocok = IDX.filter(function (x) { return (x.t + ' ' + x.j).toLowerCase().indexOf(q) >= 0; }).slice(0, 40);
    if (!cocok.length) { h.innerHTML = '<p class="cari-kosong">Tidak ada yang cocok dengan “' + esc(q) + '”.</p>'; return; }
    var grp = {}; cocok.forEach(function (x, i) { (grp[x.g] = grp[x.g] || []).push(i); });
    pilih = 0;
    h.innerHTML = Object.keys(grp).map(function (g) {
      return '<div class="cari-g">' + esc(g) + '</div>' + grp[g].map(function (i) { var x = cocok[i]; return '<button type="button" class="cari-i" data-ci="' + i + '"><b>' + esc(x.t) + '</b>' + (x.j && x.j !== x.t ? '<small>' + esc(x.j) + '</small>' : '') + '</button>'; }).join('');
    }).join('');
    h._cocok = cocok; tandai();
  }
  function tandai() { Array.prototype.forEach.call(document.querySelectorAll('.cari-i'), function (b, i) { b.classList.toggle('on', i === pilih); if (i === pilih) b.scrollIntoView({ block: 'nearest' }); }); }
  function pergi(x) {
    tutupCari(); if (!x) return;
    var kartu = x.el.closest('.panel, .card, .rgk-tile, .rgk-hero') || x.el;
    if (A.lompatKe) A.lompatKe(x.sec, null);
    setTimeout(function () {
      var h = document.getElementById('top') ? document.getElementById('top').getBoundingClientRect().height : 0;
      window.scrollTo({ top: Math.max(0, kartu.getBoundingClientRect().top + window.scrollY - h - 14), behavior: 'smooth' });
      kartu.classList.remove('sorot-k'); void kartu.offsetWidth; kartu.classList.add('sorot-k'); setTimeout(function () { kartu.classList.remove('sorot-k'); }, 2200);
      x.el.classList.add('cari-tanda'); setTimeout(function () { x.el.classList.remove('cari-tanda'); }, 2600);
    }, 380);
  }
  box.addEventListener('click', function (e) { if (e.target === box) return tutupCari(); var b = e.target.closest('.cari-i'); if (b) pergi(document.getElementById('cariHasil')._cocok[+b.getAttribute('data-ci')]); });
  document.getElementById('cariQ').addEventListener('input', function (e) { tampil(e.target.value.length >= 2 ? e.target.value : ''); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { if (document.getElementById('app') && !document.getElementById('app').hidden) { e.preventDefault(); box.hidden ? bukaCari() : tutupCari(); } return; }
    if (box.hidden) return;
    var n = document.querySelectorAll('.cari-i').length;
    if (e.key === 'Escape') { e.preventDefault(); tutupCari(); }
    else if (e.key === 'ArrowDown' && n) { e.preventDefault(); pilih = (pilih + 1) % n; tandai(); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); pilih = (pilih - 1 + n) % n; tandai(); }
    else if (e.key === 'Enter' && n) { e.preventDefault(); pergi(document.getElementById('cariHasil')._cocok[pilih]); }
  });
  // tombol kaca pembesar di bilah atas
  var aksi = document.querySelector('#top .aksi');
  if (aksi) {
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'cari-btn'; bt.title = 'Cari (⌘K / Ctrl+K)'; bt.setAttribute('aria-label', 'Cari di dashboard');
    bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
    bt.addEventListener('click', bukaCari); aksi.insertBefore(bt, aksi.firstChild);
  }
  // di HP tombol cari pindah ke menu ☰ supaya bilah atas tetap satu baris (☰ tetap di kanan)
  var mm = document.getElementById('mainMenu');
  if (mm && !mm.querySelector('.mi-cari')) { var mi = document.createElement('button'); mi.type = 'button'; mi.className = 'mi mi-cari'; mi.setAttribute('role', 'menuitem');
    mi.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>Cari di dashboard';
    mi.addEventListener('click', function () { setTimeout(bukaCari, 260); });   // menu ☰ menutup sendiri saat item diklik
    var pertama = mm.querySelector('.mi'); if (pertama) pertama.parentNode.insertBefore(mi, pertama); }

  /* ---------- 2. angka menghitung naik ---------- */
  var sudah = new WeakSet();
  function hitung(el) {
    if (reduce || sudah.has(el)) return; sudah.add(el);
    var asli = el.textContent.trim(), m = asli.match(/^([^\d]*)([\d.]+(?:,\d+)?)(.*)$/); if (!m) return;
    var desim = (m[2].split(',')[1] || '').length, nilai = parseFloat(m[2].replace(/\./g, '').replace(',', '.')); if (!isFinite(nilai) || nilai === 0) return;
    var t0 = null, dur = 650;
    function lang(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + D.fmt(nilai * e, desim) + m[3]; if (p < 1) requestAnimationFrame(lang); else el.textContent = asli; }
    requestAnimationFrame(lang);
  }
  function jalankanHitung() { Array.prototype.forEach.call(document.querySelectorAll('main .rgk-big, main .card .val, main .rgk-tile .rgk-mid > b, main .cs-big'), function (el) { if (el.childElementCount === 0) hitung(el); }); }

  /* ---------- 3. panah teks → ikon garis ---------- */
  function ganti() {
    Array.prototype.forEach.call(document.querySelectorAll('button, a.btn, a.ig-go, .rgk-more, .ph-i em, .kq-go'), function (b) {
      if (b.dataset.panah || b.classList.contains('ke-rinci')) return;
      for (var i = b.childNodes.length - 1; i >= 0; i--) {
        var n = b.childNodes[i]; if (n.nodeType !== 3) continue;
        var t = n.textContent; if (!/[→↗]\s*$/.test(t)) continue;
        var luar = /↗\s*$/.test(t); n.textContent = t.replace(/\s*[→↗]\s*$/, ' ');
        b.insertAdjacentHTML('beforeend', luar ? LUAR : PANAH); b.dataset.panah = 1; break;
      }
    });
  }
  /* ---------- 4. HP: kartu angka bertumpuk (geser kiri/kanan) ---------- */
  function sempit() { return window.innerWidth <= 700 && !document.body.classList.contains('pres'); }
  function tampilTumpuk(c) {
    var kids = Array.prototype.filter.call(c.children, function (k) { return !k.hidden; }), n = kids.length, i = +c.dataset.tmI || 0;
    if (i >= n) i = 0; c.dataset.tmI = i;
    kids.forEach(function (k, j) { var d = (j - i + n) % n; k.classList.toggle('tm-on', d === 0); k.classList.toggle('tm-n1', d === 1); k.classList.toggle('tm-n2', d === 2); k.setAttribute('aria-hidden', d === 0 ? 'false' : 'true'); });
    var dt = c.nextElementSibling; if (dt && dt.classList.contains('tm-dots')) Array.prototype.forEach.call(dt.children, function (b, j) { b.classList.toggle('on', j === i); });
  }
  function aturTumpuk() {
    Array.prototype.forEach.call(document.querySelectorAll('main .kpis, main .rgk-t'), function (c) {
      var dt = c.nextElementSibling && c.nextElementSibling.classList.contains('tm-dots') ? c.nextElementSibling : null;
      var kids = Array.prototype.filter.call(c.children, function (k) { return !k.hidden; });
      if (!sempit() || kids.length < 2) { c.classList.remove('tumpuk'); Array.prototype.forEach.call(c.children, function (k) { k.classList.remove('tm-on', 'tm-n1', 'tm-n2'); k.removeAttribute('aria-hidden'); }); if (dt) dt.remove(); return; }
      if (!c.classList.contains('tumpuk')) {
        c.classList.add('tumpuk');
        // kartu pertama yang tampil: yang paling perlu perhatian (status merah, lalu kuning)
        var pr = -1; kids.some(function (k, j) { if (k.querySelector('.bad, [data-st="bad"], .dot.bad')) { pr = j; return true; } });
        if (pr < 0) kids.some(function (k, j) { if (k.querySelector('.warn, [data-st="warn"], .dot.warn')) { pr = j; return true; } });
        c.dataset.tmI = Math.max(0, pr);
        if (!c.dataset.tmGeser) { c.dataset.tmGeser = 1; var x0 = null, y0 = 0, dx = 0;
          c.addEventListener('touchstart', function (e) { if (!c.classList.contains('tumpuk')) return; var tx = e.touches[0].clientX; if (tx < 28 || tx > window.innerWidth - 28) { x0 = null; return; } x0 = tx; y0 = e.touches[0].clientY; dx = 0; }, { passive: true });
          c.addEventListener('touchmove', function (e) { if (x0 === null) return; dx = e.touches[0].clientX - x0; var dy = e.touches[0].clientY - y0; if (Math.abs(dy) > Math.abs(dx)) { x0 = null; return; } var on = c.querySelector(':scope > .tm-on'); if (on) { on.classList.add('tm-geser'); var lim = window.innerWidth * 0.35, ddx = Math.max(-lim, Math.min(lim, dx)); on.style.transform = 'translateX(' + ddx + 'px) rotate(' + (ddx / 50) + 'deg)'; var n1 = c.querySelector(':scope > .tm-n1'); if (n1) { var pr = Math.min(1, Math.abs(ddx) / lim); n1.style.transition = 'none'; n1.style.transform = 'translateX(' + (6 * (1 - pr)) + 'px) scaleY(' + (0.93 + 0.07 * pr) + ')'; } } }, { passive: true });
          c.addEventListener('touchend', function () { var on = c.querySelector(':scope > .tm-on'); if (on) { on.classList.remove('tm-geser'); on.style.transform = ''; } Array.prototype.forEach.call(c.children, function (k) { k.style.transition = ''; if (!k.classList.contains('tm-on')) k.style.transform = ''; });
            if (x0 !== null && Math.abs(dx) > 45) { var n = Array.prototype.filter.call(c.children, function (k) { return !k.hidden; }).length; c.dataset.tmI = ((+c.dataset.tmI || 0) + (dx < 0 ? 1 : -1) + n) % n; tampilTumpuk(c); c.dataset.tmBaruGeser = Date.now(); }
            x0 = null; });
          // ketukan setelah menggeser tidak membuka rincian kartu
          c.addEventListener('click', function (e) { if (Date.now() - (+c.dataset.tmBaruGeser || 0) < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
        }
      }
      if (!dt || dt.children.length !== kids.length) {
        if (dt) dt.remove(); dt = document.createElement('div'); dt.className = 'tm-dots'; dt.setAttribute('role', 'tablist');
        dt.innerHTML = kids.map(function (k, j) { var h = k.querySelector('h3, .rgk-lbl'); return '<button type="button" role="tab" aria-label="Kartu ' + (j + 1) + (h ? ': ' + esc(h.textContent.trim()) : '') + '" data-tm="' + j + '"></button>'; }).join('');
        dt.addEventListener('click', function (e) { var b = e.target.closest('[data-tm]'); if (b) { c.dataset.tmI = b.getAttribute('data-tm'); tampilTumpuk(c); } });
        c.parentNode.insertBefore(dt, c.nextSibling);
      }
      dt.style.order = getComputedStyle(c).order;
      dt.hidden = c.hidden || !!c.closest('[hidden]');
      c.classList.toggle('tm-dua', kids.length === 2);
      // petunjuk gerak sekali per kunjungan: kartu teratas bergeser ke kiri lalu kembali
      var kunci = 'tmIntip'; try { if (!sessionStorage.getItem(kunci) && c.getBoundingClientRect().top < window.innerHeight) { sessionStorage.setItem(kunci, 1); c.classList.add('tm-intip'); setTimeout(function () { c.classList.remove('tm-intip'); }, 2000); } } catch (e) { /* abaikan */ }
      tampilTumpuk(c);
    });
  }
  window.addEventListener('resize', function () { clearTimeout(aturTumpuk.t); aturTumpuk.t = setTimeout(aturTumpuk, 150); });
  var t = 0; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { ganti(); jalankanHitung(); aturTumpuk(); }, 60); }).observe(document.body, { childList: true, subtree: true });
})();
