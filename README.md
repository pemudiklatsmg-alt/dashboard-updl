# Dashboard Kinerja UPDL Semarang (versi 3)

Website dashboard monitoring gratis (GitHub Pages). Data diisi lewat Google Sheets **atau** lewat tombol **Input Data** di website (perlu login). Keduanya menulis ke tab yang sama. Dashboard mengambil, mengolah, dan menampilkannya otomatis (dimuat ulang tiap 5 menit). Tombol **Export Excel** mengunduh laporan periode terpilih.

- Website: https://pemudiklatsmg-alt.github.io/dashboard-updl/
- Spreadsheet gabungan: [Data Dashboard UPDL Semarang](https://docs.google.com/spreadsheets/d/1HQ1pwmlDMaITmeioEMxauu75SRYpOkuDYxBrn7yAEtg/edit)

## Sumber data

| Bagian dashboard | Sumber | Diisi oleh |
|---|---|---|
| Capaian Kinerja, grafik per bulan, Indikator Kinerja | Spreadsheet gabungan → tab **Konman 2026** (tab per tahun: "Konman 2027", dst.) | PIC Konman |
| Total Kelas, Total Peserta | File **Rendiklat** → sheet RENREKAP, status *Selesai* | Tim Rendiklat |
| Hari Orang Pelatihan (HOP) | Rendiklat ÷ tab **Jumlah Pegawai**; koreksi di tab **Koreksi Rendiklat** dan **Penyesuaian HOP** | Tim Rendiklat / admin |
| Kepuasan Peserta (L1) | tab **Rekap L1 Kepuasan** | Per pelatihan |
| Peningkatan KSA & Confidence & Commitment (L2) | tab **Rekap L2** | Per pelatihan |
| Dampak Perilaku (L3) / Kinerja (L4) | tab **Rekap L3 Perilaku** / **Rekap L4 Kinerja** (target dari Konman) | Per pelatihan |
| ROTI | tab **Rekap ROTI** | Per pengukuran |
| Sertifikat Terbit | tab **Rekap Sertifikat** | Per pelatihan |
| Kepatuhan | tab **Kepatuhan** (tahun × aspek × bulan) | Bulanan |
| Tindak Lanjut Evaluasi | tab **Tindak Lanjut Evaluasi** | Sesuai kebutuhan |
| Maturity Level Proses Bisnis | File **MLI Probis** → sheet **SMG**; target dari Konman (indikator Pengelolaan Proses Bisnis) | Tim Mutu |
| Peta Risiko | File **Profil Risiko** (versi Google Sheets) → sheet *4. Peta Risiko*, mengikuti pilihan Inheren/Residual/Target di file itu | Tim JAR |
| Tautan Penting | tab **Tautan Penting** | Admin |

## Rumus utama

- **Total Kelas** = jumlah kelas berstatus *Selesai* dengan R.Tgl Selesai di tahun terpilih s.d. akhir bulan terpilih.
- **Total Peserta** = Σ Realisasi Peserta kelas tersebut. Bila kosong: pakai angka di tab Koreksi Rendiklat; bila tetap kosong dan Pengaturan `KELAS_TANPA_REALISASI = PAKAI RENCANA PESERTA`, pakai Rencana Peserta (ditandai *perkiraan*).
- **HOP** = Σ (peserta × hari kerja Senin–Jumat dari R.Tgl Mulai s.d. R.Tgl Selesai), kumulatif s.d. bulan terpilih, + penyesuaian orang-hari ÷ jumlah pegawai bulan itu. *HOP Final (timpa)* menggantikan hasil bulan itu.
- **Rekap evaluasi** = rata-rata (tertimbang jumlah responden/peserta bila diisi) dari baris bertanggal di tahun terpilih s.d. bulan terpilih.
- **Maturity** = jumlah kolom *Level SA* / *Level Verifikasi* per key element di sheet SMG; skor total = rata-rata semua key element.

Sakelar aturan HOP dan target evaluasi ada di tab **Pengaturan**.

## Rutin
1. **Tiap bulan:** isi tab *Jumlah Pegawai*, isi Konman, lalu di spreadsheet pilih menu **Dashboard → Tarik daftar kelas tanpa realisasi** dan isi kolom *Realisasi Peserta (koreksi)* bila perlu.
2. **Tiap ada evaluasi:** tambah satu baris di tab rekap yang sesuai.
3. **Tahun baru:** salin tab Konman menjadi "Konman 2027", tambah baris `RENDIKLAT_2027` (ID file) di tab Pengaturan, tambah baris tahun baru di Jumlah Pegawai dan Kepatuhan.

## Input lewat website
- Tombol **＋ Input Data** → login dengan satu akun bersama → pilih jenis data → isi → periksa → simpan.
- 12 jenis data: Jumlah Pegawai, Realisasi Konman, Kepatuhan, L1, L2, L3, L4, ROTI, Sertifikat, Tindak Lanjut (tambah / ubah status), Koreksi Rendiklat, Penyesuaian HOP.
- Data ditulis ke tab yang sudah ada, dengan kolom yang sama. Tidak ada tab atau kolom baru. Setiap isian diberi catatan "(input web: akun, tanggal)" di kolom Keterangan, atau di kolom "Diisi Oleh" bila ada.
- Form hanya menambah data dan mengisi/mengganti isian bulanan. Memperbaiki atau menghapus data lama tetap di Google Sheets.
- Akun diatur lewat menu **Dashboard → Atur akun input web** di spreadsheet. Password disimpan sebagai hash di Script Properties, tidak di spreadsheet dan tidak di kode website. Mengganti password membuat semua sesi login berakhir. Sesi login berlaku 6 jam; 10 kali salah password mengunci login selama 15 menit.

## Export Excel
Tombol **⬇ Export Excel** membuat file .xlsx berformat (pustaka ExcelJS) dari data periode terpilih (Tahun & Bulan di header): Ringkasan (gambar tampilan dashboard + tabel status), Indikator Kinerja, Tren Bulanan, Evaluasi Pembelajaran, Kepatuhan & Tindak Lanjut, Maturity & Risiko, dan lampiran Daftar Kelas (opsional). Siap cetak: A4 mendatar, pas selebar halaman, nomor halaman di kaki.

## Font
Website memakai SF Pro (seperti apple.com). Font ini bawaan perangkat Apple dan lisensinya tidak mengizinkan dipasang di website, jadi tidak ikut diunggah: di Mac, iPhone, dan iPad tampil asli; di perangkat lain memakai Helvetica/Arial/Segoe UI. File Excel memakai Arial supaya tampil sama di semua komputer.

## Apps Script
Kode ada di [`apps-script/Code.gs`](apps-script/Code.gs), terpasang di spreadsheet gabungan (Ekstensi → Apps Script). Setelah mengganti kode: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah.

## Hal yang perlu diketahui
- Website bisa dilihat siapa pun yang tahu alamatnya. Mengubah data perlu akses edit Google Sheets atau login input web.
- Akun pemasang Apps Script harus punya akses lihat ke file Rendiklat, MLI Probis, dan Profil Risiko. Cek lewat menu **Dashboard → Cek koneksi sumber data**.
- Bila Google Sheets tidak bisa dihubungi, dashboard memakai data terakhir yang tersimpan di browser (bila ada) atau menampilkan pesan "Data tidak bisa dimuat". Repository ini sengaja tidak menyimpan salinan data.
