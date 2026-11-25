# Catatan Proyek — Dashboard Kinerja UPDL Semarang

File ini adalah ingatan proyek. Siapa pun (manusia atau AI) yang melanjutkan pekerjaan di repo ini
wajib membacanya dulu, dan memperbaruinya setiap ada keputusan atau permintaan baru.

## Ringkas
- Dashboard pemantauan kinerja PLN UPDL Semarang: Kontrak Manajemen (Konman), Kepatuhan, Rekap Pembelajaran
  (Rendiklat), Evaluasi L1–L4/ROTI/Sertifikat, SDM & Inovasi, Risiko & Mutu (KRI, FRA), Maturity Level, Tugas Tim EPMK.
- Dirancang & dikembangkan oleh Vania Azaria Bonaputri.
- Situs statis di GitHub Pages (repo ini, cabang `main`). Data dibaca lewat Google Apps Script (folder `apps-script/`).
- **Jangan menyebarkan tautan situs ke publik.**

## Sumber data
- Spreadsheet utama: `1HQ1pwmlDMaITmeioEMxauu75SRYpOkuDYxBrn7yAEtg`
- File Rendiklat 2026: `1Xc7xI3gbpvGEUxaxP3ss6KqYAMNAJoVUsdnIlMf1EJ8`
  (sheet kategori LEADERSHIP, IKP KKJ, PIL, PENUGASAN, PINJAMSEWA, ACADEMY; baris judul ditemukan lewat "ID REN" + "nm_judul")
- Proyek Apps Script: `1P6G97JGjeNYTFulba-m877tTq_yO8MEc_f89Wt_zNXXaUAW9DmbMlupz` (Code.gs, konstanta `VERSI`).
  Setelah mengubah Code.gs: Deploy → Kelola deployment → versi baru.
- Tab penting: "Log Perubahan" (riwayat perubahan), "Survei Pertanyaan" (bisa disunting), "Survei Jawaban" (anonim),
  "Pembanding Tahun Lalu", "Konman 2025".

## Aturan kerja (permintaan pemilik)
1. **Contoh dulu, pasang kemudian.** Setiap perubahan tampilan dibuat di cabang contoh (mis. `contoh-xxx`) + screenshot,
   lalu tunggu kata **"pasang"** sebelum digabung ke `main`. Perbaikan bug boleh langsung dipasang.
2. Kadang pemilik bilang "jangan buat perubahan dulu" → kumpulkan daftar dulu, kerjakan setelah ada lampu hijau.
3. Hanya **2 jenis akun**: Admin dan Lihat.
4. Jangan pernah mengisi kata sandi/kredensial, menyetujui syarat layanan, atau memberi izin OAuth atas nama pemilik.
5. Gaya: minimalis ala Apple, tanpa ruang kosong yang sia-sia, tampilan HP tetap sederhana.
   Jarak memakai rasio emas: 5 / 8 / 13 / 21 / 34 px.
6. **Versi** di `assets/versi.js`: satu hari = satu versi (b = Baru, l = Lebih baik, p = Diperbaiki, maks. 3 poin per kategori).
   Pengecualian yang diminta: 23–25 Nov 2026 digabung jadi v2.6.
7. Setiap rilis: naikkan parameter cache `?v=YYYYMMDDx` di `index.html`, push, lalu cek situs live sudah memakai versi baru.
8. Bekerja efisien; kuota pemakaian pemilik terbatas.
9. Bila pemilik bilang "deploy sendiri, laptop saya standby": deploy Apps Script lewat browser lalu push.

## Keputusan penting (terbaru di atas)
_Butir bertanda [contoh] ada di cabang `contoh-sorot`, menunggu "pasang"._
- 25 Nov 2026 [contoh]: Laporan bulanan punya tombol "← Kembali ke dashboard"; tombol back browser menutup laporan.
- 25 Nov 2026 [contoh]: Menu "Cetak ringkasan" dan "Export Excel" digabung jadi satu menu "Unduh / Cetak" (PDF atau Excel).
- 25 Nov 2026 [contoh]: Sorotan "Perlu perhatian" pada kartu hanya untuk akun Admin, tanpa angka, hanya masalah mendesak:
  indikator Konman < 95%, pengurang kepatuhan, KRI merah, kejadian fraud, inovasi lewat target,
  perbaikan berkelanjutan belum dimulai ≥ 5. Hal administratif tidak disorot.
- 25 Nov 2026 [contoh]: Animasi grafik (garis, batang, cincin, donat) diputar ulang setiap tab dibuka; menunggu sampai kartu terlihat
  (`assets/anim.js`).
- 25 Nov 2026 [contoh]: Grafik Banding Tahun Lalu menampilkan angka hanya di bulan terpilih.
- 25 Nov 2026: Rekap Pembelajaran: pencarian judul di Kalender, grafik bergaya Ringkasan, tabel per judul saat satu kategori
  dipilih; Banding Tahun Lalu diletakkan di bawah Kepatuhan.
- Maturity Level tetap menu sendiri (klien akan menambah datanya).
- Bulan yang tampil saat dibuka = bulan terakhir yang realisasi Konman-nya minimal separuh terisi (disengaja).
- Survei kepuasan anonim di dalam dashboard; pertanyaan bisa disunting dari sheet.
  Bidang: JAR, PKU, K3LKAM, PBJ, MNGT, Others. Peran: Manajemen / Pengambil Keputusan, Pengelola, Kolaborator Data, Viewer, Others.

## Struktur kode
- `index.html` — kerangka halaman & menu. `assets/style.css` — semua gaya.
- `assets/dashboard.js` — inti (`window.DashApp`): data, tab, kartu, notifikasi "Perlu perhatian", Tugas Tim.
- `assets/common.js` (`window.Dash`): api, format angka, nama bulan.
- `assets/rendik2.js` — Rekap Pembelajaran. `assets/banding.js` — Banding Tahun Lalu. `assets/grafik.js` — grafik bersama.
- `assets/lapbulan.js`, `assets/pptbulan.js` — Laporan bulanan (Word/PDF/PPT). `assets/cetak.js` — Unduh / Cetak PDF.
  `assets/export.js` — Excel. `assets/riwayat.js` — Riwayat perubahan. `assets/survei.js` — survei.
- `assets/fitur.js` — mode presentasi & navigasi. `assets/anim.js` — animasi grafik. `assets/versi.js` — catatan rilis.

## Tertunda / ide
- Data Kelas/Peserta 2025 untuk Pembanding Tahun Lalu (sudah ditawarkan).
- Riwayat perubahan: uji satu kali edit manual di Google Sheets agar tercatat.
- Penyebaran survei ke pengguna.
