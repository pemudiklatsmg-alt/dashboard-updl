/* Nomor versi website & catatan rilis.
   Aturan: X.Y — X naik bila tampilan/cara pakai berubah besar, Y naik setiap pemasangan berikutnya.
   Tambah entri baru PALING ATAS di RILIS setiap kali memasang perubahan. */
(function () {
  // b = Baru, l = Lebih baik, p = Diperbaiki (masing-masing maksimal 2–3 poin)
  var RILIS = [
    { v: '5.0', t: '14 Nov 2026', b: ['Tema warna PLN: biru sebagai warna utama, garis biru–kuning–merah di kepala halaman'],
      l: ['Pink kini khusus untuk lingkaran panah pembuka rincian', 'Di HP, keterangan grafik memakai lebar penuh; tombol pilihan pindah ke baris sendiri'],
      p: ['Safari iPhone: tidak ada lagi garis bayangan di bawah bilah tab, dan halaman tampil sampai bawah di tema gelap'] },
    { v: '4.6', t: '14 Nov 2026', b: [], l: ['Di HP, pilihan tab hanya ada di bilah bawah'],
      p: ['Safari di iPhone: isi halaman tidak lagi terlihat di atas kepala halaman'] },
    { v: '4.5', t: '14 Nov 2026', b: ['Navigasi bawah di HP ala Safari: mengecil saat digulir ke bawah, membesar saat digulir ke atas'],
      l: ['Akun Lihat lebih ringkas: tanpa kartu "Perlu perhatian" dan lonceng', 'Isi halaman menghilang di balik kepala halaman, tidak lagi terlihat di atasnya'],
      p: ['Tab Ringkasan kembali tersorot saat website pertama dibuka'] },
    { v: '4.4', t: '14 Nov 2026', b: ['Dashboard langsung tampil dari data terakhir, lalu memperbarui diri di belakang layar'],
      l: ['Server mengirim paket data yang sudah jadi, sehingga data termuat jauh lebih cepat', 'Website selalu dibuka di tab Ringkasan; tidak perlu login ulang setelah menutup tab (selama sesi 6 jam masih berlaku)'],
      p: ['Di HP, halaman di belakang menu ☰ dan jendela pop-up tidak lagi ikut bergulir'] },
    { v: '4.3', t: '14 Nov 2026', b: ['Menu samping & Status Data menampilkan kapan data sumber terakhir berubah', 'Pemeriksaan kualitas data di pengingat Admin, dengan pintasan ke baris yang perlu diperbaiki', 'Nomor versi & catatan rilis'],
      l: ['Penanda klik seragam: panah dalam lingkaran yang menyala pink', 'Angka tampil di semua grafik tren; Peta Risiko meringkas sel padat menjadi "N risiko"'],
      p: ['Tinggi batang Capaian Kinerja kini sebanding nilainya, warna status sama di semua grafik', 'Panduan yang berantakan dirapikan'] },
    { v: '4.2', t: '13 Nov 2026', b: ['Rincian berlapis: klik grafik, metode, status kelas, atau KRI untuk melihat daftar lalu rinciannya', 'Grafik tren di Ringkasan, Rekap Pembelajaran, dan Evaluasi', 'Logo PLN'],
      l: ['Kepala halaman mengambang saat digulir; lengkung sudut seragam'], p: ['Kartu yang diperbesar di mode presentasi tidak lagi buram'] },
    { v: '4.1', t: '13 Nov 2026', b: ['Halaman Pengaturan lewat website (Admin): target, PIC, pengingat email, akun', 'Cetak / Simpan PDF: Ringkas, Lengkap, atau Halaman ini', 'Pengingat tugas saat Admin masuk'],
      l: ['Satu tugas boleh punya lebih dari satu PIC'], p: ['Laporan PDF: ukuran huruf seragam, tidak ada tulisan keluar kotak'] },
    { v: '4.0', t: '13 Nov 2026', b: ['Menu samping untuk berpindah bagian', 'Halaman Tugas Tim EPMK: data usang & tenggat per PIC'],
      l: ['Tampilan saat memuat langsung memakai tata letak baru'], p: ['Data Rendiklat yang sempat gagal terbaca'] },
    { v: '3.0', t: '13 Nov 2026', b: ['Halaman Ringkasan baru', 'Mode presentasi dengan zoom & fokus kartu'],
      l: ['Tampilan kaca, tema terang/gelap'], p: ['Slide presentasi yang terpotong atau terlalu kosong', 'Panel Risiko Fraud yang berantakan'] },
    { v: '2.0', t: '12 Nov 2026', b: ['Akun Admin & Lihat: data hanya tampil setelah login', 'Input data langsung dari dashboard; pengingat email bulanan'],
      l: ['Data dimuat lebih cepat; evaluasi per jadwal'], p: ['Pembacaan kolom data evaluasi yang tidak sesuai'] },
    { v: '1.1', t: '10 Nov 2026', b: ['Struktur organisasi, IDP pegawai, dan inovasi'], l: [], p: ['Tata letak bagan struktur organisasi'] },
    { v: '1.0', t: '5 Nov 2026', b: ['Rilis awal: kinerja Konman, Rendiklat, evaluasi pembelajaran, dan risiko'], l: [], p: [] }
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
        var kat = [['b', '✨ Baru'], ['l', '👍 Lebih baik'], ['p', '🔧 Diperbaiki']].filter(function (k) { return r[k[0]] && r[k[0]].length; });
        return '<section class="rl-i' + (i === 0 ? ' kini' : '') + '"><div class="rl-h"><b>v' + esc(r.v) + '</b><small>' + esc(r.t) + '</small></div>' +
          kat.map(function (k) { return '<div class="rl-k"><span>' + k[1] + '</span><ul>' + r[k[0]].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; }).join('') + '</section>';
      }).join('') + '</div>' +
      (baru ? '<div class="ig-aksi"><button type="button" class="btn" data-rilis>Lihat semua catatan rilis</button><button type="button" class="btn primary" data-close>Mengerti</button></div>' :
        '<p class="note">Penomoran X.Y — X naik untuk perubahan besar tampilan/cara pakai, Y naik setiap ada pembaruan.</p>'), 'rilis');
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
