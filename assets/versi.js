/* Nomor versi website & catatan rilis.
   Aturan: X.Y — Y naik satu kali untuk setiap hari yang ada pembaruannya (2.0 = tampilan baru 13 Nov 2026).
   SATU HARI = SATU VERSI: semua penambahan, perubahan, dan perbaikan bug di hari yang sama digabung ke satu entri
   (entri hari itu diperbarui, bukan entri baru). Versi baru hanya untuk hari baru yang ada perubahannya.
   X naik hanya bila tampilan berubah total. Maksimal 3 poin per kategori. */
(function () {
  // b = Baru, l = Lebih baik, p = Diperbaiki (masing-masing maksimal 2–3 poin)
  var RILIS = [
    { v: '2.5', t: '18 Nov 2026', b: ['Pencarian cepat: ikon kaca pembesar atau ⌘K / Ctrl+K', 'Rincian Capaian Kinerja per bidang (PIC), proyeksi kelas akhir tahun, riwayat perubahan data di Status Data (Admin)', 'Kepuasan per Aspek: perubahan dari bulan lalu & ringkasan aspek'],
      l: ['Angka menghitung naik & batang grafik tumbuh saat muncul; angka utama lebih tegas', 'HP: kartu angka bertumpuk, termasuk 6 kartu Evaluasi (kartu di belakang mengintip di kanan, kartu "Belum diisi" di urutan terakhir, geser kiri/kanan, kartu sorotan biru tampil duluan); mode presentasi lebih kontras untuk proyektor, slide Isu dipecah dua', 'Panah teks & tombol jeda/putar diganti ikon garis'],
      p: ['Keterangan kembali tampil di bawah judul di semua kartu (tombol ⓘ dihapus)', 'Tinggi grafik Capaian Kinerja pas dengan kartu di sebelahnya; di HP tombol ☰ kembali di kanan atas (Cari pindah ke menu ☰); tampilan tidak lagi mengecil sesaat saat kartu digeser; tumpukan kartu Rekap Pembelajaran tidak lagi muncul di tab lain; angka di dalam lingkaran tidak lagi mepet tepi'] },
    { v: '2.4', t: '17 Nov 2026', b: ['Grafik mini 12 bulan di kartu angka (layar lebar) & Kepatuhan sebagai matriks aspek × bulan', 'Rincian Capaian Kinerja: dari mana angka total terbentuk', 'Jendela pop-up: ✕ untuk menutup, tombol ← Kembali di jendela lapis kedua (juga tombol kembali HP); daftar panjang digulir sendiri, grafik tetap diam'],
      l: ['Proporsi rasio emas: lebar kolom, tangga huruf, jarak & lengkungan sudut seragam; teks keterangan lebih besar dan kontras, huruf terkecil kini 12px, satu jenis huruf di semua perangkat; Ringkasan lebih padat (ikon sebaris judul, grafik lebih lebar)', 'Kartu sorotan selalu paling atas di tabnya; tombol pilihan tepat di bawah judul kartu; tulisan grafik di HP kini terbaca (min. 12px)', 'Halaman login baru dan sapaan saat memuat data; menu ☰ di HP bisa digeser ke bawah untuk menutup; mode presentasi dengan ukuran huruf seragam & tombol kontrol yang tidak bergeser'], p: ['Skala sumbu grafik lebih rapat, angka peta risiko tanpa lingkaran putih', 'Teks di kartu sorotan biru (peringatan, baris tabel, garis grafik) kini terbaca di mode terang', 'Jendela pop-up tidak lagi melewati layar (isinya digulir); kartu sorotan tanpa tepi gelap di Safari; bilah navigasi bawah tidak muncul di halaman login; teks daftar dan matriks Kepatuhan tidak lagi keluar dari kartu di HP; catatan sumber di bawah halaman lebih ringkas; akun Lihat tidak lagi melihat nama file sumber & menu Status data; Panduan dengan ikon menu & ilustrasi kecil, akun Lihat ditulis ulang & jendela Pembaruan Data yang ringkas; menu Cetak khusus Admin; Struktur Organisasi: kotak nama jelas di mode terang, alih daya dibuka per sub bidang; kartu Evaluasi lebih ringkas, pilihan tab sejajar judul di desktop; jarak atas & bawah kartu seragam (8·13·21) di semua tab; tampilan lebih tenang ala Apple: keterangan judul di tombol ⓘ, batang daftar satu warna, Capaian Kinerja lebih ringkas; emoji diganti ikon garis seragam; keterangan kartu angka juga di tombol ⓘ; keterangan yang muncul saat disorot tidak lagi mengubah ukuran kartu; angka kartu tidak lagi tertimpa lingkaran persen'] },
    { v: '2.3', t: '16 Nov 2026', b: [],
      l: [], p: ['Bilah tab bawah di HP bisa digeser ke kiri/kanan lagi'] },
    { v: '2.2', t: '15 Nov 2026', b: ['Kartu sorotan biru tua: satu informasi terpenting di setiap tab', 'Bilah tab bawah di HP kini berikon'],
      l: ['Mode terang lebih bersih: latar polos, kartu putih solid, bayangan lembut', 'Ikon kartu dalam kotak warna pastel sesuai status; label tanpa huruf kapital', 'Huruf judul & angka Plus Jakarta Sans'], p: [] },
    { v: '2.1', t: '14 Nov 2026', b: ['Tema warna PLN; pink khusus lingkaran panah pembuka rincian', 'Dashboard langsung tampil dari data terakhir, dan server mengirim paket data jadi sehingga jauh lebih cepat', 'Navigasi bawah di HP ala Safari; waktu perubahan data sumber & pemeriksaan kualitas data; nomor versi & catatan rilis'],
      l: ['Penanda klik seragam dan angka di semua grafik tren; Pengaturan pindah ke menu ☰', 'Selalu dibuka di tab Ringkasan; tidak perlu login ulang setelah menutup tab (selama sesi 6 jam)', 'Akun Lihat lebih ringkas; isi halaman tidak lagi terlihat di atas kepala halaman'], p: ['Safari iPhone: garis bayangan di bawah bilah tab dan halaman terpotong di tema gelap', 'Di HP, halaman di belakang menu ☰ dan jendela pop-up tidak lagi ikut bergulir', 'Tinggi batang Capaian Kinerja sebanding nilainya; Panduan dirapikan'] },
    { v: '2.0', t: '13 Nov 2026', b: ['Tampilan baru: halaman Ringkasan, menu samping, tema terang/gelap', 'Mode presentasi, cetak / simpan PDF, dan rincian berlapis dari grafik & daftar', 'Pengaturan lewat website, pengingat tugas Admin, logo PLN'],
      l: ['Grafik tren di Ringkasan, Rekap Pembelajaran, dan Evaluasi', 'Kepala halaman mengambang saat digulir; lengkung sudut seragam', 'Satu tugas boleh punya lebih dari satu PIC'], p: ['Slide presentasi terpotong dan kartu yang diperbesar buram', 'Laporan PDF: ukuran huruf seragam, tidak ada tulisan keluar kotak', 'Panel Risiko Fraud berantakan; data Rendiklat sempat gagal terbaca'] },
    { v: '1.2', t: '12 Nov 2026', b: ['Akun Admin & Lihat: data hanya tampil setelah login', 'Input data langsung dari dashboard; pengingat email bulanan'],
      l: ['Data dimuat lebih cepat; evaluasi per jadwal'], p: ['Pembacaan kolom data evaluasi yang tidak sesuai'] },
    { v: '1.1', t: '10 Nov 2026', b: ['Struktur organisasi, IDP pegawai, dan inovasi'],
      l: [], p: ['Tata letak bagan struktur organisasi'] },
    { v: '1.0', t: '5 Nov 2026', b: ['Rilis awal: kinerja Konman, Rendiklat, evaluasi pembelajaran, dan risiko'],
      l: [], p: [] }
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
        var kat = [['b', '<svg class="ik-s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/></svg> Baru'], ['l', '<svg class="ik-s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11l5-5 5 5M12 6v13"/></svg> Lebih baik'], ['p', '<svg class="ik-s" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8M4 20l6-6"/></svg> Diperbaiki']].filter(function (k) { return r[k[0]] && r[k[0]].length; });
        return '<section class="rl-i' + (i === 0 ? ' kini' : '') + '"><div class="rl-h"><b>v' + esc(r.v) + '</b><small>' + esc(r.t) + '</small></div>' +
          kat.map(function (k) { return '<div class="rl-k"><span>' + k[1] + '</span><ul>' + r[k[0]].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</section>';
      }).join('') + '</div>' +
      (baru ? '<div class="ig-aksi"><button type="button" class="btn" data-rilis>Lihat semua catatan rilis</button><button type="button" class="btn primary" data-close>Mengerti</button></div>' :
        '<p class="note">Satu versi untuk setiap hari pembaruan. X naik bila tampilan berubah total.</p>'), 'rilis');
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
    var bandingV = function (a, b) { a = String(a || '0').split('.'); b = String(b || '0').split('.'); return (+a[0] - +b[0]) || ((+a[1] || 0) - (+b[1] || 0)); };
    if (lihat === KINI.v || parseFloat(lihat) >= 3 || bandingV(lihat, KINI.v) > 0) { try { localStorage.setItem('updl_versi', KINI.v); } catch (x) { /* abaikan */ } return; }
    var coba = setInterval(function () {
      if (!$('modal').hidden) return;   // tunggu pengingat Admin ditutup
      clearInterval(coba);
      try { localStorage.setItem('updl_versi', KINI.v); } catch (x) { /* abaikan */ }
      buka(true);
    }, 1500);
  }, 1000);
  window.DashVersi = KINI.v;
})();
