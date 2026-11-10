# Dashboard Kinerja UPDL Semarang (versi 4)

Website dashboard monitoring gratis (GitHub Pages). **Seluruh dashboard hanya tampil setelah login** (akun Admin atau akun Lihat). Data diisi lewat Google Sheets **atau** lewat tombol **Input Data** di website (akun Admin). Keduanya menulis ke tab yang sama. Dashboard mengambil, mengolah, dan menampilkannya otomatis (dimuat ulang tiap 5 menit). Tombol **Export Excel** mengunduh laporan periode terpilih.

- Website: https://pemudiklatsmg-alt.github.io/dashboard-updl/
- Spreadsheet gabungan: [Data Dashboard UPDL Semarang](https://docs.google.com/spreadsheets/d/1HQ1pwmlDMaITmeioEMxauu75SRYpOkuDYxBrn7yAEtg/edit)

## Sumber data

| Bagian dashboard | Sumber | Diisi oleh |
|---|---|---|
| Capaian Kinerja, grafik per bulan, Indikator Kinerja | Spreadsheet gabungan → tab **Konman 2026** (tab per tahun: "Konman 2027", dst.) | PIC Konman |
| Total Kelas, Total Peserta | File **Rendiklat** → sheet RENREKAP, status *Selesai* | Tim Rendiklat |
| Hari Orang Pelatihan (HOP) | Rendiklat ÷ tab **Jumlah Pegawai**; koreksi di tab **Koreksi Rendiklat** dan **Penyesuaian HOP** | Tim Rendiklat / admin |
| Kepuasan Peserta (EL1) | tab **Data - Kepuasan EL1** (tempel hasil tarikan, satu baris per responden) | Admin |
| Penilaian Instruktur (EL1) | tab **Data - Instruktur EL1** (satu baris per penilaian) | Admin |
| Peningkatan KSA (EL2) | tab **Data - KSA EL2** (satu baris per peserta) | Admin |
| Confidence & Commitment (EL2) | tab **Data - C&C EL2** (satu baris per peserta) | Admin |
| Dampak Perilaku (L3) / Kinerja (L4) | tab **Rekap L3 Perilaku** / **Rekap L4 Kinerja** (target dari Konman) | Per pelatihan |
| ROTI | tab **Rekap ROTI** | Per pengukuran |
| Sertifikat Terbit | tab **Data - Sertifikat** (satu baris per sertifikat) | Admin |
| Kepatuhan | tab **Kepatuhan** (tahun × aspek × bulan) | Bulanan |
| Tindak Lanjut Evaluasi | tab **Tindak Lanjut Evaluasi** (format template; dropdown Sumber, PIC, Status) | Admin |
| Maturity Level Proses Bisnis | File **MLI Probis** → sheet **SMG**; target dari Konman (indikator Pengelolaan Proses Bisnis) | Tim Mutu |
| Peta Risiko | File **Profil Risiko** (versi Google Sheets) → sheet *4. Peta Risiko*, mengikuti pilihan Inheren/Residual/Target di file itu | Tim JAR |
| Pengembangan Pegawai (IDP) | tab **Data - IDP** (kolom sama dengan template Pengembangan Pegawai). Selesai = semua jalur yang ada rencananya sudah ada realisasinya. Kelompok 4a–4e dari kolom Pemetaan IDP; nilai Konman 4a–4e dari tab Konman. Tidak mengikuti filter bulan. | Admin |
| Pengembangan Inovasi | tab **Data - Inovasi** (tahun = kolom Tahun). Kategori Kinerja = untuk Konman no. 9, UPDL = internal. Persen Konman no. 9 diambil dari tab Konman, tidak dihitung ulang (tidak bergantung juklak). | JAR |
| Struktur Organisasi (menu ☰, tampil sebagai jendela) | tab **Data - Pegawai** (Nama, NIP, Jabatan, Atasan Langsung, Level Jabatan) dan **Data - Alih Daya**; periode di Pengaturan `PERIODE_DATA_PEGAWAI`. Bagan disusun otomatis dari kolom Atasan Langsung (harus sama persis dengan Jabatan atasannya): Manager di atas, jabatan langsung di bawah Manager di garis tengah, lalu satu kolom per Asman; urut abjad jabatan lalu nama. Alih daya dikelompokkan per perusahaan, lalu per jenis pekerjaan (kata pertama kolom Bagian), nama urut abjad. NIP tidak dikirim ke website. | Admin |

## Rumus utama

- **Total Kelas** = jumlah kelas berstatus *Selesai* dengan R.Tgl Selesai di tahun terpilih s.d. akhir bulan terpilih.
- **Total Peserta** = Σ Realisasi Peserta kelas tersebut. Bila kosong: pakai angka di tab Koreksi Rendiklat; bila tetap kosong dan Pengaturan `KELAS_TANPA_REALISASI = PAKAI RENCANA PESERTA`, pakai Rencana Peserta (ditandai *perkiraan*).
- **HOP** = Σ (peserta × hari kerja Senin–Jumat dari R.Tgl Mulai s.d. R.Tgl Selesai), kumulatif s.d. bulan terpilih, + penyesuaian orang-hari ÷ jumlah pegawai bulan itu. *HOP Final (timpa)* menggantikan hasil bulan itu.
- **Data evaluasi (tab "Data - …")** dihitung kumulatif Januari s.d. bulan terpilih menurut tanggal selesai pelatihan:
  - *Kepuasan* dan *Instruktur* = rata-rata semua jawaban di semua butir. Kolom berakhiran **-Val**, kolom **K.…** (komentar), dan **Durasi Mengajar** tidak dihitung. Aspek = awalan judul kolom sebelum tanda "-" (Ins, Mat, Sarpras, Dig). Judul kolom boleh diganti, misalnya menjadi "Aspek - Butir".
  - *KSA* = rata-rata Nilai, hanya baris Kehadiran = Hadir dan Kelulusan = Lulus.
  - *C&C* = rata-rata Confidence Level dan Commitment Level (skala di Pengaturan `SKALA_CC`).
  - *Sertifikat terbit* = status **Finish TTE GM**, dihitung dari Tgl.Terbit. Yang belum terbit ditempatkan menurut Tgl.Selesai. Ditampilkan: jumlah terbit s.d. bulan, terbit di bulan itu saja, % terbit, dan jumlah per status.
- **Tindak Lanjut**: Selesai = *Selesai* + *Sudah Dilaporkan*; Berjalan = *OFI* + *Proses Tindak Lanjut*; sisanya Belum Dimulai.
- **L3, L4, ROTI** = rata-rata baris bertanggal di tab rekapnya, tahun terpilih s.d. bulan terpilih.
- **Maturity** = jumlah kolom *Level SA* / *Level Verifikasi* per key element di sheet SMG; skor total = rata-rata semua key element.

Sakelar aturan HOP dan target evaluasi ada di tab **Pengaturan**.

## Rutin
1. **Tiap bulan:** isi tab *Jumlah Pegawai*, isi Konman, lalu di spreadsheet pilih menu **Dashboard → Tarik daftar kelas tanpa realisasi** dan isi kolom *Realisasi Peserta (koreksi)* bila perlu.
2. **Tiap ada tarikan data evaluasi:** tempel (paste) di tab "Data - …" yang sesuai, di bawah baris terakhir, dengan urutan kolom sama seperti template. L3, L4, ROTI tetap satu baris per pengukuran di tab rekapnya.
3. **Tahun baru:** salin tab Konman menjadi "Konman 2027", tambah baris `RENDIKLAT_2027` (ID file) di tab Pengaturan, tambah baris tahun baru di Jumlah Pegawai dan Kepatuhan.

## Input lewat website
- Header berisi judul, Tahun & Bulan, **＋ Input Data** (Admin), dan tombol **☰ Menu** (Struktur Organisasi, Panduan, tampilan Terang/Gelap, Muat ulang, Export Excel, Google Sheets, Keluar). Di HP menu muncul dari bawah layar.
- Tombol **＋ Input Data** (hanya akun Admin) → pilih jenis data → isi → periksa → simpan.
- 9 jenis data: Jumlah Pegawai, Realisasi Konman, Kepatuhan, L3, L4, ROTI, Tindak Lanjut (ubah Status & Keterangan), Koreksi Rendiklat, Penyesuaian HOP. Data evaluasi mentah (tab "Data - …") ditempel langsung di spreadsheet.
- Data ditulis ke tab yang sudah ada, dengan kolom yang sama. Tidak ada tab atau kolom baru. Setiap isian diberi catatan "(input web: akun, tanggal)" di kolom Keterangan, atau di kolom "Diisi Oleh" bila ada.
- Form hanya menambah data dan mengisi/mengganti isian bulanan. Memperbaiki atau menghapus data lama tetap di Google Sheets.
- Dua akun, diatur lewat menu di spreadsheet:
  - **Dashboard → Atur akun Admin**: melihat dashboard, input data, export Excel.
  - **Dashboard → Atur akun Lihat**: hanya melihat dashboard (tanpa Input, Export, dan tautan Google Sheets).
-  Password disimpan sebagai hash di Script Properties, tidak di spreadsheet dan tidak di kode website. Mengganti password membuat semua sesi login berakhir. Sesi login berlaku 6 jam; 10 kali salah password mengunci login selama 15 menit.

## Export Excel
Tombol **⬇ Export Excel** (akun Admin) membuat file .xlsx berformat (pustaka ExcelJS) dari data periode terpilih (Tahun & Bulan di header): Ringkasan (gambar tampilan dashboard + tabel status), Indikator Kinerja, Tren Bulanan, Evaluasi Pembelajaran, Kepatuhan & Tindak Lanjut, Maturity & Risiko, dan lampiran Daftar Kelas (opsional). Siap cetak: A4 mendatar, pas selebar halaman, nomor halaman di kaki.

## Tampilan
- Menu dan jendela pop-up memakai efek genie (±0,3 detik); otomatis mati bila perangkat diatur "kurangi gerakan".

## Font
Website memakai SF Pro (seperti apple.com). Font ini bawaan perangkat Apple dan lisensinya tidak mengizinkan dipasang di website, jadi tidak ikut diunggah: di Mac, iPhone, dan iPad tampil asli; di perangkat lain memakai Helvetica/Arial/Segoe UI. File Excel memakai Arial supaya tampil sama di semua komputer.

## Apps Script
Kode ada di [`apps-script/Code.gs`](apps-script/Code.gs), terpasang di spreadsheet gabungan (Ekstensi → Apps Script). Setelah mengganti kode: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah.

## Hal yang perlu diketahui
- Halaman website bisa dibuka siapa pun, tetapi data hanya dikirim setelah login. Apps Script menolak permintaan data tanpa token yang sah. Tombol **Keluar** menghapus data dari browser.
- Akun pemasang Apps Script harus punya akses lihat ke file Rendiklat, MLI Probis, dan Profil Risiko. Cek lewat menu **Dashboard → Cek koneksi sumber data**.
- Bila Google Sheets tidak bisa dihubungi, dashboard memakai data terakhir yang tersimpan di tab browser itu selama sesi login (bila ada) atau menampilkan pesan "Data tidak bisa dimuat". Repository ini sengaja tidak menyimpan salinan data.
- Tab lama **(Lama) Rekap L1 Kepuasan**, **(Lama) Rekap L2**, **(Lama) Rekap Sertifikat**, dan **Tautan Penting** tidak lagi dibaca dashboard. Datanya tidak dihapus.
