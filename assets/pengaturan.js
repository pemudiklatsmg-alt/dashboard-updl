/* Halaman Pengaturan (khusus Admin): semua isi tab Pengaturan, PIC Tugas Tim EPMK,
   pengingat email, sumber data, dan akun diatur dari website. Disimpan ke tab Pengaturan. */
(function () {
  var A = window.DashApp, D = window.Dash; if (!A || !D) return;
  var $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var P = { data: null, muat: false, err: '', tab: 'umum', ubah: {}, pic: null, sibuk: false, hasilCek: null, buka: '', q: '', lanjut: false, picView: 'tugas', picOrang: 'TL EPMK', undo: null };

  var KEL = [
    { id: 'umum', n: 'Umum', d: 'Judul, unit, periode data', ik: 'rumah' },
    { id: 'target', n: 'Target & perhitungan', d: 'Target evaluasi, aturan HOP', ik: 'target' },
    { id: 'tugas', n: 'Tugas Tim EPMK', d: 'PIC tiap tugas, batas waktu', ik: 'daftar' },
    { id: 'pengingat', n: 'Pengingat email', d: 'Penerima & jadwal', ik: 'lonceng' },
    { id: 'akun', n: 'Akun', d: 'Admin, Lihat, akun per orang', ik: 'orang' },
    { id: 'sumber', n: 'Lanjutan', d: 'Sumber data, hanya bila perlu', ik: 'lapis' }
  ];
  // t: teks | angka | ya | pilih | id ; k = kelompok
  var F = {
    JUDUL: { k: 'umum', l: 'Judul dashboard', d: 'Tampil di kepala halaman dan laporan cetak.' },
    UNIT: { k: 'umum', l: 'Nama unit' },
    PERIODE_DATA_PEGAWAI: { k: 'umum', l: 'Periode data pegawai', d: 'Periode tab Data - Pegawai & Alih Daya, tampil di panel Struktur Organisasi. Mis. Oktober 2026.' },
    DASHBOARD_URL: { k: 'umum', l: 'Alamat website dashboard', d: 'Dipakai sebagai tautan di email pengingat.' },
    TARGET_KEPUASAN_L1: { k: 'target', l: 'Target kepuasan peserta (Level 1)', d: 'Skala 1–5. Kosongkan bila belum ada target.', t: 'angka', min: 0, max: 5, step: 0.01, suf: 'dari 5' },
    TARGET_INSTRUKTUR: { k: 'target', l: 'Target penilaian instruktur', d: 'Skala 1–5. Kosongkan bila belum ada target.', t: 'angka', min: 0, max: 5, step: 0.01, suf: 'dari 5' },
    TARGET_KSA_L2: { k: 'target', l: 'Target KSA formatif (Level 2)', d: 'Nilai 0–100.', t: 'angka', min: 0, max: 100, step: 0.1 },
    TARGET_CC_L2: { k: 'target', l: 'Target Confidence & Commitment', t: 'angka', min: 0, max: 5, step: 0.01, sufFn: function (v) { return 'dari ' + (v.SKALA_CC || 4); } },
    SKALA_CC: { k: 'target', l: 'Skala maksimum C&C', d: 'Nilai tertinggi pada kuesioner Confidence & Commitment.', t: 'pilih', o: [['4', '1–4'], ['5', '1–5']] },
    TARGET_SERTIFIKAT: { k: 'target', l: 'Target sertifikat terbit', t: 'angka', min: 0, max: 100, step: 1, suf: '%' },
    HOP_KECUALIKAN_SELF_LEARNING: { k: 'target', l: 'Kelas Self Learning tidak dihitung dalam HOP', t: 'ya' },
    HOP_HITUNG_HARI_SEBELUM_TAHUN: { k: 'target', l: 'Hitung hari pelatihan sebelum 1 Januari dalam HOP', d: 'Untuk kelas yang dimulai di tahun sebelumnya.', t: 'ya' },
    KELAS_TANPA_REALISASI: { k: 'target', l: 'Kelas selesai tanpa realisasi peserta', d: 'Pakai rencana peserta (ditandai perkiraan) atau abaikan dari hitungan.', t: 'pilih', o: [['PAKAI RENCANA PESERTA', 'Pakai rencana peserta'], ['ABAIKAN', 'Abaikan']] },
    BATAS_HARI_DATA: { k: 'tugas', l: 'Data tarikan dianggap usang setelah', d: 'EL1, instruktur, KSA, C&C, sertifikat.', t: 'angka', min: 1, max: 90, step: 1, suf: 'hari' },
    BATAS_TANGGAL_BULANAN: { k: 'tugas', l: 'Isian bulanan paling lambat tanggal', d: 'Konman, kepatuhan, jumlah pegawai, KRI.', t: 'angka', min: 1, max: 28, step: 1, suf: 'bulan berikutnya' },
    EMAIL_PENGINGAT: { k: 'pengingat', l: 'Email penerima', d: 'Bisa lebih dari satu, pisahkan dengan koma.', t: 'email' },
    TANGGAL_PENGINGAT: { k: 'pengingat', l: 'Dikirim setiap tanggal', d: 'Sekitar pukul 07.00. Email hanya dikirim bila ada isian bulan lalu yang belum lengkap.', t: 'angka', min: 1, max: 28, step: 1, suf: 'tiap bulan' },
    KONMAN_TAB_AWALAN: { k: 'sumber', l: 'Awalan nama tab Konman', d: 'Tab Konman per tahun = awalan + tahun, mis. "Konman 2026".' },
    RENDIKLAT_TAB: { k: 'sumber', l: 'Nama sheet di file Rendiklat' },
    MLI_ID: { k: 'sumber', l: 'File MLI Probis', t: 'id' },
    MLI_TAB: { k: 'sumber', l: 'Sheet unit di MLI Probis' },
    PROFIL_RISIKO_ID: { k: 'sumber', l: 'File Profil Risiko', t: 'id' },
    PROFIL_RISIKO_TAB: { k: 'sumber', l: 'Sheet peta risiko' },
    KRI_TAB: { k: 'sumber', l: 'Sheet pemantauan KRI', d: 'Di file Profil Risiko. Tahun baru: ganti nama sheet di sini.' },
    FRA_ID: { k: 'sumber', l: 'File FRA', t: 'id', d: 'Rincian FRA hanya tampil untuk akun Admin.' },
    EL1_ID: { k: 'sumber', l: 'File DOC 1 Evaluasi Level 1', t: 'id', d: 'Kosongkan untuk memakai tab Data - Kepuasan EL1 di spreadsheet ini.' },
    EL2_ID: { k: 'sumber', l: 'File DOC 2 Evaluasi Level 2 / C&C', t: 'id', d: 'Kosongkan untuk memakai tab Data - C&C EL2 di spreadsheet ini.' }
  };
  // [contoh isian, kapan perlu diubah]
  var BANTU = {
    JUDUL: ['Dashboard Kinerja UPDL Semarang', 'Ubah bila nama dashboard berganti.'],
    UNIT: ['UPDL Semarang', 'Jarang diubah.'],
    PERIODE_DATA_PEGAWAI: ['Oktober 2026', 'Ubah setiap kali tab Data - Pegawai diperbarui, supaya pembaca tahu data pegawai per kapan.'],
    DASHBOARD_URL: ['https://…github.io/dashboard-updl/', 'Hanya bila alamat website pindah.'],
    TARGET_KEPUASAN_L1: ['4,5', 'Isi saat target tahunan ditetapkan. Dipakai untuk warna hijau/kuning/merah dan garis target di grafik.'],
    TARGET_INSTRUKTUR: ['4,5', 'Isi saat target tahunan ditetapkan.'],
    TARGET_KSA_L2: ['80', 'Isi saat target tahunan ditetapkan.'],
    TARGET_CC_L2: ['3,2', 'Isi saat target tahunan ditetapkan. Sesuaikan dengan skala C&C.'],
    SKALA_CC: ['', 'Ubah hanya bila kuesioner C&C berganti skala.'],
    TARGET_SERTIFIKAT: ['100', 'Persen sertifikat yang harus sudah terbit.'],
    HOP_KECUALIKAN_SELF_LEARNING: ['', 'Nyalakan bila kebijakan HOP tidak menghitung kelas Self Learning.'],
    HOP_HITUNG_HARI_SEBELUM_TAHUN: ['', 'Biasanya Ya. Matikan bila hari pelatihan di tahun sebelumnya tidak boleh ikut dihitung.'],
    KELAS_TANPA_REALISASI: ['', 'Pakai rencana peserta agar angka tidak anjlok saat realisasi belum diisi.'],
    BATAS_HARI_DATA: ['7', 'Makin kecil, makin cepat tugas menjadi merah di halaman Tugas Tim.'],
    BATAS_TANGGAL_BULANAN: ['7', 'Mis. 7 = isian Oktober paling lambat 7 November.'],
    EMAIL_PENGINGAT: ['nama@pln.co.id, nama2@pln.co.id', 'Tambah atau hapus penerima pengingat bulanan.'],
    TANGGAL_PENGINGAT: ['5', 'Tanggal 1–28. Jadwal ikut diperbarui otomatis saat disimpan.']
  };
  var TUGAS = [
    ['Isian bulanan', [['KONMAN', 'Isi realisasi Kontrak Manajemen (Konman)'], ['KEPATUHAN', 'Isi nilai kepatuhan bulanan'], ['PEGAWAI', 'Isi jumlah pegawai bulanan'], ['KRI', 'Isi realisasi KRI bulanan']]],
    ['Tarik data evaluasi', [['EL1', 'Evaluasi Level 1 (kepuasan peserta)'], ['INSTRUKTUR', 'Penilaian instruktur'], ['KSA', 'KSA Evaluasi Level 2'], ['CC', 'Confidence & Commitment (Level 2)'], ['SERTIFIKAT', 'Sertifikat terbit']]],
    ['Rekap periodik', [['L3', 'Rekap Evaluasi Level 3'], ['L4', 'Rekap Evaluasi Level 4'], ['ROTI', 'Rekap ROTI'], ['IDP', 'Data IDP pegawai'], ['INOVASI', 'Data & progres inovasi']]],
    ['Tindak lanjut', [['PERBAIKAN_INPUT', 'Input masukan peserta ke Perbaikan Berkelanjutan'], ['RENDIKLAT', 'Realisasi peserta kelas selesai (Rendiklat)'], ['INDIKATOR', 'Indikator Konman di bawah 95%'], ['PERBAIKAN_TL', 'Koordinasi perbaikan berkelanjutan yang belum dimulai'],
      ['PERBAIKAN_ISI', 'Lengkapi PIC & Status perbaikan berkelanjutan'], ['PERBAIKAN', 'Perbarui status perbaikan berkelanjutan']]]
  ];
  var PICS = ['TL EPMK', 'OF EPMK', 'ADM EPMK'];

  function caraTutup() { try { return localStorage.getItem('updl_at_cara') === '1'; } catch (e) { return false; } }
  function token() { var s = D.sesi(); return s ? s.token : ''; }
  function api(body) {
    body.token = token();
    return D.api(body).catch(function (e) { if (e.login) A.keluar(e.message); throw e; });
  }
  function nilai() { var o = {}; (P.data ? P.data.cfg : []).forEach(function (r) { o[r[0]] = r[1]; }); Object.keys(P.ubah).forEach(function (k) { o[k] = P.ubah[k]; }); return o; }
  function asli(k) { var r = (P.data ? P.data.cfg : []).filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : ''; }
  function picDef(k) { return [A.PIC_DEF[k]]; }
  function picKini(k) { var m = P.pic || (P.data && P.data.pic) || {}; return m[k] && m[k].length ? m[k] : picDef(k); }
  function picBerubah() {
    if (!P.pic) return 0;
    var a = P.data.pic || {}, n = 0;
    TUGAS.forEach(function (g) { g[1].forEach(function (t) { var x = (a[t[0]] && a[t[0]].length ? a[t[0]] : picDef(t[0])).join(), y = picKini(t[0]).join(); if (x !== y) n++; }); });
    return n;
  }
  function jmlUbah() { return Object.keys(P.ubah).length + picBerubah(); }

  /* ---------- tampilan ---------- */
  function render() {
    var el = $('pengaturan'); if (!el) return;
    if (!A.admin()) { el.innerHTML = ''; return; }
    if (!P.data && !P.muat) muat();
    var head = '<div class="panel at-head"><div class="panel-h"><div><h2 class="ber-ikon"><span class="ikb">' + A.ikon('gir') + '</span>Pengaturan</h2>' +
      '<div class="desc">Semua pengaturan dashboard. Perubahan disimpan ke tab Pengaturan di spreadsheet dan langsung dipakai dashboard.</div></div>' +
        (caraTutup() ? '<button type="button" class="btn sm" data-at="cara">Cara pakai</button>' : '') + '</div>' +
      (caraTutup() ? '' : '<div class="at-cara"><div class="at-cara-l"><span><b>1</b>Pilih bagian di bawah</span><span><b>2</b>Ubah isian. Yang berubah ditandai <mark>kuning</mark></span><span><b>3</b>Tekan <b>Simpan perubahan</b> di bawah layar, periksa, lalu konfirmasi</span></div>' +
        '<p>Tidak sengaja? Tekan <b>Batalkan</b> sebelum menyimpan, atau <b>Urungkan</b> sesaat setelah menyimpan. Tombol <b class="at-qi">?</b> menjelaskan kapan pengaturan perlu diubah.</p>' +
        '<button type="button" class="btn sm" data-at="caratutup">Mengerti, sembunyikan</button></div>') +
      '<div class="at-kel" role="tablist">' + KEL.map(function (k) {
        return '<button type="button" role="tab" class="at-k" data-atk="' + k.id + '" aria-selected="' + (P.tab === k.id) + '"><span class="ikb">' + A.ikon(k.ik) + '</span><span><b>' + k.n + '</b><small>' + k.d + '</small></span></button>';
      }).join('') + '</div></div>';
    var isi;
    if (P.err) isi = '<div class="panel"><div class="warnbox">' + esc(P.err) + '</div><button type="button" class="btn" data-at="muat">Coba lagi</button></div>';
    else if (!P.data) isi = '<div class="panel at-muat"><div class="sk" style="height:18px;width:40%"></div><div class="sk" style="height:46px"></div><div class="sk" style="height:46px"></div><div class="sk" style="height:46px"></div></div>';
    else isi = '<div class="panel at-isi">' + ({ tugas: tTugas, pengingat: tPengingat, sumber: tSumber, akun: tAkun }[P.tab] || tBidang)(P.tab) + '</div>';
    el.innerHTML = head + isi + barHtml();
  }
  function barHtml() {
    var n = jmlUbah();
    if (n) return '<div class="at-bar"><span><b>' + n + '</b> perubahan belum disimpan</span><button type="button" class="btn" data-at="batal">Batalkan</button><button type="button" class="btn primary" data-at="simpan"' + (P.sibuk ? ' disabled' : '') + '>' + (P.sibuk ? 'Menyimpan…' : 'Simpan perubahan') + '</button></div>';
    if (P.undo) return '<div class="at-bar ok"><span>✓ Pengaturan tersimpan.</span><button type="button" class="btn" data-at="urungkan">Urungkan</button><button type="button" class="btn" data-at="tutupundo">Tutup</button></div>';
    return '';
  }
  function bidang(k, f) {
    var v = nilai(), x = v[k] === undefined ? '' : v[k], id = 'at_' + k, ub = k in P.ubah ? ' data-ubah="1"' : '';
    var inp, suf = f.sufFn ? f.sufFn(v) : f.suf, bt = BANTU[k] || [], kunci = (f.k === 'sumber' || /^RENDIKLAT_/.test(k)) && !P.lanjut ? ' disabled' : '';
    if (f.t === 'ya') {
      var on = /^(YA|Y|TRUE|1)$/i.test(String(x).trim());
      inp = '<label class="at-sw"><input type="checkbox" id="' + id + '" data-atf="' + k + '"' + (on ? ' checked' : '') + kunci + '><i></i><span>' + (on ? 'Ya' : 'Tidak') + '</span></label>';
    } else if (f.t === 'pilih') {
      inp = '<div class="seg at-seg">' + f.o.map(function (o) { return '<button type="button" data-atf="' + k + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(x).trim().toUpperCase() === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
    } else {
      var at = f.t === 'angka' ? 'type="number" inputmode="decimal" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '"' : f.t === 'email' ? 'type="text" inputmode="email" autocomplete="off"' : 'type="text" autocomplete="off"';
      inp = '<div class="at-in"><input ' + at + ' id="' + id + '" data-atf="' + k + '" value="' + esc(x) + '"' + (bt[0] ? ' placeholder="contoh: ' + esc(bt[0]) + '"' : f.t === 'angka' ? ' placeholder="–"' : '') + kunci + '>' + (suf ? '<span class="at-suf">' + esc(suf) + '</span>' : '') + '</div>' +
        (f.t === 'id' && String(x).trim() ? '<a class="at-link" href="https://docs.google.com/spreadsheets/d/' + encodeURIComponent(String(x).trim()) + '/edit" target="_blank" rel="noopener">Buka file ↗</a>' : '');
    }
    return '<div class="at-row"' + ub + '><div class="at-l"><label for="' + id + '"><b>' + esc(f.l) + '</b></label>' + (bt[1] ? '<button type="button" class="at-q" data-atq="' + k + '" aria-expanded="' + (P.q === k) + '" aria-label="Kapan perlu diubah?">?</button>' : '') + (f.d ? '<small>' + esc(f.d) + '</small>' : '') +
      (P.q === k ? '<div class="at-help"><b>Kapan diubah?</b> ' + esc(bt[1]) + (bt[0] ? '<br><b>Contoh isian:</b> ' + esc(bt[0]) : '') + '</div>' : '') + '</div><div class="at-v">' + inp + '</div></div>';
  }
  function tBidang(kel) {
    var ks = Object.keys(F).filter(function (k) { return F[k].k === kel; });
    return '<h3 class="at-h">' + KEL.filter(function (x) { return x.id === kel; })[0].n + '</h3>' + ks.map(function (k) { return bidang(k, F[k]); }).join('');
  }
  function tTugas() {
    var salah = (P.data.picSalah || []);
    var t = '<h3 class="at-h">Batas waktu</h3>' + bidang('BATAS_HARI_DATA', F.BATAS_HARI_DATA) + bidang('BATAS_TANGGAL_BULANAN', F.BATAS_TANGGAL_BULANAN) +
      '<div class="at-h2"><h3 class="at-h">PIC tiap tugas</h3><button type="button" class="btn sm" data-at="picbawaan">Kembalikan ke bawaan</button></div>' +
      '<div class="at-pv"><div class="seg at-seg" role="group" aria-label="Tampilan PIC"><button type="button" data-atpv="tugas" aria-pressed="' + (P.picView === 'tugas') + '">Per tugas</button><button type="button" data-atpv="orang" aria-pressed="' + (P.picView === 'orang') + '">Per orang</button></div>' +
      '<p class="desc">Centang siapa yang bertanggung jawab. Satu tugas boleh dipegang lebih dari satu PIC; tugas itu dihitung di masing-masing PIC.</p></div>' +
      (salah.length ? '<div class="note at-warn">Baris PIC lama di spreadsheet yang tidak dikenali (' + salah.map(esc).join(', ') + ') akan dirapikan saat Anda menyimpan.</div>' : '') +
      '';
    if (P.picView === 'orang') return t + perOrang();
    t += '<div class="at-pic"><div class="at-pic-h"><span>Tugas</span>' + PICS.map(function (p) { return '<span>' + p.split(' ')[0] + '</span>'; }).join('') + '</div>';
    TUGAS.forEach(function (g) {
      t += '<div class="at-pic-g">' + esc(g[0]) + '</div>';
      g[1].forEach(function (x) {
        var kini = picKini(x[0]), bawaan = kini.join() === picDef(x[0]).join();
        t += '<div class="at-pic-r"><span class="at-pic-n">' + esc(x[1]) + (bawaan ? '' : ' <em class="at-badge">diubah</em>') + '</span>' + PICS.map(function (p) {
          return '<label class="at-cek" title="' + p + '"><input type="checkbox" data-atpic="' + x[0] + '" value="' + p + '"' + (kini.indexOf(p) >= 0 ? ' checked' : '') + '><i></i><span class="vh">' + p + '</span></label>';
        }).join('') + '</div>';
      });
    });
    return t + '</div>';
  }
  function perOrang() {
    var o = P.picOrang;
    var t = '<div class="at-orang">' + PICS.map(function (p) {
      var c = 0; TUGAS.forEach(function (g) { g[1].forEach(function (x) { if (picKini(x[0]).indexOf(p) >= 0) c++; }); });
      return '<button type="button" class="at-o" data-atorang="' + p + '" aria-pressed="' + (o === p) + '"><span class="tg-av">' + p.split(' ')[0] + '</span><span><b>' + p + '</b><small>' + c + ' tugas</small></span></button>';
    }).join('') + '</div><div class="at-pic">';
    TUGAS.forEach(function (g) {
      t += '<div class="at-pic-g">' + esc(g[0]) + '</div>';
      g[1].forEach(function (x) {
        var kini = picKini(x[0]), on = kini.indexOf(o) >= 0, lain = kini.filter(function (p) { return p !== o; });
        t += '<label class="at-pic-r at-pic-o"><span class="at-pic-n">' + esc(x[1]) + (lain.length ? '<small>' + (on ? 'bersama ' : 'dipegang ') + lain.map(function (p) { return p.split(' ')[0]; }).join(' & ') + '</small>' : '') + '</span>' +
          '<span class="at-cek"><input type="checkbox" data-atpic="' + x[0] + '" value="' + o + '"' + (on ? ' checked' : '') + '><i></i><span class="vh">' + o + '</span></span></label>';
      });
    });
    return t + '</div>';
  }
  function tPengingat() {
    var on = P.data.pengingat;
    return '<h3 class="at-h">Pengingat email bulanan</h3>' +
      '<div class="at-status"><span class="pill ' + (on ? 'good' : '') + '">' + (on ? 'Aktif' : 'Tidak aktif') + '</span><span class="desc">' + (on ? 'Email dikirim otomatis tiap bulan.' : 'Belum ada jadwal pengiriman.') + '</span></div>' +
      bidang('EMAIL_PENGINGAT', F.EMAIL_PENGINGAT) + bidang('TANGGAL_PENGINGAT', F.TANGGAL_PENGINGAT) +
      '<div class="at-aksi"><button type="button" class="btn primary" data-at="ingat-aktif">' + (on ? 'Perbarui jadwal' : 'Aktifkan pengingat') + '</button>' +
      '<button type="button" class="btn" data-at="ingat-coba">Kirim email percobaan</button>' + (on ? '<button type="button" class="btn" data-at="ingat-mati">Matikan</button>' : '') + '</div>' +
      '<p class="desc at-p">Perubahan penerima atau tanggal disimpan dulu otomatis sebelum jadwal diperbarui.</p>';
  }
  function tSumber() {
    var v = nilai(), ren = Object.keys(v).filter(function (k) { return /^RENDIKLAT_\d{4}$/.test(k); }).sort();
    var lain = (P.data.cfg || []).map(function (r) { return r[0]; }).filter(function (k) { return !F[k] && !/^RENDIKLAT_\d{4}$/.test(k) && k !== 'RENDIKLAT_TAB'; });
    var t = '<div class="at-lanjut' + (P.lanjut ? ' buka' : '') + '"><b>' + (P.lanjut ? '🔓 Mode ubah aktif' : '⚠️ Hanya ubah bila diminta') + '</b><span>' + (P.lanjut ? 'Pastikan ID file dan nama sheet benar. Setelah menyimpan, tekan <b>Cek koneksi sumber data</b> di bawah.' : 'Bagian ini menentukan file mana yang dibaca dashboard. Salah isi dapat membuat data tidak tampil. Biasanya hanya diubah saat awal tahun (file Rendiklat baru) atau saat file sumber pindah.') + '</span>' +
      (P.lanjut ? '<button type="button" class="btn sm" data-at="kunci">Kunci lagi</button>' : '<button type="button" class="btn sm" data-at="bukakunci">Saya mengerti, izinkan mengubah</button>') + '</div>' +
      '<h3 class="at-h">File Rendiklat per tahun</h3>' + ren.map(function (k) { return bidang(k, { l: 'Rendiklat ' + k.slice(-4), t: 'id' }); }).join('') +
      (P.lanjut ? '' : '<!--') + '<div class="at-aksi"><button type="button" class="btn sm" data-at="tambahtahun">+ Tambah tahun ' + (ren.length ? Number(ren[ren.length - 1].slice(-4)) + 1 : new Date().getFullYear()) + '</button></div>' + (P.lanjut ? '' : '-->') +
      '<h3 class="at-h">File & sheet lain</h3>' + Object.keys(F).filter(function (k) { return F[k].k === 'sumber'; }).map(function (k) { return bidang(k, F[k]); }).join('') +
      (lain.length ? '<h3 class="at-h">Lainnya</h3>' + lain.map(function (k) { var r = P.data.cfg.filter(function (x) { return x[0] === k; })[0]; return bidang(k, { l: k, d: r[2] }); }).join('') : '') +
      '<h3 class="at-h">Pemeriksaan</h3><div class="at-aksi"><button type="button" class="btn" data-at="cek"' + (P.sibuk ? ' disabled' : '') + '>Cek koneksi sumber data</button><button type="button" class="btn" data-at="segar">Segarkan data dashboard</button></div>' +
      (P.hasilCek ? '<ul class="at-cekl">' + P.hasilCek.map(function (x) { var ok = !/GAGAL|tidak ditemukan/.test(x); return '<li data-st="' + (ok ? 'good' : 'bad') + '"><i></i>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="desc at-p">ID file adalah bagian alamat Google Sheets di antara <b>/d/</b> dan <b>/edit</b>. Boleh juga tempel alamat lengkapnya; ID diambil otomatis.</p>';
    return t;
  }
  function tAkun() {
    var a = P.data.akun || {}, buka = P.buka;
    var form = function (kode, judul, user, ket) {
      return '<div class="at-akun"><div class="at-akun-h"><span class="tg-av">' + (kode === 'admin' ? 'ADM' : 'LHT') + '</span><div><b>' + judul + '</b><small>' + ket + '</small></div>' +
        '<span class="at-u">' + (user ? esc(user) : '<em>belum diatur</em>') + '</span><button type="button" class="btn sm" data-at="buka" data-k="' + kode + '">' + (buka === kode ? 'Tutup' : 'Ubah') + '</button></div>' +
        (buka === kode ? '<form class="at-form" data-akun="' + kode + '" autocomplete="off">' +
          '<label>Username<input name="user" value="' + esc(user) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' +
          '<label>Password baru<input name="pw" type="password" autocomplete="new-password" placeholder="' + (user ? 'kosongkan bila tidak diganti' : 'minimal 8 karakter') + '"></label>' +
          '<label>Ulangi password baru<input name="pw2" type="password" autocomplete="new-password"></label>' +
          '<label class="at-konf">Password Admin saat ini<small>Wajib, untuk memastikan yang mengubah benar Admin.</small><input name="pwSekarang" type="password" autocomplete="current-password" required></label>' +
          '<div class="at-aksi"><button class="btn primary" type="submit">Simpan akun ' + (kode === 'admin' ? 'Admin' : 'Lihat') + '</button></div>' +
          (kode === 'admin' ? '<p class="desc">Setelah disimpan, Anda akan keluar dan perlu masuk lagi dengan data baru.</p>' : '<p class="desc">Semua yang sedang login dengan akun Lihat bersama akan perlu masuk lagi.</p>') + '</form>' : '') + '</div>';
    };
    var tb = (a.tambahan || []);
    return '<h3 class="at-h">Akun bersama</h3>' +
      form('admin', 'Akun Admin', a.admin, 'Melihat semua, mengisi data, export, pengaturan') +
      form('lihat', 'Akun Lihat bersama', a.lihat, 'Hanya melihat dashboard') +
      '<div class="at-h2"><h3 class="at-h">Akun Lihat per orang</h3><button type="button" class="btn sm" data-at="buka" data-k="tambah">' + (buka === 'tambah' ? 'Tutup' : '+ Tambah akun') + '</button></div>' +
      '<p class="desc at-p">Opsional: akun Lihat untuk tiap orang, bisa dinonaktifkan sendiri-sendiri tanpa mengganti password akun bersama.</p>' +
      (buka === 'tambah' ? '<form class="at-form" data-akun="tambah" autocomplete="off"><label>Username<input name="user" autocomplete="off" autocapitalize="off" spellcheck="false" required></label><label>Nama pemilik<input name="nama" autocomplete="off"></label>' +
        '<label>Password<input name="pw" type="password" autocomplete="new-password" required placeholder="minimal 8 karakter"></label><label>Ulangi password<input name="pw2" type="password" autocomplete="new-password" required></label>' +
        '<div class="at-aksi"><button class="btn primary" type="submit">Tambah akun Lihat</button></div></form>' : '') +
      (tb.length ? '<div class="at-tb">' + tb.map(function (x) {
        var k = 'sandi:' + x.user;
        return '<div class="at-tb-r"><div><b>' + esc(x.user) + '</b><small>' + esc(x.nama || '–') + '</small></div><span class="pill ' + (x.aktif ? 'good' : '') + '">' + (x.aktif ? 'Aktif' : 'Nonaktif') + '</span>' +
          '<div class="at-aksi"><button type="button" class="btn sm" data-at="buka" data-k="' + esc(k) + '">' + (x.aktif ? 'Ganti password' : 'Aktifkan') + '</button>' + (x.aktif ? '<button type="button" class="btn sm" data-at="nonaktif" data-u="' + esc(x.user) + '">Nonaktifkan</button>' : '') + '</div>' +
          (buka === k ? '<form class="at-form" data-akun="sandi" data-u="' + esc(x.user) + '" autocomplete="off"><label>Password baru<input name="pw" type="password" autocomplete="new-password" required placeholder="minimal 8 karakter"></label><label>Ulangi<input name="pw2" type="password" autocomplete="new-password" required></label><div class="at-aksi"><button class="btn primary" type="submit">Simpan</button></div></form>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="empty">Belum ada akun Lihat per orang.</div>') +
      '<p class="desc at-p">Password tidak pernah disimpan dalam bentuk asli dan tidak bisa dilihat lagi, hanya bisa diganti. Riwayat masuk ada di tab Log Login.</p>';
  }

  /* ---------- data ---------- */
  function muat() {
    P.muat = true; P.err = '';
    return api({ aksi: 'pengaturan' }).then(function (d) { P.data = d; P.ubah = {}; P.pic = null; }).catch(function (e) {
      P.err = /Aksi tidak dikenal/.test(e.message) ? 'Apps Script belum diperbarui. Tempel Code.gs terbaru lalu Deploy versi baru agar halaman Pengaturan bisa dipakai.' : 'Pengaturan tidak bisa dimuat: ' + e.message;
    }).then(function () { P.muat = false; if (A.S.vt === 'pengaturan') render(); });
  }
  function idDari(v) { var m = String(v).match(/\/d\/([A-Za-z0-9_-]{20,})/); return m ? m[1] : String(v).trim(); }
  function simpan() {
    if (P.sibuk) return Promise.resolve();
    var nilaiBaru = {}, salah = '';
    Object.keys(P.ubah).forEach(function (k) {
      var f = F[k] || (/^RENDIKLAT_\d{4}$/.test(k) ? { t: 'id' } : {}), v = String(P.ubah[k]).trim();
      if (f.t === 'id') v = idDari(v);
      if (f.t === 'angka' && v !== '') { var n = Number(v.replace(',', '.')); if (isNaN(n) || n < f.min || n > f.max) salah = salah || f.l + ' harus antara ' + f.min + ' dan ' + f.max + '.'; else v = String(n); }
      if (f.t === 'email' && v && !v.split(/\s*[,;]\s*/).every(function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); })) salah = salah || 'Alamat email tidak valid.';
      nilaiBaru[k] = v;
    });
    if (salah) { A.toast(salah); return Promise.reject(new Error(salah)); }
    if (!P.yakin) { konfirmasi(nilaiBaru); return Promise.resolve(); }
    P.yakin = false;
    var lamaNilai = {}; Object.keys(nilaiBaru).forEach(function (k) { lamaNilai[k] = asli(k); });
    var lamaPic = picBerubah() ? JSON.parse(JSON.stringify(P.data.pic || {})) : null;
    var body = { aksi: 'simpanPengaturan', nilai: nilaiBaru };
    if (picBerubah()) {
      body.pic = {}; body.picDef = {};
      TUGAS.forEach(function (g) { g[1].forEach(function (t) { body.pic[t[0]] = picKini(t[0]); body.picDef[t[0]] = picDef(t[0]).join(','); }); });
    }
    P.sibuk = true; render();
    return api(body).then(function (d) {
      A.toast(d.pesan || 'Pengaturan tersimpan.');
      P.undo = { nilai: lamaNilai, pic: lamaPic }; clearTimeout(P.undoT); P.undoT = setTimeout(function () { P.undo = null; if (A.S.vt === 'pengaturan') render(); }, 30000);
      P.sibuk = false; return muat().then(function () { if (A.muatUlang) A.muatUlang(); });
    }).catch(function (e) { P.sibuk = false; render(); A.toast('Gagal menyimpan: ' + e.message, 6000); throw e; });
  }
  function labelKunci(k) { return (F[k] && F[k].l) || (/^RENDIKLAT_(\d{4})$/.test(k) ? 'File Rendiklat ' + k.slice(-4) : k); }
  function tampil(k, v) {
    var f = F[k] || {}; v = String(v === undefined || v === null ? '' : v).trim();
    if (v === '') return '<em>kosong</em>';
    if (f.t === 'ya') return /^(YA|Y|TRUE|1)$/i.test(v) ? 'Ya' : 'Tidak';
    if (f.t === 'pilih') { var o = f.o.filter(function (x) { return x[0] === v.toUpperCase(); })[0]; return esc(o ? o[1] : v); }
    if (f.t === 'id' && v.length > 18) return esc(v.slice(0, 8) + '…' + v.slice(-6));
    return esc(v.replace('.', ','));
  }
  function konfirmasi(nb) {
    var baris = Object.keys(nb).map(function (k) { return '<li><b>' + esc(labelKunci(k)) + '</b><span>' + tampil(k, asli(k)) + ' <i>→</i> ' + tampil(k, nb[k]) + '</span></li>'; });
    if (picBerubah()) {
      var a = P.data.pic || {};
      TUGAS.forEach(function (g) { g[1].forEach(function (t) {
        var x = (a[t[0]] && a[t[0]].length ? a[t[0]] : picDef(t[0])), y = picKini(t[0]);
        if (x.join() !== y.join()) baris.push('<li><b>PIC: ' + esc(t[1]) + '</b><span>' + esc(x.join(', ')) + ' <i>→</i> ' + esc(y.join(', ')) + '</span></li>');
      }); });
    }
    A.openModal('<div class="modal-h"><div><div class="desc">Periksa sekali lagi sebelum disimpan</div><h3>Simpan ' + baris.length + ' perubahan?</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<ul class="at-diff">' + baris.join('') + '</ul><p class="desc">Perubahan langsung dipakai dashboard. Bila keliru, tekan <b>Urungkan</b> setelah menyimpan.</p>' +
      '<div class="ig-aksi"><button type="button" class="btn" data-close>Periksa lagi</button><button type="button" class="btn primary" id="atYa">Ya, simpan</button></div>', 'atur-konf');
  }
  function urungkan() {
    var u = P.undo; if (!u) return; P.undo = null;
    var body = { aksi: 'simpanPengaturan', nilai: u.nilai };
    if (u.pic) { body.pic = {}; body.picDef = {}; TUGAS.forEach(function (g) { g[1].forEach(function (t) { body.pic[t[0]] = u.pic[t[0]] && u.pic[t[0]].length ? u.pic[t[0]] : picDef(t[0]); body.picDef[t[0]] = picDef(t[0]).join(','); }); }); }
    P.sibuk = true; render();
    api(body).then(function () { A.toast('Perubahan terakhir diurungkan.'); P.sibuk = false; return muat().then(function () { if (A.muatUlang) A.muatUlang(); }); })
      .catch(function (e) { P.sibuk = false; render(); A.toast('Gagal mengurungkan: ' + e.message, 6000); });
  }
  function aksiAkun(form) {
    var jenis = form.getAttribute('data-akun'), g = function (n) { var x = form.querySelector('[name="' + n + '"]'); return x ? x.value : ''; };
    if ((g('pw') || g('pw2')) && g('pw') !== g('pw2')) return A.toast('Ulangan password tidak sama.');
    if (g('pw') && g('pw').length < 8) return A.toast('Password minimal 8 karakter.');
    var body = { aksi: 'akun', op: jenis === 'admin' || jenis === 'lihat' ? jenis : jenis === 'tambah' ? 'tambah' : 'sandi', user: jenis === 'sandi' ? form.getAttribute('data-u') : g('user').trim(), pw: g('pw'), nama: g('nama'), pwSekarang: g('pwSekarang') };
    var btn = form.querySelector('[type="submit"]'); btn.disabled = true; btn.textContent = 'Menyimpan…';
    api(body).then(function (d) {
      if (d.keluar) return A.keluar('Akun Admin sudah diubah. Silakan masuk dengan username/password baru.');
      P.data.akun = d.akun; P.buka = ''; render(); A.toast(d.pesan, 6000);
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Coba lagi'; A.toast(e.message, 6000); });
  }

  /* ---------- kejadian ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#pengaturan')) return;
    var k = t.closest('[data-atk]'); if (k) { P.tab = k.getAttribute('data-atk'); P.buka = ''; P.q = ''; render(); return; }
    var q = t.closest('[data-atq]'); if (q) { var qk = q.getAttribute('data-atq'); P.q = P.q === qk ? '' : qk; render(); return; }
    var pv = t.closest('[data-atpv]'); if (pv) { P.picView = pv.getAttribute('data-atpv'); render(); return; }
    var po = t.closest('[data-atorang]'); if (po) { P.picOrang = po.getAttribute('data-atorang'); render(); return; }
    var s = t.closest('button[data-atf]'); if (s) { var key = s.getAttribute('data-atf'), v = s.getAttribute('data-v'); if (v === String(asli(key)).trim().toUpperCase()) delete P.ubah[key]; else P.ubah[key] = v; render(); return; }
    var b = t.closest('[data-at]'); if (!b) return;
    var a = b.getAttribute('data-at');
    if (a === 'muat') { P.err = ''; render(); muat(); }
    else if (a === 'batal') { P.ubah = {}; P.pic = null; render(); }
    else if (a === 'simpan') simpan();
    else if (a === 'urungkan') urungkan();
    else if (a === 'tutupundo') { P.undo = null; render(); }
    else if (a === 'cara') { try { localStorage.removeItem('updl_at_cara'); } catch (x) { /* abaikan */ } render(); }
    else if (a === 'caratutup') { try { localStorage.setItem('updl_at_cara', '1'); } catch (x) { /* abaikan */ } render(); }
    else if (a === 'bukakunci') { P.lanjut = true; render(); }
    else if (a === 'kunci') { P.lanjut = false; render(); }
    else if (a === 'picbawaan') { P.pic = {}; TUGAS.forEach(function (g) { g[1].forEach(function (x) { P.pic[x[0]] = picDef(x[0]); }); }); render(); }
    else if (a === 'buka') { var kk = b.getAttribute('data-k'); P.buka = P.buka === kk ? '' : kk; render(); var f = document.querySelector('#pengaturan .at-form input'); if (f) f.focus(); }
    else if (a === 'nonaktif') { var u = b.getAttribute('data-u'); if (b.getAttribute('data-yakin') !== '1') { b.setAttribute('data-yakin', '1'); b.textContent = 'Yakin? Klik lagi'; b.classList.add('bahaya'); return; }
      api({ aksi: 'akun', op: 'nonaktif', user: u }).then(function (d) { P.data.akun = d.akun; render(); A.toast(d.pesan, 6000); }).catch(function (er) { A.toast(er.message); }); }
    else if (a === 'tambahtahun') { var ren = Object.keys(nilai()).filter(function (x) { return /^RENDIKLAT_\d{4}$/.test(x); }).sort(); var th = ren.length ? Number(ren[ren.length - 1].slice(-4)) + 1 : new Date().getFullYear(); P.ubah['RENDIKLAT_' + th] = ''; render(); }
    else if (a === 'cek' || a === 'segar') {
      P.sibuk = true; b.textContent = a === 'cek' ? 'Memeriksa… (bisa 1–2 menit)' : 'Menyegarkan…'; b.disabled = true;
      api({ aksi: a === 'cek' ? 'cekKoneksi' : 'segarkan' }).then(function (d) { P.sibuk = false; if (d.hasil) P.hasilCek = d.hasil; else { A.toast('Data dashboard disegarkan.'); if (A.muatUlang) A.muatUlang(); } render(); })
        .catch(function (er) { P.sibuk = false; render(); A.toast(er.message, 6000); });
    } else if (/^ingat-/.test(a)) {
      var op = a.slice(6), lanjut = Object.keys(P.ubah).some(function (x) { return F[x] && F[x].k === 'pengingat'; }) ? simpan() : Promise.resolve();
      b.disabled = true; b.textContent = 'Memproses…';
      lanjut.then(function () { return api({ aksi: 'pengingat', op: op }); }).then(function (d) { P.data.pengingat = d.pengingat; render(); A.toast(d.pesan, 7000); })
        .catch(function (er) { render(); A.toast(er.message, 6000); });
    }
  });
  document.addEventListener('click', function (e) {
    if (!e.target || e.target.id !== 'atYa') return;
    var c = document.querySelector('#modal [data-close]'); if (c) c.click();
    P.yakin = true; simpan().catch(function () { /* sudah diberi tahu */ });
  });
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#pengaturan')) return;
    var key = t.getAttribute('data-atf');
    if (key) {
      var v = t.type === 'checkbox' ? (t.checked ? 'YA' : 'TIDAK') : t.value;
      var sama = t.type === 'checkbox' ? /^(YA|Y|TRUE|1)$/i.test(String(asli(key)).trim()) === t.checked : v.trim() === String(asli(key)).trim();
      if (sama && !(key in {}) && P.data.cfg.some(function (r) { return r[0] === key; })) delete P.ubah[key]; else P.ubah[key] = v;
      if (t.type === 'checkbox') { var sp = t.parentNode.querySelector('span'); if (sp) sp.textContent = t.checked ? 'Ya' : 'Tidak'; }
      var row = t.closest('.at-row'); if (row) { if (key in P.ubah) row.setAttribute('data-ubah', '1'); else row.removeAttribute('data-ubah'); }
      bar(); return;
    }
    var pk = t.getAttribute('data-atpic');
    if (pk) {
      var pilih = picKini(pk).filter(function (p) { return p !== t.value; }); if (t.checked) pilih.push(t.value);
      if (!pilih.length) { t.checked = true; return A.toast('Setiap tugas minimal punya satu PIC.'); }
      if (!P.pic) { P.pic = {}; TUGAS.forEach(function (g) { g[1].forEach(function (x) { P.pic[x[0]] = picKini(x[0]); }); }); }
      P.pic[pk] = PICS.filter(function (p) { return pilih.indexOf(p) >= 0; });
      render();
    }
  });
  // perbarui hanya bilah simpan saat mengetik agar fokus input tidak hilang
  function bar() {
    var el = $('pengaturan'), b = el.querySelector('.at-bar'), h = barHtml();
    if (b) b.remove();
    if (h) el.insertAdjacentHTML('beforeend', h);
  }
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.closest || !f.closest('#pengaturan') || !f.hasAttribute('data-akun')) return;
    e.preventDefault(); aksiAkun(f);
  });
  window.addEventListener('beforeunload', function (e) { if (jmlUbah()) { e.preventDefault(); e.returnValue = ''; } });

  A.renderPengaturan = render;
  A.resetPengaturan = function () { P.data = null; P.ubah = {}; P.pic = null; P.err = ''; P.hasilCek = null; P.buka = ''; };
})();
