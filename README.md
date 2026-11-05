# Dashboard Kinerja UPDL Semarang (versi 2)

Website dashboard monitoring gratis (GitHub Pages). Semua data diisi di Google Sheets. Dashboard mengambil, mengolah, dan menampilkannya otomatis (dimuat ulang tiap 5 menit).

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

## Apps Script
Kode ada di [`apps-script/Code.gs`](apps-script/Code.gs), terpasang di spreadsheet gabungan (Ekstensi → Apps Script). Setelah mengganti kode: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah.

## Hal yang perlu diketahui
- Website bisa dilihat siapa pun yang tahu alamatnya. Perubahan data hanya lewat Google Sheets.
- Akun pemasang Apps Script harus punya akses lihat ke file Rendiklat, MLI Probis, dan Profil Risiko. Cek lewat menu **Dashboard → Cek koneksi sumber data**.
- Bila Google Sheets tidak bisa dihubungi, dashboard memakai data terakhir yang tersimpan di browser (bila ada) atau menampilkan pesan "Data tidak bisa dimuat". Repository ini sengaja tidak menyimpan salinan data.
