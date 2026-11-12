# Dashboard Kinerja UPDL Semarang (versi 6)

Website dashboard monitoring gratis (GitHub Pages). **Seluruh dashboard hanya tampil setelah login** (akun Admin atau akun Lihat). Data diisi lewat Google Sheets **atau** lewat tombol **Input Data** di website (akun Admin). Keduanya menulis ke tab yang sama. Dashboard mengambil, mengolah, dan menampilkannya otomatis (dimuat ulang tiap 5 menit). Tombol **Export Excel** mengunduh laporan periode terpilih.

- Website: https://pemudiklatsmg-alt.github.io/dashboard-updl/
- Spreadsheet gabungan: [Data Dashboard UPDL Semarang](https://docs.google.com/spreadsheets/d/1HQ1pwmlDMaITmeioEMxauu75SRYpOkuDYxBrn7yAEtg/edit)

## Sumber data

| Bagian dashboard | Sumber | Diisi oleh |
|---|---|---|
| Capaian Kinerja, grafik per bulan, Indikator Kinerja | Spreadsheet gabungan → tab **Konman 2026** (tab per tahun: "Konman 2027", dst.) | PIC Konman |
| Total Kelas, Total Peserta | File **Rendiklat** → sheet RENREKAP, status *Selesai* | Tim Rendiklat |
| Hari Orang Pelatihan (HOP) | Rendiklat ÷ tab **Jumlah Pegawai**; koreksi di tab **Koreksi Rendiklat** dan **Penyesuaian HOP** | Tim Rendiklat / admin |
| Kepuasan Peserta (EL1) | tab **Data - Kepuasan EL1** (template *EVALUASI LEVEL 1 PER JADWAL*: satu baris per kelas, nilai dibobot jumlah pengisi `P.Isi`; format lama per responden tetap terbaca). Arti singkatan butir dari tab **Master Evaluasi L1** | Admin |
| Penilaian Instruktur (EL1) | tab **Data - Instruktur EL1** (satu baris per penilaian) | Admin |
| Peningkatan KSA (EL2) | tab **Data - KSA EL2** (satu baris per peserta) | Admin |
| Confidence & Commitment (EL2) | tab **Data - C&C EL2** (template *EVALUASI LEVEL 2 RESUME*: satu baris per kelas, dibobot `Jumlah Peserta Isi`; format lama per peserta tetap terbaca) | Admin |
| Dampak Perilaku (L3) / Kinerja (L4) | tab **Rekap L3 Perilaku** / **Rekap L4 Kinerja** (target dari Konman) | Per pelatihan |
| ROTI | tab **Rekap ROTI** | Per pengukuran |
| Sertifikat Terbit | tab **Data - Sertifikat** (satu baris per sertifikat) | Admin |
| Kepatuhan | tab **Kepatuhan** (tahun × aspek × bulan) | Bulanan |
| Perbaikan Berkelanjutan | tab **Perbaikan Berkelanjutan** (dulu *Tindak Lanjut Evaluasi*; nama lama tetap dikenali). Komentar EL1 dan komentar Hambatan/Dukungan EL2; dropdown Sumber, PIC (MAN, JAR, JAR LAB, JAR MUTU, PKU YAN, PKU KEU, PBJ, K3L KAM, REN Pusdiklat, ACD Pusdiklat), Status | Admin |
| Maturity Level Proses Bisnis | File **MLI Probis** → sheet **SMG**; target dari Konman (indikator Pengelolaan Proses Bisnis) | Tim Mutu |
| Key Risk Indicator | File **Profil Risiko** → tab **10. Pemantauan KRI 2026** (realisasi bulanan Jan–Des; nama tab bisa diganti lewat `KRI_TAB`) | Tim JAR |
| Risiko Fraud (FRA) | File **FRA** (`FRA_ID` di Pengaturan) → sheet *Entry*, *Monev*, *Rencana Mitigasi*. Akun Lihat hanya menerima ringkasan; rincian per risiko hanya dikirim ke akun Admin | Tim JAR |
| Peta Risiko | File **Profil Risiko** (versi Google Sheets) → sheet *4. Peta Risiko*, mengikuti pilihan Inheren/Residual/Target di file itu | Tim JAR |
| Pengembangan Pegawai (IDP) | tab **Data - IDP** (kolom sama dengan template Pengembangan Pegawai). Selesai = semua jalur yang ada rencananya sudah ada realisasinya. Kelompok 4a–4e dari kolom Pemetaan IDP; nilai Konman 4a–4e dari tab Konman. Tidak mengikuti filter bulan. | Admin |
| Pengembangan Inovasi | tab **Data - Inovasi** (tahun = kolom Tahun). Kategori Kinerja = untuk Konman no. 9, UPDL = internal. Persen Konman no. 9 diambil dari tab Konman, tidak dihitung ulang (tidak bergantung juklak). | JAR |
| Isu Internal & Eksternal, Pihak Berkepentingan (Tahap 3) | File **Profil Risiko** → tab **2c. Isu & Kaitan Risiko** (teks isu otomatis dari tab 2a; kolom Sasaran, No. Risiko Terkait, Pihak Berkepentingan Terkait diisi nomor/kode dipisah koma) dan tab **2b. Pihak Berkepentingan** (satu baris per pihak; Progres %, Status: Belum Dimulai/Berjalan/Tercapai). Nama tab bisa diganti lewat Pengaturan `ISU_TAB` / `PIHAK_TAB`. Nomor risiko yang diketuk menyorot risiko itu di Peta Risiko. | Tim JAR / Admin |
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
- **Perbaikan Berkelanjutan**: *OFI* = masukan membangun/pujian/netral (tidak perlu tindakan). Persen tuntas = (*Selesai* + *Sudah Dilaporkan*) ÷ masukan selain OFI. *Belum Dimulai* masuk notifikasi Perlu perhatian. PIC dan Status bisa diubah lewat Input Data. Menu spreadsheet **Dashboard → Perbaikan Berkelanjutan**: *Isi PIC & Status otomatis* (hanya sel kosong, berdasarkan kata kunci) dan *Tambah komentar EL2* (hambatan & dukungan dari tab Data - C&C EL2; aman diulang).
- **KRI**: Maks = hijau ≥ batas atas, kuning ≥ batas bawah, merah di bawahnya; Min kebalikannya. KRI merah bulan terpilih masuk notifikasi.
- **L3, L4, ROTI** = rata-rata baris bertanggal di tab rekapnya, tahun terpilih s.d. bulan terpilih.
- **Maturity** = jumlah kolom *Level SA* / *Level Verifikasi* per key element di sheet SMG; skor total = rata-rata semua key element.

Sakelar aturan HOP dan target evaluasi ada di tab **Pengaturan**.

## Rutin
1. **Tiap bulan:** isi tab *Jumlah Pegawai*, isi Konman, lalu di spreadsheet pilih menu **Dashboard → Tarik daftar kelas tanpa realisasi** dan isi kolom *Realisasi Peserta (koreksi)* bila perlu.
2. **Tiap ada tarikan data evaluasi:** tempel (paste) di tab "Data - …" yang sesuai, di bawah baris terakhir, dengan urutan kolom sama seperti template. L3, L4, ROTI tetap satu baris per pengukuran di tab rekapnya.
3. **Sebelum rapat / akhir bulan:** di spreadsheet pilih **Dashboard → Periksa isian data** untuk melihat isian yang kosong atau salah format (dengan nama tab dan nomor baris).
4. **Tahun baru:** salin tab Konman menjadi "Konman 2027", tambah baris `RENDIKLAT_2027` (ID file) di tab Pengaturan, tambah baris tahun baru di Jumlah Pegawai dan Kepatuhan.

## Input lewat website
- Header berisi judul, Tahun & Bulan, **＋ Input Data** (Admin), lonceng **Perlu perhatian**, dan tombol **☰ Menu** (Struktur Organisasi, Panduan, tampilan Terang/Gelap, Lompat ke bagian, Mode presentasi (Admin), Cetak ringkasan / PDF, Status data per sumber, Muat ulang, Export Excel, Ringkasan login, Google Sheets, Keluar). Di HP menu muncul dari bawah layar.
- Tombol **＋ Input Data** (hanya akun Admin) → pilih jenis data → isi → periksa → simpan.
- 9 jenis data: Jumlah Pegawai, Realisasi Konman, Kepatuhan, L3, L4, ROTI, Tindak Lanjut (ubah Status & Keterangan), Koreksi Rendiklat, Penyesuaian HOP. Data evaluasi mentah (tab "Data - …") ditempel langsung di spreadsheet.
- Data ditulis ke tab yang sudah ada, dengan kolom yang sama. Tidak ada tab atau kolom baru. Setiap isian diberi catatan "(input web: akun, tanggal)" di kolom Keterangan, atau di kolom "Diisi Oleh" bila ada.
- Form hanya menambah data dan mengisi/mengganti isian bulanan. Memperbaiki atau menghapus data lama tetap di Google Sheets.
- Dua akun, diatur lewat menu di spreadsheet:
  - **Dashboard → Atur akun Admin**: melihat dashboard, input data, export Excel.
  - **Dashboard → Atur akun Lihat**: hanya melihat dashboard (tanpa Input, Export, dan tautan Google Sheets).
-  Password disimpan sebagai hash di Script Properties, tidak di spreadsheet dan tidak di kode website. Mengganti password membuat semua sesi login berakhir. Sesi login berlaku 6 jam; 10 kali salah password mengunci login selama 15 menit.
- Hanya ada dua jenis akun: **Admin** dan **Lihat**. Akun Lihat bisa ditambah sesuai kebutuhan, satu per orang, lewat **Dashboard → Akun Lihat tambahan → Tambah akun Lihat / ganti password** (username, nama, password). Daftarnya di tab **Akun Lihat** (Username, Nama, Aktif); semuanya berperan Lihat, dan password hanya disimpan sebagai hash di Script Properties. Kolom Aktif boleh diubah langsung di tab (berlaku pada login berikutnya); **Nonaktifkan akun Lihat** mengeluarkan orang itu saat itu juga. Akun Lihat bersama tetap berfungsi.
- Setiap login (berhasil, gagal, terkunci) dan keluar dicatat di tab **Log Login** (dibuat otomatis): waktu, akun, peran, hasil, jenis perangkat & browser. Password tidak pernah dicatat. Akun Admin bisa melihat rangkumannya di website: **☰ → Ringkasan login** (30 hari: login per hari, per akun, percobaan gagal).

## Export Excel
Tombol **⬇ Export Excel** (akun Admin) membuat file .xlsx berformat (pustaka ExcelJS) dari data periode terpilih (Tahun & Bulan di header): Ringkasan (gambar tampilan dashboard + tabel status), Indikator Kinerja, Tren Bulanan, Evaluasi Pembelajaran, Kepatuhan & Tindak Lanjut, Maturity & Risiko, IDP, Inovasi, serta Struktur Organisasi dan lampiran Daftar Kelas (opsional). Siap cetak: A4 mendatar, pas selebar halaman, nomor halaman di kaki.

## Tampilan
- **Perlu perhatian** (paling atas, seperti notifikasi; bisa diperkecil – atau ditutup ✕, dibuka lagi lewat ikon lonceng 🔔 di header yang menampilkan jumlahnya; pilihan ini diingat di browser sampai isinya berubah): indikator < 95% atau 95–99%, pengurang kepatuhan, data bulan terpilih yang belum diisi, kelas selesai tanpa realisasi peserta, tindak lanjut Belum Dimulai, inovasi lewat target, dan pihak berkepentingan prioritas tinggi dengan progres < 50%. Ketuk untuk membuka rinciannya.
- Kartu utama menampilkan **▲▼ dibanding bulan sebelumnya** (hijau/merah untuk skor dan nilai evaluasi; netral untuk angka kumulatif).
- **Status data per sumber** (☰): tanggal/bulan terakhir tiap sumber terisi, dibandingkan dengan bulan terpilih.
- **Tautan ke bagian:** `#ringkasan`, `#bulanan`, `#indikator`, `#kepatuhan`, `#pengembangan`, `#isu`, `#risiko`, `#organisasi`. Contoh: alamat website + `#risiko` langsung bergulir ke Peta Risiko setelah masuk.
- **Mode presentasi** (☰, akun Admin): layar penuh, pindah bagian tiap 20 detik. Tombol ‹ ❚❚ › ✕; keyboard ← → spasi, P (jeda), Esc (keluar).
- **Cetak ringkasan / PDF** (☰): satu halaman A4 mendatar, selalu tema terang (Perlu perhatian, kartu utama, grafik per bulan, evaluasi, indikator).
- Menu dan jendela pop-up membesar dari tombol/kartu asalnya (zoom, ±0,2 detik); otomatis mati bila perangkat diatur "kurangi gerakan".

## Font
Website memakai SF Pro (seperti apple.com). Font ini bawaan perangkat Apple dan lisensinya tidak mengizinkan dipasang di website, jadi tidak ikut diunggah: di Mac, iPhone, dan iPad tampil asli; di perangkat lain memakai Helvetica/Arial/Segoe UI. File Excel memakai Arial supaya tampil sama di semua komputer.

## Kecepatan (cache)
Hasil olahan tiap bagian disimpan sementara di server (maks. 6 jam). Bagian dari tab di spreadsheet ini dihitung ulang hanya bila tabnya berubah (jumlah baris/kolom berubah atau ada suntingan); file luar (Rendiklat, MLI, Profil Risiko, FRA) disegarkan tiap 10 menit. Tab besar (KSA EL2, Sertifikat) hanya dibaca kolom yang dipakai.
- **Dashboard → Percepat dashboard**: sekali saja, memasang pembaruan otomatis tiap jam supaya pengunjung tidak menunggu.
- **Dashboard → Segarkan data dashboard sekarang**: setelah menempel data besar atau bila angka terasa belum berubah.

## Pengingat email bulanan
Isi di tab **Pengaturan**: `EMAIL_PENGINGAT` (alamat, pisahkan dengan koma), `TANGGAL_PENGINGAT` (1–28, bawaan 5); alamat website diambil dari `DASHBOARD_URL`. Lalu **Dashboard → Pengingat email bulanan → Aktifkan**. Tiap tanggal itu sekitar pukul 07.00, Apps Script memeriksa isian bulan lalu (Jumlah Pegawai, Kepatuhan, tab Konman) dan tindak lanjut Belum Dimulai; email hanya dikirim bila ada yang kurang. **Kirim percobaan sekarang** selalu mengirim email; **Matikan** menghapus jadwalnya.

## Apps Script
Kode ada di [`apps-script/Code.gs`](apps-script/Code.gs), terpasang di spreadsheet gabungan (Ekstensi → Apps Script). Setelah mengganti kode: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah.

## Hal yang perlu diketahui
- Halaman website bisa dibuka siapa pun, tetapi data hanya dikirim setelah login. Apps Script menolak permintaan data tanpa token yang sah. Tombol **Keluar** menghapus data dari browser.
- Akun pemasang Apps Script harus punya akses lihat ke file Rendiklat, MLI Probis, dan Profil Risiko. Cek lewat menu **Dashboard → Cek koneksi sumber data**.
- Bila Google Sheets tidak bisa dihubungi, dashboard memakai data terakhir yang tersimpan di tab browser itu selama sesi login (bila ada) atau menampilkan pesan "Data tidak bisa dimuat". Repository ini sengaja tidak menyimpan salinan data.
- Tab lama **(Lama) Rekap L1 Kepuasan**, **(Lama) Rekap L2**, **(Lama) Rekap Sertifikat**, dan **Tautan Penting** tidak lagi dibaca dashboard. Datanya tidak dihapus.
