/* Nomor versi website & catatan rilis.
   Aturan: X.Y.Z  — X naik bila tampilan/cara pakai berubah besar, Y bila ada fitur baru, Z untuk perbaikan kecil.
   Tambah entri baru PALING ATAS di RILIS setiap kali memasang perubahan. */
(function () {
  var RILIS = [
    { v: '4.3.1', t: '14 Nov 2026', j: 'Perbaikan tampilan', d: [
      'Nomor versi & catatan rilis di menu ☰',
      'Tinggi batang Capaian Kinerja sebanding dengan nilainya; warna status sama di semua grafik capaian',
      'Angka di semua grafik tren: bulan terpilih terang, bulan lain redup',
      'Penanda klik seragam: panah dalam lingkaran yang menyala pink, tanpa garis pink di kartu'] },
    { v: '4.3.0', t: '14 Nov 2026', j: 'Pantau kesegaran & kualitas data', d: [
      'Menu samping menampilkan kapan data sumber terakhir berubah (edit manual, lewat dashboard, atau file sumber)',
      'Status Data: kelompok Kosong / Belum lengkap / Lengkap, kolom "Terakhir diubah", dan pemeriksaan kualitas isian',
      'Pengingat Admin saat masuk memuat temuan kualitas data, dengan pintasan ke baris yang perlu diperbaiki',
      'Peta Risiko: sel berisi banyak risiko diringkas "N risiko"'] },
    { v: '4.2.0', t: '13 Nov 2026', j: 'Rincian berlapis & grafik baru', d: [
      'Klik batang grafik, metode, status kelas, atau KRI untuk melihat daftar lalu rincian per kelas/KRI',
      'Grafik tren di Ringkasan, Rekap Pembelajaran, dan Evaluasi',
      'Logo PLN; kepala halaman mengambang saat digulir; lengkung sudut seragam',
      'Mode presentasi: kartu yang diperbesar tampil jelas'] },
    { v: '4.1.0', t: '13 Nov 2026', j: 'Pengaturan lewat website', d: [
      'Halaman Pengaturan (Admin): target, PIC, batas waktu, pengingat email, akun, sumber data',
      'Satu tugas boleh punya lebih dari satu PIC; tugas ADM input masukan perbaikan',
      'Pengingat tugas saat Admin masuk',
      'Cetak / Simpan PDF: Ringkas, Lengkap, atau Halaman ini, dengan kop di setiap halaman'] },
    { v: '4.0.0', t: '13 Nov 2026', j: 'Menu samping & Tugas Tim EPMK', d: [
      'Menu samping untuk berpindah bagian',
      'Halaman Tugas Tim EPMK: data usang & tenggat per PIC (TL, OF, ADM)',
      'Tampilan saat memuat langsung memakai tata letak baru'] },
    { v: '3.0.0', t: '13 Nov 2026', j: 'Desain ulang', d: [
      'Halaman Ringkasan baru: capaian, perlu perhatian, enam angka kunci',
      'Mode presentasi dengan zoom & fokus kartu',
      'Tampilan kaca, tema terang/gelap'] },
    { v: '2.0.0', t: '12 Nov 2026', j: 'Login & input data', d: [
      'Akun Admin dan Lihat; data hanya tampil setelah login',
      'Input data langsung dari dashboard; pengingat email bulanan',
      'Data dimuat lebih cepat (cache) dan evaluasi per jadwal'] },
    { v: '1.1.0', t: '10 Nov 2026', j: 'SDM & inovasi', d: ['Struktur organisasi, IDP pegawai, dan inovasi'] },
    { v: '1.0.0', t: '5 Nov 2026', j: 'Rilis awal', d: ['Kinerja Konman, Rendiklat, evaluasi pembelajaran, dan risiko'] }
  ];
  var KINI = RILIS[0];
  var A = function () { return window.DashApp; }, $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // nomor versi kecil di baris kredit bawah
  var cr = document.querySelector('.sheet > .credit');
  if (cr) cr.insertAdjacentHTML('beforeend', '<span class="dot" aria-hidden="true">·</span><button type="button" class="ver-btn" data-rilis title="Lihat catatan rilis">v' + KINI.v + '</button>');
  // menu ☰ › Catatan rilis
  var g = $('guideBtn');
  if (g) g.insertAdjacentHTML('afterend', '<button class="mi" role="menuitem" type="button" data-rilis><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/></svg>Catatan rilis <small class="mi-ver">v' + KINI.v + '</small></button>');

  function buka(baru) {
    if (!A() || !A().openModal) return;
    var daftar = baru ? RILIS.slice(0, 1) : RILIS;
    A().openModal('<div class="modal-h"><div><div class="desc">' + (baru ? 'Pembaruan dashboard' : 'Riwayat pembaruan dashboard') + '</div><h3>' + (baru ? 'Ada yang baru di v' + KINI.v : 'Catatan rilis') + '</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="rl">' + daftar.map(function (r, i) {
        return '<section class="rl-i' + (i === 0 ? ' kini' : '') + '"><div class="rl-h"><b>v' + esc(r.v) + '</b><span>' + esc(r.j) + '</span><small>' + esc(r.t) + '</small></div><ul>' + r.d.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
      }).join('') + '</div>' +
      (baru ? '<div class="ig-aksi"><button type="button" class="btn" data-rilis>Lihat semua catatan rilis</button><button type="button" class="btn primary" data-close>Mengerti</button></div>' :
        '<p class="note">Penomoran X.Y.Z — X: perubahan besar tampilan/cara pakai · Y: fitur baru · Z: perbaikan kecil.</p>'), 'rilis');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rilis]'); if (!b) return;
    var mm = $('mainMenu'); if (mm && !mm.hidden && $('menuScrim')) $('menuScrim').click();
    setTimeout(function () { buka(false); }, 60);
  });
  // pemberitahuan sekali setiap versi naik (setelah dashboard termuat & tidak ada jendela lain)
  var tunggu = setInterval(function () {
    var a = A(); if (!a || !a.S || !a.S.data || $('app').hidden) return;
    clearInterval(tunggu);
    var lihat = null; try { lihat = localStorage.getItem('updl_versi'); } catch (x) { /* abaikan */ }
    if (lihat === KINI.v) return;
    var coba = setInterval(function () {
      if (!$('modal').hidden) return;   // tunggu pengingat Admin ditutup
      clearInterval(coba);
      try { localStorage.setItem('updl_versi', KINI.v); } catch (x) { /* abaikan */ }
      buka(true);
    }, 1500);
  }, 1000);
  window.DashVersi = KINI.v;
})();
