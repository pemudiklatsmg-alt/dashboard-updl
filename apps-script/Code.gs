/**
 * ==========================================================================
 *  DASHBOARD KINERJA UPDL SEMARANG — Apps Script versi 3 (membaca + input web)
 *  Dipasang pada spreadsheet "Data Dashboard UPDL Semarang".
 * --------------------------------------------------------------------------
 *  Sumber yang dibaca:
 *   - Spreadsheet ini : Konman <tahun>, Jumlah Pegawai, Rekap L1/L2/L3/L4/ROTI/
 *                        Sertifikat, Kepatuhan, Tindak Lanjut Evaluasi,
 *                        Tautan Penting, Koreksi Rendiklat, Penyesuaian HOP
 *   - Rendiklat        : sheet RENREKAP (ID per tahun di tab Pengaturan)
 *   - MLI Probis       : sheet SMG
 *   - Profil Risiko    : sheet "4. Peta Risiko" (versi Google Sheets)
 *
 *  Menu di spreadsheet: Dashboard > Tarik daftar kelas tanpa realisasi
 *                      Dashboard > Atur akun input web
 *
 *  Input dari website (doPost) hanya menulis ke tab yang sudah ada, dengan
 *  kolom yang sama. Tidak ada tab atau kolom baru. Password disimpan sebagai
 *  hash di Script Properties (tidak di spreadsheet, tidak di kode website).
 *
 *  Setelah mengganti kode ini: Deploy > Manage deployments > ✏️ >
 *  Version: New version > Deploy. URL /exec tetap sama.
 * ==========================================================================
 */

var VERSI = 3;
var BULAN_ = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

var TAB = {
  PENGATURAN: 'Pengaturan',
  PEGAWAI: 'Jumlah Pegawai',
  L1: 'Rekap L1 Kepuasan',
  L2: 'Rekap L2',
  L3: 'Rekap L3 Perilaku',
  L4: 'Rekap L4 Kinerja',
  ROTI: 'Rekap ROTI',
  SERTIFIKAT: 'Rekap Sertifikat',
  KEPATUHAN: 'Kepatuhan',
  TINDAKLANJUT: 'Tindak Lanjut Evaluasi',
  TAUTAN: 'Tautan Penting',
  KOREKSI: 'Koreksi Rendiklat',
  PENYESUAIAN: 'Penyesuaian HOP'
};

/* Kolom Rendiklat yang dipakai (dicari berdasarkan judul kolom baris 1) */
var KOLOM_REN = ['ID REN', 'nm_judul', 'laks_diklat', 'Status Pelaksanaan', 'R.Tgl Mulai', 'R.Tgl Selesai',
  'Rencana Peserta', 'Realisasi Peserta', 'JP'];

/* ======================================================================== */
/*  MENU                                                                     */
/* ======================================================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dashboard')
    .addItem('Tarik daftar kelas tanpa realisasi', 'tarikKelasTanpaRealisasi')
    .addItem('Cek koneksi sumber data', 'cekKoneksi')
    .addSeparator()
    .addItem('Atur akun input web', 'aturAkunWeb')
    .addToUi();
}

function cekKoneksi() {
  var cfg = getConfig_(), pesan = [];
  Object.keys(cfg).filter(function (k) { return /^RENDIKLAT_\d{4}$/.test(k); }).forEach(function (k) {
    try { bukaSheet_(cfg[k], cfg.RENDIKLAT_TAB || 'RENREKAP').getLastRow(); pesan.push(k + ': OK'); }
    catch (e) { pesan.push(k + ': GAGAL — ' + e.message); }
  });
  try { bukaSheet_(cfg.MLI_ID, cfg.MLI_TAB || 'SMG').getLastRow(); pesan.push('MLI Probis: OK'); }
  catch (e) { pesan.push('MLI Probis: GAGAL — ' + e.message); }
  try { bukaSheet_(cfg.PROFIL_RISIKO_ID, cfg.PROFIL_RISIKO_TAB || '4. Peta Risiko').getLastRow(); pesan.push('Profil Risiko: OK'); }
  catch (e) { pesan.push('Profil Risiko: GAGAL — ' + e.message); }
  var konman = tabKonman_(SpreadsheetApp.getActiveSpreadsheet(), cfg);
  pesan.push('Tab Konman: ' + (Object.keys(konman).join(', ') || 'tidak ditemukan'));
  safeAlert_(pesan.join('\n'));
}

/**
 * Menambahkan ke tab "Koreksi Rendiklat" semua kelas berstatus Selesai yang
 * Realisasi Peserta-nya kosong dan belum ada di daftar. Kunci = ID REN + Judul + Tgl Mulai.
 */
function tarikKelasTanpaRealisasi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cfg = getConfig_();
  var sh = ss.getSheetByName(TAB.KOREKSI);
  if (!sh) throw new Error('Tab "' + TAB.KOREKSI + '" tidak ditemukan.');
  var ada = {};
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().forEach(function (r) { ada[kunci_(r[0], r[1], r[2])] = true; });
  }
  var baru = [];
  Object.keys(cfg).filter(function (k) { return /^RENDIKLAT_\d{4}$/.test(k); }).forEach(function (k) {
    bacaRendiklat_(cfg[k], cfg.RENDIKLAT_TAB).forEach(function (r) {
      // r: [ID, judul, metode, status, mulai, selesai, rencana, realisasi, jp]
      if (String(r[3]).trim() !== 'Selesai' || String(r[7]).trim() !== '') return;
      var key = kunci_(r[0], r[1], r[4]);
      if (ada[key]) return;
      ada[key] = true;
      baru.push(["'" + r[0], r[1], keTanggal_(r[4]), keTanggal_(r[5]), r[2], r[6], '', '', 'Ya', '', '']);
    });
  });
  if (baru.length) sh.getRange(sh.getLastRow() + 1, 1, baru.length, 11).setValues(baru);
  SpreadsheetApp.flush();
  // Notifikasi kecil di pojok kanan bawah (tidak perlu diklik, tidak menahan proses)
  ss.toast(baru.length ? baru.length + ' kelas ditambahkan. Isi kolom Realisasi Peserta (koreksi).'
                       : 'Tidak ada kelas baru tanpa realisasi.', 'Koreksi Rendiklat', 8);
}

/* ======================================================================== */
/*  API BACA                                                                 */
/* ======================================================================== */
function doGet(e) {
  try { return json_(buildData_()); }
  catch (err) { return json_({ error: String(err && err.message || err) }); }
}

function buildData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getConfig_();
  var out = {
    meta: {
      versi: VERSI, source: 'live', generatedAt: new Date().toISOString(),
      unit: cfg.UNIT, judul: cfg.JUDUL,
      inputWeb: !!PropertiesService.getScriptProperties().getProperty('WEB_PASS_HASH'),
      pengaturan: {
        kecualikanSL: ya_(cfg.HOP_KECUALIKAN_SELF_LEARNING),
        hitungHariSebelumTahun: cfg.HOP_HITUNG_HARI_SEBELUM_TAHUN === undefined ? true : ya_(cfg.HOP_HITUNG_HARI_SEBELUM_TAHUN),
        tanpaRealisasi: String(cfg.KELAS_TANPA_REALISASI || 'PAKAI RENCANA PESERTA').toUpperCase(),
        targetL1: angka_(cfg.TARGET_KEPUASAN_L1), targetKSA: angka_(cfg.TARGET_KSA_L2),
        targetCC: angka_(cfg.TARGET_CC_L2), targetSertifikat: angka_(cfg.TARGET_SERTIFIKAT)
      },
      links: {
        data: ss.getUrl(),
        mli: cfg.MLI_ID ? 'https://docs.google.com/spreadsheets/d/' + cfg.MLI_ID + '/edit' : '',
        profilRisiko: cfg.PROFIL_RISIKO_ID ? 'https://docs.google.com/spreadsheets/d/' + cfg.PROFIL_RISIKO_ID + '/edit' : '',
        rendiklat: {}
      }
    },
    warnings: []
  };

  // Konman per tahun (tab lokal)
  out.konman = tabKonman_(ss, cfg);
  if (!Object.keys(out.konman).length) out.warnings.push('Tab Konman tidak ditemukan (nama tab harus "' + (cfg.KONMAN_TAB_AWALAN || 'Konman ') + '<tahun>").');

  // Tab lokal
  out.pegawai = readTab_(ss, TAB.PEGAWAI, out);
  out.l1 = readTab_(ss, TAB.L1, out);
  out.l2 = readTab_(ss, TAB.L2, out);
  out.l3 = readTab_(ss, TAB.L3, out);
  out.l4 = readTab_(ss, TAB.L4, out);
  out.roti = readTab_(ss, TAB.ROTI, out);
  out.sertifikat = readTab_(ss, TAB.SERTIFIKAT, out);
  out.kepatuhan = readTab_(ss, TAB.KEPATUHAN, out);
  out.tindaklanjut = readTab_(ss, TAB.TINDAKLANJUT, out);
  out.tautan = readTab_(ss, TAB.TAUTAN, out);
  out.koreksi = readTab_(ss, TAB.KOREKSI, out);
  out.penyesuaian = readTab_(ss, TAB.PENYESUAIAN, out);

  // Rendiklat per tahun
  out.rendiklat = {};
  Object.keys(cfg).filter(function (k) { return /^RENDIKLAT_\d{4}$/.test(k); }).forEach(function (k) {
    var th = k.slice(-4);
    out.meta.links.rendiklat[th] = 'https://docs.google.com/spreadsheets/d/' + cfg[k] + '/edit';
    try {
      out.rendiklat[th] = [KOLOM_REN].concat(bacaRendiklat_(cfg[k], cfg.RENDIKLAT_TAB).map(function (r) {
        return [r[0], r[1], r[2], r[3], keIso_(r[4]), keIso_(r[5]), r[6], r[7], r[8]];
      }));
    } catch (e) { out.warnings.push('Rendiklat ' + th + ' tidak bisa dibaca: ' + e.message); }
  });

  // MLI Probis sheet SMG -> skor per key element
  try { out.maturity = bacaMaturity_(cfg); }
  catch (e) { out.warnings.push('MLI Probis tidak bisa dibaca: ' + e.message); out.maturity = []; }

  // Peta risiko
  try { out.risiko = bacaRisiko_(cfg); }
  catch (e) { out.warnings.push('Profil Risiko tidak bisa dibaca: ' + e.message); out.risiko = { tampilan: '', rows: [] }; }

  return out;
}

/* ---------- Konman ---------- */
function tabKonman_(ss, cfg) {
  var awalan = String(cfg.KONMAN_TAB_AWALAN || 'Konman ');
  var res = {};
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if (n.indexOf(awalan) === 0 && /^\d{4}$/.test(n.slice(awalan.length).trim())) {
      var rng = sh.getRange(1, 1, Math.min(sh.getLastRow(), 200), Math.min(sh.getLastColumn(), 80));
      res[n.slice(awalan.length).trim()] = { values: clean_(rng.getValues()), display: rng.getDisplayValues() };
    }
  });
  return res;
}

/* ---------- Rendiklat ---------- */
function bacaRendiklat_(id, tab) {
  var sh = bukaSheet_(id, tab || 'RENREKAP');
  var last = sh.getLastRow(), lastC = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, lastC).getValues()[0].map(function (h) { return String(h).trim(); });
  var idx = KOLOM_REN.map(function (k) { return head.indexOf(k); });
  var miss = KOLOM_REN.filter(function (k, i) { return idx[i] < 0; });
  if (miss.length) throw new Error('kolom tidak ditemukan: ' + miss.join(', '));
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, lastC).getValues();
  return vals.filter(function (r) { return String(r[idx[1]]).trim() !== ''; })
    .map(function (r) { return idx.map(function (i) { var v = r[i]; return typeof v === 'string' ? v.trim() : v; }); });
}

/* ---------- Maturity (sheet SMG) ---------- */
function bacaMaturity_(cfg) {
  var sh = bukaSheet_(cfg.MLI_ID, cfg.MLI_TAB || 'SMG');
  var v = sh.getDataRange().getValues();
  var h = v[0].map(function (x) { return String(x).trim(); });
  var cNo = h.indexOf('No'), cKE = h.indexOf('Key Element'), cSA = h.indexOf('Level SA'), cVer = h.indexOf('Level Verifikasi');
  if (cNo < 0 || cKE < 0 || cSA < 0 || cVer < 0) throw new Error('kolom No / Key Element / Level SA / Level Verifikasi tidak ditemukan di sheet ' + sh.getName());
  var urut = [], map = {};
  v.slice(1).forEach(function (r) {
    var no = String(r[cNo]).trim(); if (!no) return;
    if (!map[no]) { map[no] = { no: no, ke: String(r[cKE]).trim(), sa: 0, ver: 0, adaVer: false }; urut.push(no); }
    var sa = Number(r[cSA]), ve = Number(r[cVer]);
    if (r[cSA] !== '' && !isNaN(sa)) map[no].sa += sa;
    if (r[cVer] !== '' && !isNaN(ve)) { map[no].ver += ve; map[no].adaVer = true; }
  });
  return urut.map(function (k) { var x = map[k]; return [x.no, x.ke, bulat_(x.sa), x.adaVer ? bulat_(x.ver) : '']; });
}

/* ---------- Peta risiko ---------- */
function bacaRisiko_(cfg) {
  var sh = bukaSheet_(cfg.PROFIL_RISIKO_ID, cfg.PROFIL_RISIKO_TAB || '4. Peta Risiko');
  var d = sh.getRange(1, 1, Math.min(sh.getLastRow(), 300), Math.min(sh.getLastColumn(), 80)).getDisplayValues();
  var tampilan = '';
  for (var i = 0; i < Math.min(d.length, 20) && !tampilan; i++) {
    for (var j = 0; j < d[i].length; j++) {
      if (/Menampilkan/i.test(d[i][j])) { for (var k = j + 1; k < d[i].length; k++) if (d[i][k].trim()) { tampilan = d[i][k].trim(); break; } break; }
    }
  }
  var hr = -1;
  for (i = 0; i < d.length; i++) if (d[i].some(function (x) { return x.trim() === 'No Urut'; })) { hr = i; break; }
  if (hr < 0) throw new Error('baris judul "No Urut" tidak ditemukan');
  var H = d[hr].map(function (x) { return x.trim(); });
  var cNo = H.indexOf('No Urut'), cId = H.indexOf('ID Risk'), cDes = H.indexOf('Deskripsi Risiko');
  var cInh = H.indexOf('Tingkat Risiko Inheren'), cRes = H.indexOf('Tingkat Risiko Residu'), cTgt = H.indexOf('Tingkat Risiko Target');
  var rows = [];
  for (i = hr + 1; i < d.length; i++) {
    var r = d[i], id = (r[cId] || '').trim(), des = (r[cDes] || '').trim();
    if (!id || id === '0' || /^Note/i.test(id) || !des || des === '0') continue;
    var inh = (r[cInh] || '').trim(), res = (r[cRes] || '').trim(), tgt = (r[cTgt] || '').trim();
    var pola = /\(([A-E])([1-5])\)/;
    if (!pola.test(inh) && !pola.test(res) && !pola.test(tgt)) continue;
    rows.push([r[cNo], id, des, inh, res, tgt]);
  }
  return { tampilan: tampilan, rows: [['No', 'ID Risk', 'Deskripsi Risiko', 'Inheren', 'Residual', 'Target']].concat(rows) };
}

/* ======================================================================== */
/*  INPUT DARI WEBSITE                                                       */
/* ======================================================================== */
/**
 * Satu akun bersama untuk input data lewat website.
 * Jalankan dari menu Dashboard > Atur akun input web. Mengganti password
 * membuat semua orang yang sedang login harus masuk lagi.
 */
function aturAkunWeb() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var r1 = ui.prompt('Atur akun input web (1 dari 2)', 'Username untuk login di website.\nContoh: updlsmg', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var u = r1.getResponseText().trim();
  if (!u || /\s/.test(u)) { ui.alert('Username tidak boleh kosong atau berisi spasi. Akun belum diubah.'); return; }
  var r2 = ui.prompt('Atur akun input web (2 dari 2)', 'Password, minimal 8 karakter.\nCatat di tempat aman; password tidak bisa dilihat lagi, hanya bisa diganti.', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var pw = r2.getResponseText();
  if (pw.length < 8) { ui.alert('Password minimal 8 karakter. Akun belum diubah.'); return; }
  var salt = Utilities.getUuid();
  p.setProperties({ WEB_USER: u, WEB_SALT: salt, WEB_PASS_HASH: hash_(salt, pw), WEB_VER: String(Number(p.getProperty('WEB_VER') || 0) + 1) });
  ui.alert('Akun tersimpan.\n\nUsername: ' + u + '\n\nBagikan username dan password ini hanya kepada petugas yang mengisi data.');
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.aksi === 'login') return json_(login_(req));
    var user = cekToken_(req.token);
    if (req.aksi === 'cek') return json_({ ok: true, user: user });
    if (req.aksi === 'keluar') { CacheService.getScriptCache().remove('tok_' + req.token); return json_({ ok: true }); }
    if (req.aksi === 'simpan') {
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { var hasil = simpan_(String(req.jenis || ''), req.data || {}, user); SpreadsheetApp.flush(); return json_(hasil); }
      finally { lock.releaseLock(); }
    }
    throw new Error('Aksi tidak dikenal.');
  } catch (err) {
    var m = String(err && err.message || err);
    return json_({ ok: false, login: m.indexOf('LOGIN:') === 0, error: m.replace(/^LOGIN:\s*/, '') });
  }
}

function login_(req) {
  var p = PropertiesService.getScriptProperties();
  var u = p.getProperty('WEB_USER'), h = p.getProperty('WEB_PASS_HASH'), salt = p.getProperty('WEB_SALT');
  if (!u || !h) throw new Error('Akun input web belum diatur. Di spreadsheet, pilih menu Dashboard → Atur akun input web.');
  var c = CacheService.getScriptCache(), gagal = Number(c.get('login_gagal') || 0);
  if (gagal >= 10) throw new Error('Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.');
  Utilities.sleep(300);
  if (String(req.username || '').trim().toLowerCase() !== u.toLowerCase() || hash_(salt, String(req.password || '')) !== h) {
    c.put('login_gagal', String(gagal + 1), 900);
    throw new Error('Username atau password salah.');
  }
  var t = Utilities.getUuid();
  c.put('tok_' + t, u + '|' + (p.getProperty('WEB_VER') || '0'), 21600); // 6 jam
  return { ok: true, token: t, user: u, berlakuDetik: 21600 };
}

function cekToken_(t) {
  var v = t ? CacheService.getScriptCache().get('tok_' + t) : null;
  if (!v) throw new Error('LOGIN: Sesi sudah berakhir. Silakan masuk lagi.');
  var i = v.lastIndexOf('|'), ver = PropertiesService.getScriptProperties().getProperty('WEB_VER') || '0';
  if (v.slice(i + 1) !== ver) throw new Error('LOGIN: Akun sudah diganti. Silakan masuk lagi.');
  return v.slice(0, i);
}

function hash_(salt, s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* Kolom per jenis isian (nama kolom = judul kolom di baris 1 tab) */
var FORM_TAMBAH = {
  l1: { tab: TAB.L1, kolom: [['Tanggal Selesai', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Jumlah Responden', 'int', 1, 1], ['Nilai Kepuasan (1-5)', 'angka', 1, 1, 5], ['Keterangan', 'ket']] },
  l2: { tab: TAB.L2, kolom: [['Tanggal Selesai', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Jumlah Peserta', 'int', 1, 1], ['KSA Formatif (0-100)', 'angka', 0, 0, 100], ['C&C Sumatif (1-4)', 'angka', 0, 1, 4], ['Keterangan', 'ket']], salahSatu: ['KSA Formatif (0-100)', 'C&C Sumatif (1-4)'] },
  l3: { tab: TAB.L3, kolom: [['Tanggal Evaluasi', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, 0, 100], ['Keterangan', 'ket']] },
  l4: { tab: TAB.L4, kolom: [['Tanggal Evaluasi', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, 0, 100], ['Keterangan', 'ket']] },
  roti: { tab: TAB.ROTI, kolom: [['Tanggal', 'tgl', 1], ['Judul / Program', 'teks', 1], ['Unit', 'teks', 0], ['Nilai ROTI (%)', 'angka', 1], ['Keterangan', 'ket']] },
  sertifikat: { tab: TAB.SERTIFIKAT, kolom: [['Tanggal', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Peserta Lulus', 'int', 1, 0], ['Sertifikat Terbit', 'int', 1, 0], ['Keterangan', 'ket']] },
  hop: { tab: TAB.PENYESUAIAN, kolom: [['Tahun', 'int', 1, 2000, 2100], ['Bulan', 'bulan', 1], ['Penyesuaian Orang-Hari (+/-)', 'angka', 0], ['HOP Final (timpa)', 'angka', 0, 0], ['Alasan', 'teks', 1], ['Diisi Oleh', 'user']], salahSatu: ['Penyesuaian Orang-Hari (+/-)', 'HOP Final (timpa)'] },
  tl: { tab: TAB.TINDAKLANJUT, kolom: [['Tanggal', 'tgl', 1], ['Temuan / Masukan', 'teks', 1], ['Sumber', 'teks', 1], ['PIC', 'teks', 1], ['Status', 'status', 1], ['Target Selesai', 'tgl', 0], ['Keterangan', 'ket']] }
};
var STATUS_TL = ['Belum Dimulai', 'Berjalan', 'Selesai'];

function simpan_(jenis, d, user) {
  if (FORM_TAMBAH[jenis] && !(jenis === 'tl' && d.mode === 'ubah')) return tambahBaris_(jenis, d, user);
  if (jenis === 'tl') return ubahTindakLanjut_(d, user);
  if (jenis === 'pegawai') return simpanPegawai_(d, user);
  if (jenis === 'konman') return simpanKonman_(d, user);
  if (jenis === 'kepatuhan') return simpanKepatuhan_(d, user);
  if (jenis === 'koreksi') return simpanKoreksi_(d, user);
  throw new Error('Jenis data tidak dikenal: ' + jenis);
}

function tambahBaris_(jenis, d, user) {
  var f = FORM_TAMBAH[jenis], sh = tab_(f.tab), head = judulKolom_(sh), nilai = {};
  f.kolom.forEach(function (k) { nilai[k[0]] = nilaiKolom_(k, d[k[0]], user); });
  if (f.salahSatu && f.salahSatu.every(function (k) { return nilai[k] === ''; })) throw new Error('Isi minimal salah satu: ' + f.salahSatu.join(' atau ') + '.');
  if (jenis === 'sertifikat' && nilai['Sertifikat Terbit'] > nilai['Peserta Lulus']) throw new Error('Sertifikat Terbit tidak boleh lebih besar dari Peserta Lulus.');
  if (jenis === 'tl') {
    var cNo = head.indexOf('No'), maks = 0;
    if (cNo >= 0 && sh.getLastRow() > 1) sh.getRange(2, cNo + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { var n = Number(r[0]); if (n > maks) maks = n; });
    if (cNo >= 0) nilai['No'] = maks + 1;
  }
  var r = barisBaru_(sh);
  Object.keys(nilai).forEach(function (k) {
    var c = head.indexOf(k);
    if (c < 0) throw new Error('Kolom "' + k + '" tidak ditemukan di tab ' + f.tab + '.');
  });
  Object.keys(nilai).forEach(function (k) { if (nilai[k] !== '') sh.getRange(r, head.indexOf(k) + 1).setValue(nilai[k]); });
  return { ok: true, tab: f.tab, baris: r, pesan: 'Ditambahkan di tab ' + f.tab + ', baris ' + r + '.' };
}

function ubahTindakLanjut_(d, user) {
  var sh = tab_(TAB.TINDAKLANJUT), head = judulKolom_(sh), cNo = head.indexOf('No'), cSt = head.indexOf('Status'), cKet = head.indexOf('Keterangan');
  var st = nilaiKolom_(['Status', 'status', 1], d['Status'], user);
  var v = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), head.length).getValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][cNo]).trim() === String(d.no).trim() && String(v[i][cNo]).trim() !== '') {
      sh.getRange(i + 2, cSt + 1).setValue(st);
      if (cKet >= 0) sh.getRange(i + 2, cKet + 1).setValue(ket_(d['Keterangan'] !== undefined && String(d['Keterangan']).trim() !== '' ? d['Keterangan'] : v[i][cKet], user));
      return { ok: true, tab: TAB.TINDAKLANJUT, baris: i + 2, pesan: 'Status temuan No ' + d.no + ' diubah menjadi ' + st + '.' };
    }
  }
  throw new Error('Temuan No ' + d.no + ' tidak ditemukan. Mungkin sudah dihapus atau diubah nomornya di spreadsheet.');
}

function simpanPegawai_(d, user) {
  var sh = tab_(TAB.PEGAWAI), head = judulKolom_(sh);
  var th = nilaiKolom_(['Tahun', 'int', 1, 2000, 2100], d['Tahun']), bl = nilaiKolom_(['Bulan', 'bulan', 1], d['Bulan']);
  var jml = nilaiKolom_(['Jumlah Pegawai', 'int', 1, 1], d['Jumlah Pegawai']);
  var cT = head.indexOf('Tahun'), cB = head.indexOf('Bulan'), cJ = head.indexOf('Jumlah Pegawai'), cK = head.indexOf('Keterangan');
  var v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getValues() : [], r = -1, lama = '';
  for (var i = 0; i < v.length; i++) if (String(v[i][cT]).trim() === String(th) && String(v[i][cB]).trim().toUpperCase() === bl.toUpperCase()) { r = i + 2; lama = v[i][cK]; break; }
  var baru = r < 0;
  if (baru) { r = barisBaru_(sh); sh.getRange(r, cT + 1).setValue(th); sh.getRange(r, cB + 1).setValue(bl); }
  sh.getRange(r, cJ + 1).setValue(jml);
  if (cK >= 0) sh.getRange(r, cK + 1).setValue(ket_(String(d['Keterangan'] || '').trim() || (/^Belum diisi$/i.test(String(lama).trim()) ? '' : lama), user));
  return { ok: true, tab: TAB.PEGAWAI, baris: r, pesan: 'Jumlah pegawai ' + bl + ' ' + th + ' ' + (baru ? 'ditambahkan' : 'diperbarui') + '.' };
}

function simpanKonman_(d, user) {
  var cfg = getConfig_(), nama = String(cfg.KONMAN_TAB_AWALAN || 'Konman ') + d.tahun, sh = tab_(nama);
  var B = BULAN_[Number(d.bulan) - 1]; if (!B) throw new Error('Bulan tidak valid.');
  var h1 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim().toUpperCase(); });
  var cR = h1.indexOf('REALISASI ' + B), cK = h1.indexOf('KET ' + B);
  if (cR < 0) throw new Error('Kolom REALISASI ' + B + ' tidak ditemukan di tab ' + nama + '.');
  var ditulis = 0, lewat = [];
  (d.baris || []).forEach(function (x) {
    var r = Number(x.baris);
    if (!(r >= 3 && r <= sh.getLastRow())) { lewat.push(x.nama + ' (baris tidak valid)'); return; }
    var nm = String(sh.getRange(r, 2).getValue()).replace(/^[a-z]\.\s*/, '').trim().toUpperCase();
    if (nm !== String(x.nama).replace(/^[a-z]\.\s*/, '').trim().toUpperCase()) { lewat.push(x.nama + ' (urutan baris di spreadsheet berubah, muat ulang dashboard)'); return; }
    var cell = sh.getRange(r, cR + 1);
    if (cell.getFormula()) { lewat.push(x.nama + ' (realisasi berisi rumus)'); return; }
    var t = String(x.realisasi === undefined || x.realisasi === null ? '' : x.realisasi).trim();
    if (t === '') cell.clearContent();
    else { var n = parseAngka_(t); if (n === null) { lewat.push(x.nama + ' (realisasi bukan angka: ' + t + ')'); return; } cell.setValue(n); }
    if (cK >= 0) { var kc = sh.getRange(r, cK + 1); if (!kc.getFormula()) kc.setValue(ket_(x.ket === undefined ? kc.getValue() : x.ket, user)); }
    ditulis++;
  });
  if (!ditulis && lewat.length) throw new Error('Tidak ada yang tersimpan: ' + lewat.join('; '));
  return { ok: true, tab: nama, pesan: ditulis + ' indikator tersimpan untuk ' + B.charAt(0) + B.slice(1).toLowerCase() + ' ' + d.tahun + '.' + (lewat.length ? ' Dilewati: ' + lewat.join('; ') + '.' : ''), dilewati: lewat };
}

function simpanKepatuhan_(d, user) {
  var sh = tab_(TAB.KEPATUHAN), head = judulKolom_(sh);
  var B = BULAN_[Number(d.bulan) - 1]; if (!B) throw new Error('Bulan tidak valid.');
  var cT = head.indexOf('Tahun'), cA = head.indexOf('Aspek Kepatuhan'), cM = head.indexOf('Maks Pengurang'), cK = head.indexOf('Keterangan');
  var cB = -1; head.forEach(function (h, i) { if (String(h).trim().toUpperCase() === B) cB = i; });
  if (cB < 0) throw new Error('Kolom bulan ' + B + ' tidak ditemukan di tab Kepatuhan.');
  var v = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), head.length).getValues(), ditulis = 0, lewat = [];
  (d.aspek || []).forEach(function (x) {
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][cT]).trim() === String(d.tahun) && String(v[i][cA]).trim() === String(x.nama).trim()) {
        var t = String(x.nilai === undefined ? '' : x.nilai).trim(), cell = sh.getRange(i + 2, cB + 1);
        if (cell.getFormula()) { lewat.push(x.nama + ' (berisi rumus)'); return; }
        if (t === '') { cell.clearContent(); ditulis++; return; }
        var n = parseAngka_(t), maks = parseAngka_(String(v[i][cM]));
        if (n === null || n < 0) { lewat.push(x.nama + ' (bukan angka ≥ 0)'); return; }
        if (maks !== null && n > maks) { lewat.push(x.nama + ' (melebihi maks ' + maks + ')'); return; }
        cell.setValue(n);
        if (cK >= 0 && n !== Number(v[i][cB])) sh.getRange(i + 2, cK + 1).setValue(ket_(v[i][cK], user));
        ditulis++; return;
      }
    }
    lewat.push(x.nama + ' (aspek tidak ditemukan)');
  });
  if (!ditulis && lewat.length) throw new Error('Tidak ada yang tersimpan: ' + lewat.join('; '));
  return { ok: true, tab: TAB.KEPATUHAN, pesan: 'Kepatuhan ' + B.charAt(0) + B.slice(1).toLowerCase() + ' ' + d.tahun + ' tersimpan (' + ditulis + ' aspek).' + (lewat.length ? ' Dilewati: ' + lewat.join('; ') + '.' : '') };
}

function simpanKoreksi_(d, user) {
  var sh = tab_(TAB.KOREKSI), head = judulKolom_(sh);
  var v = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 3).getValues();
  for (var i = 0; i < v.length; i++) {
    if (kunci_(v[i][0], v[i][1], v[i][2]) === String(d.kunci)) {
      var r = i + 2, isi = {
        'Realisasi Peserta (koreksi)': nilaiKolom_(['Realisasi Peserta (koreksi)', 'int', 0, 0], d['Realisasi Peserta (koreksi)']),
        'Hari Kerja (koreksi)': nilaiKolom_(['Hari Kerja (koreksi)', 'int', 0, 0, 400], d['Hari Kerja (koreksi)']),
        'Ikut HOP?': /^tidak$/i.test(String(d['Ikut HOP?'] || '').trim()) ? 'Tidak' : 'Ya',
        'Alasan': nilaiKolom_(['Alasan', 'teks', 1], d['Alasan']),
        'Diisi Oleh': user + ' (web)'
      };
      if (isi['Realisasi Peserta (koreksi)'] === '' && isi['Hari Kerja (koreksi)'] === '' && isi['Ikut HOP?'] === 'Ya') throw new Error('Isi Realisasi Peserta atau Hari Kerja, atau pilih Ikut HOP = Tidak.');
      Object.keys(isi).forEach(function (k) { var c = head.indexOf(k); if (c >= 0 && isi[k] !== '') sh.getRange(r, c + 1).setValue(isi[k]); });
      return { ok: true, tab: TAB.KOREKSI, baris: r, pesan: 'Koreksi kelas tersimpan di baris ' + r + '.' };
    }
  }
  throw new Error('Kelas tidak ditemukan di tab Koreksi Rendiklat. Jalankan menu Dashboard → Tarik daftar kelas tanpa realisasi, lalu muat ulang dashboard.');
}

/* ---------- util input ---------- */
function tab_(nama) { var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nama); if (!sh) throw new Error('Tab "' + nama + '" tidak ditemukan.'); return sh; }
function judulKolom_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (x) { return String(x).trim(); }); }
/* baris kosong pertama setelah data terakhir di kolom A (aman untuk kolom berisi ARRAYFORMULA) */
function barisBaru_(sh) {
  var n = sh.getLastRow(); if (n < 2) return 2;
  var a = sh.getRange(1, 1, n, 1).getValues();
  for (var i = a.length - 1; i >= 0; i--) if (String(a[i][0]).trim() !== '') return i + 2;
  return 2;
}
function parseAngka_(t) {
  var s = String(t).trim().replace(/\s/g, ''); if (!s) return null;
  var pct = /%$/.test(s); s = s.replace('%', '');
  if (s.indexOf('.') >= 0 && s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s); return pct ? n / 100 : n;
}
function catatanWeb_(user) { return '(input web: ' + user + ', ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy') + ')'; }
function ket_(teks, user) {
  var t = String(teks === undefined || teks === null ? '' : teks).replace(/\s*\(input web:[^)]*\)/g, '').trim();
  return (t ? t + ' ' : '') + catatanWeb_(user);
}
function nilaiKolom_(k, v, user) {
  var nama = k[0], jenis = k[1], wajib = k[2], min = k[3], max = k[4];
  if (jenis === 'user') return user;
  if (jenis === 'ket') return ket_(v, user);
  var t = String(v === undefined || v === null ? '' : v).trim();
  if (t === '') { if (wajib) throw new Error('Kolom "' + nama + '" wajib diisi.'); return ''; }
  if (t.length > 1000) throw new Error('Isian "' + nama + '" terlalu panjang.');
  if (jenis === 'teks') return /^[=+@]/.test(t) ? "'" + t : t;   // cegah teks terbaca sebagai rumus
  if (jenis === 'status') { var s = STATUS_TL.filter(function (x) { return x.toUpperCase() === t.toUpperCase(); })[0]; if (!s) throw new Error('Status tidak dikenal: ' + t); return s; }
  if (jenis === 'bulan') { var b = BULAN_.indexOf(t.toUpperCase()); if (b < 0) throw new Error('Bulan tidak dikenal: ' + t); return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); }
  if (jenis === 'tgl') { var m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) throw new Error('Tanggal "' + nama + '" tidak valid.'); return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
  var n = parseAngka_(t);
  if (n === null) throw new Error('"' + nama + '" harus berupa angka.');
  if (jenis === 'int' && Math.round(n) !== n) throw new Error('"' + nama + '" harus bilangan bulat.');
  if (min !== undefined && n < min) throw new Error('"' + nama + '" minimal ' + min + '.');
  if (max !== undefined && n > max) throw new Error('"' + nama + '" maksimal ' + max + '.');
  return n;
}

/* ======================================================================== */
/*  UTIL                                                                     */
/* ======================================================================== */
function bukaSheet_(id, tab) {
  if (!id) throw new Error('ID file belum diisi di tab Pengaturan');
  var sh = SpreadsheetApp.openById(String(id).trim()).getSheetByName(tab);
  if (!sh) throw new Error('sheet "' + tab + '" tidak ditemukan');
  return sh;
}

function readTab_(ss, name, out) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() === 0) { out.warnings.push('Tab "' + name + '" tidak ditemukan.'); return []; }
  var v = clean_(sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues());
  return v.filter(function (r, i) { return i === 0 || r.some(function (x) { return x !== '' && x !== null; }); });
}

function clean_(rows) {
  return rows.map(function (r) { return r.map(function (v) { return v instanceof Date ? keIso_(v) : v; }); });
}

function keIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim(), m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function keTanggal_(v) {
  var iso = keIso_(v), m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : v;
}

function kunci_(id, judul, mulai) {
  return [String(id).replace(/^'/, '').trim(), String(judul).trim().toUpperCase(), keIso_(mulai)].join('|');
}

function getConfig_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.PENGATURAN);
  var cfg = {};
  if (sh) sh.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) cfg[String(r[0]).trim()] = r[1]; });
  return cfg;
}

function ya_(v) { return /^(YA|Y|TRUE|1)$/i.test(String(v).trim()); }
function angka_(v) { var n = Number(String(v).replace(',', '.')); return v === '' || v === null || v === undefined || isNaN(n) ? null : n; }
function bulat_(n) { return Math.round(n * 10000) / 10000; }
function safeAlert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) { Logger.log(msg); } }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
