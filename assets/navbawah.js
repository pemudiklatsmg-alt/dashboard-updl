/* Navigasi bawah (HP), meniru bilah Safari:
   - baris tab tergulir keluar layar  -> pilihan tab muncul sebagai bilah di bawah;
   - digulir ke bawah (membaca)        -> bilah mengecil, hanya nama tab aktif;
   - digulir ke atas / bilah diketuk   -> bilah membesar lagi, semua tab terlihat. */
(function () {
  var asli = document.getElementById('vtabs'); if (!asli) return;
  var nb = document.createElement('nav');
  nb.className = 'navbawah'; nb.id = 'navBawah'; nb.setAttribute('aria-label', 'Bagian dashboard (pintasan bawah)');
  nb.innerHTML = '<div class="nb-isi"></div><button type="button" class="nb-kecil" aria-label="Tampilkan semua bagian"><span></span></button>';
  document.body.appendChild(nb);
  var isi = nb.querySelector('.nb-isi'), kecil = nb.querySelector('.nb-kecil'), lbl = kecil.firstChild;
  function salin() {
    isi.innerHTML = asli.innerHTML; isi.querySelectorAll('[id]').forEach(function (x) { x.id = x.id + '_nb'; });
    var a = asli.querySelector('[aria-selected="true"]'); lbl.textContent = a ? a.textContent : 'Bagian';
    nb.style.setProperty('--nb-kw', (lbl.offsetWidth + 34) + 'px');
  }
  salin();
  // ikuti perubahan tombol tab (pilihan aktif, tombol khusus Admin, badge)
  new MutationObserver(function () { salin(); tengah(false); })
    .observe(asli, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'aria-selected'] });
  function tengah(halus) {
    [isi, asli].forEach(function (w) {
      var a = w.querySelector('[aria-selected="true"]'); if (!a) return;
      w.scrollTo({ left: a.offsetLeft - w.offsetLeft - (w.clientWidth - a.offsetWidth) / 2, behavior: halus === false ? 'auto' : 'smooth' });
    });
  }
  function atas() { var t = document.querySelector('.top'); return t ? Math.round(t.getBoundingClientRect().bottom) : 0; }
  var aktif = false, mengecil = false, yLalu = window.scrollY, jalan = false;
  function setKecil(v) { if (v === mengecil) return; mengecil = v; document.body.classList.toggle('nb-kcl', v); if (!v) setTimeout(tengah, 60); }
  function cek() {
    var y = window.scrollY, d = y - yLalu, r = asli.getBoundingClientRect();
    // di HP baris tab atas disembunyikan, jadi bilah bawah selalu tampil; di layar lebar bilah ini tidak dipakai
    var keluar = window.innerWidth <= 640 || (r.height > 0 && r.bottom < atas() + 4);
    if (keluar !== aktif) { aktif = keluar; document.body.classList.toggle('nb-aktif', keluar); if (keluar) { setKecil(false); tengah(false); } }
    if (aktif) {
      if (d > 8) setKecil(true);                    // menggulir ke bawah: kecilkan
      else if (d < -8) setKecil(false);             // menggulir ke atas: besarkan
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 4 || y < 40) setKecil(false);   // di puncak/dasar halaman: besarkan
    }
    if (Math.abs(d) > 8) yLalu = y;
  }
  window.addEventListener('scroll', function () { if (!jalan) { jalan = true; requestAnimationFrame(function () { jalan = false; cek(); }); } }, { passive: true });
  window.addEventListener('resize', cek); cek();
  kecil.addEventListener('click', function () { setKecil(false); });
  // pindah tab dari bilah bawah: mulai dari atas bagian tersebut
  isi.addEventListener('click', function (e) {
    if (!e.target.closest('[data-vt]')) return;
    setTimeout(function () { tengah(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 30);
  });
})();
