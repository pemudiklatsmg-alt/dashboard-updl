/* Animasi buka/tutup menu dan jendela pop-up (zoom dari asal).
   Hanya berjalan sesaat (±0,2 detik); mati otomatis bila perangkat diatur "kurangi gerakan". */
(function () {
  var asal = null;
  function pilihAsal(t) { return t && t.closest ? t.closest('button,a,summary,tr,[role=button],[data-act],.card,.chip,.rdot') : null; }
  document.addEventListener('pointerdown', function (e) { var el = pilihAsal(e.target); if (el) asal = el; }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var el = pilihAsal(document.activeElement); if (el) asal = el; } }, true);

  function terlihat(el) { if (!el || !document.contains(el) || !el.offsetParent) return null; var r = el.getBoundingClientRect(); return r.width || r.height ? r : null; }
  /* Kotak asal: elemen yang terakhir diketuk bila masih terlihat, kalau tidak tombol menu ☰. */
  function srcRect(el) { return terlihat(el) || terlihat(asal) || terlihat(document.getElementById('menuBtn')); }
  /* Dipanggil saat membuka jendela: simpan elemen asal; saat menutup, kembali ke elemen itu (atau kotak cadangan). */
  function catat() { var el = terlihat(asal) ? asal : document.getElementById('menuBtn'); return { el: el, r: terlihat(el) }; }
  function balik(c) { return (c && (terlihat(c.el) || c.r)) || terlihat(document.getElementById('menuBtn')); }

  /* Zoom dari asal: jendela membesar dari tombol/kartu asalnya sambil memudar (0,22 detik),
     lalu mengecil kembali ke sana saat ditutup (0,17 detik). Menu ☰ di HP cukup bergeser naik dari bawah. */
  function jalan(el, src, buka) {
    if (!el || !src || !el.animate || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return Promise.resolve();
    el.getAnimations && el.getAnimations().forEach(function (a) { if (a.id === 'genie') a.cancel(); });
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) return Promise.resolve();
    var k;
    if (el.id === 'mainMenu' && window.innerWidth <= 640) k = [{ transform: 'translateY(105%)', opacity: 0.6 }, { transform: 'none', opacity: 1 }];
    else {
      var dx = (src.left + src.width / 2) - (r.left + r.width / 2), dy = (src.top + src.height / 2) - (r.top + r.height / 2);
      var sk = Math.max(0.12, Math.min(0.5, src.width / r.width));
      k = [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sk + ')', opacity: 0 }, { transform: 'none', opacity: 1 }];
    }
    if (!buka) k = k.slice().reverse();
    var an = el.animate(k, { duration: buka ? 220 : 170, easing: buka ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.4,0,1,1)', fill: 'both' });
    an.id = 'genie';
    return an.finished.then(function () { an.cancel(); }, function () {});
  }
  /* Latar gelap di belakang jendela ikut memudar */
  function pudar(el, buka) {
    if (!el || !el.animate || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var a = el.animate(buka ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: buka ? 220 : 230, fill: buka ? 'none' : 'forwards' });
    a.id = 'pudar';
  }
  function bersih(el) { el && el.getAnimations && el.getAnimations().forEach(function (a) { if (a.id === 'pudar' || a.id === 'genie') a.cancel(); }); }

  window.Genie = { jalan: jalan, pudar: pudar, bersih: bersih, srcRect: srcRect, catat: catat, balik: balik };
})();
