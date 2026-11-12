/**
 * ==========================================================================
 *  DASHBOARD KINERJA UPDL SEMARANG — Apps Script versi 5 (login, pengingat email, pemeriksa data)
 *  Dipasang pada spreadsheet "Data Dashboard UPDL Semarang".
 * --------------------------------------------------------------------------
 *  Sumber yang dibaca:
 *   - Spreadsheet ini : Konman <tahun>, Jumlah Pegawai, Rekap L3/L4/ROTI,
 *                        Kepatuhan, Perbaikan Berkelanjutan, Koreksi Rendiklat,
 *                        Penyesuaian HOP, dan tab data mentah hasil tarikan:
 *                        Data - Kepuasan EL1, Data - Instruktur EL1,
 *                        Data - KSA EL2, Data - C&C EL2, Data - Sertifikat
 *   - Rendiklat        : sheet RENREKAP (ID per tahun di tab Pengaturan)
 *   - MLI Probis       : sheet SMG
 *   - Profil Risiko    : sheet "4. Peta Risiko" (versi Google Sheets)
 *
 *  Menu di spreadsheet: Dashboard > Tarik daftar kelas tanpa realisasi
 *                      Dashboard > Periksa isian data
 *                      Dashboard > Atur akun Admin / Atur akun Lihat
 *                      Dashboard > Akun Lihat tambahan (opsional)
 *                      Dashboard > Pengingat email bulanan
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

var VERSI = 6;   // 6.1: isi PIC & Status otomatis, impor komentar EL2
var BULAN_ = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

var TAB = {
  PENGATURAN: 'Pengaturan',
  PEGAWAI: 'Jumlah Pegawai',
  L3: 'Rekap L3 Perilaku',
  L4: 'Rekap L4 Kinerja',
  ROTI: 'Rekap ROTI',
  KEPATUHAN: 'Kepatuhan',
  TINDAKLANJUT: 'Perbaikan Berkelanjutan',   // nama lama "Tindak Lanjut Evaluasi" tetap dikenali
  MASTER_L1: 'Master Evaluasi L1',
  TAUTAN: 'Tautan Penting',
  KOREKSI: 'Koreksi Rendiklat',
  PENYESUAIAN: 'Penyesuaian HOP',
  KEPUASAN: 'Data - Kepuasan EL1',
  INSTRUKTUR: 'Data - Instruktur EL1',
  KSA: 'Data - KSA EL2',
  CC: 'Data - C&C EL2',
  SERT: 'Data - Sertifikat', ORG: 'Data - Pegawai', ALIHDAYA: 'Data - Alih Daya', IDP: 'Data - IDP', INOVASI: 'Data - Inovasi',
  LOG: 'Log Login', AKUN: 'Akun Lihat'
};
var TAB_LAMA_ = { TINDAKLANJUT: 'Tindak Lanjut Evaluasi' };
/* Pakai nama tab lama bila tab dengan nama baru belum ada (masa peralihan) */
function sesuaikanTab_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TAB_LAMA_).forEach(function (k) {
    if (!ss.getSheetByName(TAB[k]) && ss.getSheetByName(TAB_LAMA_[k])) TAB[k] = TAB_LAMA_[k];
  });
}
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
    .addItem('Periksa isian data', 'periksaData')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Perbaikan Berkelanjutan')
      .addItem('Isi PIC & Status otomatis (yang masih kosong)', 'isiPicStatus')
      .addItem('Tambah komentar EL2 dari tab Data - C&C EL2', 'tambahKomentarEl2'))
    .addItem('Segarkan data dashboard sekarang', 'segarkanData')
    .addItem('Percepat dashboard (aktifkan pembaruan otomatis tiap jam)', 'pasangPercepatan')
    .addSeparator()
    .addItem('Atur akun Admin (input & export)', 'aturAkunAdmin')
    .addItem('Atur akun Lihat (hanya melihat)', 'aturAkunLihat')
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Akun Lihat tambahan (opsional)')
      .addItem('Tambah akun Lihat / ganti password', 'aturAkunPribadi')
      .addItem('Nonaktifkan akun Lihat', 'nonaktifkanAkunPribadi'))
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Pengingat email bulanan')
      .addItem('Aktifkan (tiap tanggal di Pengaturan)', 'pasangPengingat')
      .addItem('Kirim percobaan sekarang', 'cobaKirimPengingat')
      .addItem('Matikan', 'hapusPengingat'))
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

  var CEPAT = ambilUbah_();   // cap waktu perubahan per tab (dari onEdit), untuk mengenali cache yang basi
  function lokal(key, tabs, fn) { return sekCache_(key, sidikTab_(ss, tabs, CEPAT), fn); }
  function luar(key, fn) { return sekCache_(key, 'v' + VERSI + '|' + (CEPAT['ubah_Pengaturan'] || ''), fn, 600); }   // file luar: disegarkan tiap 10 menit

  // Konman per tahun (tab lokal)
  out.konman = tabKonman_(ss, cfg);
  if (!Object.keys(out.konman).length) out.warnings.push('Tab Konman tidak ditemukan (nama tab harus "' + (cfg.KONMAN_TAB_AWALAN || 'Konman ') + '<tahun>").');

  // Tab lokal
  var tabLokal = [TAB.PEGAWAI, TAB.L3, TAB.L4, TAB.ROTI, TAB.KEPATUHAN, TAB.KOREKSI, TAB.PENYESUAIAN];
  var L = lokal('lokal', tabLokal, function () {
    var o = { warnings: [] };
    ['pegawai', 'l3', 'l4', 'roti', 'kepatuhan', 'koreksi', 'penyesuaian'].forEach(function (k, n) { o[k] = readTab_(ss, tabLokal[n], o); });
    return o;
  });
  ['pegawai', 'l3', 'l4', 'roti', 'kepatuhan', 'koreksi', 'penyesuaian'].forEach(function (k) { out[k] = L[k]; });
  out.warnings = out.warnings.concat(L.warnings || []);
  var TL = lokal('tl', [TAB.TINDAKLANJUT], function () {
    var o = { warnings: [] }, v = readTab_(ss, TAB.TINDAKLANJUT, o, true);
    // hanya kolom yang dipakai dashboard (tab ini bisa ribuan baris)
    var pakai = ['Tgl Selesai', 'Judul Diklat', 'Angkatan', 'Komentar', 'Kategori Komentar', 'Sumber', 'PIC', 'Status', 'Keterangan', '_baris'];
    if (v.length) { var h = v[0].map(function (x) { return String(x).trim(); }), ix = pakai.map(function (n) { return h.indexOf(n); }).filter(function (i) { return i >= 0; });
      v = v.map(function (r) { return ix.map(function (i) { return r[i]; }); }); }
    o.rows = v; return o;
  });
  out.tindaklanjut = TL.rows; out.warnings = out.warnings.concat(TL.warnings || []);
  out.meta.tabPerbaikan = TAB.TINDAKLANJUT;
  try { out.masterL1 = bacaMasterL1_(ss); } catch (e) { out.masterL1 = []; }

  // Data mentah evaluasi (hasil tarikan) -> ringkasan per pelatihan / per instruktur
  out.eval = {};
  [['kepuasan', aggKepuasan_, TAB.KEPUASAN], ['instruktur', aggInstruktur_, TAB.INSTRUKTUR], ['ksa', aggKsa_, TAB.KSA], ['cc', aggCc_, TAB.CC], ['sertifikat', aggSert_, TAB.SERT]].forEach(function (x) {
    try { out.eval[x[0]] = lokal('ev_' + x[0], [x[2]], function () { return x[1](ss); }); }
    catch (e) { out.warnings.push(e.message); out.eval[x[0]] = null; }
  });

  // Struktur organisasi (tanpa NIP)
  try { out.org = bacaOrg_(ss); out.org.periode = String(cfg.PERIODE_DATA_PEGAWAI || ''); }
  catch (e) { out.warnings.push(e.message); out.org = null; }

  // Pengembangan pegawai (IDP, tanpa NIP) dan inovasi
  try { out.idp = bacaIdp_(ss); } catch (e) { out.warnings.push(e.message); out.idp = null; }
  out.inovasi = readTab_(ss, TAB.INOVASI, out);

  // Rendiklat per tahun
  out.rendiklat = {};
  Object.keys(cfg).filter(function (k) { return /^RENDIKLAT_\d{4}$/.test(k); }).forEach(function (k) {
    var th = k.slice(-4);
    out.meta.links.rendiklat[th] = 'https://docs.google.com/spreadsheets/d/' + cfg[k] + '/edit';
    try {
      out.rendiklat[th] = luar('ren_' + th + '_' + cfg[k], function () {
        return [KOLOM_REN].concat(bacaRendiklat_(cfg[k], cfg.RENDIKLAT_TAB).map(function (r) {
          return [r[0], r[1], r[2], r[3], keIso_(r[4]), keIso_(r[5]), r[6], r[7], r[8]];
        }));
      });
    } catch (e) { out.warnings.push('Rendiklat ' + th + ' tidak bisa dibaca: ' + e.message); }
  });

  // MLI Probis sheet SMG -> skor per key element
  try { out.maturity = luar('mli', function () { return bacaMaturity_(cfg); }); }
  catch (e) { out.warnings.push('MLI Probis tidak bisa dibaca: ' + e.message); out.maturity = []; }

  // Peta risiko
  try { out.risiko = luar('risiko', function () { return bacaRisiko_(cfg); }); }
  catch (e) { out.warnings.push('Profil Risiko tidak bisa dibaca: ' + e.message); out.risiko = { tampilan: '', rows: [] }; }

  // Tahap 3: isu internal & eksternal dan pihak berkepentingan (file Profil Risiko, tab 2b & 2c)
  try { out.konteks = luar('konteks', function () { return bacaKonteks_(cfg); }); }
  catch (e) { out.warnings.push('Isu & pihak berkepentingan tidak bisa dibaca: ' + e.message); out.konteks = null; }

  // KRI (file Profil Risiko, tab 10. Pemantauan KRI) dan FRA (file FRA terpisah)
  try { out.kri = luar('kri', function () { return bacaKri_(cfg); }); }
  catch (e) { out.warnings.push('Pemantauan KRI tidak bisa dibaca: ' + e.message); out.kri = null; }
  if (cfg.FRA_ID) {
    try { out.fra = luar('fra', function () { return bacaFra_(cfg); }); }
    catch (e) { out.warnings.push('File FRA tidak bisa dibaca: ' + e.message); out.fra = null; }
  } else out.fra = null;

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

/* ---------- Tahap 3: isu & pihak berkepentingan ---------- */
/* Baris judul dicari lewat isi kolom (bukan nomor baris), jadi baris boleh ditambah di atas/bawah.
   Baris nomor kolom (1, 2, 3, ...) dilewati. Data berhenti di baris pertama yang kolom Kode-nya kosong. */
function bacaTabKonteks_(ss, tab, kunci) {
  var sh = ss.getSheetByName(tab);
  if (!sh) throw new Error('tab "' + tab + '" tidak ditemukan di file Profil Risiko');
  var d = sh.getRange(1, 1, Math.max(1, Math.min(sh.getLastRow(), 400)), Math.max(1, Math.min(sh.getLastColumn(), 40))).getDisplayValues();
  var hr = -1;
  for (var i = 0; i < Math.min(d.length, 30) && hr < 0; i++) if (d[i].some(function (x) { return x.trim() === 'Kode'; }) && d[i].some(function (x) { return x.trim().indexOf(kunci) === 0; })) hr = i;
  if (hr < 0) throw new Error('baris judul (Kode, ' + kunci + ') tidak ditemukan di tab "' + tab + '"');
  var H = d[hr].map(function (x) { return x.trim(); }), cK = H.indexOf('Kode'), n = H.length;
  while (n && !H[n - 1]) n--;
  var rows = [], j = hr + 1;
  if (d[j] && d[j][0].trim() === '1' && (d[j][1] || '').trim() === '2') j++;
  for (; j < d.length; j++) {
    var kode = (d[j][cK] || '').trim();
    if (!kode) break;
    rows.push(d[j].slice(0, n).map(function (x) { return String(x).trim(); }));
  }
  return { head: H.slice(0, n), rows: rows, d: d, akhir: j };
}
function bacaKonteks_(cfg) {
  if (!cfg.PROFIL_RISIKO_ID) throw new Error('PROFIL_RISIKO_ID belum diisi di Pengaturan');
  var ss = SpreadsheetApp.openById(String(cfg.PROFIL_RISIKO_ID).trim());
  var P = bacaTabKonteks_(ss, cfg.PIHAK_TAB || '2b. Pihak Berkepentingan', 'Pihak Berkepentingan');
  var I = bacaTabKonteks_(ss, cfg.ISU_TAB || '2c. Isu & Kaitan Risiko', 'Jenis');
  var sasaran = [];
  for (var j = I.akhir; j < I.d.length; j++) {
    if (/SASARAN STRATEGIS/i.test(I.d[j][0])) {
      for (var k = j + 1; k < I.d.length; k++) {
        var no = (I.d[k][0] || '').trim(), t = (I.d[k][1] || '').trim();
        if (!no || !t) break;
        sasaran.push([no, t]);
      }
      break;
    }
  }
  return { pihak: [P.head].concat(P.rows), isu: [I.head].concat(I.rows), sasaran: sasaran };
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
    sesuaikanTab_();
    if (req.aksi === 'login') return json_(login_(req));
    var sesi = cekToken_(req.token);
    if (req.aksi === 'cek') return json_({ ok: true, user: sesi.user, peran: sesi.peran });
    if (req.aksi === 'keluar') { CacheService.getScriptCache().remove('tok_' + req.token); catatLogin_(sesi.user, sesi.peran, 'Keluar', ''); return json_({ ok: true }); }
    if (req.aksi === 'data') {
      var d = buildData_(); d.ok = true; d.meta.user = sesi.user; d.meta.peran = sesi.peran;
      if (d.fra && sesi.peran !== 'admin') d.fra = { periode: d.fra.periode, ringkas: d.fra.ringkas, terbatas: true };   // rincian FRA hanya untuk Admin
      return json_(d);
    }
    if (req.aksi === 'log') {
      if (sesi.peran !== 'admin') throw new Error('Ringkasan login hanya untuk akun Admin.');
      return json_({ ok: true, log: ringkasLog_(30) });
    }
    if (req.aksi === 'simpan') {
      if (sesi.peran !== 'admin') throw new Error('Akun Lihat tidak bisa mengisi data. Masuk dengan akun Admin.');
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { var hasil = simpan_(String(req.jenis || ''), req.data || {}, sesi.user); SpreadsheetApp.flush(); if (hasil && hasil.tab) tandaiUbah_(hasil.tab); return json_(hasil); }
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
  var adaAkun = Object.keys(AKUN).some(function (k) { return p.getProperty(AKUN[k].kunci + '_PASS_HASH'); }) || Object.keys(akunPribadi_()).length > 0;
  if (!adaAkun) throw new Error('Akun belum diatur. Di spreadsheet, pilih menu Dashboard → Atur akun Admin.');
  var c = CacheService.getScriptCache(), gagal = Number(c.get('login_gagal') || 0);
  if (gagal >= 10) { if (!c.get('log_kunci')) { c.put('log_kunci', '1', 900); catatLogin_(req.username, '', 'Ditolak (login terkunci 15 menit)', req.perangkat); } throw new Error('Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.'); }
  Utilities.sleep(300);
  var nama = String(req.username || '').trim().toLowerCase(), pw = String(req.password || '');
  var cocok = Object.keys(AKUN).filter(function (k) {
    var a = AKUN[k], u = p.getProperty(a.kunci + '_USER'), h = p.getProperty(a.kunci + '_PASS_HASH');
    return u && h && u.toLowerCase() === nama && hash_(p.getProperty(a.kunci + '_SALT'), pw) === h;
  })[0];
  if (!cocok) {
    var pr = cocokPribadi_(nama, pw);
    if (pr) {
      var tp = Utilities.getUuid();
      c.put('tok_' + tp, [pr.user, pr.peran, pr.ver, 'p'].join('|'), 21600);
      catatLogin_(pr.user, pr.peran, 'Berhasil', req.perangkat);
      return { ok: true, token: tp, user: pr.user, peran: pr.peran, berlakuDetik: 21600 };
    }
  }
  if (!cocok) { c.put('login_gagal', String(gagal + 1), 900); catatLogin_(req.username, '', 'Gagal (password/username salah)', req.perangkat); throw new Error('Username atau password salah.'); }
  var a = AKUN[cocok], t = Utilities.getUuid(), u = p.getProperty(a.kunci + '_USER');
  c.put('tok_' + t, [u, cocok, p.getProperty(a.kunci + '_VER') || '0'].join('|'), 21600); // 6 jam
  catatLogin_(u, cocok, 'Berhasil', req.perangkat);
  return { ok: true, token: t, user: u, peran: cocok, berlakuDetik: 21600 };
}

/* Catatan login ke tab "Log Login" (dibuat otomatis). Tidak pernah mencatat password.
   Kegagalan menulis log tidak menggagalkan login. */
function catatLogin_(user, peran, hasil, perangkat) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB.LOG);
    if (!sh) {
      sh = ss.insertSheet(TAB.LOG, ss.getSheets().length);
      sh.getRange(1, 1, 1, 5).setValues([['Waktu', 'Akun', 'Peran', 'Hasil', 'Perangkat']]).setFontWeight('bold').setBackground('#18233F').setFontColor('#FFFFFF');
      sh.setFrozenRows(1); sh.setColumnWidths(1, 5, 170); sh.setColumnWidth(4, 230); sh.setTabColor('#8A93A6');
      sh.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    }
    var nama = String(user || '').replace(/[^\w.@ -]/g, '').slice(0, 40) || '(kosong)';
    var lab = peran === 'admin' ? 'Admin' : peran === 'lihat' ? 'Lihat' : '–';
    sh.appendRow([new Date(), nama, lab, String(hasil), String(perangkat || '').replace(/[^\w ·.-]/g, '').slice(0, 40)]);
  } catch (e) { /* abaikan */ }
}

function cekToken_(t) {
  var v = t ? CacheService.getScriptCache().get('tok_' + t) : null;
  if (!v) throw new Error('LOGIN: Sesi sudah berakhir. Silakan masuk lagi.');
  var x = v.split('|'), peran = x[1], a = AKUN[peran];
  if (!a) throw new Error('LOGIN: Sesi tidak valid. Silakan masuk lagi.');
  if (x[3] === 'p') {   // akun pribadi: berlaku selama password tidak diganti dan akun tidak dinonaktifkan
    var rec = rekPribadi_(x[0]);
    if (!rec || String(rec.v) !== x[2]) throw new Error('LOGIN: Akun sudah diganti atau dinonaktifkan. Silakan masuk lagi.');
    return { user: x[0], peran: peran };
  }
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
var PIC_TL = ['MAN', 'JAR', 'JAR LAB', 'JAR MUTU', 'PKU YAN', 'PKU KEU', 'PBJ', 'K3L KAM', 'REN Pusdiklat', 'ACD Pusdiklat'];

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

/* Ubah status (dan PIC) satu baris Perbaikan Berkelanjutan. Baris dikenali dari nomor baris + isi komentar (dicek ulang). */
function ubahTindakLanjut_(d, user) {
  var sh = tab_(TAB.TINDAKLANJUT), head = judulKolom_(sh), cSt = head.indexOf('Status'), cKet = head.indexOf('Keterangan'), cKom = head.indexOf('Komentar');
  if (cSt < 0 || cKom < 0) throw new Error('Kolom Status / Komentar tidak ditemukan di tab ' + TAB.TINDAKLANJUT + '.');
  var st = nilaiKolom_(['Status', 'status', 1], d['Status'], user), r = Number(d.baris);
  if (!(r >= 2 && r <= sh.getLastRow())) throw new Error('Baris perbaikan berkelanjutan tidak ditemukan. Muat ulang dashboard lalu coba lagi.');
  var kom = String(sh.getRange(r, cKom + 1).getValue()).trim();
  if (kom.slice(0, 60) !== String(d.komentar || '').trim().slice(0, 60)) throw new Error('Urutan baris di spreadsheet sudah berubah. Muat ulang dashboard lalu coba lagi.');
  sh.getRange(r, cSt + 1).setValue(st);
  var cPic = head.indexOf('PIC'), pic = String(d['PIC'] || '').trim();
  if (pic && cPic >= 0) { if (PIC_TL.indexOf(pic) < 0) throw new Error('PIC "' + pic + '" tidak ada di daftar.'); sh.getRange(r, cPic + 1).setValue(pic); }
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
/* kolom (opsional) = daftar judul kolom yang dibutuhkan. Untuk tab besar (puluhan ribu baris) hanya kolom itu
   yang dibaca, satu per satu, sehingga jauh lebih cepat daripada membaca seluruh tab. */
function bacaMentah_(ss, nama, kolom) {
  var sh = ss.getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" belum ada.');
  var nR = sh.getLastRow(), nC = sh.getLastColumn();
  if (nR < 2) return { head: nC ? judulKolom_(sh) : [], rows: [] };
  var head = sh.getRange(1, 1, 1, nC).getValues()[0].map(function (h) { return String(h).replace(/\s+/g, ' ').trim(); });
  var akhir = head.length; while (akhir > 1 && !head[akhir - 1]) akhir--;   // abaikan kolom kosong di kanan
  head = head.slice(0, akhir);
  if (kolom) {
    var pilih = []; kolom.forEach(function (k) { var i = kol_(head, k); if (i >= 0 && pilih.indexOf(i) < 0) pilih.push(i); });
    var isi = pilih.map(function (i) { return sh.getRange(2, i + 1, nR - 1, 1).getValues(); });
    var rows = [];
    for (var b = 0; b < nR - 1; b++) {
      var r = [], ada = false;
      for (var j = 0; j < head.length; j++) r.push('');
      for (var q = 0; q < pilih.length; q++) { var v = isi[q][b][0]; r[pilih[q]] = v; if (v !== '' && v !== null) ada = true; }
      if (ada) rows.push(r);
    }
    return { head: head, rows: rows };
  }
  var vv = sh.getRange(2, 1, nR - 1, akhir).getValues();
  return { head: head, rows: vv.filter(function (r) { return r.some(function (x) { return x !== '' && x !== null; }); }) };
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
    var pre = h.split(/[-\s]/)[0].trim(), asp = NAMA_ASPEK_[pre.toUpperCase()] || pre;
    out.push({ i: i, label: h, aspek: asp });
  });
  return out;
}
function bulatkan_(a) { return a.map(function (x) { return Math.round(x * 1000) / 1000; }); }

/* Kepuasan Peserta EL1: per pelatihan -> jumlah responden + jumlah & banyaknya nilai per butir */
function aggKepuasan_(ss) {
  var t = bacaMentah_(ss, TAB.KEPUASAN), h = t.head;
  if (kol_(h, 'P.Isi') >= 0) return aggKepuasanJadwal_(t);
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

/* Format per jadwal (template EVALUASI LEVEL 1 PER JADWAL): satu baris = rata-rata satu kelas.
   Nilai tiap butir dibobot jumlah pengisi (P.Isi) supaya kelas dengan pengisi banyak berbobot lebih besar. */
function aggKepuasanJadwal_(t) {
  var h = t.head, cJ = kol_(h, ['Judul Pembelajaran', 'Judul']), cK = kol_(h, ['Kode Judul', 'Kode Pembelajaran']), cS = kol_(h, ['Tgl Selesai', 'Tanggal Selesai']), cA = kol_(h, 'Angkatan'), cI = kol_(h, 'P.Isi');
  if (t.rows.length && (cJ < 0 || cS < 0)) throw new Error('Tab "' + TAB.KEPUASAN + '": kolom Judul Pembelajaran / Tgl Selesai tidak ditemukan.');
  var B = butir_(h, ['Kode Judul', 'Kode Pembelajaran', 'Judul Pembelajaran', 'Bidang', 'Tgl Mulai', 'Tanggal Mulai', 'Tgl Selesai', 'Tanggal Selesai', 'Angkatan', 'UPDL Penyelenggara', 'Jenis Diklat', 'Jenis Penyelenggaraan', 'P.Isi', 'P.Hadir'], /^waktu/i);
  var pel = [];
  t.rows.forEach(function (r) {
    var tg = isoTgl_(r[cS]), n = nilai_(r[cI]) || 0; if (!tg || n <= 0) return;
    var s = [], c = [], ada = false;
    B.forEach(function (b) { var v = nilai_(r[b.i]); if (v !== null && v > 0) { s.push(v * n); c.push(n); ada = true; } else { s.push(0); c.push(0); } });
    if (ada) pel.push([tg, teks_(r[cJ]) + (cA >= 0 && teks_(r[cA]) ? ' · Angkatan ' + teks_(r[cA]) : ''), n, bulatkan_(s), c]);
  });
  return { butir: B.map(function (b) { return labelButir_(b.label); }), aspek: B.map(function (b) { return b.aspek; }), pel: pel, format: 'jadwal' };
}
/* Samakan penulisan singkatan: "Mat-Sat-1 0f 2" -> "Mat-Sat 1 of 2", "Dig Rat" -> "Dig-Rat" */
function labelButir_(x) {
  return String(x).trim().replace(/\s+0f\s+/i, ' of ').replace(/^([A-Za-z]+)[\s-]+([A-Za-z]+)[\s-]+(\d+\s+of\s+\d+)$/i, '$1-$2 $3').replace(/^([A-Za-z]+)\s+([A-Za-z]+)$/, '$1-$2');
}
/* Tab Master Evaluasi L1: OBJEK, ASPEK, NO, PERTANYAAN LEVEL 1, SINGKATAN -> [singkatan, objek, aspek, pertanyaan] */
function bacaMasterL1_(ss) {
  var sh = ss.getSheetByName(TAB.MASTER_L1); if (!sh || sh.getLastRow() < 2) return [];
  var t = bacaMentah_(ss, TAB.MASTER_L1), h = t.head, cO = kol_(h, 'OBJEK'), cA = kol_(h, 'ASPEK'), cP = kol_(h, ['PERTANYAAN LEVEL 1', 'PERTANYAAN']), cS = kol_(h, 'SINGKATAN');
  if (cS < 0 || cP < 0) return [];
  return t.rows.filter(function (r) { return teks_(r[cS]); }).map(function (r) { return [labelButir_(r[cS]), teks_(r[cO]), teks_(r[cA]), teks_(r[cP])]; });
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
  var t = bacaMentah_(ss, TAB.KSA, ['Kehadiran', 'Kelulusan', 'Nilai', 'Nama Judul', 'Judul', 'R.Tgl_Selesai', 'R.Tgl Selesai', 'P.Tgl_Selesai', 'Tgl Selesai']), h = t.head;
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
  var cI = kol_(h, 'Jumlah Peserta Isi'), cA = kol_(h, 'Angkatan');
  if (cI >= 0) {   // format per jadwal (template EVALUASI LEVEL 2 RESUME): rata-rata kelas dibobot jumlah pengisi
    var pel = [];
    t.rows.forEach(function (r) {
      var tg = isoTgl_(r[cS]), n = nilai_(r[cI]) || 0; if (!tg || n <= 0) return;
      var c = nilai_(r[cC]), m = nilai_(r[cM]), okC = c !== null && c > 0, okM = m !== null && m > 0;
      if (!okC && !okM) return;
      pel.push([tg, teks_(r[cJ]) + (cA >= 0 && teks_(r[cA]) ? ' · Angkatan ' + teks_(r[cA]) : ''), n, okC ? Math.round(c * n * 1000) / 1000 : 0, okC ? n : 0, okM ? Math.round(m * n * 1000) / 1000 : 0, okM ? n : 0]);
    });
    return { pel: pel, format: 'jadwal' };
  }
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
  var t = bacaMentah_(ss, TAB.SERT, ['Status', 'Tgl.Terbit', 'Tgl Terbit', 'Tanggal Terbit', 'Tgl.Selesai', 'Tgl Selesai', 'Tanggal Selesai']), h = t.head;
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

/* IDP: satu baris per pegawai -> [nama, unit, jenjang, pemetaan, rencana P/C/T, realisasi P, tgl P, realisasi C, tgl C, realisasi T, tgl T, link] */
function bacaIdp_(ss) {
  var t = bacaMentah_(ss, TAB.IDP), h = t.head;
  var c = ['Nama Lengkap', 'Unit/Bidang', 'Jenjang - Main Grp Text', 'Pemetaan IDP', 'Rencana IDP Pembelajaran', 'Rencana IDP Coaching/Mentoring', 'Rencana IDP Penugasan',
    'Realisasi IDP Pembelajaran', 'Tgl Pembelajaran', 'Realisasi IDP Coaching/Mentoring', 'Tgl Coaching/Mentoring', 'Realisasi IDP Penugasan', 'Tgl Penugasan', 'Link Upload Eviden'].map(function (n) { return kol_(h, n); });
  if (t.rows.length && c[0] < 0) throw new Error('Tab "' + TAB.IDP + '": kolom Nama Lengkap tidak ditemukan.');
  return t.rows.filter(function (r) { return teks_(r[c[0]]); }).map(function (r) {
    return c.map(function (i) { if (i < 0) return ''; var v = r[i]; return v instanceof Date ? keIso_(v) : teks_(v); });
  });
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
  var nC = sh.getLastColumn(), h1 = sh.getRange(1, 1, 1, nC).getValues()[0];
  while (nC > 1 && String(h1[nC - 1]).trim() === '') nC--;   // kolom kosong di kanan tidak dibaca
  var v = clean_(sh.getRange(1, 1, sh.getLastRow(), nC).getValues());
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
  sesuaikanTab_();
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

/* ======================================================================== */
/*  AKUN LIHAT TAMBAHAN (OPSIONAL)                                           */
/* ======================================================================== */
/* Hanya ada dua jenis akun: Admin (satu akun, lewat "Atur akun Admin") dan Lihat.
   Selain akun Lihat bersama, akun Lihat bisa ditambah sesuai kebutuhan, satu per orang.
   Daftarnya di tab "Akun Lihat" (Username, Nama, Aktif, Terakhir Diubah); password hanya
   disimpan sebagai hash di Script Properties. Akun tambahan selalu berperan Lihat.
   Kolom Aktif boleh diubah langsung di tab (berlaku pada login berikutnya); untuk
   mengeluarkan seseorang saat itu juga, pakai menu "Nonaktifkan akun Lihat". */
function akunPribadi_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.AKUN), o = {};
  if (!sh || sh.getLastRow() < 2) return o;
  var v = sh.getRange(1, 1, sh.getLastRow(), Math.max(3, sh.getLastColumn())).getValues(), h = v[0].map(String);
  var iU = kol_(h, 'Username'), iN = kol_(h, 'Nama'), iA = kol_(h, 'Aktif');
  if (iU < 0) return o;
  v.slice(1).forEach(function (r, i) {
    var u = teks_(r[iU]); if (!u) return;
    o[u.toLowerCase()] = { user: u, nama: iN >= 0 ? teks_(r[iN]) : '', peran: 'lihat', aktif: iA < 0 || !/^(tidak|no|n|false|0)$/i.test(teks_(r[iA])), baris: i + 2 };
  });
  return o;
}
function rekPribadi_(u) {
  var t = PropertiesService.getScriptProperties().getProperty('PRIBADI_' + String(u).toLowerCase());
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}
function cocokPribadi_(nama, pw) {
  var a = akunPribadi_()[nama], rec = a && a.aktif ? rekPribadi_(nama) : null;
  if (!rec || hash_(rec.s, pw) !== rec.h) return null;
  return { user: a.user, nama: a.nama, peran: 'lihat', ver: String(rec.v) };
}
function tabAkun_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB.AKUN);
  if (sh) return sh;
  sh = ss.insertSheet(TAB.AKUN, ss.getSheets().length);
  sh.getRange(1, 1, 1, 4).setValues([['Username', 'Nama', 'Aktif', 'Terakhir Diubah']]).setFontWeight('bold').setBackground('#18233F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1); sh.setColumnWidths(1, 4, 170); sh.setTabColor('#8A93A6');
  sh.getRange(2, 3, 199, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Ya', 'Tidak'], true).build());
  sh.getRange(1, 6).setValue('Semua akun di sini berperan Lihat. Password tidak disimpan di sini: tambah akun / ganti password lewat menu Dashboard → Akun Lihat tambahan.').setFontStyle('italic').setFontColor('#6B7385');
  return sh;
}
function aturAkunPribadi() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var r1 = ui.prompt('Akun Lihat tambahan (1 dari 3)', 'Username (3–40 karakter: huruf, angka, titik, minus, garis bawah).\nIsi username yang sudah ada untuk mengganti password-nya.', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var u = r1.getResponseText().trim();
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(u)) { ui.alert('Username tidak valid. Akun belum diubah.'); return; }
  var bersama = Object.keys(AKUN).map(function (k) { return (p.getProperty(AKUN[k].kunci + '_USER') || '').toLowerCase(); });
  if (bersama.indexOf(u.toLowerCase()) >= 0) { ui.alert('Username ini dipakai akun Admin atau akun Lihat bersama. Pakai username lain.'); return; }
  var ada = akunPribadi_()[u.toLowerCase()];
  var r2 = ui.prompt('Akun Lihat tambahan (2 dari 3)', 'Nama pemilik akun' + (ada ? ' (kosongkan bila tetap "' + ada.nama + '")' : '') + ':', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var nama = r2.getResponseText().trim() || (ada ? ada.nama : '');
  var r3 = ui.prompt('Akun Lihat tambahan (3 dari 3)', 'Password, minimal 8 karakter. Sampaikan langsung ke pemilik akun; password tidak bisa dilihat lagi.', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  var pw = r3.getResponseText();
  if (pw.length < 8) { ui.alert('Password minimal 8 karakter. Akun belum diubah.'); return; }
  var lama = rekPribadi_(u), salt = Utilities.getUuid(), o = {};
  o['PRIBADI_' + u.toLowerCase()] = JSON.stringify({ s: salt, h: hash_(salt, pw), v: (lama ? Number(lama.v) || 0 : 0) + 1 });
  p.setProperties(o);
  var sh = tabAkun_(), isi = [[ada ? ada.user : u, nama, 'Ya', new Date()]];
  if (ada) sh.getRange(ada.baris, 1, 1, 4).setValues(isi); else sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setValues(isi);
  ui.alert('Akun Lihat tersimpan.\n\nUsername: ' + u + (lama ? '\n\nPassword lama tidak berlaku lagi.' : ''));
}
function nonaktifkanAkunPribadi() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties();
  var r = ui.prompt('Nonaktifkan akun Lihat', 'Username yang dinonaktifkan (orang ini langsung keluar dari dashboard):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var u = r.getResponseText().trim().toLowerCase(), a = akunPribadi_()[u];
  if (!a) { ui.alert('Username tidak ada di tab ' + TAB.AKUN + '.'); return; }
  var o = {}; o['PRIBADI_' + u] = ''; p.setProperties(o);
  tabAkun_().getRange(a.baris, 3, 1, 2).setValues([['Tidak', new Date()]]);
  ui.alert('Akun ' + a.user + ' dinonaktifkan. Untuk mengaktifkan lagi, pakai menu Tambah akun Lihat / ganti password.');
}

/* ======================================================================== */
/*  RINGKASAN LOG LOGIN (untuk Admin di website)                             */
/* ======================================================================== */
function ringkasLog_(hari) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB.LOG), batas = new Date(Date.now() - hari * 864e5);
  var out = { hari: hari, total: 0, akun: [], gagal: { n: 0, daftar: [] }, harian: [] };
  if (!sh || sh.getLastRow() < 2) return out;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues(), per = {}, hr = {};
  v.forEach(function (r) {
    var w = r[0] instanceof Date ? r[0] : new Date(r[0]); if (isNaN(w) || w < batas) return;
    var hasil = teks_(r[3]), akun = teks_(r[1]), iso = w.toISOString();
    if (/^berhasil/i.test(hasil)) {
      out.total++;
      var k = akun.toLowerCase(); per[k] = per[k] || { akun: akun, peran: teks_(r[2]), n: 0, terakhir: '', perangkat: '' };
      per[k].n++; if (iso >= per[k].terakhir) { per[k].terakhir = iso; per[k].perangkat = teks_(r[4]); per[k].peran = teks_(r[2]); }
      var d = Utilities.formatDate(w, Session.getScriptTimeZone(), 'yyyy-MM-dd'); hr[d] = (hr[d] || 0) + 1;
    } else if (/gagal|ditolak/i.test(hasil)) {
      out.gagal.n++; out.gagal.daftar.push([iso, akun, hasil, teks_(r[4])]);
    }
  });
  out.akun = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return a.terakhir < b.terakhir ? 1 : -1; });
  out.gagal.daftar = out.gagal.daftar.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; }).slice(0, 10);
  for (var i = hari - 1; i >= 0; i--) { var t = Utilities.formatDate(new Date(Date.now() - i * 864e5), Session.getScriptTimeZone(), 'yyyy-MM-dd'); out.harian.push([t, hr[t] || 0]); }
  return out;
}

/* ======================================================================== */
/*  PEMERIKSAAN ISIAN DATA                                                   */
/* ======================================================================== */
/* Kelengkapan isian bulanan (dipakai pemeriksa data dan pengingat email) */
function cekBulanan_(y, m) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), Bn = BULAN_[m - 1], kurang = [], sudah = [];
  try {
    var P = bacaMentah_(ss, TAB.PEGAWAI), iT = kol_(P.head, 'Tahun'), iB = kol_(P.head, 'Bulan'), iJ = kol_(P.head, 'Jumlah Pegawai');
    var ok = P.rows.some(function (r) { return teks_(r[iT]) === String(y) && teks_(r[iB]).toUpperCase() === Bn && nilai_(r[iJ]) !== null; });
    (ok ? sudah : kurang).push('Jumlah Pegawai ' + cap_(Bn) + ' ' + y);
  } catch (e) { kurang.push('Tab ' + TAB.PEGAWAI + ' tidak terbaca'); }
  try {
    var K = bacaMentah_(ss, TAB.KEPATUHAN), iA = kol_(K.head, 'Aspek Kepatuhan'), iTh = kol_(K.head, 'Tahun'), iM = kol_(K.head, Bn);
    var asp = K.rows.filter(function (r) { return teks_(r[iA]) && (iTh < 0 || !teks_(r[iTh]) || teks_(r[iTh]) === String(y)); });
    var kos = iM < 0 ? asp : asp.filter(function (r) { return teks_(r[iM]) === ''; });
    if (!asp.length) kurang.push('Kepatuhan: belum ada aspek untuk tahun ' + y);
    else (kos.length ? kurang : sudah).push('Kepatuhan ' + cap_(Bn) + (kos.length ? ' (' + kos.length + ' dari ' + asp.length + ' aspek kosong)' : ''));
  } catch (e) { kurang.push('Tab ' + TAB.KEPATUHAN + ' tidak terbaca'); }
  var cfg = getConfig_(), kon = ss.getSheetByName(String(cfg.KONMAN_TAB_AWALAN || 'Konman ') + y);
  if (!kon) kurang.push('Tab Konman ' + y + ' belum ada');
  var tl = 0;
  try {
    var T = bacaMentah_(ss, TAB.TINDAKLANJUT), iK = kol_(T.head, 'Komentar'), iS = kol_(T.head, 'Status');
    tl = T.rows.filter(function (r) { return teks_(r[iK]) && (!teks_(r[iS]) || /^belum/i.test(teks_(r[iS]))); }).length;
  } catch (e) { /* abaikan */ }
  return { kurang: kurang, sudah: sudah, tlBelum: tl, bulan: cap_(Bn) + ' ' + y };
}
function cap_(s) { s = String(s).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
function bulanLalu_() { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return [d.getFullYear(), d.getMonth() + 1]; }

/* Menu Dashboard > Periksa isian data: daftar isian yang kosong atau formatnya salah */
function periksaData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), msg = [], now = new Date(), y = now.getFullYear();
  function catat(tab, baris, teks) { msg.push('• ' + tab + (baris ? ' baris ' + baris : '') + ': ' + teks); }
  // 1. kelengkapan bulanan Januari s.d. bulan lalu
  var bl = bulanLalu_();
  for (var m = 1; m <= (bl[0] === y ? bl[1] : 12); m++) {
    cekBulanan_(bl[0] === y ? y : bl[0], m).kurang.forEach(function (k) { if (msg.indexOf('• ' + k) < 0) msg.push('• ' + k); });
  }
  // 2. rekap L3/L4/ROTI: tanggal dan nilai
  [[TAB.L3, 'Tanggal Evaluasi', 'Skor (0-100)', 100], [TAB.L4, 'Tanggal Evaluasi', 'Skor (0-100)', 100], [TAB.ROTI, 'Tanggal', 'Nilai ROTI (%)', null]].forEach(function (c) {
    try {
      var T = bacaMentah_(ss, c[0]), iT = kol_(T.head, c[1]), iN = kol_(T.head, c[2]);
      T.rows.forEach(function (r, i) {
        if (!isoTgl_(r[iT])) catat(c[0], i + 2, 'tanggal kosong / bukan tanggal');
        var n = nilai_(r[iN]);
        if (n === null) catat(c[0], i + 2, c[2] + ' kosong / bukan angka');
        else if (c[3] !== null && (n < 0 || n > c[3])) catat(c[0], i + 2, c[2] + ' di luar 0–' + c[3]);
      });
    } catch (e) { catat(c[0], 0, e.message); }
  });
  // 3. tindak lanjut: status dan PIC
  try {
    var T = bacaMentah_(ss, TAB.TINDAKLANJUT), iK = kol_(T.head, 'Komentar'), iS = kol_(T.head, 'Status'), iP = kol_(T.head, 'PIC');
    T.rows.forEach(function (r, i) {
      if (!teks_(r[iK])) return;
      var st = teks_(r[iS]);
      if (st && STATUS_TL.indexOf(st) < 0) catat(TAB.TINDAKLANJUT, i + 2, 'status "' + st + '" tidak dikenal');
      if (iP >= 0 && !teks_(r[iP])) catat(TAB.TINDAKLANJUT, i + 2, 'PIC kosong');
    });
  } catch (e) { catat(TAB.TINDAKLANJUT, 0, e.message); }
  // 4. inovasi: tahap, progres, tanggal
  try {
    var I = bacaMentah_(ss, TAB.INOVASI), c = function (n) { return kol_(I.head, n); };
    var iJ = c('Judul Inovasi'), iTp = c('Tahap'), iPg = c('Progres (%)'), iTg = c('Target Selesai'), iRs = c('Realisasi Selesai'), iSt = c('Status');
    I.rows.forEach(function (r, i) {
      if (!teks_(r[iJ])) return;
      var tp = parseInt(teks_(r[iTp]), 10), pg = nilai_(r[iPg]);
      if (!(tp >= 1 && tp <= 5)) catat(TAB.INOVASI, i + 2, 'Tahap harus 1–5');
      if (pg !== null && (pg < 0 || pg > 100)) catat(TAB.INOVASI, i + 2, 'Progres di luar 0–100');
      if (teks_(r[iTg]) && !isoTgl_(r[iTg])) catat(TAB.INOVASI, i + 2, 'Target Selesai bukan tanggal');
      if (/selesai/i.test(teks_(r[iSt])) && !isoTgl_(r[iRs])) catat(TAB.INOVASI, i + 2, 'status Selesai tapi Realisasi Selesai kosong');
    });
  } catch (e) { catat(TAB.INOVASI, 0, e.message); }
  // 5. penyesuaian HOP: alasan wajib
  try {
    var H = bacaMentah_(ss, TAB.PENYESUAIAN), iAl = kol_(H.head, 'Alasan');
    H.rows.forEach(function (r, i) { if (iAl >= 0 && !teks_(r[iAl])) catat(TAB.PENYESUAIAN, i + 2, 'Alasan kosong'); });
  } catch (e) { /* tab opsional */ }
  var teks = msg.length ? msg.length + ' hal perlu diperiksa:\n\n' + msg.slice(0, 40).join('\n') + (msg.length > 40 ? '\n… dan ' + (msg.length - 40) + ' lainnya' : '')
    : 'Semua isian yang diperiksa sudah lengkap dan formatnya benar.';
  safeAlert_(teks);
  return msg;
}

/* ======================================================================== */
/*  PENGINGAT EMAIL BULANAN                                                  */
/* ======================================================================== */
/* Pengaturan: EMAIL_PENGINGAT (pisahkan dengan koma), TANGGAL_PENGINGAT (default 5),
   DASHBOARD_URL (alamat website, ditautkan di email). Email hanya dikirim bila ada isian
   bulan lalu yang belum lengkap atau perbaikan berkelanjutan yang belum dimulai. */
function penerima_() { return String(getConfig_().EMAIL_PENGINGAT || '').split(/[,;\s]+/).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }); }
function kirimPengingat() { return kirimPengingat_(false); }
function kirimPengingat_(paksa) {
  var to = penerima_(); if (!to.length) return 'Alamat email belum diisi (Pengaturan → EMAIL_PENGINGAT).';
  var bl = bulanLalu_(), c = cekBulanan_(bl[0], bl[1]), cfg = getConfig_();
  if (!paksa && !c.kurang.length && !c.tlBelum) return 'Semua isian ' + c.bulan + ' lengkap; email tidak dikirim.';
  var url = SpreadsheetApp.getActiveSpreadsheet().getUrl(), dash = String(cfg.DASHBOARD_URL || cfg.URL_DASHBOARD || '').trim();
  var li = function (a, ikon) { return a.map(function (x) { return '<li>' + ikon + ' ' + x.replace(/</g, '&lt;') + '</li>'; }).join(''); };
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#18233F;max-width:560px">' +
    '<p>Halo, berikut pengingat isian <b>Dashboard Kinerja UPDL Semarang</b> untuk <b>' + c.bulan + '</b>.</p>' +
    (c.kurang.length ? '<p style="margin-bottom:4px"><b>Belum lengkap:</b></p><ul style="margin-top:0">' + li(c.kurang, '✗') + '</ul>' : '<p>Semua isian bulanan sudah lengkap. ✓</p>') +
    (c.sudah.length ? '<p style="margin-bottom:4px;color:#5B6478">Sudah terisi:</p><ul style="margin-top:0;color:#5B6478">' + li(c.sudah, '✓') + '</ul>' : '') +
    (c.tlBelum ? '<p>Ada <b>' + c.tlBelum + '</b> perbaikan berkelanjutan berstatus Belum Dimulai.</p>' : '') +
    '<p>Jangan lupa memperbarui realisasi Konman ' + c.bulan + '.</p>' +
    '<p><a href="' + url + '">Buka spreadsheet data</a>' + (dash ? ' · <a href="' + dash + '">Buka dashboard</a>' : '') + '</p>' +
    '<p style="color:#8A93A6;font-size:12px">Email otomatis dari Apps Script dashboard. Ubah penerima di tab Pengaturan (EMAIL_PENGINGAT).</p></div>';
  var plain = 'Pengingat isian Dashboard UPDL Semarang, ' + c.bulan + '\n\nBelum lengkap:\n' + (c.kurang.join('\n') || '-') + (c.tlBelum ? '\n\nPerbaikan berkelanjutan Belum Dimulai: ' + c.tlBelum : '') + '\n\nSpreadsheet: ' + url;
  MailApp.sendEmail({ to: to.join(','), subject: '[Dashboard UPDL] Pengingat isian data ' + c.bulan, htmlBody: html, body: plain, name: 'Dashboard UPDL Semarang' });
  return 'Email terkirim ke ' + to.join(', ') + '.';
}
function cobaKirimPengingat() { safeAlert_(kirimPengingat_(true)); }
function pasangPengingat() {
  if (!penerima_().length) { safeAlert_('Isi dulu alamat email di tab Pengaturan, baris EMAIL_PENGINGAT (pisahkan dengan koma).'); return; }
  hapusPengingat_(); var tgl = Math.min(28, Math.max(1, Number(getConfig_().TANGGAL_PENGINGAT) || 5));
  ScriptApp.newTrigger('kirimPengingat').timeBased().onMonthDay(tgl).atHour(7).create();
  safeAlert_('Pengingat aktif: tiap tanggal ' + tgl + ' sekitar pukul 07.00 ke ' + penerima_().join(', ') + '.\nEmail hanya dikirim bila ada isian bulan lalu yang belum lengkap.');
}
function hapusPengingat_() { var n = 0; ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'kirimPengingat') { ScriptApp.deleteTrigger(t); n++; } }); return n; }
function hapusPengingat() { var n = hapusPengingat_(); safeAlert_(n ? 'Pengingat email dimatikan.' : 'Pengingat email memang belum aktif.'); }

/* ======================================================================== */
/*  CACHE: hasil olahan disimpan sementara supaya dashboard cepat terbuka     */
/* ======================================================================== */
/* Tiap bagian disimpan (gzip, dipotong 90 ribu karakter) di CacheService maksimal 6 jam.
   Bagian dari tab di spreadsheet ini dihitung ulang hanya bila tab-nya berubah: jumlah baris/kolom
   berubah atau ada suntingan (dicatat onEdit). File luar (Rendiklat, MLI, Profil Risiko, FRA)
   disegarkan tiap 10 menit. Menu Dashboard > Segarkan data dashboard menghapus semua cache. */
var CACHE_DETIK = 21600;
function ambilUbah_() { try { return PropertiesService.getScriptProperties().getProperties(); } catch (e) { return {}; } }
function sidikTab_(ss, tabs, ubah) {
  return tabs.map(function (n) {
    var sh = ss.getSheetByName(n);
    return sh ? n + ':' + sh.getLastRow() + 'x' + sh.getLastColumn() + ':' + (ubah['ubah_' + n] || '0') : n + ':-';
  }).join('|') + '|v' + VERSI + '|' + (ubah.CACHE_EPOCH || '0');
}
function cacheAmbil_(key) {
  try {
    var c = CacheService.getScriptCache(), m = c.get('c_' + key); if (!m) return null;
    m = JSON.parse(m);
    var keys = []; for (var i = 0; i < m.n; i++) keys.push('c_' + key + '_' + i);
    var g = c.getAll(keys), s = '';
    for (i = 0; i < m.n; i++) { if (g[keys[i]] === undefined || g[keys[i]] === null) return null; s += g[keys[i]]; }
    var blob = Utilities.newBlob(Utilities.base64Decode(s), 'application/x-gzip');
    return { fp: m.fp, data: JSON.parse(Utilities.ungzip(blob).getDataAsString()) };
  } catch (e) { return null; }
}
function cacheSimpan_(key, fp, data, detik) {
  try {
    var s = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(data), 'application/json')).getBytes());
    var n = Math.max(1, Math.ceil(s.length / 90000)); if (n > 150) return;
    var o = {}; for (var i = 0; i < n; i++) o['c_' + key + '_' + i] = s.slice(i * 90000, (i + 1) * 90000);
    o['c_' + key] = JSON.stringify({ fp: fp, n: n });
    CacheService.getScriptCache().putAll(o, detik || CACHE_DETIK);
  } catch (e) { /* cache penuh/gagal: abaikan, data tetap dihitung langsung */ }
}
function sekCache_(key, fp, fn, detik) {
  var h = cacheAmbil_(key);
  if (h && h.fp === fp) return h.data;
  var d = fn(); cacheSimpan_(key, fp, d, detik); return d;
}
/* Pemicu sederhana: catat tab yang disunting supaya cache bagian itu dihitung ulang */
function onEdit(e) {
  try { var n = e.range.getSheet().getName(), o = {}; o['ubah_' + n] = String(Date.now()); PropertiesService.getScriptProperties().setProperties(o); } catch (x) { /* abaikan */ }
}
function tandaiUbah_(nama) { try { var o = {}; o['ubah_' + nama] = String(Date.now()); PropertiesService.getScriptProperties().setProperties(o); } catch (x) { /* abaikan */ } }
/* Menu: hapus semua cache lalu hitung ulang (dipakai setelah menempel data besar) */
function segarkanData() {
  var o = { CACHE_EPOCH: String(Date.now()) }; PropertiesService.getScriptProperties().setProperties(o);
  var t = Date.now(); buildData_();
  safeAlert_('Data dashboard sudah disegarkan (' + Math.round((Date.now() - t) / 1000) + ' detik). Website akan memakai data terbaru.');
}
/* Pemicu per jam: menjaga cache tetap siap sehingga pengunjung tidak menunggu */
function hangatkanCache() { buildData_(); }
function pasangPercepatan() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'hangatkanCache') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('hangatkanCache').timeBased().everyHours(1).create();
  segarkanData();
}

/* ======================================================================== */
/*  KRI (Profil Risiko tab 10) DAN FRA (file Fraud Risk Assessment)           */
/* ======================================================================== */
function cariBarisJudul_(d, kunci, maks) {
  for (var i = 0; i < Math.min(d.length, maks || 30); i++) if (d[i].some(function (x) { return String(x).trim() === kunci; })) return i;
  return -1;
}
function bacaKri_(cfg) {
  if (!cfg.PROFIL_RISIKO_ID) return null;
  var ss = SpreadsheetApp.openById(String(cfg.PROFIL_RISIKO_ID).trim()), sh = ss.getSheetByName(cfg.KRI_TAB || '10. Pemantauan KRI 2026');
  if (!sh) return null;
  var R = sh.getRange(1, 1, Math.min(sh.getLastRow(), 200), Math.min(sh.getLastColumn(), 40)), v = R.getValues(), d = R.getDisplayValues();
  var hr = cariBarisJudul_(d, 'Key Risk Indicator (KRI)'); if (hr < 0) throw new Error('baris judul "Key Risk Indicator (KRI)" tidak ditemukan');
  var H = d[hr].map(function (x) { return String(x).trim(); }), c = function (n) { return H.indexOf(n); };
  var BL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map(c);
  var num = function (x) { return typeof x === 'number' ? x : nilai_(x); };
  var rows = [];
  for (var i = hr + 1; i < d.length; i++) {
    var r = d[i], id = String(r[c('ID Risiko')] || '').trim(); if (!id) continue;
    rows.push({ no: r[c('No')], id: id, jenis: r[c('Jenis')], peristiwa: r[c('Peristiwa Risiko / Peluang')], res: r[c('Level Residu')], tgt: r[c('Level Target')],
      kri: r[c('Key Risk Indicator (KRI)')], satuan: r[c('Satuan')], pol: /min/i.test(r[c('Polaritas (Maks/Min)')]) ? 'Min' : 'Maks',
      pct: /%/.test(r[c('Target')]) || /%/.test(r[c('Satuan')]), target: num(v[i][c('Target')]), bb: num(v[i][c('Batas Bawah')]), ba: num(v[i][c('Batas Atas')]),
      bulan: BL.map(function (k) { return k < 0 ? null : num(v[i][k]); }), status: r[c('Status KRI')], pic: r[c('PIC (R)')], catatan: r[c('Catatan / Tindak Lanjut')] || '' });
  }
  return { tab: sh.getName(), rows: rows };
}
/* Judul dua baris (grup + sub judul) -> "Grup|Sub" atau "Judul" */
function judulDuaBaris_(a, b) {
  var g = '', out = [];
  for (var j = 0; j < Math.max(a.length, b.length); j++) {
    var x = String(a[j] || '').trim(), y = String(b[j] || '').trim();
    if (x) g = x;
    out.push(y ? (x || g) + '|' + y : x);
  }
  return out;
}
function cariKol_(H, nama) { for (var j = 0; j < H.length; j++) if (H[j] === nama) return j; for (j = 0; j < H.length; j++) if (H[j].indexOf(nama) >= 0) return j; return -1; }
var LV_FRA_ = ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'];
var KM_FRA_ = ['Sangat Kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat Besar'];
var DM_FRA_ = ['Tidak Signifikan', 'Minor', 'Medium', 'Signifikan', 'Sangat Signifikan'];
function bacaFra_(cfg) {
  var ss = SpreadsheetApp.openById(String(cfg.FRA_ID).trim());
  function tab(n) { var sh = ss.getSheetByName(n); if (!sh) throw new Error('tab "' + n + '" tidak ditemukan di file FRA'); return sh.getRange(1, 1, Math.min(sh.getLastRow(), 400), Math.min(sh.getLastColumn(), 40)).getDisplayValues(); }
  var E = tab(cfg.FRA_TAB_ENTRY || 'Entry'), hE = cariBarisJudul_(E, 'Deskripsi Risiko Fraud'); if (hE < 0) throw new Error('judul "Deskripsi Risiko Fraud" tidak ditemukan di tab Entry');
  var HE = judulDuaBaris_(E[hE], E[hE + 1]), e = function (n) { return cariKol_(HE, n); };
  var kE = { id: e('ID Risk'), pro: e('Alur Proses Bisnis'), sub: e('Sub Tahapan Kegiatan'), des: e('Deskripsi Risiko Fraud'), sk: e('Skema Fraud'), tp: e('Tipe Fraud'), peny: e('Penyebab Fraud'), rf: e('Red Flag'),
    kon: e('Kontrol Eksisting'), km: e('|Level Kemungkinan'), dm: e('|Level Dampak'), rug: e('|Estimasi Kerugian'), inh: e('Level Risiko Fraud (Inheren)'), mit: e('Mitigasi'), pic: e('PIC'), tw: e('Target Waktu'),
    pu: e('|No. Risiko Profil (utama)'), pl: e('|No. Risiko Profil terkait lainnya'), pid: e('|ID Risiko Profil') };
  var M = tab(cfg.FRA_TAB_MONEV || 'Monev'), hM = cariBarisJudul_(M, 'Kejadian Fraud'), mon = {}, periode = '';
  for (var i = 0; i < Math.min(M.length, 6); i++) if (/^periode/i.test(String(M[i][0]).trim())) periode = String(M[i][1]).trim();
  if (hM >= 0) {
    var HM = judulDuaBaris_(M[hM], M[hM + 1]), m = function (n) { return cariKol_(HM, n); };
    var kM = { id: m('ID Risk'), kj: m('Kejadian Fraud'), rf: m('Red Flag Muncul?'), pg: m('Progres Mitigasi'), ef: m('Efektivitas Mitigasi|Hasil'), km: m('Kemungkinan Residual|Level'), dm: m('Dampak Residual|Level'), res: m('Level Residual'), ch: m('Perubahan'), cat: m('Justifikasi') };
    for (i = hM + 2; i < M.length; i++) {
      var id = String(M[i][kM.id] || '').trim(); if (!/^FR/i.test(id)) continue;
      var g = function (k) { return k < 0 ? '' : String(M[i][k] || '').trim(); };
      mon[id] = { kj: g(kM.kj), rf: g(kM.rf), pg: g(kM.pg), ef: g(kM.ef), km: g(kM.km), dm: g(kM.dm), res: g(kM.res), ch: g(kM.ch), cat: g(kM.cat) };
    }
  }
  var risiko = [];
  for (i = hE + 2; i < E.length; i++) {
    var r = E[i], fid = String(r[kE.id] || '').trim(); if (!/^FR/i.test(fid)) continue;
    var x = function (k) { return k < 0 ? '' : String(r[k] || '').trim(); }, mo = mon[fid] || {};
    risiko.push({ id: fid, proses: x(kE.pro), sub: x(kE.sub), des: x(kE.des), skema: x(kE.sk), tipe: x(kE.tp), penyebab: x(kE.peny), redflag: x(kE.rf), kontrol: x(kE.kon),
      km: x(kE.km), dm: x(kE.dm), kerugian: x(kE.rug), inh: x(kE.inh), mitigasi: x(kE.mit), pic: x(kE.pic), target: x(kE.tw),
      profil: x(kE.pu), profilLain: x(kE.pl), profilId: x(kE.pid),
      kejadian: mo.kj || '', rfMuncul: mo.rf || '', progres: mo.pg || '', efektif: mo.ef || '', kmR: mo.km || '', dmR: mo.dm || '', res: mo.res || '', perubahan: mo.ch || '', catatan: mo.cat || '' });
  }
  var aksi = [];
  try {
    var A = tab(cfg.FRA_TAB_MITIGASI || 'Rencana Mitigasi'), hA = cariBarisJudul_(A, 'Rincian Kegiatan Mitigasi');
    if (hA >= 0) {
      var HA = A[hA].map(function (y) { return String(y).trim(); }), a = function (n) { return cariKol_(HA, n); }, last = '';
      var kA = { id: a('ID Risk'), no: a('No. Kegiatan'), rin: a('Rincian Kegiatan Mitigasi'), out: a('Output'), pr: a('PIC Responsible'), ps: a('PIC Support'), tg: a('Target'), st: a('Status'), sel: a('Tanggal Selesai'), ket: a('Keterangan') };
      for (i = hA + 1; i < A.length; i++) {
        var q = A[i], idA = String(q[kA.id] || '').trim(); if (idA) last = idA;
        var rin = String(q[kA.rin] || '').trim(); if (!rin || !last) continue;
        var y2 = function (k) { return k < 0 ? '' : String(q[k] || '').trim(); };
        aksi.push([last, y2(kA.no), rin, y2(kA.out), y2(kA.pr), y2(kA.ps), y2(kA.tg), y2(kA.st), y2(kA.sel), y2(kA.ket)]);
      }
    }
  } catch (x2) { /* tab rencana mitigasi opsional */ }
  return { periode: periode, ringkas: ringkasFra_(risiko, aksi), risiko: risiko, aksi: aksi };
}
/* Ringkasan tanpa rincian (untuk akun Lihat) */
function ringkasFra_(R, aksi) {
  var lv = function () { var o = {}; LV_FRA_.forEach(function (k) { o[k] = 0; }); return o; };
  var o = { n: R.length, kejadian: 0, redflag: 0, inh: lv(), res: lv(), proses: {}, skema: {}, petaInh: {}, petaRes: {}, aksi: { Belum: 0, Proses: 0, Selesai: 0 } };
  R.forEach(function (r) {
    if (/^terjadi/i.test(r.kejadian)) o.kejadian++;
    if (/^ya/i.test(r.rfMuncul)) o.redflag++;
    if (o.inh[r.inh] !== undefined) o.inh[r.inh]++;
    var res = r.res || r.inh; if (o.res[res] !== undefined) o.res[res]++;
    var p = o.proses[r.proses] = o.proses[r.proses] || { inh: lv(), res: lv() };
    if (p.inh[r.inh] !== undefined) p.inh[r.inh]++; if (p.res[res] !== undefined) p.res[res]++;
    o.skema[r.skema] = (o.skema[r.skema] || 0) + 1;
    var ki = r.km + '|' + r.dm, kr = (r.kmR || r.km) + '|' + (r.dmR || r.dm);
    o.petaInh[ki] = (o.petaInh[ki] || 0) + 1; o.petaRes[kr] = (o.petaRes[kr] || 0) + 1;
  });
  (aksi || []).forEach(function (a) { var s = /selesai/i.test(a[7]) ? 'Selesai' : /proses/i.test(a[7]) ? 'Proses' : 'Belum'; o.aksi[s]++; });
  return o;
}

/* ======================================================================== */
/*  PERBAIKAN BERKELANJUTAN: ISI PIC & STATUS OTOMATIS, KOMENTAR EL2          */
/* ======================================================================== */
/* Aturan umum (berdasarkan kata kunci; hasilnya tetap perlu dicek tim):
   - OFI: pujian, netral, kosong, atau tidak berisi masukan.
   - Masukan untuk REN/ACD Pusdiklat -> Sudah Dilaporkan; masukan internal lain -> Belum Dimulai.
   - PIC dari isi komentar; bila tidak ada kata kunci, dari kategori butir (Ins/Dig -> JAR, Mat -> ACD, Sarpras -> PKU YAN).
   Hanya sel PIC/Status yang masih kosong yang diisi; isian manual tidak ditimpa. */
var KLAS_NETRAL_ = [/tidak ada gangguan/g, /tanpa gangguan/g, /(sangat )?perlu (untuk|bagi|dalam|diterapkan|dipelajari|dipahami|diketahui)/g, /(untuk|menjadi) lebih baik/g, /ke ?depan(nya)? akan/g,
  /(lebih|sangat) (paham|mengerti|semangat|termotivasi)/g, /(me)?nambah(kan)? (pengetahuan|ilmu|wawasan|semangat)/g, /tambah(an)? (pengetahuan|ilmu|wawasan|semangat|paham)/g,
  /tidak (membosankan|bosan|ngantuk|monoton)/g, /menghilangkan (ngantuk|bosan|kantuk)/g, /tidak (terlalu )?(sulit|susah)/g, /semoga (sukses|bermanfaat|berkah|lancar).*/g, /tidak (ada )?masalah/g,
  /tidak ada( kendala| masalah| saran| keluhan| komentar| hambatan)?/g, /tidak ada yang perlu/g, /sudah (sangat )?(baik|bagus|sesuai|cukup|memadai|nyaman|lancar|jelas|oke|ok)/g, /tidak (kurang|mengecewakan)/g, /tidak perlu/g, /tanpa kendala/g];
var KLAS_AKSI_ = /\b(kurang|perlu|sebaiknya|seharusnya|harusnya|mohon|tolong|harap|saran|disarankan|diharapkan|rusak|mati|lambat|lemot|lelet|terlambat|telat|kotor|bau|panas|gerah|dingin|bising|berisik|sempit|ditambah|tambah|diperbaiki|perbaiki|ditingkatkan|tingkatkan|belum|susah|sulit|error|eror|terganggu|koreksi|tersandung|putus|ngelag|lag|nge-lag|buram|tidak jelas|kurang jelas|kecil|terlalu|keluhan|bocor|kurangnya|minim|kekurangan|tidak berfungsi|tidak bisa|tidak dapat|tidak nyaman|tidak sesuai|tidak tersedia|tidak ada (wifi|air|ac|sinyal|internet|proyektor|toilet|tempat|fasilitas|alat|modul|materi)|jauh|antri|antre|repot|mepet|mendadak|padat|monoton|membosankan|bosan|ngantuk|capek|lelah|update|diupdate|diperbarui|diperbaharui|dibuat|disediakan|sediakan|dilengkapi|lengkapi|ganti|diganti|dibersihkan|lebih baik|akan lebih|alangkah|semoga ke ?depan|kedepannya|ke depannya|ke depan)\b/;
var KLAS_PIC_ = [
  ['PKU KEU', /\b(pembayaran|bayar|honor|uang saku|uang harian|reimburse|reimburs|klaim|transfer dana|transport(asi)? (diganti|dibayar))/],
  ['PBJ', /\b(kontrak|vendor|penyedia|pengadaan|lelang|tender)\b/],
  ['K3L KAM', /\b(k3|keselamatan|apd|safety|kebersihan|bersih|kotor|sampah|keamanan|satpam|security|aman|bahaya|rokok|asap|kebakaran|apar|banjir|lingkungan kerja)\b/],
  ['JAR MUTU', /((pengisian|isi|mengisi) (evaluasi|kuesioner|kuisioner|survei|survey)|kuesioner|kuisioner|\bsurvei|\bsurvey|form(ulir)? (evaluasi|penilaian)|link (evaluasi|survei|kuesioner)|sertifikat|(post|pre) ?-?test.{0,40}(tidak|error|eror|muncul|akses|nilai|update)|nilai.{0,30}(post|pre) ?-?test)/],
  ['JAR LAB', /\b(praktik|praktek|praktikum|lab|laboratorium|workshop|simulator|simulasi alat|alat peraga|alat praktik|alat praktek|peralatan praktik|peralatan praktek|alat uji|alat (pengujian|ukur)|pengujian|trafo|rele|relay|kubikel|gardu|tower|pdkb|scada|bengkel|mock ?up|trainer kit|panel)\b/],
  ['REN Pusdiklat', /\b(off-?line|on-?line|on line|off line|daring|luring|tatap muka|hybrid|blended|zoom only|kuota peserta|alokasi|anggaran|penugasan|metode pelaksanaan)\b/],
  ['ACD Pusdiklat', /\b(materi|modul|kurikulum|kursil|silabus|bahan ajar|studi kasus|kasus|soal|kuis|quiz|durasi|jp|jam pelajaran|waktu (pembelajaran|pelatihan)? ?(terlalu )?(singkat|kurang|pendek|sedikit)|hari (ditambah|kurang)|e-?book|referensi|template|contoh soal|ppt|slide|tools?)\b/],
  ['JAR', /\b(instruktur|pengajar|narasumber|widyaiswara|coach|fasilitator)\b/],
  ['PKU YAN', /\b(fasilitas|sarana|prasarana|sarpras|mess|wisma|kamar|asrama|penginapan|hotel|konsumsi|makan|makanan|snack|kopi|minum|coffee|catering|katering|ac|toilet|wc|kamar mandi|kursi|meja|ruang(an)?|proyektor|projector|lcd|layar|sound|speaker|mic|mikrofon|pencahayaan|lampu|parkir|wifi|wi-fi|wify|wifinya|internet|jaringan|sinyal|musholla|mushola|masjid|laundry|air)\b/],
  ['JAR', /\b(instruktur|pengajar|narasumber|widyaiswara|admin|panitia|pic|penyelenggara|jadwal|undangan|koordinasi|informasi|komunikasi|lms|zoom|teams|meet|platform|aplikasi|hxms|grup|group|absen|absensi)\b/]
];
var KLAS_DEF_ = { Ins: 'JAR', Mat: 'ACD Pusdiklat', Sarpras: 'PKU YAN', Dig: 'JAR' };
function klasNorm_(s) { return String(s === null || s === undefined ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
function klasPic_(t) { for (var i = 0; i < KLAS_PIC_.length; i++) if (KLAS_PIC_[i][1].test(t)) return KLAS_PIC_[i][0]; return null; }
function klasKomentar_(kom, kat) {
  var t = klasNorm_(kom);
  var triv = !t || /^([-.\s,0-9]*|ok|oke|okey|baik|bagus|mantap|mantab|cukup|puas|sangat (baik|bagus|puas|memuaskan|membantu|sesuai|setuju)|setuju|sesuai|good|nice|top|ya|tidak|tidak ada|nihil|none|no|aman|lancar|sudah|sip|siap|mantul|luar biasa|terima ?kasih.*|thanks.*)$/.test(t);
  var t2 = t; KLAS_NETRAL_.forEach(function (r) { t2 = t2.replace(r, ' '); });
  var aksi = !triv && KLAS_AKSI_.test(t2);
  var pre = String(kat || '').split('-')[0].split(' ')[0];
  if (!aksi && !triv && (pre === 'Dig' || pre === 'Sarpras' || /koneksi|jaringan|internet|audio|suara|sinyal/.test(t2)) && /\b(gangguan|kendala|masalah)\b/.test(t2)) aksi = true;
  var pic = klasPic_(aksi ? t2 : t) || KLAS_DEF_[pre] || 'JAR';
  var st = !aksi ? 'OFI' : (pic === 'REN Pusdiklat' || pic === 'ACD Pusdiklat') ? 'Sudah Dilaporkan' : 'Belum Dimulai';
  return { pic: pic, st: st, aksi: aksi };
}
/* Komentar EL2 (hambatan/dukungan) kebanyakan tentang kondisi di unit kerja peserta: hanya yang jelas
   menyangkut pembelajaran yang diarahkan ke PIC; sisanya OFI dengan PIC JAR MUTU (pemilik evaluasi). */
function klasEl2_(k, kat) {
  var kl = klasNorm_(k), r = klasKomentar_(k, kat), m = klasPic_(kl);
  var konteks = /diklat|pelatihan|pembelajaran|materi|modul|instruktur|pengajar|on-?line|off-?line|daring|luring|zoom|jadwal|kelas|udiklat|updl|e-?learning|lms|hxms|catalyst|sertifikat|praktik|praktek/.test(kl);
  var konteks2 = /udiklat|updl|diklat|pelatihan|pembelajaran|kelas|instruktur|pengajar|jadwal/.test(kl);
  var umum = /^(hambatan|kendala|dukungan)\b.{0,40}(mungkin|yang|lain)/.test(kl) && !/sebaiknya|saran|agar|mohon|harap|seharusnya|diharapkan|tolong/.test(kl);
  if (umum || !m || !konteks || (m !== 'ACD Pusdiklat' && m !== 'REN Pusdiklat' && !konteks2)) return { pic: 'JAR MUTU', st: 'OFI' };
  return r;
}
function kolomTl_(sh) {
  var h = judulKolom_(sh), c = function (n) { return h.indexOf(n); };
  return { h: h, kom: c('Komentar'), kat: c('Kategori Komentar'), sum: c('Sumber'), pic: c('PIC'), st: c('Status') };
}
/* Menu: isi PIC & Status yang masih kosong */
function isiPicStatus() { safeAlert_(isiPicStatus_().pesan); }
function isiPicStatus_() {
  var sh = tab_(TAB.TINDAKLANJUT), k = kolomTl_(sh), n = sh.getLastRow() - 1;
  if (k.kom < 0 || k.pic < 0 || k.st < 0) throw new Error('Kolom Komentar / PIC / Status tidak ditemukan di tab ' + TAB.TINDAKLANJUT + '.');
  if (n < 1) return { pesan: 'Tab ' + TAB.TINDAKLANJUT + ' masih kosong.' };
  var v = sh.getRange(2, 1, n, k.h.length).getValues(), pic = [], st = [], isi = 0, hit = {};
  v.forEach(function (r) {
    var p = teks_(r[k.pic]), s = teks_(r[k.st]);
    if (teks_(r[k.kom]) && (!p || !s)) {
      var x = /level 2/i.test(teks_(r[k.sum])) ? klasEl2_(r[k.kom], r[k.kat]) : klasKomentar_(r[k.kom], r[k.kat]);
      if (!p) p = x.pic; if (!s) { s = x.st; hit[s] = (hit[s] || 0) + 1; }
      isi++;
    }
    pic.push([p]); st.push([s]);
  });
  sh.getRange(2, k.pic + 1, n, 1).setValues(pic); sh.getRange(2, k.st + 1, n, 1).setValues(st);
  tandaiUbah_(TAB.TINDAKLANJUT);
  return { isi: isi, hit: hit, pesan: isi ? isi + ' baris diisi otomatis: ' + Object.keys(hit).map(function (s) { return s + ' ' + hit[s]; }).join(', ') + '.\n\nIsian manual tidak diubah. Periksa terutama yang berstatus Belum Dimulai; PIC dan Status bisa diganti langsung di tab atau lewat Input Data di website.' : 'Semua baris sudah punya PIC dan Status.' };
}
/* Menu: tambahkan komentar Hambatan & Dukungan dari tab Data - C&C EL2 (format per jadwal). Aman diulang: komentar yang sudah ada tidak ditambah lagi. */
function tambahKomentarEl2() { safeAlert_(tambahKomentarEl2_().pesan); }
function tambahKomentarEl2_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), C = bacaMentah_(ss, TAB.CC), h = C.head, c = function (n) { return kol_(h, n); };
  var cH = c('Komentar Hambatan Yg Ada Dan Penanganan'), cD = c('Komentar Dukungan Yg Diperlukan');
  if (cH < 0 && cD < 0) throw new Error('Kolom komentar hambatan/dukungan tidak ditemukan di tab ' + TAB.CC + '.');
  var sh = tab_(TAB.TINDAKLANJUT), k = kolomTl_(sh), H = k.h, ada = {};
  var cKd = H.indexOf('Kode Diklat'), cAng = H.indexOf('Angkatan'), cTs = H.indexOf('Tgl Selesai');
  var kunci = function (kode, ang, tgl, kat, kom) { return [teks_(kode), teks_(ang), isoTgl_(tgl), kat, klasNorm_(kom)].join('|'); };
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, H.length).getValues().forEach(function (r) {
    if (/level 2/i.test(teks_(r[k.sum]))) ada[kunci(r[cKd], r[cAng], r[cTs], teks_(r[k.kat]), r[k.kom])] = 1;
  });
  var TRIV = /^([-.\s,0-9#]*|ok|oke|baik|cukup|cukup baik|tidak ada|tdk ada|belum ada|ada|nihil|none|no|aman|lancar|sudah|sip|siap|mantap|bagus|setuju|ya|tidak|-+|na|n\/a|belum|tidak ada hambatan|tidak ada kendala|dukungan atasan|dukungan manajemen)$/;
  var UMUM = /^(adanya |perlu |butuh |diperlukan )?(dukungan|support|perhatian|komitmen|motivasi|bimbingan|arahan)( dan [a-z ]+)?( dari| oleh)? ?(atasan|manajemen|pimpinan|rekan( kerja)?|tim|semua pihak|unit)?[a-z ,&\/]*$/;
  var baru = [], hit = {};
  C.rows.forEach(function (r) {
    if (!teks_(r[c('Judul')])) return;
    [[cH, 'Hambatan'], [cD, 'Dukungan']].forEach(function (x) {
      if (x[0] < 0) return;
      String(r[x[0]] || '').split('#').forEach(function (kom) {
        kom = kom.replace(/\s+/g, ' ').replace(/^[\s\-.\t]+|[\s\-.\t]+$/g, '');
        var kl = kom.toLowerCase();
        if (kom.length < 12 || TRIV.test(kl) || kl.split(' ').length < 3) return;
        if (UMUM.test(kl) && kl.split(' ').length <= 6) return;
        var key = kunci(r[c('Kode Judul')], r[c('Angkatan')], r[c('Tgl Selesai')], x[1], kom);
        if (ada[key]) return; ada[key] = 1;
        var f = klasEl2_(kom, x[1]); hit[f.st] = (hit[f.st] || 0) + 1;
        var row = H.map(function () { return ''; }), set = function (n, v) { var i = H.indexOf(n); if (i >= 0) row[i] = v; };
        set('Tgl Mulai', r[c('Tgl Mulai')]); set('Tgl Selesai', r[c('Tgl Selesai')]); set('Kode Diklat', r[c('Kode Judul')]); set('Judul Diklat', r[c('Judul')]);
        set('Jenis Permintaan Diklat', r[c('Jenis Permintaan Diklat')]); set('Angkatan', r[c('Angkatan')]); set('UPDL Code', r[c('UPDL Code')]); set('UPDL', r[c('UPDL')]);
        set('Jenis Penyelenggaraan', r[c('Jenis Penyelenggaraan')]); set('Komentar', kom); set('Kategori Komentar', x[1]); set('Sumber', 'Evaluasi Level 2'); set('PIC', f.pic); set('Status', f.st);
        baru.push(row);
      });
    });
  });
  if (baru.length) { sh.getRange(barisBaru_(sh), 1, baru.length, H.length).setValues(baru); tandaiUbah_(TAB.TINDAKLANJUT); }
  return { n: baru.length, hit: hit, pesan: baru.length ? baru.length + ' komentar EL2 ditambahkan ke tab ' + TAB.TINDAKLANJUT + ' (' + Object.keys(hit).map(function (s) { return s + ' ' + hit[s]; }).join(', ') + ').' : 'Tidak ada komentar EL2 baru untuk ditambahkan.' };
}
