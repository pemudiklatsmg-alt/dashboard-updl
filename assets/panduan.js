/* Panduan bergambar + pilihan tampilan terang / gelap (efek kaca selalu aktif) */
(function () {
  var KEY = 'dash-tema', $ = function (id) { return document.getElementById(id); }, H = document.documentElement;
  var gelapPerangkat = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function aktif() { var t = H.getAttribute('data-theme'); return t || (gelapPerangkat && gelapPerangkat.matches ? 'dark' : 'light'); }
  function tandai() { var m = aktif(); Array.prototype.forEach.call(document.querySelectorAll('[data-th]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-th') === m ? 'true' : 'false'); }); }
  function tema(m) {
    H.setAttribute('data-theme', m);
    try { localStorage.setItem(KEY, m); } catch (e) {}
    tandai();
  }
  H.classList.add('glass'); tandai();
  if (gelapPerangkat && gelapPerangkat.addEventListener) gelapPerangkat.addEventListener('change', tandai);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-th]'); if (b) return tema(b.getAttribute('data-th'));
    var a = e.target.closest && e.target.closest('.gnav a');
    if (a) { e.preventDefault(); var t = document.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('guideBtn').addEventListener('click', function () {
    var A = window.DashApp; if (!A || !A.openModal) return;
    A.openModal('<div class="modal-h"><div><h3>Panduan Dashboard</h3><div class="desc">Cara kerja, siapa mengisi apa, jadwal, dan aturan isian. Versi lengkap ada di tab Petunjuk spreadsheet.</div></div><button class="btn" data-close>Tutup</button></div>' + $('guideTpl').innerHTML, 'guide');
  });

  /* Menu header (☰): dropdown di laptop, lembar dari bawah di HP */
  var btn = $('menuBtn'), menu = $('mainMenu'), scrim = $('menuScrim');
  function tutup(fokus) { if (menu.hidden) return; menu.hidden = true; scrim.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (fokus) btn.focus(); }
  function buka() {
    menu.hidden = false; scrim.hidden = false; btn.setAttribute('aria-expanded', 'true'); tandai();
    if (window.innerWidth > 640) { var r = btn.getBoundingClientRect(); menu.style.top = (r.bottom + 8) + 'px'; menu.style.right = Math.max(12, window.innerWidth - r.right) + 'px'; }
    else { menu.style.top = ''; menu.style.right = ''; }
    var f = menu.querySelector('.mi'); if (f) f.focus({ preventScroll: true });
  }
  btn.addEventListener('click', function () { menu.hidden ? buka() : tutup(true); });
  scrim.addEventListener('click', function () { tutup(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('.mi')) tutup(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) tutup(true); });
  window.addEventListener('resize', function () { if (!menu.hidden && window.innerWidth > 640) tutup(false); });
  /* titik status di samping judul mengikuti label status di menu */
  var badge = $('srcBadge'), dot = $('stDot');
  function sinkron() { var c = badge.className.match(/\b(live|snap|err)\b/); dot.className = 'st ' + (c ? c[1] : 'snap'); dot.title = badge.textContent; }
  new MutationObserver(sinkron).observe(badge, { attributes: true, childList: true, characterData: true, subtree: true }); sinkron();
})();
