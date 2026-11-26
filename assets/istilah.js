/* Kamus istilah: penjelasan singkat istilah yang tidak umum (risiko inheren/residual, KRI, ROTI, OFI, dll).
   1) Istilah yang tampil sebagai label pendek di kartu diberi garis bawah titik-titik; arahkan kursor / ketuk untuk penjelasan.
   2) Menu ☰ → Kamus istilah: daftar lengkap dengan pencarian. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var RISIKO = '[data-bagian="risiko"], [data-bagian="kri"], [data-bagian="fraud"], [data-bagian="isu"]';
  var KINERJA = '[data-bagian="bulanan"], [data-bagian="indikator"], [data-bagian="banding"], #rgk';
  // k = istilah, a = sebutan lain di layar, g = kelompok, s = hanya di bagian tertentu, d = penjelasan
  var KAMUS = [
    { g: 'Kinerja', k: 'Kontrak Manajemen (Konman)', a: ['konman', 'kontrak manajemen'], d: 'Kesepakatan target kinerja tahunan unit dengan kantor induk, berisi indikator, bobot, dan target per bulan.' },
    { g: 'Kinerja', k: 'Capaian Kinerja', a: ['capaian kinerja'], d: 'Total skor Kontrak Manajemen (jumlah skor semua indikator) setelah dikurangi pengurang kepatuhan. Target 100.' },
    { g: 'Kinerja', k: 'Target', a: ['target'], s: KINERJA, d: 'Nilai yang harus dicapai sebuah indikator pada periode tersebut.' },
    { g: 'Kinerja', k: 'Realisasi', a: ['realisasi'], d: 'Nilai yang benar-benar tercapai pada periode tersebut.' },
    { g: 'Kinerja', k: 'Capaian', a: ['capaian', 'pencapaian'], d: 'Realisasi dibandingkan target, dengan memperhatikan polaritas. Dibatasi maksimal 110%.' },
    { g: 'Kinerja', k: 'Polaritas', a: ['polaritas'], d: 'Arah baik sebuah indikator: makin tinggi makin baik, atau makin rendah makin baik (mis. biaya).' },
    { g: 'Kinerja', k: 'Bobot', a: ['bobot'], d: 'Porsi nilai sebuah indikator dalam total skor Kontrak Manajemen.' },
    { g: 'Kinerja', k: 'Skor', a: ['skor'], d: 'Capaian × bobot. Jumlah skor semua indikator menjadi Capaian Kinerja.' },
    { g: 'Kinerja', k: 'Pengurang kepatuhan', a: ['pengurang', 'pengurang kepatuhan'], d: 'Pengurangan skor Kontrak Manajemen bila aspek kepatuhan (mis. tata kelola, 5S, pos anggaran) tidak terpenuhi.' },
    { g: 'Kinerja', k: 'SMT I / SMT II', a: ['smt i', 'smt ii'], d: 'Semester I dan Semester II periode Kontrak Manajemen; bobot dan target bisa berbeda per semester.' },
    { g: 'Kinerja', k: 'HOP (Hari Orang Pelatihan)', a: ['hop', 'hari orang pelatihan'], d: 'Total hari pelatihan seluruh peserta dibagi jumlah pegawai.' },
    { g: 'Pembelajaran & Evaluasi', k: 'Rendiklat', a: ['rendiklat'], d: 'Rencana Pendidikan dan Pelatihan: daftar kelas yang direncanakan beserta jadwal, peserta, dan biaya.' },
    { g: 'Pembelajaran & Evaluasi', k: 'Evaluasi Level 1', a: ['level 1', 'el1'], d: 'Reaksi peserta: tingkat kepuasan terhadap materi, instruktur, sarana, dan penyelenggaraan.' },
    { g: 'Pembelajaran & Evaluasi', k: 'Evaluasi Level 2', a: ['level 2', 'el2'], d: 'Hasil belajar: peningkatan pengetahuan, keterampilan, dan sikap peserta (KSA, C&C).' },
    { g: 'Pembelajaran & Evaluasi', k: 'KSA', a: ['ksa'], d: 'Knowledge, Skill, Attitude: pengetahuan, keterampilan, dan sikap peserta yang diukur sebelum dan sesudah pelatihan.' },
    { g: 'Pembelajaran & Evaluasi', k: 'C&C', a: ['c&c', 'confidence & commitment'], d: 'Confidence & Commitment: keyakinan dan komitmen peserta untuk menerapkan hasil pelatihan di tempat kerja.' },
    { g: 'Pembelajaran & Evaluasi', k: 'Evaluasi Level 3', a: ['level 3', 'el3'], d: 'Perubahan perilaku peserta di tempat kerja setelah pelatihan.' },
    { g: 'Pembelajaran & Evaluasi', k: 'Evaluasi Level 4', a: ['level 4', 'el4'], d: 'Dampak pelatihan terhadap kinerja unit atau organisasi.' },
    { g: 'Pembelajaran & Evaluasi', k: 'ROTI', a: ['roti'], d: 'Return on Training Investment: perbandingan manfaat (nilai) pelatihan dengan biayanya, dalam persen.' },
    { g: 'Pembelajaran & Evaluasi', k: 'IDP', a: ['idp'], d: 'Individual Development Plan: rencana pengembangan individu pegawai melalui pembelajaran, coaching/mentoring, dan penugasan.' },
    { g: 'Pembelajaran & Evaluasi', k: '10-20-70', a: ['10-20-70'], d: 'Pola pengembangan: 10% belajar formal, 20% sosial (coaching, mentoring), 70% pengalaman kerja nyata.' },
    { g: 'Risiko', k: 'Risiko inheren', a: ['inheren', 'risiko inheren'], d: 'Tingkat risiko sebelum ada pengendalian atau mitigasi apa pun.' },
    { g: 'Risiko', k: 'Risiko residual', a: ['residual', 'risiko residual'], d: 'Tingkat risiko yang masih tersisa setelah pengendalian yang ada saat ini dijalankan.' },
    { g: 'Risiko', k: 'Target risiko', a: ['target', 'target risiko'], s: RISIKO, d: 'Tingkat risiko yang ingin dicapai setelah semua rencana mitigasi selesai dijalankan.' },
    { g: 'Risiko', k: 'Kemungkinan', a: ['kemungkinan'], d: 'Seberapa besar peluang sebuah risiko terjadi (skala 1–5).' },
    { g: 'Risiko', k: 'Dampak', a: ['dampak'], s: RISIKO, d: 'Seberapa besar akibatnya bila risiko benar-benar terjadi (skala 1–5).' },
    { g: 'Risiko', k: 'Level risiko', a: ['level risiko', 'tingkat risiko'], d: 'Hasil gabungan kemungkinan × dampak, dari rendah sampai sangat tinggi.' },
    { g: 'Risiko', k: 'Mitigasi', a: ['mitigasi'], d: 'Tindakan untuk menurunkan kemungkinan atau dampak sebuah risiko.' },
    { g: 'Risiko', k: 'Profil Risiko', a: ['profil risiko'], d: 'Daftar risiko utama unit beserta penilaian kemungkinan, dampak, dan levelnya.' },
    { g: 'Risiko', k: 'Risk Register', a: ['risk register'], d: 'Daftar risiko lengkap dengan penyebab, dampak, pemilik risiko, dan rencana perlakuannya.' },
    { g: 'Risiko', k: 'KRI (Key Risk Indicator)', a: ['kri', 'key risk indicator'], d: 'Indikator peringatan dini bahwa sebuah risiko mulai meningkat. Hijau = aman, kuning = waspada, merah = melewati batas.' },
    { g: 'Risiko', k: 'FRA (Fraud Risk Assessment)', a: ['fra', 'fraud risk assessment'], d: 'Penilaian risiko kecurangan (fraud) pada setiap proses bisnis.' },
    { g: 'Risiko', k: 'Red flag', a: ['red flag'], d: 'Tanda awal adanya potensi kecurangan yang perlu diperiksa lebih lanjut.' },
    { g: 'Risiko', k: 'Isu internal & eksternal', a: ['isu internal', 'isu eksternal'], d: 'Kondisi di dalam dan di luar organisasi yang dapat memengaruhi pencapaian sasaran.' },
    { g: 'Risiko', k: 'Pihak berkepentingan', a: ['pihak berkepentingan'], d: 'Pihak yang memengaruhi atau dipengaruhi kegiatan unit, mis. pelanggan, peserta, regulator, mitra.' },
    { g: 'Mutu', k: 'MLI (Maturity Level Index)', a: ['mli', 'maturity level'], d: 'Tingkat kematangan proses bisnis dan standar layanan unit, skala 0–5.' },
    { g: 'Mutu', k: 'Key element', a: ['key element'], d: 'Unsur yang dinilai dalam Maturity Level; tiap key element punya skor dan target.' },
    { g: 'Mutu', k: 'SA (Self Assessment)', a: ['sa', 'self assessment'], d: 'Penilaian mandiri oleh unit terhadap pemenuhan key element.' },
    { g: 'Mutu', k: 'Verifikasi', a: ['verifikasi'], d: 'Penilaian ulang hasil self assessment oleh verifikator.' },
    { g: 'Mutu', k: 'NC (Nonconformity)', a: ['nc', 'ketidaksesuaian'], d: 'Ketidaksesuaian: temuan audit yang tidak memenuhi persyaratan standar. Mayor = berdampak besar, minor = berdampak kecil.' },
    { g: 'Mutu', k: 'OFI (Opportunity for Improvement)', a: ['ofi', 'peluang perbaikan'], d: 'Peluang perbaikan: temuan audit yang belum melanggar persyaratan tetapi sebaiknya ditingkatkan.' },
    { g: 'Mutu', k: 'PP 50', a: ['pp 50', 'pp 50/2012'], d: 'Peraturan Pemerintah No. 50 Tahun 2012 tentang Sistem Manajemen Keselamatan dan Kesehatan Kerja (SMK3), acuan skor audit per elemen.' },
    { g: 'Mutu', k: 'Perbaikan Berkelanjutan', a: ['perbaikan berkelanjutan'], d: 'Pencatatan komentar, keluhan, dan temuan beserta tindak lanjutnya sampai tuntas.' }
  ];
  var PETA = {};
  KAMUS.forEach(function (x) { x.a.forEach(function (t) { (PETA[t] = PETA[t] || []).push(x); }); });
  function norm(t) { return String(t || '').replace(/\s+/g, ' ').replace(/[:·*]+$/, '').trim().toLowerCase(); }
  function cari(el) {
    var L = PETA[norm(el.textContent)]; if (!L) return null;
    for (var i = 0; i < L.length; i++) if (!L[i].s || el.closest(L[i].s)) return L[i];
    return null;
  }

  /* ---------- tandai label pendek di kartu ---------- */
  var SEL = 'main :is(th, span, b, label, small, em, h3, .chip, .seg button, .sub-h, .lbl)';
  function tandai() {
    Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) {
      if (el.hasAttribute('data-ist') || el.children.length > 1 || (el.textContent || '').length > 40) return;
      if (el.children.length === 1 && el.children[0].textContent.trim()) return;
      var x = cari(el); if (!x) return;
      el.setAttribute('data-ist', x.k); el.classList.add('ist');
      if (!el.title) el.title = x.k + ': ' + x.d;
    });
  }
  var t = null;
  function nanti() { clearTimeout(t); t = setTimeout(tandai, 300); }
  var main = document.querySelector('main');
  if (main && window.MutationObserver) new MutationObserver(nanti).observe(main, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', nanti); nanti();

  /* ketuk label (yang bukan tombol) -> penjelasan singkat; berguna di HP yang tidak punya kursor */
  var pop = null;
  function tutupPop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('.ist');
    if (!el || el.closest('button, a, [data-act], [role="button"], .click, tr[data-i], [onclick]')) { if (!(e.target.closest && e.target.closest('.ist-pop'))) tutupPop(); return; }
    var x = KAMUS.filter(function (k) { return k.k === el.getAttribute('data-ist'); })[0]; if (!x) return;
    tutupPop(); e.stopPropagation();
    pop = document.createElement('div'); pop.className = 'ist-pop'; pop.setAttribute('role', 'tooltip');
    pop.innerHTML = '<b>' + esc(x.k) + '</b><span>' + esc(x.d) + '</span><button type="button" data-istsemua>Lihat semua istilah →</button>';
    document.body.appendChild(pop);
    var r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)), top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }, true);
  window.addEventListener('scroll', tutupPop, { passive: true });

  /* ---------- daftar lengkap ---------- */
  function daftar(q) {
    q = norm(q);
    var G = {}, urut = [];
    KAMUS.forEach(function (x) {
      if (q && (x.k + ' ' + x.d + ' ' + x.a.join(' ')).toLowerCase().indexOf(q) < 0) return;
      if (!G[x.g]) { G[x.g] = []; urut.push(x.g); } G[x.g].push(x);
    });
    return urut.length ? urut.map(function (g) {
      return '<div class="ist-g"><div class="sub-h">' + esc(g) + '</div><dl>' + G[g].map(function (x) { return '<dt>' + esc(x.k) + '</dt><dd>' + esc(x.d) + '</dd>'; }).join('') + '</dl></div>';
    }).join('') : '<p class="desc">Istilah tidak ditemukan.</p>';
  }
  function buka(q) {
    tutupPop();
    A().openModal('<div class="modal-h"><div><div class="desc">Penjelasan singkat istilah di dashboard</div><h3>Kamus Istilah</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<input type="search" class="ist-cari" placeholder="Cari istilah, mis. residual, ROTI, OFI…" value="' + esc(q || '') + '" aria-label="Cari istilah"><div class="ist-daftar">' + daftar(q) + '</div>');
    var i = document.querySelector('.ist-cari');
    if (i) i.addEventListener('input', function () { document.querySelector('.ist-daftar').innerHTML = daftar(i.value); });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-istsemua]')) { var b = pop && pop.querySelector('b'); buka(b ? b.textContent : ''); return; }
    if (e.target.closest && e.target.closest('#istBtn')) buka('');
  });
  window.DashIstilah = { buka: buka, KAMUS: KAMUS };
})();
