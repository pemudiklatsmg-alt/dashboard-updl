/**
 * ==========================================================================
 *  DASHBOARD KINERJA UPDL SEMARANG — Apps Script versi 2 (hanya MEMBACA data)
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
 *
 *  Setelah mengganti kode ini: Deploy > Manage deployments > ✏️ >
 *  Version: New version > Deploy. URL /exec tetap sama.
 * ==========================================================================
 */

var VERSI = 2;

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
