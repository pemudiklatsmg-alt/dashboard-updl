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
})();
