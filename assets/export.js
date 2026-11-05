/* Export laporan ke Excel (.xlsx). Periode = Tahun & Bulan di header. Pustaka SheetJS dimuat saat dibutuhkan. */
(function () {
  var D = window.Dash, A = function () { return window.DashApp; }, $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var PILIHAN = [
    ['ringkasan', 'Ringkasan', 'Capaian, peserta, kelas, HOP, evaluasi, maturity', 1],
    ['indikator', 'Indikator Kinerja', 'Target, realisasi, pencapaian, skor', 1],
    ['bulanan', 'Capaian per Bulan', 'Total skor Konman tiap bulan', 1],
    ['kepatuhan', 'Kepatuhan', 'Nilai pengurang per aspek', 1],
    ['evaluasi', 'Evaluasi (L1–L4, ROTI, Sertifikat)', 'Satu sheet per jenis evaluasi', 1],
    ['hop', 'HOP per Bulan', 'Orang-hari, pegawai, HOP, target', 1],
    ['kelas', 'Daftar Kelas', 'Kelas Selesai beserta peserta dan hari kerja', 0],
    ['maturity', 'Maturity Level', 'Skor SA dan verifikasi per key element', 1],
    ['risiko', 'Peta Risiko', 'Daftar risiko dan tingkatnya', 1],
    ['tl', 'Tindak Lanjut Evaluasi', 'Temuan, PIC, status', 1]
  ];
  $('expChk').innerHTML = PILIHAN.map(function (p) { return '<label><input type="checkbox" value="' + p[0] + '"' + (p[3] ? ' checked' : '') + '><span>' + esc(p[1]) + '<small>' + esc(p[2]) + '</small></span></label>'; }).join('');

  function namaFile() { var S = A().S; return 'Laporan Dashboard UPDL Semarang - ' + A().namaBulan(S.bulan) + ' ' + S.tahun + '.xlsx'; }
  function bukaExport() {
    if (!A() || !A().S.data) { A() && A().toast('Data dashboard belum termuat.'); return; }
    $('expName').textContent = namaFile(); $('expErr').hidden = true;
    ['loginModal', 'inputModal'].forEach(function (m) { $(m).hidden = true; });
    $('exportModal').hidden = false; $('expGo').focus();
  }
  function tutup() { $('exportModal').hidden = true; $('exportBtn').focus(); }
  $('exportBtn').addEventListener('click', bukaExport);
  document.addEventListener('click', function (e) { if (e.target.closest && (e.target.closest('#exportModal [data-tutup]') || e.target === $('exportModal'))) tutup(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('exportModal').hidden) tutup(); });
  document.addEventListener('dash:periode', function () { $('expName').textContent = A() && A().S.data ? namaFile() : ''; });

  var libP = null;
  function muatLib() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (libP) return libP;
    libP = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = LIB; s.onload = function () { ok(window.XLSX); }; s.onerror = function () { libP = null; no(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet lalu coba lagi.')); }; document.head.appendChild(s); });
    return libP;
  }

  $('expGo').addEventListener('click', function () {
    var dipilih = Array.prototype.filter.call($('expChk').querySelectorAll('input'), function (i) { return i.checked; }).map(function (i) { return i.value; });
    if (!dipilih.length) { $('expErr').hidden = false; $('expErr').textContent = 'Pilih minimal satu isi laporan.'; return; }
    var b = this; b.disabled = true; b.textContent = 'Menyiapkan…'; $('expErr').hidden = true;
    muatLib().then(function (X) {
      var wb = X.utils.book_new();
      dipilih.forEach(function (k) { BUAT[k]().forEach(function (sh) { tambah(X, wb, sh.nama, sh.rows, sh.lebar); }); });
      X.writeFile(wb, namaFile(), { compression: true });
      tutup(); A().toast('Laporan Excel diunduh: ' + namaFile());
    }).catch(function (er) { $('expErr').hidden = false; $('expErr').textContent = er.message || String(er); })
      .then(function () { b.disabled = false; b.textContent = '⬇ Unduh Excel'; });
  });

  function tambah(X, wb, nama, rows, lebar) {
    var ws = X.utils.aoa_to_sheet(rows);
    var cols = (lebar || []).map(function (w) { return { wch: w }; });
    if (!cols.length && rows.length) { var n = Math.max.apply(null, rows.map(function (r) { return r.length; })); for (var i = 0; i < n; i++) cols.push({ wch: Math.min(60, Math.max(10, Math.max.apply(null, rows.map(function (r) { return String(r[i] === undefined || r[i] === null ? '' : r[i]).length; })) + 2)) }); }
    ws['!cols'] = cols;
    X.utils.book_append_sheet(wb, ws, nama.slice(0, 31));
  }

  /* ---------- isi tiap sheet ---------- */
  function judul(t) { var S = A().S; return [[t], ['UPDL Semarang · periode ' + A().namaBulan(S.bulan) + ' ' + S.tahun + ' · diunduh ' + new Date().toLocaleString('id-ID')], []]; }
  function n(v) { return v === null || v === undefined || !isFinite(v) ? '' : Math.round(v * 10000) / 10000; }
  function tglTeks(v) { var t = D.tgl(v); return t ? ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + '/' + t.getFullYear() : String(v || ''); }
  function rekap(key, kolTgl) { var S = A().S; return D.rekapSampai(S.data[key], kolTgl, S.tahun, S.bulan); }

  var BUAT = {
    ringkasan: function () {
      var a = A(), S = a.S, Bn = a.B(), set = a.set(), r = D.hitungRendiklat(a.kelas(), S.tahun, S.bulan, set), H = a.hop(S.tahun, S.bulan);
      var itH = a.find(/Tingkat Pelaksanaan Pembelajaran/i), tH = itH && a.konmanAda(Bn) ? D.num(itH.target[Bn].v) : null;
      var tot = a.konmanAda(Bn) ? a.totalSkor(Bn) : null;
      var L1 = D.rataTertimbang(rekap('l1', 'Tanggal Selesai'), 'Nilai Kepuasan (1-5)', 'Jumlah Responden');
      var KSA = D.rataTertimbang(rekap('l2', 'Tanggal Selesai'), 'KSA Formatif (0-100)', 'Jumlah Peserta');
      var CC = D.rataTertimbang(rekap('l2', 'Tanggal Selesai'), 'C&C Sumatif (1-4)', 'Jumlah Peserta');
      var L3 = D.rataTertimbang(rekap('l3', 'Tanggal Evaluasi'), 'Skor (0-100)'), L4 = D.rataTertimbang(rekap('l4', 'Tanggal Evaluasi'), 'Skor (0-100)');
      var RO = D.rataTertimbang(rekap('roti', 'Tanggal'), 'Nilai ROTI (%)');
      var lul = 0, ter = 0; rekap('sertifikat', 'Tanggal').forEach(function (x) { var l = D.num(x['Peserta Lulus']); if (l) { lul += l; ter += D.num(x['Sertifikat Terbit']) || 0; } });
      var M = (S.data.maturity || []), mv = M.map(function (x) { var v = D.num(x[3]); return v !== null ? v : D.num(x[2]); }), mAvg = mv.length ? mv.reduce(function (s, v) { return s + (v || 0); }, 0) / mv.length : null;
      var TL = a.tlRows(), sel = TL.filter(function (x) { return a.tlStatus(x) === 'Selesai'; }).length;
      return [{ nama: 'Ringkasan', lebar: [38, 18, 16, 50], rows: judul('Ringkasan Dashboard Kinerja').concat([
        ['Ukuran', 'Nilai', 'Target', 'Catatan'],
        ['Capaian Kinerja (skor Konman, %)', n(tot), 100, a.konmanAda(Bn) ? 'Setelah pengurang kepatuhan ' + n(a.pengurang(Bn)) : 'Tidak ada data Konman bulan ini'],
        ['Total Peserta', r.peserta, '', r.pakaiRencana ? r.pakaiRencana + ' kelas memakai rencana peserta (perkiraan)' : ''],
        ['Total Kelas (Selesai)', r.kelas, r.terjadwal, 'Target = kelas terjadwal s.d. bulan ini'],
        ['Hari Orang Pelatihan (HOP)', n(H.nilai), n(tH), 'Pegawai: ' + (H.pegawai === null ? 'belum diisi' : H.pegawai) + (H.disesuaikan ? ' · ada penyesuaian' : '')],
        ['Kepuasan Peserta L1 (1–5)', n(L1 && L1.nilai), n(set.targetL1), L1 ? L1.n + ' pelatihan' : 'Belum diisi'],
        ['Peningkatan KSA L2 (0–100)', n(KSA && KSA.nilai), n(set.targetKSA), KSA ? KSA.n + ' pelatihan' : 'Belum diisi'],
        ['Confidence & Commitment L2 (1–4)', n(CC && CC.nilai), n(set.targetCC), CC ? CC.n + ' pelatihan' : 'Belum diisi'],
        ['Dampak Perilaku L3 (0–100)', n(L3 && L3.nilai), '', L3 ? L3.n + ' data' : 'Belum diisi'],
        ['Dampak Kinerja L4 (0–100)', n(L4 && L4.nilai), '', L4 ? L4.n + ' data' : 'Belum diisi'],
        ['ROTI (%)', n(RO && RO.nilai), '', RO ? RO.n + ' data' : 'Belum diisi'],
        ['Sertifikat Terbit (%)', lul ? n(ter / lul * 100) : '', n(set.targetSertifikat), lul ? ter + ' dari ' + lul + ' peserta lulus' : 'Belum diisi'],
        ['Maturity Level Proses Bisnis (0–5)', n(mAvg), '', M.length + ' key element (sheet SMG)'],
        ['Tindak Lanjut Selesai (%)', TL.length ? n(sel / TL.length * 100) : '', '', sel + ' dari ' + TL.length + ' temuan']
      ]) }];
    },
    indikator: function () {
      var a = A(), Bn = a.B(), rows = [['No', 'Indikator', 'PIC', 'Satuan', 'Target', 'Realisasi', 'Pencapaian (%)', 'Skor', 'Keterangan']];
      if (a.konmanAda(Bn)) a.K().items.forEach(function (it) {
        if (it.isGroup || it.pengurang) return;
        var has = D.hasData(it, Bn), v = has ? D.capaianItem(it, Bn) : null;
        rows.push([a.labelNo(it), it.nama, it.pic, it.satuan, it.target[Bn].d || '', has ? it.real[Bn].d : '', n(v === null ? null : v * 100), n(it.skor[Bn]), String(it.ket[Bn] || '')]);
      });
      return [{ nama: 'Indikator Kinerja', lebar: [6, 50, 10, 16, 12, 12, 14, 10, 50], rows: judul('Indikator Kinerja (Konman)').concat(rows) }];
    },
    bulanan: function () {
      var a = A(), rows = [['Bulan', 'Total Skor', 'Pengurang Kepatuhan']];
      a.K().months.forEach(function (Bn) { rows.push([D.cap(Bn), n(a.totalSkor(Bn)), n(a.pengurang(Bn))]); });
      return [{ nama: 'Capaian per Bulan', lebar: [14, 14, 22], rows: judul('Capaian Kinerja per Bulan').concat(rows) }];
    },
    kepatuhan: function () {
      var a = A(), Bn = a.B(), rows = [['Aspek Kepatuhan', 'Maks Pengurang', 'Nilai ' + D.cap(Bn), 'Status', 'Keterangan']];
      a.kepRows().forEach(function (r) { var v = a.kepVal(r, Bn); rows.push([r['Aspek Kepatuhan'], D.num(r['Maks Pengurang']), n(v), v === null ? 'Belum diisi' : v === 0 ? 'Patuh' : 'Ada pengurang', r['Keterangan'] || '']); });
      return [{ nama: 'Kepatuhan', lebar: [55, 16, 14, 14, 40], rows: judul('Kepatuhan').concat(rows) }];
    },
    evaluasi: function () {
      var S = A().S, out = [];
      [['l1', 'L1 Kepuasan', 'Tanggal Selesai'], ['l2', 'L2 KSA & CC', 'Tanggal Selesai'], ['l3', 'L3 Perilaku', 'Tanggal Evaluasi'], ['l4', 'L4 Kinerja', 'Tanggal Evaluasi'], ['roti', 'ROTI', 'Tanggal'], ['sertifikat', 'Sertifikat', 'Tanggal']].forEach(function (c) {
        var head = ((S.data[c[0]] || [])[0] || []).map(String), rows = rekap(c[0], c[2]);
        out.push({ nama: c[1], rows: judul('Rekap ' + c[1] + ' (s.d. bulan terpilih)').concat([head]).concat(rows.map(function (r) { return head.map(function (h) { var v = r[h]; return h === c[2] ? tglTeks(v) : (typeof v === 'number' ? n(v) : v); }); })) });
      });
      return out;
    },
    hop: function () {
      var a = A(), S = a.S, itH = a.find(/Tingkat Pelaksanaan Pembelajaran/i), rows = [['Bulan', 'Orang-hari Rendiklat', 'Penyesuaian', 'Jumlah Pegawai', 'HOP', 'Target Konman', 'Realisasi Konman']];
      for (var m = 1; m <= S.bulan; m++) {
        var h = a.hop(S.tahun, m), Bn = D.BULAN[m - 1];
        rows.push([a.namaBulan(m), n(h.orangHariAsli), n(h.adj.tambah), n(h.pegawai), n(h.nilai), itH && a.konmanAda(Bn) ? n(D.num(itH.target[Bn].v)) : '', itH && a.konmanAda(Bn) && D.hasData(itH, Bn) ? n(D.num(itH.real[Bn].v)) : '']);
      }
      return [{ nama: 'HOP per Bulan', lebar: [12, 20, 14, 16, 10, 14, 16], rows: judul('Hari Orang Pelatihan per Bulan').concat(rows) }];
    },
    kelas: function () {
      var a = A(), S = a.S, r = D.hitungRendiklat(a.kelas(), S.tahun, S.bulan, a.set()), rows = [['ID REN', 'Judul', 'Metode', 'Mulai', 'Selesai', 'Peserta', 'Sumber Angka Peserta', 'Hari Kerja', 'Dihitung di HOP']];
      r.daftar.slice().sort(function (x, y) { return x.k.selesai - y.k.selesai; }).forEach(function (x) { rows.push([String(x.k.id || '').replace(/^'/, ''), x.k.judul, x.k.metode, tglTeks(x.k.mulai), tglTeks(x.k.selesai), x.peserta, x.sumber, x.hari, x.ikut ? 'Ya' : 'Tidak']); });
      return [{ nama: 'Daftar Kelas', lebar: [30, 60, 8, 12, 12, 10, 20, 11, 15], rows: judul('Daftar Kelas Selesai (Rendiklat)').concat(rows) }];
    },
    maturity: function () {
      var a = A(), Bn = a.B(), it = a.find(/Pengelolaan Proses Bisnis/i), tg = it && a.konmanAda(Bn) ? D.num(it.target[Bn].v) : null;
      var rows = [['No', 'Key Element', 'Level SA', 'Level Verifikasi', 'Target Konman']];
      (a.S.data.maturity || []).forEach(function (x) { rows.push([x[0], x[1], n(D.num(x[2])), n(D.num(x[3])), n(tg)]); });
      return [{ nama: 'Maturity Level', lebar: [8, 60, 10, 16, 14], rows: judul('Maturity Level Proses Bisnis (sheet SMG)').concat(rows) }];
    },
    risiko: function () {
      var R = (A().S.data.risiko && A().S.data.risiko.rows) || [['No', 'ID Risk', 'Deskripsi Risiko', 'Inheren', 'Residual', 'Target']];
      return [{ nama: 'Peta Risiko', lebar: [6, 18, 70, 18, 18, 18], rows: judul('Peta Risiko (Profil Risiko)').concat(R) }];
    },
    tl: function () {
      var a = A(), rows = [['No', 'Tanggal', 'Temuan / Masukan', 'Sumber', 'PIC', 'Status', 'Target Selesai', 'Keterangan']];
      a.tlRows().forEach(function (r) { rows.push([r['No'], tglTeks(r['Tanggal']), r['Temuan / Masukan'], r['Sumber'], r['PIC'], a.tlStatus(r), tglTeks(r['Target Selesai']), r['Keterangan']]); });
      return [{ nama: 'Tindak Lanjut', lebar: [6, 12, 60, 18, 14, 14, 14, 40], rows: judul('Tindak Lanjut Evaluasi').concat(rows) }];
    }
  };
})();
