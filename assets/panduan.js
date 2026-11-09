/* Panduan bergambar + pilihan tampilan terang / gelap / ikuti perangkat */
(function () {
  var KEY = 'dash-tema', $ = function (id) { return document.getElementById(id); };
  function tema(m) {
    if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-theme', m); else { m = 'auto'; document.documentElement.removeAttribute('data-theme'); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-th]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-th') === m ? 'true' : 'false'); });
    try { if (m === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch (e) {}
  }
  function kaca(on) {
    document.documentElement.classList.toggle('glass', on);
    Array.prototype.forEach.call(document.querySelectorAll('[data-kaca]'), function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    try { localStorage.setItem('dash-kaca', on ? '1' : '0'); } catch (e) {}
  }
  kaca(document.documentElement.classList.contains('glass'));
  var awal = 'auto'; try { awal = localStorage.getItem(KEY) || 'auto'; } catch (e) {}
  tema(awal);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-th]'); if (b) return tema(b.getAttribute('data-th'));
    var k = e.target.closest && e.target.closest('[data-kaca]'); if (k) return kaca(!document.documentElement.classList.contains('glass'));
    var a = e.target.closest && e.target.closest('.gnav a');
    if (a) { e.preventDefault(); var t = document.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('guideBtn').addEventListener('click', function () {
    var A = window.DashApp; if (!A || !A.openModal) return;
    A.openModal('<div class="modal-h"><div><h3>Panduan Dashboard</h3><div class="desc">Cara kerja, siapa mengisi apa, jadwal, dan aturan isian. Versi lengkap ada di tab Petunjuk spreadsheet.</div></div><button class="btn" data-close>Tutup</button></div>' + $('guideTpl').innerHTML, 'guide');
  });
})();
