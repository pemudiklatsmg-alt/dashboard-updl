/* Pelengkap laporan (Cetak/PDF dan Excel): narasi analisis singkat, tanggal laporan, dan kolom tanda tangan
   (Manajer UPDL, Asman Penyelenggaraan Pembelajaran, TL EPMK). Nama & NIP diambil dari tab Data - Pegawai. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var TTD = [
    { k: 'tl', label: 'TL EPMK', peran: 'Disusun oleh', cari: /^TL EVALUASI DAN PENGENDALIAN MUTU/i },
    { k: 'asman', label: 'Asman Penyelenggaraan Pembelajaran', peran: 'Diperiksa oleh', cari: /^ASMAN PENYELENGGARAAN PEMBELAJARAN/i },
    { k: 'mgr', label: 'Manajer UPDL Semarang', peran: 'Disetujui oleh', cari: /^MANAGER/i }
  ];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function isoHariIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var opsi = { narasi: true, tgl: isoHariIni(), ttd: [] };
  try { var simpan = JSON.parse(localStorage.getItem('updl_lap') || 'null'); if (simpan) { opsi.narasi = simpan.narasi !== false; opsi.ttd = simpan.ttd || []; } } catch (e) { /* abaikan */ }

  function tglPanjang(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : ''; }
  function judulNama(t) { return A().judulNama ? A().judulNama(t) : t; }
  function penandatangan(k) {
    var T = TTD.filter(function (x) { return x.k === k; })[0], O = A().S.data && A().S.data.org;
    var p = T && O ? (O.pegawai || []).filter(function (r) { return T.cari.test(String(r[1] || '')); })[0] : null;
    return { k: k, peran: T ? T.peran : '', jab: T ? T.label : '', nama: p ? judulNama(p[0]) : '', nip: p ? p[4] || '' : '' };
  }
  /* pilihan di jendela Cetak / Export */
  function opsiHtml(pre) {
    return '<fieldset class="lap-op"><legend>Pelengkap laporan</legend>' +
      '<label class="lap-cek"><input type="checkbox" data-lap="narasi"' + (opsi.narasi ? ' checked' : '') + '><span><b>Narasi analisis singkat</b><small>Ringkasan capaian, hal yang perlu perhatian, dan tindak lanjut, disusun otomatis dari data.</small></span></label>' +
      '<label class="lap-tgl">Tanggal laporan<input type="date" data-lap="tgl" value="' + esc(opsi.tgl) + '"></label>' +
      '<div class="lap-ttd"><span>Kolom tanda tangan (opsional)</span>' + TTD.map(function (t) {
        var p = penandatangan(t.k);
        return '<label><input type="checkbox" data-lap="ttd" value="' + t.k + '"' + (opsi.ttd.indexOf(t.k) >= 0 ? ' checked' : '') + '><span><b>' + esc(t.label) + '</b><small>' + esc(p.nama || 'nama dari Data - Pegawai') + '</small></span></label>';
      }).join('') + '</div></fieldset>';
  }
  function baca(root) {
    if (!root) return opsi;
    var n = root.querySelector('[data-lap="narasi"]'), t = root.querySelector('[data-lap="tgl"]');
    if (n) opsi.narasi = n.checked;
    if (t && t.value) opsi.tgl = t.value;
    var c = root.querySelectorAll('[data-lap="ttd"]');
    if (c.length) opsi.ttd = Array.prototype.filter.call(c, function (x) { return x.checked; }).map(function (x) { return x.value; });
    try { localStorage.setItem('updl_lap', JSON.stringify({ narasi: opsi.narasi, ttd: opsi.ttd })); } catch (e) { /* abaikan */ }
    return opsi;
  }
  function teks(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); }

  /* Narasi: 3 paragraf pendek (capaian · pembelajaran & evaluasi · perhatian & tindak lanjut) */
  function narasi() {
    var a = A(), S = a.S, Bn = a.B(), bl = a.namaBulan(S.bulan) + ' ' + S.tahun, out = [];
    var adaK = a.konmanAda(Bn), skor = adaK ? a.totalSkor(Bn) : null, Bp = S.bulan > 1 ? D.BULAN[S.bulan - 2] : null;
    var skorL = Bp && a.konmanAda(Bp) ? a.totalSkor(Bp) : null;
    if (skor !== null) {
      var ind = a.K().items.filter(function (it) { return !it.isGroup && !it.pengurang && D.hasData(it, Bn); });
      var cap = ind.map(function (it) { return { it: it, v: D.capaianItem(it, Bn) }; }).filter(function (x) { return x.v !== null && x.v !== undefined; });
      var ok = cap.filter(function (x) { return x.v >= 0.9999; }).length, low = cap.filter(function (x) { return x.v < 0.9999; }).sort(function (x, y) { return x.v - y.v; });
      var s1 = 'Capaian kinerja UPDL Semarang ' + bl + ' tercatat ' + D.fmt(skor, 2) + ' (skor Kontrak Manajemen setelah pengurang kepatuhan)';
      if (skorL !== null) { var d = skor - skorL; s1 += Math.abs(d) < 0.005 ? ', sama dengan bulan sebelumnya' : ', ' + (d > 0 ? 'naik ' : 'turun ') + D.fmt(Math.abs(d), 2) + ' poin dari bulan sebelumnya'; }
      s1 += '. Sebanyak ' + ok + ' dari ' + cap.length + ' indikator telah mencapai target';
      if (low.length) s1 += '; capaian terendah ada pada ' + low.slice(0, 2).map(function (x) { return x.it.pendek + ' (' + D.fmt(x.v * 100, 1) + '%)'; }).join(' dan ');
      var pg = a.pengurang(Bn); if (pg) s1 += '. Pengurang kepatuhan bulan ini −' + D.fmt(pg, 2) + ' poin';
      out.push(s1 + '.');
    } else out.push('Realisasi Kontrak Manajemen ' + bl + ' belum diisi, sehingga capaian kinerja bulan ini belum dapat dihitung.');
    var r = D.hitungRendiklat(a.kelas(), S.tahun, S.bulan, a.set()), H = a.hop(S.tahun, S.bulan), itH = a.find(/Tingkat Pelaksanaan Pembelajaran/i), tH = itH && adaK ? D.num(itH.target[Bn].v) : null;
    var s2 = 'Sampai ' + a.namaBulan(S.bulan) + ', ' + D.fmt(r.kelas, 0) + ' kelas telah selesai dilaksanakan' + (r.terjadwal ? ' dari ' + D.fmt(r.terjadwal, 0) + ' kelas terjadwal (' + D.pct(r.kelas / r.terjadwal) + ')' : '') + ' dengan ' + D.fmt(r.peserta, 0) + ' peserta';
    if (H.nilai !== null) s2 += '. Hari Orang Pelatihan mencapai ' + D.fmt(H.nilai, 3) + (tH ? ' atau ' + D.pct(H.nilai / tH) + ' dari target ' + D.fmt(tH, 3) : '');
    var Kp = a.ev('kepuasan'), In = a.ev('instruktur');
    if (Kp || In) s2 += '. Hasil Evaluasi Level 1: ' + [Kp ? 'kepuasan peserta ' + D.fmt(Kp.nilai, 2) + ' dari 5' : '', In ? 'penilaian instruktur ' + D.fmt(In.nilai, 2) + ' dari 5' : ''].filter(Boolean).join(' dan ');
    out.push(s2 + '.');
    var P = (a.perhatian ? a.perhatian() : []).filter(function (x) { return !/belum diisi/i.test(teks(x.t)); }).slice(0, 3);
    if (P.length) out.push('Hal yang perlu ditindaklanjuti: ' + P.map(function (x, i) { return (i + 1) + ') ' + teks(x.t).replace(/\.$/, ''); }).join('; ') + '. Tindak lanjut dikoordinasikan oleh PIC terkait dan dipantau pada rapat kinerja bulan berikutnya.');
    else out.push('Tidak ada hal mendesak yang perlu ditindaklanjuti bulan ini. Kinerja dipertahankan dan dipantau pada rapat kinerja bulan berikutnya.');
    return out;
  }
  function narasiHtml() {
    return '<div class="lap-nar"><h4>Analisis singkat</h4>' + narasi().map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';
  }
  function ttdHtml() {
    if (!opsi.ttd.length) return '';
    var L = TTD.filter(function (t) { return opsi.ttd.indexOf(t.k) >= 0; }).map(function (t) { return penandatangan(t.k); });
    return '<div class="lap-ttdblok" style="--n:' + L.length + '"><div class="lap-tempat">Semarang, ' + esc(tglPanjang(opsi.tgl)) + '</div><div class="lap-kol">' + L.map(function (p) {
      return '<div class="lap-k"><span>' + esc(p.peran) + ',</span><b>' + esc(p.jab) + '</b><i class="lap-ruang"></i><u>' + esc(p.nama || '(nama)') + '</u>' + (p.nip ? '<small>NIP ' + esc(p.nip) + '</small>' : '') + '</div>';
    }).join('') + '</div></div>';
  }
  window.DashLap = { opsi: function () { return opsi; }, opsiHtml: opsiHtml, baca: baca, narasi: narasi, narasiHtml: narasiHtml, ttdHtml: ttdHtml, penandatangan: penandatangan, tglPanjang: tglPanjang, TTD: TTD };
})();
