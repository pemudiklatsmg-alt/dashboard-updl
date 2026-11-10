/* Efek genie (tiruan efek macOS) untuk menu dan jendela pop-up.
   Panel "mengalir" keluar dari tombol/kartu asalnya dan kembali ke sana saat ditutup.
   Hanya berjalan sesaat (±0,3 detik); mati otomatis bila perangkat diatur "kurangi gerakan". */
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

  function jalan(el, src, buka) {
    if (!el || !src || !el.animate || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return Promise.resolve();
    el.getAnimations && el.getAnimations().forEach(function (a) { if (a.id === 'genie') a.cancel(); });
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) return Promise.resolve();
    var cx = src.left + src.width / 2, cy = src.top + src.height / 2;
    var atas = cy < r.top + r.height / 2, ox = Math.max(4, Math.min(96, (cx - r.left) / r.width * 100)), oy = atas ? 0 : 100;
    var tx = cx - (r.left + r.width * ox / 100), ty = (atas ? src.bottom : src.top) - (atas ? r.top : r.bottom);
    function poly(a, b) {
      var nl = ox - a * ox, nr = ox + a * (100 - ox), fl = ox - b * ox, fr = ox + b * (100 - ox);
      return atas ? 'polygon(' + nl + '% 0%,' + nr + '% 0%,' + fr + '% 100%,' + fl + '% 100%)' : 'polygon(' + fl + '% 0%,' + fr + '% 0%,' + nr + '% 100%,' + nl + '% 100%)';
    }
    var k = [
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.2,.03)', clipPath: poly(.04, .12), opacity: 0, offset: 0 },
      { transform: 'translate(' + tx * .45 + 'px,' + ty * .45 + 'px) scale(.75,.45)', clipPath: poly(.1, .7), opacity: 1, offset: .45 },
      { transform: 'translate(' + tx * .1 + 'px,' + ty * .1 + 'px) scale(.98,.9)', clipPath: poly(.75, 1), opacity: 1, offset: .8 },
      { transform: 'none', clipPath: poly(1, 1), opacity: 1, offset: 1 }
    ];
    if (!buka) k = k.slice().reverse().map(function (f) { var g = {}; for (var x in f) g[x] = f[x]; g.offset = 1 - f.offset; return g; });
    el.style.transformOrigin = ox + '% ' + oy + '%';
    var an = el.animate(k, { duration: buka ? 300 : 230, easing: buka ? 'cubic-bezier(.2,.75,.25,1)' : 'cubic-bezier(.55,0,.75,.3)', fill: 'both' });
    an.id = 'genie';
    return an.finished.then(function () { an.cancel(); el.style.transformOrigin = ''; }, function () { el.style.transformOrigin = ''; });
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
