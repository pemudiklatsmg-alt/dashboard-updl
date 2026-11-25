/* Animasi grafik saat bagian pertama kali terlihat: garis tergambar, area muncul perlahan,
   batang tumbuh dari bawah / dari kiri, titik muncul di ujung. Hanya sekali per bagian (ganti bulan
   atau render ulang tidak memutar ulang). Mati bila perangkat menyetel "kurangi gerakan". */
(function () {
  if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!Element.prototype.animate) return;
  var selesai = new WeakSet(), EASE = 'cubic-bezier(.25,.8,.3,1)';

  function batangSvg(el, svgW) {
    if (el.classList.contains('gx-bar') || el.classList.contains('rd-seg') || el.classList.contains('gx-ghost')) return true;
    if (el.tagName.toLowerCase() !== 'rect') return false;
    var b; try { b = el.getBBox(); } catch (e) { return false; }
    return b.height > 2 && b.width > 1 && b.width < svgW * 0.2 && el.getAttribute('fill') !== 'transparent';
  }
  function animasikan(box) {
    box.querySelectorAll('svg').forEach(function (svg) {
      var vb = svg.viewBox && svg.viewBox.baseVal, svgW = vb && vb.width ? vb.width : svg.clientWidth || 600, urut = 0;
      svg.querySelectorAll('path, polyline, rect, circle').forEach(function (el) {
        var cs = window.getComputedStyle(el), tag = el.tagName.toLowerCase();
        if (tag === 'circle') {
          el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 50%';
          el.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 450, delay: 650, easing: EASE, fill: 'backwards' });
          return;
        }
        if (batangSvg(el, svgW)) {
          el.style.transformBox = 'fill-box'; el.style.transformOrigin = '50% 100%';
          el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 650, delay: Math.min(urut++ * 25, 450), easing: EASE, fill: 'backwards' });
          return;
        }
        if (tag === 'path' || tag === 'polyline') {
          var garis = cs.fill === 'none' || el.getAttribute('fill') === 'none';
          if (garis && cs.stroke !== 'none' && typeof el.getTotalLength === 'function') {
            var L = 0; try { L = el.getTotalLength(); } catch (e) { L = 0; }
            if (L < 20) return;
            if (cs.strokeDasharray && cs.strokeDasharray !== 'none') { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, easing: 'ease-out', fill: 'backwards' }); return; }
            el.animate([{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 900, easing: EASE });
          } else if (!garis) {
            el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 200, easing: 'ease-out', fill: 'backwards' });
          }
        }
      });
    });
    // batang progres HTML (lebar dalam %), mis. indikator, persentase, keterisian
    box.querySelectorAll('[style*="width"]').forEach(function (el) {
      if (!/%$/.test(el.style.width) || el.closest('svg') || el.offsetHeight > 18 || !el.offsetWidth) return;
      el.style.transformOrigin = '0 50%';
      el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 100, easing: EASE, fill: 'backwards' });
    });
  }
  function adaIsi(sec) { return !!sec.querySelector('svg path, svg rect, svg polyline, [style*="width"]'); }
  function cek() {
    document.querySelectorAll('main [data-bagian], #rgk').forEach(function (sec) {
      if (selesai.has(sec) || sec.hidden || !sec.offsetParent) return;
      var r = sec.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.9 || r.bottom < 0) return;
      if (!adaIsi(sec)) return;
      selesai.add(sec); animasikan(sec);
    });
  }
  var jadwal = null;
  function nanti() { if (jadwal) return; jadwal = setTimeout(function () { jadwal = null; window.requestAnimationFrame(cek); }, 120); }
  window.addEventListener('scroll', nanti, { passive: true });
  window.addEventListener('resize', nanti);
  document.addEventListener('click', nanti, true);
  document.addEventListener('dash:periode', nanti);
  var main = document.querySelector('main');
  if (main && window.MutationObserver) new MutationObserver(nanti).observe(main, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', nanti);
})();
