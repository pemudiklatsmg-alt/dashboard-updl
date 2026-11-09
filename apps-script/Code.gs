/**
 * ==========================================================================
 *  DASHBOARD KINERJA UPDL SEMARANG — Apps Script versi 4 (login dua akun)
 *  Dipasang pada spreadsheet "Data Dashboard UPDL Semarang".
 * --------------------------------------------------------------------------
 *  Sumber yang dibaca:
 *   - Spreadsheet ini : Konman <tahun>, Jumlah Pegawai, Rekap L3/L4/ROTI,
 *                        Kepatuhan, Tindak Lanjut Evaluasi, Koreksi Rendiklat,
 *                        Penyesuaian HOP, dan tab data mentah hasil tarikan:
 *                        Data - Kepuasan EL1, Data - Instruktur EL1,
 *                        Data - KSA EL2, Data - C&C EL2, Data - Sertifikat
 *   - Rendiklat        : sheet RENREKAP (ID per tahun di tab Pengaturan)
 *   - MLI Probis       : sheet SMG
 *   - Profil Risiko    : sheet "4. Peta Risiko" (versi Google Sheets)
 *
 *  Menu di spreadsheet: Dashboard > Tarik daftar kelas tanpa realisasi
 *                      Dashboard > Atur akun Admin / Atur akun Lihat
 *
 *  Seluruh data hanya dikirim setelah login (doPost aksi "data").
 *  Akun Admin: lihat + input + export. Akun Lihat: hanya melihat.
 *  Password disimpan sebagai hash di Script Properties (tidak di spreadsheet,
 *  tidak di kode website).
 *
 *  Setelah mengganti kode ini: Deploy > Manage deployments > ✏️ >
 *  Version: New version > Deploy. URL /exec tetap sama.
 * ==========================================================================
 */

var VERSI = 4;
var BULAN_ = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

var TAB = {
  PENGATURAN: 'Pengaturan',
  PEGAWAI: 'Jumlah Pegawai',
  L3: 'Rekap L3 Perilaku',
  L4: 'Rekap L4 Kinerja',
  ROTI: 'Rekap ROTI',
  KEPATUHAN: 'Kepatuhan',
  TINDAKLANJUT: 'Tindak Lanjut Evaluasi',
  TAUTAN: 'Tautan Penting',
  KOREKSI: 'Koreksi Rendiklat',
  PENYESUAIAN: 'Penyesuaian HOP',
  KEPUASAN: 'Data - Kepuasan EL1',
  INSTRUKTUR: 'Data - Instruktur EL1',
  KSA: 'Data - KSA EL2',
  CC: 'Data - C&C EL2',
  SERT: 'Data - Sertifikat', ORG: 'Data - Pegawai', ALIHDAYA: 'Data - Alih Daya'
};
/* Urutan status sertifikat (paling jauh ke paling awal); terbit = Finish TTE GM */
var STATUS_SERT = ['Finish TTE GM', 'Proses TTE GM', 'Finish TTE UPDL', 'Proses TTE UPDL', 'Draft Sertifikat', 'Gagal Generate', 'Belum Generate'];

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
    .addItem('Atur akun Admin (input & export)', 'aturAkunAdmin')
    .addItem('Atur akun Lihat (hanya melihat)', 'aturAkunLihat')
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
/* Tanpa login tidak ada data yang dikirim. Data diambil lewat doPost aksi "data". */
function doGet(e) {
  return json_({ ok: false, perluLogin: true, meta: { versi: VERSI } });
}

function buildData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = getConfig_();
  var out = {
    meta: {
      versi: VERSI, source: 'live', generatedAt: new Date().toISOString(),
      unit: cfg.UNIT, judul: cfg.JUDUL,
      pengaturan: {
        kecualikanSL: ya_(cfg.HOP_KECUALIKAN_SELF_LEARNING),
        hitungHariSebelumTahun: cfg.HOP_HITUNG_HARI_SEBELUM_TAHUN === undefined ? true : ya_(cfg.HOP_HITUNG_HARI_SEBELUM_TAHUN),
        tanpaRealisasi: String(cfg.KELAS_TANPA_REALISASI || 'PAKAI RENCANA PESERTA').toUpperCase(),
        targetL1: angka_(cfg.TARGET_KEPUASAN_L1), targetKSA: angka_(cfg.TARGET_KSA_L2),
        targetCC: angka_(cfg.TARGET_CC_L2), targetSertifikat: angka_(cfg.TARGET_SERTIFIKAT),
        targetInstruktur: angka_(cfg.TARGET_INSTRUKTUR), skalaCC: angka_(cfg.SKALA_CC) || 4
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
  out.l3 = readTab_(ss, TAB.L3, out);
  out.l4 = readTab_(ss, TAB.L4, out);
  out.roti = readTab_(ss, TAB.ROTI, out);
  out.kepatuhan = readTab_(ss, TAB.KEPATUHAN, out);
  out.tindaklanjut = readTab_(ss, TAB.TINDAKLANJUT, out, true);
  out.koreksi = readTab_(ss, TAB.KOREKSI, out);
  out.penyesuaian = readTab_(ss, TAB.PENYESUAIAN, out);

  // Data mentah evaluasi (hasil tarikan) -> ringkasan per pelatihan / per instruktur
  out.eval = {};
  [['kepuasan', aggKepuasan_], ['instruktur', aggInstruktur_], ['ksa', aggKsa_], ['cc', aggCc_], ['sertifikat', aggSert_]].forEach(function (x) {
    try { out.eval[x[0]] = x[1](ss); }
    catch (e) { out.warnings.push(e.message); out.eval[x[0]] = null; }
  });

  // Struktur organisasi (tanpa NIP)
  try { out.org = bacaOrg_(ss); out.org.periode = String(cfg.PERIODE_DATA_PEGAWAI || ''); }
  catch (e) { out.warnings.push(e.message); out.org = null; }

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
/* ---------- Akun: Admin (lihat, input, export) dan Lihat (hanya melihat) ---------- */
var AKUN = {
  admin: { kunci: 'WEB', nama: 'Admin', ket: 'melihat dashboard, mengisi data, dan export Excel' },
  lihat: { kunci: 'LIHAT', nama: 'Lihat', ket: 'hanya melihat dashboard' }
};
function aturAkunAdmin() { aturAkun_('admin'); }
function aturAkunLihat() { aturAkun_('lihat'); }
function aturAkunWeb() { aturAkun_('admin'); }   // nama lama, tetap berfungsi

function aturAkun_(peran) {
  var a = AKUN[peran], lain = AKUN[peran === 'admin' ? 'lihat' : 'admin'];
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var r1 = ui.prompt('Atur akun ' + a.nama + ' (1 dari 2)', 'Akun ini untuk ' + a.ket + '.\n\nUsername (tanpa spasi):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var u = r1.getResponseText().trim();
  if (!u || /\s/.test(u)) { ui.alert('Username tidak boleh kosong atau berisi spasi. Akun belum diubah.'); return; }
  if ((p.getProperty(lain.kunci + '_USER') || '').toLowerCase() === u.toLowerCase()) { ui.alert('Username ini sudah dipakai akun ' + lain.nama + '. Pakai username lain.'); return; }
  var r2 = ui.prompt('Atur akun ' + a.nama + ' (2 dari 2)', 'Password, minimal 8 karakter.\nCatat di tempat aman; password tidak bisa dilihat lagi, hanya bisa diganti.', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var pw = r2.getResponseText();
  if (pw.length < 8) { ui.alert('Password minimal 8 karakter. Akun belum diubah.'); return; }
  var salt = Utilities.getUuid(), o = {};
  o[a.kunci + '_USER'] = u; o[a.kunci + '_SALT'] = salt; o[a.kunci + '_PASS_HASH'] = hash_(salt, pw);
  o[a.kunci + '_VER'] = String(Number(p.getProperty(a.kunci + '_VER') || 0) + 1);
  p.setProperties(o);
  ui.alert('Akun ' + a.nama + ' tersimpan.\n\nUsername: ' + u + '\nAkun ini bisa ' + a.ket + '.\n\nSemua yang sedang login dengan akun ' + a.nama + ' lama harus masuk lagi.');
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.aksi === 'login') return json_(login_(req));
    var sesi = cekToken_(req.token);
    if (req.aksi === 'cek') return json_({ ok: true, user: sesi.user, peran: sesi.peran });
    if (req.aksi === 'keluar') { CacheService.getScriptCache().remove('tok_' + req.token); return json_({ ok: true }); }
    if (req.aksi === 'data') {
      var d = buildData_(); d.ok = true; d.meta.user = sesi.user; d.meta.peran = sesi.peran;
      return json_(d);
    }
    if (req.aksi === 'simpan') {
      if (sesi.peran !== 'admin') throw new Error('Akun Lihat tidak bisa mengisi data. Masuk dengan akun Admin.');
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { var hasil = simpan_(String(req.jenis || ''), req.data || {}, sesi.user); SpreadsheetApp.flush(); return json_(hasil); }
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
  var adaAkun = Object.keys(AKUN).some(function (k) { return p.getProperty(AKUN[k].kunci + '_PASS_HASH'); });
  if (!adaAkun) throw new Error('Akun belum diatur. Di spreadsheet, pilih menu Dashboard → Atur akun Admin.');
  var c = CacheService.getScriptCache(), gagal = Number(c.get('login_gagal') || 0);
  if (gagal >= 10) throw new Error('Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.');
  Utilities.sleep(300);
  var nama = String(req.username || '').trim().toLowerCase(), pw = String(req.password || '');
  var cocok = Object.keys(AKUN).filter(function (k) {
    var a = AKUN[k], u = p.getProperty(a.kunci + '_USER'), h = p.getProperty(a.kunci + '_PASS_HASH');
    return u && h && u.toLowerCase() === nama && hash_(p.getProperty(a.kunci + '_SALT'), pw) === h;
  })[0];
  if (!cocok) { c.put('login_gagal', String(gagal + 1), 900); throw new Error('Username atau password salah.'); }
  var a = AKUN[cocok], t = Utilities.getUuid(), u = p.getProperty(a.kunci + '_USER');
  c.put('tok_' + t, [u, cocok, p.getProperty(a.kunci + '_VER') || '0'].join('|'), 21600); // 6 jam
  return { ok: true, token: t, user: u, peran: cocok, berlakuDetik: 21600 };
}

function cekToken_(t) {
  var v = t ? CacheService.getScriptCache().get('tok_' + t) : null;
  if (!v) throw new Error('LOGIN: Sesi sudah berakhir. Silakan masuk lagi.');
  var x = v.split('|'), peran = x[1], a = AKUN[peran];
  if (!a) throw new Error('LOGIN: Sesi tidak valid. Silakan masuk lagi.');
  if (x[2] !== (PropertiesService.getScriptProperties().getProperty(a.kunci + '_VER') || '0')) throw new Error('LOGIN: Akun sudah diganti. Silakan masuk lagi.');
  return { user: x[0], peran: peran };
}

function hash_(salt, s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* Kolom per jenis isian (nama kolom = judul kolom di baris 1 tab) */
var FORM_TAMBAH = {
  l3: { tab: TAB.L3, kolom: [['Tanggal Evaluasi', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, 0, 100], ['Keterangan', 'ket']] },
  l4: { tab: TAB.L4, kolom: [['Tanggal Evaluasi', 'tgl', 1], ['Judul Pelatihan', 'teks', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, 0, 100], ['Keterangan', 'ket']] },
  roti: { tab: TAB.ROTI, kolom: [['Tanggal', 'tgl', 1], ['Judul / Program', 'teks', 1], ['Unit', 'teks', 0], ['Nilai ROTI (%)', 'angka', 1], ['Keterangan', 'ket']] },
  hop: { tab: TAB.PENYESUAIAN, kolom: [['Tahun', 'int', 1, 2000, 2100], ['Bulan', 'bulan', 1], ['Penyesuaian Orang-Hari (+/-)', 'angka', 0], ['HOP Final (timpa)', 'angka', 0, 0], ['Alasan', 'teks', 1], ['Diisi Oleh', 'user']], salahSatu: ['Penyesuaian Orang-Hari (+/-)', 'HOP Final (timpa)'] }
};
var STATUS_TL = ['Belum Dimulai', 'OFI', 'Proses Tindak Lanjut', 'Sudah Dilaporkan', 'Selesai'];

function simpan_(jenis, d, user) {
  if (FORM_TAMBAH[jenis]) return tambahBaris_(jenis, d, user);
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

/* Ubah status satu baris Tindak Lanjut. Baris dikenali dari nomor baris + isi komentar (dicek ulang). */
function ubahTindakLanjut_(d, user) {
  var sh = tab_(TAB.TINDAKLANJUT), head = judulKolom_(sh), cSt = head.indexOf('Status'), cKet = head.indexOf('Keterangan'), cKom = head.indexOf('Komentar');
  if (cSt < 0 || cKom < 0) throw new Error('Kolom Status / Komentar tidak ditemukan di tab ' + TAB.TINDAKLANJUT + '.');
  var st = nilaiKolom_(['Status', 'status', 1], d['Status'], user), r = Number(d.baris);
  if (!(r >= 2 && r <= sh.getLastRow())) throw new Error('Baris tindak lanjut tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
  var kom = String(sh.getRange(r, cKom + 1).getValue()).trim();
  if (kom.slice(0, 60) !== String(d.komentar || '').trim().slice(0, 60)) throw new Error('Urutan baris di spreadsheet sudah berubah. Muat ulang dashboard lalu coba lagi.');
  sh.getRange(r, cSt + 1).setValue(st);
  if (cKet >= 0) sh.getRange(r, cKet + 1).setValue(ket_(d['Keterangan'] !== undefined && String(d['Keterangan']).trim() !== '' ? d['Keterangan'] : sh.getRange(r, cKet + 1).getValue(), user));
  return { ok: true, tab: TAB.TINDAKLANJUT, baris: r, pesan: 'Status diubah menjadi ' + st + ' (baris ' + r + ').' };
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
/*  DATA MENTAH EVALUASI (salin-tempel hasil tarikan) -> RINGKASAN           */
/* ======================================================================== */
/* Membaca tab: { head: [...], rows: [[...]] } ; null bila tab belum ada / kosong */
function bacaMentah_(ss, nama) {
  var sh = ss.getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" belum ada.');
  if (sh.getLastRow() < 2) return { head: sh.getLastColumn() ? judulKolom_(sh) : [], rows: [] };
  var v = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var head = v[0].map(function (h) { return String(h).replace(/\s+/g, ' ').trim(); });
  return { head: head, rows: v.slice(1).filter(function (r) { return r.some(function (x) { return x !== '' && x !== null; }); }) };
}
function kol_(head, nama) {   // cari kolom tanpa peduli huruf besar/kecil, spasi, titik, garis bawah
  var norm = function (x) { return String(x).toLowerCase().replace(/[\s._]+/g, ''); };
  var list = [].concat(nama), i;
  for (var k = 0; k < list.length; k++) { i = head.map(norm).indexOf(norm(list[k])); if (i >= 0) return i; }
  return -1;
}
function nilai_(v) {           // angka penilaian; teks / kosong -> null
  if (v === '' || v === null || v === undefined) return null;
  var n = typeof v === 'number' ? v : Number(String(v).replace(',', '.').trim());
  return isNaN(n) ? null : n;
}
function isoTgl_(v) { var s = keIso_(v); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; }
function teks_(v) { return String(v === null || v === undefined ? '' : v).trim(); }
var NAMA_ASPEK_ = { INS: 'Instruktur', MAT: 'Materi', SARPRAS: 'Sarana & Prasarana', DIG: 'Digital' };
/* Butir penilaian = kolom di luar daftar kolom keterangan; kolom berakhiran "Val" tidak dihitung */
function butir_(head, meta, tolak) {
  var m = meta.map(function (x) { return x.toLowerCase().replace(/[\s._]+/g, ''); });
  var out = [];
  head.forEach(function (h, i) {
    var n = h.toLowerCase().replace(/[\s._]+/g, '');
    if (!h || m.indexOf(n) >= 0 || /(^|[\s\-_])val$/i.test(h) || (tolak && tolak.test(h))) return;
    var pre = h.split('-')[0].trim(), asp = NAMA_ASPEK_[pre.toUpperCase()] || pre;
    out.push({ i: i, label: h, aspek: asp });
  });
  return out;
}
function bulatkan_(a) { return a.map(function (x) { return Math.round(x * 1000) / 1000; }); }

/* Kepuasan Peserta EL1: per pelatihan -> jumlah responden + jumlah & banyaknya nilai per butir */
function aggKepuasan_(ss) {
  var t = bacaMentah_(ss, TAB.KEPUASAN), h = t.head;
  var cJ = kol_(h, ['Judul Pembelajaran', 'Judul']), cK = kol_(h, ['Kode Pembelajaran', 'Kode']), cS = kol_(h, ['Tanggal Selesai', 'Tgl Selesai']);
  if (t.rows.length && (cJ < 0 || cS < 0)) throw new Error('Tab "' + TAB.KEPUASAN + '": kolom Judul Pembelajaran / Tanggal Selesai tidak ditemukan.');
  var B = butir_(h, ['Nama', 'NIP', 'Kode Pembelajaran', 'Judul Pembelajaran', 'Bidang', 'Tanggal Mulai', 'Tanggal Selesai', 'UPDL Penyelenggara', 'Jenis Penyelenggaraan', 'Waktu Pengisian Evaluasi'], /^waktu/i);
  var g = {}, urut = [];
  t.rows.forEach(function (r) {
    var tg = isoTgl_(r[cS]); if (!tg) return;
    var key = teks_(r[cK]) + '|' + teks_(r[cJ]) + '|' + tg;
    var x = g[key]; if (!x) { x = g[key] = { tg: tg, j: teks_(r[cJ]), n: 0, s: B.map(function () { return 0; }), c: B.map(function () { return 0; }) }; urut.push(key); }
    var ada = false;
    B.forEach(function (b, k) { var v = nilai_(r[b.i]); if (v !== null && v > 0) { x.s[k] += v; x.c[k]++; ada = true; } });
    if (ada) x.n++;
  });
  return { butir: B.map(function (b) { return b.label; }), aspek: B.map(function (b) { return b.aspek; }),
    pel: urut.map(function (k) { var x = g[k]; return [x.tg, x.j, x.n, bulatkan_(x.s), x.c]; }) };
}

/* Penilaian Instruktur EL1: per instruktur per pelatihan */
function aggInstruktur_(ss) {
  var t = bacaMentah_(ss, TAB.INSTRUKTUR), h = t.head;
  var cN = kol_(h, 'Nama'), cNip = kol_(h, 'NIP'), cTp = kol_(h, 'Tipe Instruktur'), cJ = kol_(h, ['Judul Diklat', 'Judul']), cA = kol_(h, 'Angkatan'), cS = kol_(h, ['Tgl Selesai', 'Tanggal Selesai']);
  if (t.rows.length && (cN < 0 || cJ < 0 || cS < 0)) throw new Error('Tab "' + TAB.INSTRUKTUR + '": kolom Nama / Judul Diklat / Tgl Selesai tidak ditemukan.');
  var B = butir_(h, ['NIP', 'Nama', 'Unit Induk', 'Tipe Instruktur', 'Tgl Mulai', 'Tgl Selesai', 'Kode Diklat', 'Judul Diklat', 'Angkatan', 'UPDL', 'Jenis Diklat', 'Jenis Peyelenggaraan', 'Jenis Penyelenggaraan', 'Durasi Mengajar'], /^k\s*\./i);
  var ins = [], idx = {}, g = {}, urut = [];
  t.rows.forEach(function (r) {
    var tg = isoTgl_(r[cS]), nm = teks_(r[cN]); if (!tg || !nm) return;
    var ki = teks_(r[cNip]) + '|' + nm.toUpperCase();
    if (idx[ki] === undefined) { idx[ki] = ins.length; ins.push([nm, teks_(r[cTp])]); }
    var key = idx[ki] + '|' + teks_(r[cJ]) + '|' + teks_(r[cA]) + '|' + tg;
    var x = g[key]; if (!x) { x = g[key] = { i: idx[ki], tg: tg, j: teks_(r[cJ]), a: teks_(r[cA]), n: 0, s: B.map(function () { return 0; }), c: B.map(function () { return 0; }) }; urut.push(key); }
    var ada = false;
    B.forEach(function (b, k) { var v = nilai_(r[b.i]); if (v !== null && v > 0) { x.s[k] += v; x.c[k]++; ada = true; } });
    if (ada) x.n++;
  });
  return { butir: B.map(function (b) { return b.label; }), instruktur: ins,
    pel: urut.map(function (k) { var x = g[k]; return [x.i, x.tg, x.j, x.a, x.n, bulatkan_(x.s), x.c]; }) };
}

/* KSA EL2: hanya Kehadiran = Hadir dan Kelulusan = Lulus */
function aggKsa_(ss) {
  var t = bacaMentah_(ss, TAB.KSA), h = t.head;
  var cH = kol_(h, 'Kehadiran'), cL = kol_(h, 'Kelulusan'), cV = kol_(h, 'Nilai'), cJ = kol_(h, ['Nama Judul', 'Judul']), cS = kol_(h, ['R.Tgl_Selesai', 'R.Tgl Selesai', 'P.Tgl_Selesai', 'Tgl Selesai']);
  if (t.rows.length && (cH < 0 || cL < 0 || cV < 0 || cS < 0)) throw new Error('Tab "' + TAB.KSA + '": kolom Kehadiran / Kelulusan / Nilai / R.Tgl_Selesai tidak ditemukan.');
  var g = {}, urut = [];
  t.rows.forEach(function (r) {
    var tg = isoTgl_(r[cS]); if (!tg) return;
    var key = teks_(r[cJ]) + '|' + tg;
    var x = g[key]; if (!x) { x = g[key] = { tg: tg, j: teks_(r[cJ]), n: 0, s: 0, semua: 0 }; urut.push(key); }
    x.semua++;
    var v = nilai_(r[cV]);
    if (/^hadir$/i.test(teks_(r[cH])) && /^lulus$/i.test(teks_(r[cL])) && v !== null) { x.n++; x.s += v; }
  });
  return { pel: urut.map(function (k) { var x = g[k]; return [x.tg, x.j, x.n, Math.round(x.s * 1000) / 1000, x.semua]; }) };
}

/* Confidence & Commitment EL2 */
function aggCc_(ss) {
  var t = bacaMentah_(ss, TAB.CC), h = t.head;
  var cJ = kol_(h, ['Judul', 'Nama Judul']), cS = kol_(h, ['Tgl Selesai', 'Tanggal Selesai']), cC = kol_(h, 'Confidence Level'), cM = kol_(h, 'Commitment Level');
  if (t.rows.length && (cS < 0 || cC < 0 || cM < 0)) throw new Error('Tab "' + TAB.CC + '": kolom Tgl Selesai / Confidence Level / Commitment Level tidak ditemukan.');
  var g = {}, urut = [];
  t.rows.forEach(function (r) {
    var tg = isoTgl_(r[cS]); if (!tg) return;
    var key = teks_(r[cJ]) + '|' + tg;
    var x = g[key]; if (!x) { x = g[key] = { tg: tg, j: teks_(r[cJ]), n: 0, sc: 0, nc: 0, sm: 0, nm: 0 }; urut.push(key); }
    var c = nilai_(r[cC]), m = nilai_(r[cM]);
    if (c !== null && c > 0) { x.sc += c; x.nc++; }
    if (m !== null && m > 0) { x.sm += m; x.nm++; }
    if ((c !== null && c > 0) || (m !== null && m > 0)) x.n++;
  });
  return { pel: urut.map(function (k) { var x = g[k]; return [x.tg, x.j, x.n, x.sc, x.nc, x.sm, x.nm]; }) };
}

/* Sertifikat: satu baris = satu sertifikat -> [indeks status, tanggal terbit, tanggal selesai pelatihan] */
function aggSert_(ss) {
  var t = bacaMentah_(ss, TAB.SERT), h = t.head;
  var cSt = kol_(h, 'Status'), cT = kol_(h, ['Tgl.Terbit', 'Tgl Terbit', 'Tanggal Terbit']), cS = kol_(h, ['Tgl.Selesai', 'Tgl Selesai', 'Tanggal Selesai']);
  if (t.rows.length && (cSt < 0 || cT < 0)) throw new Error('Tab "' + TAB.SERT + '": kolom Status / Tgl.Terbit tidak ditemukan.');
  var status = STATUS_SERT.slice(), up = status.map(function (s) { return s.toUpperCase(); });
  var rows = [];
  t.rows.forEach(function (r) {
    var s = teks_(r[cSt]); if (!s) return;
    var i = up.indexOf(s.toUpperCase());
    if (i < 0) { status.push(s); up.push(s.toUpperCase()); i = status.length - 1; }
    rows.push([i, isoTgl_(r[cT]), cS >= 0 ? isoTgl_(r[cS]) : '']);
  });
  return { status: status, rows: rows };
}

/* Struktur organisasi: pegawai [nama, jabatan, atasan, level]; alih daya [nama, perusahaan, bagian, lokasi]. NIP tidak dikirim. */
function bacaOrg_(ss) {
  var p = bacaMentah_(ss, TAB.ORG), a = bacaMentah_(ss, TAB.ALIHDAYA);
  var cN = kol_(p.head, 'Nama'), cJ = kol_(p.head, 'Jabatan'), cA = kol_(p.head, 'Atasan Langsung'), cL = kol_(p.head, ['Level Jabatan', 'Keterangan / Level Jabatan', 'Level']);
  if (p.rows.length && (cN < 0 || cJ < 0 || cA < 0)) throw new Error('Tab "' + TAB.ORG + '": kolom Nama / Jabatan / Atasan Langsung tidak ditemukan.');
  var dN = kol_(a.head, ['Nama', 'Nama Tenaga Kerja']), dP = kol_(a.head, 'Perusahaan'), dB = kol_(a.head, 'Bagian'), dL = kol_(a.head, 'Lokasi Kerja');
  if (a.rows.length && (dN < 0 || dB < 0)) throw new Error('Tab "' + TAB.ALIHDAYA + '": kolom Nama / Bagian tidak ditemukan.');
  return {
    pegawai: p.rows.filter(function (r) { return teks_(r[cN]) && teks_(r[cJ]); }).map(function (r) { return [teks_(r[cN]), teks_(r[cJ]), teks_(r[cA]), cL >= 0 ? teks_(r[cL]) : '']; }),
    alihDaya: a.rows.filter(function (r) { return teks_(r[dN]); }).map(function (r) { return [teks_(r[dN]), dP >= 0 ? teks_(r[dP]) : '', teks_(r[dB]), dL >= 0 ? teks_(r[dL]) : '']; })
  };
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

function readTab_(ss, name, out, denganBaris) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() === 0) { out.warnings.push('Tab "' + name + '" tidak ditemukan.'); return []; }
  var v = clean_(sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues());
  if (denganBaris) v = v.map(function (r, i) { return r.concat([i === 0 ? '_baris' : i + 1]); });
  return v.filter(function (r, i) { return i === 0 || r.some(function (x, j) { return j < r.length - (denganBaris ? 1 : 0) && x !== '' && x !== null; }); });
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
