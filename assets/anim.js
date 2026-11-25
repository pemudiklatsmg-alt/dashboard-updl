/* Animasi grafik: garis tergambar, area muncul perlahan, batang tumbuh dari bawah / dari kiri,
   cincin & donat terisi melingkar, titik muncul di ujung.
   Diputar setiap kali sebuah bagian tampil: saat tab dibuka atau dibuka lagi, saat bagian di-scroll masuk layar,
   dan saat isinya digambar ulang (mis. ganti bulan). Elemen yang sudah punya animasi CSS sendiri dilewati agar
   tidak dobel. Mati bila perangkat menyetel "kurangi gerakan". */
(function () {
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!Element.prototype.animate) return;
  var EASE = 'cubic-bezier(.25,.8,.3,1)';
  var gen = new WeakMap();      // bagian -> nomor tayang (naik tiap kali bagian disembunyikan)
  var tampil = new WeakMap();   // bagian -> sedang tampil di layar?
  var sudah = new WeakMap();    // elemen grafik -> nomor tayang terakhir saat dianimasikan

  function punyaCss(el) { var a = window.getComputedStyle(el).animationName; return a && a !== 'none'; }
  function punyaTransform(el) { return el.hasAttribute('transform'); }
  function perlu(el, g) { if (sudah.get(el) === g) return false; sudah.set(el, g); return !punyaCss(el); }

  function batangSvg(el, svgW) {
    if (el.classList.contains('gx-bar') || el.classList.contains('rd-seg') || el.classList.contains('gx-ghost')) return true;
    if (el.tagName.toLowerCase() !== 'rect' || el.classList.contains('gx-selcol')) return false;
    var b; try { b = el.getBBox(); } catch (e) { return false; }
    return b.height > 2 && b.width > 1 && b.width < svgW * 0.2 && el.getAttribute('fill') !== 'transparent';
  }
  function muncul(el, durasi, jeda) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durasi, delay: jeda || 0, easing: 'ease-out', fill: 'backwards' }); }

  function animasikan(box, g) {
    box.querySelectorAll('svg').forEach(function (svg) {
      if (!svg.getBoundingClientRect().width) return;
      var vb = svg.viewBox && svg.viewBox.baseVal, svgW = vb && vb.width ? vb.width : svg.clientWidth || 600, urut = 0;
      svg.querySelectorAll('path, polyline, line, rect, circle').forEach(function (el) {
        if (!perlu(el, g)) return;
        var cs = window.getComputedStyle(el), tag = el.tagName.toLowerCase();
        var tanpaIsi = cs.fill === 'none' || el.getAttribute('fill') === 'none';
        var garis = cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth || 0) > 0;
        // cincin / donat: lingkaran bergaris putus (dasharray) tanpa isi -> terisi melingkar
        if (tag === 'circle' && tanpaIsi && el.getAttribute('stroke-dasharray')) {
          var d = el.getAttribute('stroke-dasharray').split(/[\s,]+/).map(parseFloat), C = d[1] || 2 * Math.PI * parseFloat(el.getAttribute('r') || 0);
          el.animate([{ strokeDasharray: '0 ' + C }, { strokeDasharray: d[0] + ' ' + C }], { duration: 900, delay: 100 + urut++ * 90, easing: EASE, fill: 'backwards' });
          return;
        }
        if (tag === 'circle') {
          if (tanpaIsi) return;   // lingkaran latar (track) diam
          if (punyaTransform(el)) { muncul(el, 400, 650); return; }
          el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 50%';
          el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, delay: 650, easing: EASE, fill: 'backwards' });
          return;
        }
        if (tag !== 'line' && batangSvg(el, svgW)) {
          if (punyaTransform(el)) { muncul(el, 600, Math.min(urut++ * 25, 450)); return; }
          el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 100%';
          el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 650, delay: Math.min(urut++ * 25, 450), easing: EASE, fill: 'backwards' });
          return;
        }
        if (tag === 'path' || tag === 'polyline') {
          if (tanpaIsi && garis && typeof el.getTotalLength === 'function') {
            var L = 0; try { L = el.getTotalLength(); } catch (e) { L = 0; }
            if (L < 20) return;
            if (cs.strokeDasharray && cs.strokeDasharray !== 'none') { muncul(el, 800); return; }
            el.animate([{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 900, easing: EASE });
          } else if (!tanpaIsi) muncul(el, 700, 200);
        }
      });
    });
    // batang progres HTML (lebar dalam %), mis. indikator, persentase, per PIC
    box.querySelectorAll('[style*="width"]').forEach(function (el) {
      if (!/%$/.test(el.style.width) || el.closest('svg') || el.offsetHeight > 18 || !el.offsetWidth) return;
      if (!perlu(el, g)) return;
      el.style.transformOrigin = '0 50%';
      el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 100, easing: EASE, fill: 'backwards' });
    });
  }

  function cek(tahan) {
    document.querySelectorAll('main [data-bagian], #rgk').forEach(function (sec) {
      var lihat = !sec.hidden && !!sec.offsetParent;
      if (document.body.classList.contains('pres')) { sec.classList.remove('anim-tunggu'); return; }   // mode presentasi punya efek sendiri
      if (!lihat) { sec.classList.add('anim-tunggu'); if (tampil.get(sec)) { tampil.set(sec, false); gen.set(sec, (gen.get(sec) || 0) + 1); } return; }
      if ((tahan || Date.now() < tahanSampai) && !tampil.get(sec)) { sec.classList.add('anim-tunggu'); return; }   // baru tampil: tahan dulu, dilepas setelah posisi gulir beres
      var r = sec.getBoundingClientRect();
      // animasi CSS (batang dsb.) ditahan di awal sampai bagian masuk layar, supaya tidak habis diputar di luar layar
      if (r.top > window.innerHeight * 0.9 || r.bottom < 0) { if (!tampil.get(sec)) sec.classList.add('anim-tunggu'); return; }
      sec.classList.remove('anim-tunggu');
      tampil.set(sec, true);
      animasikan(sec, gen.get(sec) || 0);
    });
  }
  var jadwal = null, tahanSampai = 0;   // setelah ganti tab: tunggu gulir ke atas selesai (bisa animasi halus)
  function nanti() { if (jadwal) return; jadwal = setTimeout(function () { jadwal = null; window.requestAnimationFrame(function () { cek(false); }); }, 60); }
  window.addEventListener('scroll', nanti, { passive: true });
  window.addEventListener('resize', nanti);
  document.addEventListener('click', nanti, true);
  document.addEventListener('dash:periode', nanti);
  var main = document.querySelector('main');
  if (main && window.MutationObserver) new MutationObserver(function (ms) { if (ms.some(function (m) { return m.type === 'attributes'; })) { tahanSampai = Date.now() + 220; cek(true); setTimeout(nanti, 260); } nanti(); }).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('DOMContentLoaded', nanti);
})();
