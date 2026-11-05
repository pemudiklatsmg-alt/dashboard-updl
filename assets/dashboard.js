(function () {
  var D = window.Dash, $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var S = { data: null, tahun: null, bulan: null, mlMode: 'ver', mlKlausul: 'Semua', riskView: null, riskOn: null };
  var DEFAULT_LINKS = { data: 'https://docs.google.com/spreadsheets/d/1HQ1pwmlDMaITmeioEMxauu75SRYpOkuDYxBrn7yAEtg/edit' };
  var KLAUSUL = { 1: 'Konteks Organisasi', 2: 'Kepemimpinan', 3: 'Perencanaan', 4: 'Dukungan', 5: 'Operasi', 6: 'Evaluasi', 7: 'Peningkatan' };

  /* ---------- helpers ---------- */
  function B() { return D.BULAN[S.bulan - 1]; }                 // 'OKTOBER'
  function namaBulan(m) { return D.cap(D.BULAN[m - 1]); }
  function status(v) {
    if (v === null || v === undefined) return { c: 'idle', t: 'Belum ada data' };
    if (v >= 1.0001) return { c: 'good', t: 'Melebihi Target' };
    if (v >= 0.9999) return { c: 'good', t: 'Mencapai Target' };
    if (v >= 0.95) return { c: 'warn', t: 'Hampir Tercapai' };
    return { c: 'bad', t: 'Di Bawah Target' };
  }
  function cv(c) { return 'var(--' + c + ')'; }
  function set() { return (S.data.meta && S.data.meta.pengaturan) || { tanpaRealisasi: 'PAKAI RENCANA PESERTA', hitungHariSebelumTahun: true, kecualikanSL: false }; }
  function sheetLink(label, tab) {
    var url = (S.data.meta.links && S.data.meta.links.data) || DEFAULT_LINKS.data;
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' + (tab ? ' (tab <b>' + esc(tab) + '</b>)' : '');
  }
  function tag(t, c) { return ' <span class="tag ' + (c || '') + '">' + t + '</span>'; }

  /* ---------- data per tahun ---------- */
  function K() { return S.cache.konman[S.tahun] || { months: [], items: [] }; }
  function kelas() { return S.cache.kelas[S.tahun] || []; }
  function find(re) { return K().items.filter(function (i) { return re.test(i.namaAsli) || re.test(i.pendek); })[0]; }
  function konmanAda(Bn) { return K().months.indexOf(Bn) >= 0; }

  function kepRows() {
    return D.rows(S.data.kepatuhan).filter(function (x) { return String(x['Aspek Kepatuhan'] || '').trim() && String(x['Tahun'] || S.tahun).trim() === String(S.tahun); });
  }
  function kepVal(row, Bn) {
    var key = Object.keys(row).filter(function (k) { return k.trim().toUpperCase() === Bn; })[0];
    return key ? D.num(row[key]) : null;
  }
  function pengurang(Bn) {
    var tot = 0; kepRows().forEach(function (x) { var n = kepVal(x, Bn); if (n !== null) tot += Math.abs(n); }); return tot;
  }
  function totalSkor(Bn) {
    var s = 0, any = false;
    K().items.forEach(function (it) {
      if (it.isGroup || it.pengurang) return;
      if (D.hasData(it, Bn)) any = true;
      if (it.skor[Bn] !== null && it.skor[Bn] !== undefined) s += it.skor[Bn];
    });
    return any ? s - pengurang(Bn) : null;
  }
  function pegawai(y, m) {
    var r = D.rows(S.data.pegawai).filter(function (x) { return String(x['Tahun']).trim() === String(y) && String(x['Bulan']).trim().toUpperCase() === D.BULAN[m - 1]; })[0];
    return r ? D.num(r['Jumlah Pegawai']) : null;
  }
  function penyesuaian(y, m) {
    var tambah = 0, timpa = null, alasan = [];
    D.rows(S.data.penyesuaian).forEach(function (r) {
      if (String(r['Tahun']).trim() !== String(y)) return;
      var bm = D.BULAN.indexOf(String(r['Bulan']).trim().toUpperCase()) + 1; if (!bm) return;
      var t = D.num(r['Penyesuaian Orang-Hari (+/-)']), f = D.num(r['HOP Final (timpa)']);
      if (t !== null && bm <= m) { tambah += t; if (r['Alasan']) alasan.push(namaBulan(bm) + ': ' + r['Alasan']); }
      if (f !== null && bm === m) { timpa = f; if (r['Alasan']) alasan.push(namaBulan(bm) + ' (timpa): ' + r['Alasan']); }
    });
    return { tambah: tambah, timpa: timpa, alasan: alasan };
  }
  function hop(y, m) {
    var o = D.hitungRendiklat(kelas(), y, m, set());
    var adj = penyesuaian(y, m), peg = pegawai(y, m);
    var oh = o.orangHari + adj.tambah;
    var v = adj.timpa !== null ? adj.timpa : (peg ? oh / peg : null);
    return { nilai: v, orangHariAsli: o.orangHari, orangHari: oh, pegawai: peg, adj: adj, r: o, disesuaikan: adj.timpa !== null || adj.tambah !== 0 };
  }

  /* ---------- KPI cards ---------- */
  function gauge(v) {
    var max = 1.2, f = Math.max(0, Math.min(v || 0, max)) / max, R = 70, cx = 85, cy = 82;
    function pt(t, r) { var a = Math.PI * (1 - t); return [cx + (r || R) * Math.cos(a), cy - (r || R) * Math.sin(a)]; }
    var e = pt(f), t1 = pt(1 / max), t2 = pt(1 / max, R + 9), st = status(v);
    return '<svg class="gauge" viewBox="0 0 170 96" role="img" aria-label="Capaian ' + D.pct(v) + '">' +
      '<path d="M15 82 A70 70 0 0 1 155 82" fill="none" stroke="var(--track)" stroke-width="12" stroke-linecap="round"/>' +
      (v ? '<path d="M15 82 A70 70 0 0 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + '" fill="none" stroke="' + cv(st.c) + '" stroke-width="12" stroke-linecap="round"/>' : '') +
      '<line x1="' + t1[0].toFixed(1) + '" y1="' + t1[1].toFixed(1) + '" x2="' + t2[0].toFixed(1) + '" y2="' + t2[1].toFixed(1) + '" stroke="var(--ink)" stroke-width="2"/>' +
      '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-family="var(--f-display)" font-weight="700" font-size="24" fill="var(--ink)">' + (v === null ? '–' : D.fmt(v * 100, 1) + '%') + '</text></svg>';
  }
  /* Lingkaran progres: f = 0..1 (null = tanpa data) */
  function ring(f, c, txt, label) {
    var R = 26, C = 2 * Math.PI * R, v = f === null || f === undefined || !isFinite(f) ? null : Math.max(0, Math.min(1, f));
    return '<svg class="ring" viewBox="0 0 64 64" role="img" aria-label="' + esc(label || txt) + '">' +
      '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="var(--track)" stroke-width="7"/>' +
      (v ? '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + cv(c) + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (C * v).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(-90 32 32)"/>' : '') +
      '<text x="32" y="36" text-anchor="middle" class="ring-t">' + esc(txt) + '</text></svg>';
  }
  /* Donat beberapa segmen: seg = [{n, c, t}] */
  function donut(seg, txt, sub) {
    var R = 26, C = 2 * Math.PI * R, tot = seg.reduce(function (a, x) { return a + x.n; }, 0), off = 0, gap = seg.filter(function (x) { return x.n; }).length > 1 ? 1.6 : 0;
    var h = '<svg class="ring donut" viewBox="0 0 64 64" role="img" aria-label="' + esc(seg.map(function (x) { return x.t + ' ' + x.n; }).join(', ')) + '">' +
      '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="var(--track)" stroke-width="8"/>';
    if (tot) seg.forEach(function (x) {
      if (!x.n) return; var len = C * x.n / tot;
      h += '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + cv(x.c) + '" stroke-width="8" stroke-dasharray="' + Math.max(len - gap, 0.6).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 32 32)"><title>' + esc(x.t) + ': ' + x.n + '</title></circle>';
      off += len;
    });
    return h + '<text x="32" y="' + (sub ? 34 : 36.5) + '" text-anchor="middle" class="ring-t big">' + esc(txt) + '</text>' + (sub ? '<text x="32" y="43" text-anchor="middle" class="ring-s">' + esc(sub) + '</text>' : '') + '</svg>';
  }
  /* Setengah lingkaran kecil: f dan tick = 0..1 */
  function semi(f, tick, txt, c, label) {
    var R = 44, cx = 56, cy = 52;
    function pt(t) { var a = Math.PI * (1 - t); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; }
    var v = f === null || !isFinite(f) ? null : Math.max(0, Math.min(1, f)), e = v ? pt(v) : null;
    var h = '<svg class="semi" viewBox="0 0 112 62" role="img" aria-label="' + esc(label || txt) + '">' +
      '<path d="M12 52 A44 44 0 0 1 100 52" fill="none" stroke="var(--track)" stroke-width="9" stroke-linecap="round"/>' +
      (v ? '<path d="M12 52 A44 44 0 0 1 ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + '" fill="none" stroke="' + cv(c) + '" stroke-width="9" stroke-linecap="round"/>' : '');
    if (tick !== null && tick !== undefined && isFinite(tick)) {
      var a = Math.PI * (1 - Math.max(0, Math.min(1, tick)));
      h += '<line x1="' + (cx + 36 * Math.cos(a)).toFixed(1) + '" y1="' + (cy - 36 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + 53 * Math.cos(a)).toFixed(1) + '" y2="' + (cy - 53 * Math.sin(a)).toFixed(1) + '" stroke="var(--ink)" stroke-width="2"/>';
    }
    return h + '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" class="semi-t">' + esc(txt) + '</text></svg>';
  }
  function card(o) {
    var body = o.html || (o.ring ? '<div class="cv"><div class="val num">' + o.val + '</div>' + o.ring + '</div>' : '<div class="val num">' + o.val + '</div>');
    return '<div class="card' + (o.click ? ' click' : '') + '"' + (o.click ? ' tabindex="0" role="button" data-act="' + o.click + '"' : '') + '>' +
      '<h3>' + o.title + (o.tag || '') + '</h3>' + (o.hint ? '<div class="hint">' + o.hint + '</div>' : '') +
      body + '<div class="foot ' + (o.cls || 'idle') + '">' + (o.foot || '') + '</div></div>';
  }
  function pctTxt(f) { return f === null || f === undefined || !isFinite(f) ? '–' : D.fmt(f * 100, 0) + '%'; }

  function renderKpis() {
    var bl = namaBulan(S.bulan), Bn = B(), h = '';
    var tot = konmanAda(Bn) ? totalSkor(Bn) : null, tv = tot === null ? null : tot / 100, st = status(tv);
    h += card({ title: 'Capaian Kinerja', hint: 'Skor Konman ' + bl + ' ' + S.tahun, html: gauge(tv), foot: konmanAda(Bn) ? st.t : 'Tidak ada data Konman bulan ini', cls: st.c });

    var r = D.hitungRendiklat(kelas(), S.tahun, S.bulan, set());
    var pctP = r.rencanaPeserta ? r.peserta / r.rencanaPeserta : null;
    h += card({ title: 'Total Peserta', hint: 'Rendiklat s.d. ' + bl, val: r.kelas ? D.fmt(r.peserta, 0) : '–',
      ring: ring(pctP, r.pakaiRencana || r.tanpaPeserta ? 'warn' : status(pctP).c, pctTxt(pctP), 'Peserta ' + pctTxt(pctP) + ' dari rencana peserta'),
      tag: r.pakaiRencana ? tag('perkiraan', 'warn') : (r.dikoreksi ? tag('dikoreksi') : ''),
      foot: !r.kelas ? 'Belum ada kelas selesai' : (r.pakaiRencana ? r.pakaiRencana + ' kelas memakai rencana peserta' : (r.tanpaPeserta ? r.tanpaPeserta + ' kelas tanpa realisasi' : D.pct(pctP) + ' dari rencana peserta')),
      cls: r.pakaiRencana || r.tanpaPeserta ? 'warn' : status(pctP).c, click: 'kelas' });

    var pctK = r.terjadwal ? r.kelas / r.terjadwal : null;
    h += card({ title: 'Total Kelas', hint: 'Rendiklat, status Selesai s.d. ' + bl, val: r.kelas ? D.fmt(r.kelas, 0) : '–',
      ring: ring(pctK, status(pctK).c, pctTxt(pctK), 'Kelas selesai ' + pctTxt(pctK) + ' dari terjadwal'),
      foot: r.terjadwal ? D.pct(pctK) + ' dari ' + D.fmt(r.terjadwal, 0) + ' kelas terjadwal · +' + r.kelasBulan + ' di ' + bl : 'Belum ada data Rendiklat', cls: status(pctK).c, click: 'kelas' });

    var H = hop(S.tahun, S.bulan), itH = find(/Tingkat Pelaksanaan Pembelajaran/i), tgt = itH && konmanAda(Bn) ? D.num(itH.target[Bn].v) : null;
    var hc = H.nilai !== null && tgt ? H.nilai / tgt : null;
    h += card({ title: 'Hari Orang Pelatihan', hint: 'Rendiklat ÷ jumlah pegawai',
      tag: H.disesuaikan ? tag('disesuaikan') : (r.pakaiRencana ? tag('perkiraan', 'warn') : ''),
      val: H.nilai !== null ? D.fmt(H.nilai, 3) : '–',
      ring: ring(hc, status(hc).c, pctTxt(hc), 'HOP ' + pctTxt(hc) + ' dari target'),
      foot: H.pegawai === null && H.adj.timpa === null ? 'Jumlah pegawai ' + bl + ' belum diisi' : (tgt ? D.pct(hc) + ' dari target ' + D.fmt(tgt, 3) : 'Target Konman belum ada'),
      cls: H.pegawai === null && H.adj.timpa === null ? 'warn' : status(hc).c, click: 'hop' });

    var L1 = D.rataTertimbang(D.rekapSampai(S.data.l1, 'Tanggal Selesai', S.tahun, S.bulan), 'Nilai Kepuasan (1-5)', 'Jumlah Responden');
    var t1 = set().targetL1;
    var k1 = !L1 ? { c: 'idle', t: 'Belum diisi' } : t1 ? status(L1.nilai / t1) : (L1.nilai >= 4.5 ? { c: 'good', t: 'Sangat Baik' } : L1.nilai >= 4 ? { c: 'good', t: 'Baik' } : L1.nilai >= 3 ? { c: 'warn', t: 'Cukup' } : { c: 'bad', t: 'Kurang' });
    var f1 = L1 ? (t1 ? L1.nilai / t1 : L1.nilai / 5) : null;
    h += card({ title: 'Kepuasan Peserta', hint: 'Evaluasi Level 1 · s.d. ' + bl, val: L1 ? D.fmt(L1.nilai, 2) + ' <small>/ 5</small>' : '–',
      ring: ring(f1, k1.c, pctTxt(f1), t1 ? 'Kepuasan ' + pctTxt(f1) + ' dari target' : 'Kepuasan ' + pctTxt(f1) + ' dari skala 5'),
      foot: L1 ? k1.t + ' · ' + L1.n + ' pelatihan' : 'Belum diisi', cls: k1.c, click: 'rekap:l1' });
    $('kpis').innerHTML = h;
  }

  function renderMinis() {
    var bl = namaBulan(S.bulan), Bn = B(), p = set(), h = '';
    function evalCard(o) {
      var rows = D.rekapSampai(S.data[o.data], o.kolTgl, S.tahun, S.bulan);
      var a = o.agg ? o.agg(rows) : D.rataTertimbang(rows, o.kolNilai, o.kolBobot);
      var st = !a ? { c: 'idle', t: 'Belum diisi' } : o.target ? status(a.nilai / o.target) : { c: 'idle', t: a.n + ' data' };
      var foot = !a ? 'Belum diisi' : (o.target ? (a.nilai / o.target >= 0.9999 ? 'Mencapai target ' : 'Dari target ') + D.fmt(o.target, o.dTarget === undefined ? 2 : o.dTarget) : a.n + ' data s.d. ' + bl);
      var fr = !a ? null : o.target ? a.nilai / o.target : a.nilai / o.skala;
      var rc = !a ? 'idle' : o.target ? st.c : (fr >= 0.8 ? 'good' : fr >= 0.6 ? 'warn' : 'bad');
      return card({ title: o.title, hint: o.hint, val: a ? o.fmtV(a.nilai) : '–', foot: foot, cls: st.c, click: 'rekap:' + o.data + (o.key ? ':' + o.key : ''),
        ring: ring(fr, rc, pctTxt(fr), o.title + ' ' + pctTxt(fr) + (o.target ? ' dari target' : ' dari skala maksimum')) });
    }
    function konTarget(re) { var it = find(re); return it && konmanAda(Bn) ? D.num(it.target[Bn].v) : null; }
    h += evalCard({ title: 'Peningkatan KSA', hint: 'Evaluasi Level 2 · Formatif', data: 'l2', key: 'ksa', kolTgl: 'Tanggal Selesai', kolNilai: 'KSA Formatif (0-100)', kolBobot: 'Jumlah Peserta', target: p.targetKSA, skala: 100, fmtV: function (v) { return D.fmt(v, 1) + ' <small>/ 100</small>'; } });
    h += evalCard({ title: 'Dampak pada Perilaku', hint: 'Evaluasi Level 3', data: 'l3', kolTgl: 'Tanggal Evaluasi', kolNilai: 'Skor (0-100)', target: konTarget(/Perubahan Perilaku/i), skala: 100, fmtV: function (v) { return D.fmt(v, 2); } });
    h += evalCard({ title: 'ROTI', hint: 'Return on Training Investment', data: 'roti', kolTgl: 'Tanggal', kolNilai: 'Nilai ROTI (%)', skala: 100, fmtV: function (v) { return D.fmt(v, 1) + '<small>%</small>'; } });
    h += evalCard({ title: 'Confidence & Commitment', hint: 'Evaluasi Level 2 · Sumatif', data: 'l2', key: 'cc', kolTgl: 'Tanggal Selesai', kolNilai: 'C&C Sumatif (1-4)', kolBobot: 'Jumlah Peserta', target: p.targetCC, skala: 4, fmtV: function (v) { return D.fmt(v, 2) + ' <small>/ 4</small>'; } });
    h += evalCard({ title: 'Dampak pada Kinerja', hint: 'Evaluasi Level 4', data: 'l4', kolTgl: 'Tanggal Evaluasi', kolNilai: 'Skor (0-100)', target: konTarget(/Pada Kinerja/i), skala: 100, fmtV: function (v) { return D.fmt(v, 2); } });
    h += evalCard({ title: 'Sertifikat Terbit', hint: 'Terbit ÷ peserta lulus', data: 'sertifikat', kolTgl: 'Tanggal', target: p.targetSertifikat, dTarget: 0, skala: 100,
      agg: function (rows) { var l = 0, t = 0, n = 0; rows.forEach(function (r) { var a = D.num(r['Peserta Lulus']), b = D.num(r['Sertifikat Terbit']); if (a) { l += a; t += b || 0; n++; } }); return n ? { nilai: t / l * 100, n: n } : null; },
      fmtV: function (v) { return D.fmt(v, 1) + '<small>%</small>'; } });
    $('minis').innerHTML = h;
  }

  /* ---------- monthly chart ---------- */
  function renderChart() {
    var months = K().months;
    if (!months.length) { $('monthChart').innerHTML = '<div class="empty">Tab Konman ' + S.tahun + ' belum ada.</div>'; return; }
    var vals = months.map(function (Bn) { return totalSkor(Bn); });
    var maxV = Math.ceil(Math.max.apply(null, [120].concat(vals.filter(function (v) { return v !== null; }))) / 20) * 20;
    var W = 640, H = 240, L = 34, Rr = 8, T = 16, Bt = 26, iw = W - L - Rr, ih = H - T - Bt, step = iw / months.length, bw = Math.min(38, step * 0.56);
    function y(v) { return T + ih - (v / maxV) * ih; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Capaian kinerja per bulan">';
    for (var g = 0; g <= maxV; g += 20) s += '<line class="grid" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="ax" x="' + (L - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>';
    months.forEach(function (Bn, i) {
      var cx = L + step * i + step / 2, v = vals[i], x = cx - bw / 2, sel = Bn === B(), m = D.BULAN.indexOf(Bn) + 1;
      if (v === null) s += '<rect class="b-empty" x="' + x + '" y="' + y(maxV * 0.35) + '" width="' + bw + '" height="' + (T + ih - y(maxV * 0.35)) + '" rx="4"/>';
      else {
        var top = y(Math.max(v, 0));
        s += '<g data-m="' + m + '"><rect class="hit" x="' + (cx - step / 2) + '" y="' + T + '" width="' + step + '" height="' + ih + '"/>' +
          '<path class="b' + (sel ? ' sel' : '') + '" d="M' + x + ' ' + (T + ih) + 'V' + (top + 4) + 'q0 -4 4 -4h' + (bw - 8) + 'q4 0 4 4V' + (T + ih) + 'z"><title>' + D.cap(Bn) + ': ' + D.fmt(v, 2) + '</title></path>' +
          '<text class="bl num" x="' + cx + '" y="' + (top - 5) + '" text-anchor="middle">' + D.fmt(v, 1) + '</text></g>';
      }
      s += '<text class="ax" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle"' + (sel ? ' font-weight="700" fill="var(--ink)"' : '') + '>' + D.BLN3[m - 1] + '</text>';
    });
    s += '<line class="tgt" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(100) + '" y2="' + y(100) + '"/><text class="tgt-l" x="' + (W - Rr) + '" y="' + (y(100) - 4) + '" text-anchor="end">Target 100</text></svg>';
    $('monthChart').innerHTML = s;
    Array.prototype.forEach.call($('monthChart').querySelectorAll('g[data-m]'), function (gg) { gg.addEventListener('click', function () { setPeriode(S.tahun, +gg.getAttribute('data-m')); }); });
  }

  /* ---------- indikator (tanpa indikator gabungan) ---------- */
  function labelNo(it) {
    if (it.level === 0) return String(it.no || '');
    var m = String(it.namaAsli).match(/^([a-z])\./); return (it.parent && it.parent.no || '') + (m ? m[1] : '');
  }
  function renderInd() {
    var Bn = B();
    if (!konmanAda(Bn)) { $('indList').innerHTML = '<div class="empty">Tidak ada data Konman untuk ' + namaBulan(S.bulan) + ' ' + S.tahun + '.</div>'; return; }
    var h = '';
    K().items.forEach(function (it) {
      if (it.isGroup || it.pengurang) return;
      var v = D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null, st = status(v), w = v === null ? 0 : Math.min(v, 1.2) / 1.2 * 100;
      h += '<button type="button" class="ind-row" data-ind="' + it.baris + '"><div style="min-width:0"><div class="ind-name"><span class="n">' + esc(labelNo(it)) + '</span><span class="t" title="' + esc(it.nama) + '">' + esc(it.pendek) + '</span></div>' +
        '<div class="ind-bar"><i style="width:' + w + '%;background:' + cv(st.c) + '"></i><b style="left:' + (100 / 1.2) + '%"></b></div></div>' +
        '<div class="ind-pct num ' + st.c + '">' + (v === null ? '–' : D.fmt(v * 100, 0) + '%') + '</div></button>';
    });
    $('indList').innerHTML = h || '<div class="empty">Data Konman belum terbaca.</div>';
  }
  function openInd(baris) {
    var it = K().items.filter(function (x) { return String(x.baris) === String(baris); })[0]; if (!it) return;
    var rowsH = K().months.map(function (Bn) {
      var has = D.hasData(it, Bn), v = has ? D.capaianItem(it, Bn) : null, st = status(v);
      return '<tr' + (Bn === B() ? ' class="cur"' : '') + '><td>' + D.cap(Bn) + '</td><td class="r">' + esc(it.target[Bn].d) + '</td><td class="r">' + esc(has ? it.real[Bn].d : '') + '</td>' +
        '<td class="r ' + st.c + '"><b>' + (has ? D.pct(v, 0) : '–') + '</b></td><td class="r">' + (has && it.skor[Bn] !== null ? D.fmt(it.skor[Bn], 2) : '–') + '</td><td class="ket">' + esc(it.ket[Bn] || '') + '</td></tr>';
    }).join('');
    openModal('<div class="modal-h"><div><div class="desc">Indikator Konman ' + S.tahun + (it.parent ? ' · bagian dari ' + esc(it.parent.pendek) : '') + '</div><h3>' + esc(it.nama) + '</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="meta"><div><span>PIC</span>' + esc(it.pic || '–') + '</div><div><span>Satuan</span>' + esc(it.satuan || '–') + '</div><div><span>Bobot Smt I / II</span>' + esc(it.bobot1 || '–') + ' / ' + esc(it.bobot2 || '–') + '</div><div><span>Target Smt I / II</span>' + esc(it.target1 || '–') + ' / ' + esc(it.target2 || '–') + '</div></div>' +
      (it.formula ? '<div class="meta"><div style="grid-column:1/-1"><span>Formula</span>' + esc(it.formula) + '</div></div>' : '') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bulan</th><th class="r">Target</th><th class="r">Realisasi</th><th class="r">Pencapaian</th><th class="r">Skor</th><th>Keterangan</th></tr></thead><tbody>' + rowsH + '</tbody></table></div>' +
      '<div class="note">Ubah realisasi/keterangan di ' + sheetLink('Google Sheets', 'Konman ' + S.tahun) + '.</div>');
  }

  /* ---------- kepatuhan ---------- */
  function renderKep() {
    var Bn = B(), aspek = kepRows().map(function (x) { return { nama: String(x['Aspek Kepatuhan']).trim(), maks: D.num(x['Maks Pengurang']), row: x }; });
    var tot = 0, isi = 0;
    var h = aspek.map(function (a) {
      var n = kepVal(a.row, Bn), st = n === null ? { c: 'idle', t: 'Belum diisi' } : n === 0 ? { c: 'good', t: 'Patuh' } : { c: 'bad', t: 'Ada pengurang' };
      if (n !== null) { tot += Math.abs(n); isi++; }
      var fr = n === null ? null : a.maks ? Math.max(0, (a.maks - Math.abs(n)) / a.maks) : (n === 0 ? 1 : 0);
      return '<div class="kep-box" title="' + esc(a.row['Keterangan'] || '') + '"><h4>' + esc(a.nama) + '</h4>' +
        '<div class="kep-b">' + ring(fr, st.c, n === null ? '–' : (n === 0 ? '0' : '−' + D.fmt(Math.abs(n), 2)), a.nama + ': ' + st.t) +
        '<div><span class="pill ' + st.c + '">' + st.t + '</span><div class="mx-l">maks ' + (a.maks || '–') + '</div></div></div></div>';
    }).join('');
    $('kepList').innerHTML = h || '<div class="empty">Belum ada aspek kepatuhan untuk tahun ' + S.tahun + '.</div>';
    $('kepNote').innerHTML = isi ? 'Total pengurang ' + namaBulan(S.bulan) + ': <b>' + D.fmt(tot, 2) + '</b> (sudah dikurangkan dari Capaian Kinerja).' : 'Nilai kepatuhan ' + namaBulan(S.bulan) + ' belum diisi. Isi di ' + sheetLink('Google Sheets', 'Kepatuhan') + ' (0 = patuh).';
  }

  /* ---------- tindak lanjut ---------- */
  function tlRows() { return D.rows(S.data.tindaklanjut).filter(function (r) { return String(r['Temuan / Masukan'] || '').trim(); }); }
  function tlStatus(r) { var s = String(r['Status'] || 'Belum Dimulai').trim(); return { 'Selesai': 1, 'Berjalan': 1, 'Belum Dimulai': 1 }[s] ? s : 'Belum Dimulai'; }
  function renderTL() {
    var R = tlRows(), c = { 'Selesai': 0, 'Berjalan': 0, 'Belum Dimulai': 0 };
    R.forEach(function (r) { c[tlStatus(r)]++; });
    var n = R.length;
    $('tlDesc').textContent = n + ' temuan & masukan';
    if (!n) { $('tlBody').innerHTML = '<div class="empty">Belum ada temuan atau masukan. Tambahkan lewat tombol Input Data atau di ' + sheetLink('Google Sheets', 'Tindak Lanjut Evaluasi') + '.</div>'; return; }
    var seg = [['Selesai', 'good'], ['Berjalan', 'warn'], ['Belum Dimulai', 'bad']];
    var cls = { 'Selesai': 'good', 'Berjalan': 'warn', 'Belum Dimulai': 'bad' };
    var buka = R.filter(function (r) { return tlStatus(r) !== 'Selesai'; });
    $('tlBody').innerHTML = '<div class="tl-top">' + donut(seg.map(function (s) { return { n: c[s[0]], c: s[1], t: s[0] }; }), D.fmt(c['Selesai'] / n * 100, 0) + '%', 'selesai') +
      '<div class="tl-sum">' + seg.map(function (s) { return '<div><b class="num ' + s[1] + '">' + c[s[0]] + '</b><span>' + s[0] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="sub-h">Belum selesai (' + buka.length + ')</div>' +
      '<div class="fill tl-list">' + (buka.length ? buka.map(function (r) {
        var s = tlStatus(r); return '<div class="tl-item"><div><div class="tl-t">' + esc(r['Temuan / Masukan']) + '</div><div class="tl-m">' + esc([r['PIC'], r['Sumber'], r['Target Selesai'] ? 'target ' + r['Target Selesai'] : ''].filter(Boolean).join(' · ')) + '</div></div><span class="pill ' + cls[s] + '">' + s + '</span></div>';
      }).join('') : '<div class="empty">Semua temuan sudah selesai.</div>') + '</div>' +
      '<button class="btn" style="align-self:flex-start" data-act="tl">Lihat daftar lengkap →</button>';
  }
  function openTL() {
    var cls = { 'Selesai': 'good', 'Berjalan': 'warn', 'Belum Dimulai': 'bad' };
    openModal('<div class="modal-h"><h3>Daftar Tindak Lanjut Evaluasi</h3><button class="btn" data-close>Tutup</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Temuan / Masukan</th><th>Sumber</th><th>PIC</th><th>Status</th><th>Target</th><th>Keterangan</th></tr></thead><tbody>' +
      tlRows().map(function (r) { var s = String(r['Status'] || 'Belum Dimulai'); return '<tr><td>' + esc(r['No']) + '</td><td>' + esc(r['Temuan / Masukan']) + '</td><td>' + esc(r['Sumber']) + '</td><td>' + esc(r['PIC']) + '</td><td><span class="pill ' + (cls[s] || 'idle') + '">' + esc(s) + '</span></td><td class="r">' + esc(r['Target Selesai']) + '</td><td class="ket">' + esc(r['Keterangan']) + '</td></tr>'; }).join('') + '</tbody></table></div>');
  }

  /* ---------- maturity (sheet SMG) ---------- */
  function renderMl() {
    var M = (S.data.maturity || []).map(function (r) { return { no: String(r[0]), ke: r[1], sa: D.num(r[2]), ver: D.num(r[3]) }; });
    if (!M.length) { $('mlList').innerHTML = '<div class="empty">Data MLI Probis (sheet SMG) belum terbaca.</div>'; $('mlSum').innerHTML = ''; return; }
    var it = find(/Pengelolaan Proses Bisnis/i), Bn = B(), tgt = null;
    if (it) { tgt = konmanAda(Bn) ? D.num(it.target[Bn].v) : null; if (tgt === null) tgt = D.num(S.bulan <= 6 ? it.target1 : it.target2); }
    var vals = M.map(function (x) { return S.mlMode === 'ver' ? (x.ver !== null ? x.ver : x.sa) : x.sa; });
    var avg = vals.reduce(function (a, b) { return a + (b || 0); }, 0) / vals.length;
    var capai = tgt === null ? null : avg >= tgt, warna = capai === false ? 'bad' : 'good';
    $('mlSum').innerHTML = '<div class="ml-sum-h"><div><b class="ml-avg num">' + D.fmt(avg, 2) + '</b><span class="ml-dari">rata-rata dari 5 · ' + (S.mlMode === 'ver' ? 'verifikasi' : 'self assessment') + '</span></div>' +
      (tgt !== null ? '<span class="pill ' + warna + '">Target ' + D.fmt(tgt, 2) + ' · ' + (capai ? 'Tercapai' : 'Di bawah target') + '</span>' : '<span class="pill idle">Target Konman belum ada</span>') + '</div>' +
      '<div class="ml-big" role="img" aria-label="Rata-rata maturity ' + D.fmt(avg, 2) + ' dari 5' + (tgt !== null ? ', target ' + D.fmt(tgt, 2) : '') + '"><i style="width:' + Math.min(100, avg / 5 * 100) + '%;background:var(--' + warna + ')"></i>' +
      (tgt !== null ? '<b style="left:' + (tgt / 5 * 100) + '%" title="Target ' + D.fmt(tgt, 2) + '"></b>' : '') + '</div>' +
      '<div class="ml-scale" aria-hidden="true">' + [0, 1, 2, 3, 4, 5].map(function (n) { return '<span style="left:' + (n * 20) + '%">' + n + '</span>'; }).join('') + '</div>';
    $('mlInfo').textContent = (tgt !== null ? 'Target ' + D.fmt(tgt, 2) + ' (Konman)' : 'Target Konman belum ada') + ' · ' + M.length + ' key element';
    var kl = ['Semua'];
    M.forEach(function (x) { var k = KLAUSUL[x.no.charAt(0)]; if (k && kl.indexOf(k) < 0) kl.push(k); });
    $('mlChips').innerHTML = kl.map(function (k) { return '<button type="button" class="chip" data-kl="' + esc(k) + '" aria-pressed="' + (k === S.mlKlausul) + '">' + esc(k) + '</button>'; }).join('');
    $('mlList').innerHTML = M.map(function (x, i) { x.v = vals[i]; return x; }).filter(function (x) { return S.mlKlausul === 'Semua' || KLAUSUL[x.no.charAt(0)] === S.mlKlausul; }).map(function (x) {
      var under = x.v !== null && tgt !== null && x.v < tgt;
      return '<div class="ml-row" title="' + esc(x.ke) + ' — level ' + D.fmt(x.v, 2) + '"><div class="k"><em>' + esc(x.no) + '</em>' + esc(x.ke) + '</div>' +
        '<div class="ml-bar"><i class="' + (under ? 'under' : '') + '" style="width:' + ((x.v || 0) / 5 * 100) + '%"></i>' + (tgt !== null ? '<b style="left:' + (tgt / 5 * 100) + '%"></b>' : '') + '</div><div class="s">' + D.fmt(x.v, 1) + '</div></div>';
    }).join('');
  }

  /* ---------- peta risiko (mengikuti file Profil Risiko) ---------- */
  var KEM = { E: 'Sangat Besar', D: 'Besar', C: 'Sedang', B: 'Kecil', A: 'Sangat Kecil' };
  var DAM = ['Tidak Signifikan', 'Minor', 'Medium', 'Signifikan', 'Sangat Signifikan'];
  var MATRIKS = {   // level per kotak, sesuai warna di sheet "4. Peta Risiko"
    E: ['Moderat', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'],
    D: ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'],
    C: ['Rendah', 'Moderat', 'Tinggi', 'Tinggi', 'Sangat Tinggi'],
    B: ['Rendah', 'Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi'],
    A: ['Rendah', 'Rendah', 'Moderat', 'Tinggi', 'Tinggi']
  };
  var LV = { 'Rendah': 2, 'Moderat': 1, 'Tinggi': 3, 'Sangat Tinggi': 4, 'Ekstrem': 5 };
  function parseLabel(s) { var m = String(s || '').match(/^(.*?)\s*\(([A-E])([1-5])\)/); return m ? { level: m[1].trim(), k: m[2], d: +m[3] } : null; }
  function renderRisk() {
    var R = (S.data.risiko && S.data.risiko.rows) ? D.rows(S.data.risiko.rows) : [];
    var col = { inheren: 'Inheren', residual: 'Residual', target: 'Target' }[S.riskView];
    Array.prototype.forEach.call(document.querySelectorAll('[data-rv]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-rv') === S.riskView); });
    var list = R.map(function (r) { return { no: r['No'], id: r['ID Risk'], des: r['Deskripsi Risiko'], p: parseLabel(r[col]) }; });
    var g = '<div class="rmap"><div class="yt">Tingkat Kemungkinan</div>';
    ['E', 'D', 'C', 'B', 'A'].forEach(function (k, ri) {
      g += '<div class="yl" style="grid-row:' + (ri + 1) + '">' + KEM[k] + ' ' + k + '</div>';
      for (var d = 1; d <= 5; d++) {
        var lv = MATRIKS[k][d - 1], here = list.filter(function (x) { return x.p && x.p.k === k && x.p.d === d; });
        g += '<div class="cell" data-l="' + LV[lv] + '" style="grid-row:' + (ri + 1) + ';grid-column:' + (d + 2) + '" title="' + k + d + ' · ' + lv + '">' +
          here.map(function (x) { return '<button type="button" class="rdot' + (S.riskOn === x.no ? ' on' : '') + '" data-r="' + esc(x.no) + '" title="' + esc(x.des) + '">' + esc(x.no) + '</button>'; }).join('') + '</div>';
      }
    });
    for (var d = 1; d <= 5; d++) g += '<div class="xl" style="grid-row:6;grid-column:' + (d + 2) + '"><b>' + d + '</b><br>' + DAM[d - 1] + '</div>';
    g += '<div class="xt" style="grid-row:7">Tingkat Dampak</div></div>';
    var urut = ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'], cnt = {};
    list.forEach(function (x) { if (x.p) cnt[x.p.level] = (cnt[x.p.level] || 0) + 1; });
    var segR = urut.filter(function (l) { return cnt[l]; }).map(function (l) { return { n: cnt[l], c: 'risk-' + LV[l], t: l }; });
    var ringkas = list.length ? '<div class="rsum">' + donut(segR, String(list.length), 'risiko') + '<div class="rsum-l">' + segR.map(function (x) { return '<span><i class="sw" style="background:var(--' + x.c + ')"></i>' + x.t + ' <b class="num">' + x.n + '</b></span>'; }).join('') + '</div></div>' : '';
    var tbl = '<div class="rside">' + ringkas + '<div class="rlist"><div class="h"><span>Daftar Risiko · ' + col + '</span><span>' + list.length + '</span></div>' + (list.length ?
      '<div style="max-height:300px;overflow:auto"><table><thead><tr><th>No</th><th>Risiko</th><th>Level</th></tr></thead><tbody>' + list.map(function (x) {
        return '<tr data-r="' + esc(x.no) + '"' + (S.riskOn === x.no ? ' class="on"' : '') + ' title="' + esc(x.id) + '"><td>' + esc(x.no) + '</td><td>' + esc(x.des) + '</td><td class="lvl">' + (x.p ? '<i class="sw" style="background:var(--risk-' + LV[x.p.level] + ')"></i>' + esc(x.p.level) + ' (' + x.p.k + x.p.d + ')' : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="empty" style="border:0">File Profil Risiko belum terbaca.</div>') + '</div></div>';
    $('riskBody').innerHTML = g + tbl;
  }

  /* ---------- tautan ---------- */
  function renderLinks() {
    var R = D.rows(S.data.tautan).filter(function (r) { return String(r['Nama'] || '').trim() && String(r['URL'] || '').trim(); })
      .sort(function (a, b) { return (D.num(a['Urutan']) || 99) - (D.num(b['Urutan']) || 99); });
    $('links').innerHTML = R.map(function (r) { return '<a class="link" href="' + esc(r['URL']) + '" target="_blank" rel="noopener"><b>' + esc(r['Nama']) + '</b><span>' + esc(r['Kelompok'] || '') + '</span></a>'; }).join('');
  }

  /* ---------- modals: kelas, HOP, rekap ---------- */
  function barChart(vals, labels, selIdx, unit) {
    var mx = Math.max.apply(null, vals.concat([1])), W = 600, H = 170, step = (W - 16) / vals.length, bw = step * 0.6, ih = H - 40;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + vals.map(function (v, i) {
      var cx = 8 + step * i + step / 2, h = v / mx * ih, y = 14 + ih - h;
      return (v ? '<path class="b' + (i === selIdx ? ' sel' : '') + '" d="M' + (cx - bw / 2) + ' ' + (14 + ih) + 'V' + (y + 4) + 'q0 -4 4 -4h' + (bw - 8) + 'q4 0 4 4V' + (14 + ih) + 'z"><title>' + labels[i] + ': ' + D.fmt(v, 0) + ' ' + unit + '</title></path><text class="bl" x="' + cx + '" y="' + (y - 4) + '" text-anchor="middle">' + D.fmt(v, 0) + '</text>' : '') +
        '<text class="ax" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + labels[i] + '</text>';
    }).join('') + '</svg>';
  }
  function openKelas() {
    var per = [];
    for (var m = 1; m <= 12; m++) { var a = D.hitungRendiklat(kelas(), S.tahun, m, set()), b = m > 1 ? D.hitungRendiklat(kelas(), S.tahun, m - 1, set()) : { kelas: 0 }; per.push(a.kelas - b.kelas); }
    var r = D.hitungRendiklat(kelas(), S.tahun, S.bulan, set());
    var link = S.data.meta.links && S.data.meta.links.rendiklat && S.data.meta.links.rendiklat[S.tahun];
    openModal('<div class="modal-h"><div><div class="desc">Rendiklat ' + S.tahun + ', status Selesai s.d. ' + namaBulan(S.bulan) + (link ? ' · <a href="' + esc(link) + '" target="_blank" rel="noopener">buka file</a>' : '') + '</div><h3>' + D.fmt(r.kelas, 0) + ' kelas · ' + D.fmt(r.peserta, 0) + ' peserta</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="chart">' + barChart(per, D.BLN3, S.bulan - 1, 'kelas') + '</div>' +
      '<div class="meta"><div><span>Peserta dari Rendiklat</span>' + D.fmt(r.daftar.filter(function (x) { return x.sumber === 'Rendiklat'; }).reduce(function (s, x) { return s + x.peserta; }, 0), 0) + '</div>' +
      '<div><span>Dikoreksi</span>' + r.dikoreksi + ' kelas</div><div><span>Memakai rencana (perkiraan)</span>' + r.pakaiRencana + ' kelas</div><div><span>Tanpa angka peserta</span>' + r.tanpaPeserta + ' kelas</div></div>' +
      '<input class="search" id="kelasQ" type="search" placeholder="Cari judul pembelajaran…" aria-label="Cari judul">' +
      '<div class="tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl"><thead><tr><th>Judul</th><th>Metode</th><th class="r">Selesai</th><th class="r">Peserta</th><th class="r">Hari kerja</th><th>Sumber</th></tr></thead><tbody id="kelasT"></tbody></table></div><div class="note" id="kelasN"></div>' +
      '<div class="note">Koreksi angka peserta di ' + sheetLink('Google Sheets', 'Koreksi Rendiklat') + '.</div>');
    function fill() {
      var q = ($('kelasQ').value || '').toLowerCase();
      var f = r.daftar.filter(function (x) { return !q || String(x.k.judul).toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return b.k.selesai - a.k.selesai; });
      var badge = { 'Rendiklat': '', 'koreksi': '<span class="pill good">koreksi</span>', 'perkiraan': '<span class="pill warn">perkiraan</span>', 'kosong': '<span class="pill bad">kosong</span>' };
      $('kelasT').innerHTML = f.slice(0, 200).map(function (x) {
        var t = x.k.selesai; return '<tr><td>' + esc(x.k.judul) + '</td><td>' + esc(x.k.metode) + '</td><td class="r">' + t.getDate() + ' ' + D.BLN3[t.getMonth()] + '</td><td class="r">' + D.fmt(x.peserta, 0) + '</td><td class="r">' + x.hari + (x.ikut ? '' : ' <span class="pill idle">tidak dihitung</span>') + '</td><td>' + badge[x.sumber] + '</td></tr>';
      }).join('');
      $('kelasN').textContent = f.length > 200 ? 'Menampilkan 200 dari ' + D.fmt(f.length, 0) + ' kelas.' : D.fmt(f.length, 0) + ' kelas';
    }
    $('kelasQ').addEventListener('input', fill); fill();
  }
  function openHop() {
    var p = set(), itH = find(/Tingkat Pelaksanaan Pembelajaran/i);
    var rowsH = '';
    for (var m = 1; m <= 12; m++) {
      var h = hop(S.tahun, m), Bn = D.BULAN[m - 1], kon = itH && konmanAda(Bn) && D.hasData(itH, Bn) ? D.num(itH.real[Bn].v) : null, tgt = itH && konmanAda(Bn) ? D.num(itH.target[Bn].v) : null;
      rowsH += '<tr' + (m === S.bulan ? ' class="cur"' : '') + '><td>' + namaBulan(m) + '</td><td class="r">' + D.fmt(h.orangHariAsli, 0) + '</td><td class="r">' + (h.adj.tambah ? D.fmt(h.adj.tambah, 0) : '–') + '</td><td class="r">' + D.fmt(h.pegawai, 0) + '</td>' +
        '<td class="r"><b>' + D.fmt(h.nilai, 3) + '</b>' + (h.adj.timpa !== null ? ' <span class="pill warn">timpa</span>' : '') + '</td><td class="r">' + D.fmt(tgt, 3) + '</td><td class="r">' + D.fmt(kon, 3) + '</td></tr>';
    }
    var H = hop(S.tahun, S.bulan);
    openModal('<div class="modal-h"><div><div class="desc">Σ (peserta × hari kerja), kelas Selesai, kumulatif ÷ jumlah pegawai</div><h3>Hari Orang Pelatihan ' + S.tahun + '</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="meta"><div><span>Self Learning</span>' + (p.kecualikanSL ? 'tidak dihitung' : 'dihitung') + '</div><div><span>Hari sebelum 1 Januari</span>' + (p.hitungHariSebelumTahun ? 'dihitung' : 'tidak dihitung') + '</div><div><span>Kelas tanpa realisasi</span>' + (String(p.tanpaRealisasi).indexOf('RENCANA') >= 0 ? 'pakai rencana peserta' : 'diabaikan') + '</div><div><span>Kelas dikoreksi</span>' + H.r.dikoreksi + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bulan</th><th class="r">Orang-hari Rendiklat</th><th class="r">Penyesuaian</th><th class="r">Pegawai</th><th class="r">HOP</th><th class="r">Target Konman</th><th class="r">Realisasi Konman</th></tr></thead><tbody>' + rowsH + '</tbody></table></div>' +
      (H.adj.alasan.length ? '<div class="note">Penyesuaian: ' + H.adj.alasan.map(esc).join(' · ') + '</div>' : '') +
      '<div class="note">Aturan diubah di ' + sheetLink('Google Sheets', 'Pengaturan') + '; jumlah pegawai di tab <b>Jumlah Pegawai</b>; penyesuaian di tab <b>Penyesuaian HOP</b>.</div>');
  }
  var REKAP = {
    l1: ['Rekap L1 Kepuasan', 'l1', 'Tanggal Selesai'], l2: ['Rekap L2', 'l2', 'Tanggal Selesai'], l3: ['Rekap L3 Perilaku', 'l3', 'Tanggal Evaluasi'],
    l4: ['Rekap L4 Kinerja', 'l4', 'Tanggal Evaluasi'], roti: ['Rekap ROTI', 'roti', 'Tanggal'], sertifikat: ['Rekap Sertifikat', 'sertifikat', 'Tanggal']
  };
  function openRekap(key) {
    var cfg = REKAP[key]; if (!cfg) return;
    var tbl = S.data[cfg[1]] || [], head = (tbl[0] || []).map(String), rows = D.rekapSampai(tbl, cfg[2], S.tahun, S.bulan);
    openModal('<div class="modal-h"><div><div class="desc">' + S.tahun + ' s.d. ' + namaBulan(S.bulan) + '</div><h3>' + esc(cfg[0]) + ' (' + rows.length + ')</h3></div><button class="btn" data-close>Tutup</button></div>' +
      (rows.length ? '<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + head.map(function (h) { var v = r[h]; if (h === head[0] && r._t) v = r._t.getDate() + ' ' + D.BLN3[r._t.getMonth()] + ' ' + r._t.getFullYear(); else if (typeof v === 'number' && v < 1 && /% Terbit/.test(h)) v = D.pct(v); return '<td>' + esc(typeof v === 'number' ? D.fmt(v) : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="empty">Belum ada data. Isi di ' + sheetLink('Google Sheets', cfg[0]) + ', satu baris per pelatihan.</div>'));
  }

  /* ---------- modal ---------- */
  var lastFocus = null;
  function openModal(html) { lastFocus = document.activeElement; $('modalC').innerHTML = html; $('modal').hidden = false; var b = $('modalC').querySelector('[data-close]'); if (b) b.focus(); }
  function closeModal() { $('modal').hidden = true; $('modalC').innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  /* ---------- state ---------- */
  function setPeriode(y, m) {
    S.tahun = y; S.bulan = m;
    $('tahunSel').value = String(y);
    $('bulanSel').value = String(m);
    Array.prototype.forEach.call(document.querySelectorAll('.per'), function (e) { e.textContent = namaBulan(m) + ' ' + y; });
    renderAll();
    document.dispatchEvent(new CustomEvent('dash:periode'));
  }
  function renderAll() { renderKpis(); renderMinis(); renderChart(); renderInd(); renderKep(); renderTL(); renderMl(); renderRisk(); renderLinks(); }

  function tahunTersedia(d) {
    var ys = {};
    Object.keys(d.konman || {}).forEach(function (y) { ys[y] = 1; });
    Object.keys(d.rendiklat || {}).forEach(function (y) { ys[y] = 1; });
    D.rows(d.pegawai).forEach(function (r) { if (/^\d{4}$/.test(String(r['Tahun']).trim())) ys[String(r['Tahun']).trim()] = 1; });
    var out = Object.keys(ys).map(Number).sort(); return out.length ? out : [new Date().getFullYear()];
  }
  function bulanBawaan(y) {
    var kk = S.cache.konman[y], last = null;
    if (kk) {
      var leaves = kk.items.filter(function (it) { return !it.isGroup && !it.pengurang; });
      kk.months.forEach(function (Bn) { var f = leaves.filter(function (it) { return D.hasData(it, Bn); }).length; if (f && f >= leaves.length * 0.5) last = D.BULAN.indexOf(Bn) + 1; });
    }
    if (last) return last;
    var now = new Date(); return now.getFullYear() === y ? now.getMonth() + 1 : 12;
  }

  function boot(data) {
    S.data = data;
    S.cache = { konman: {}, kelas: {} };
    Object.keys(data.konman || {}).forEach(function (y) { S.cache.konman[y] = D.parseKonman(data.konman[y]); });
    Object.keys(data.rendiklat || {}).forEach(function (y) { S.cache.kelas[y] = D.parseRendiklat(data.rendiklat[y], data.koreksi); });
    var m = data.meta || {};
    if (m.judul) { $('judul').innerHTML = esc(m.judul) + '<span class="dot">.</span>'; document.title = m.judul; }
    if (m.links && m.links.data) $('sheetBtn').href = m.links.data;
    var badge = $('srcBadge');
    if (m.source === 'live' && !m.stale) { badge.className = 'badge live'; badge.textContent = 'Terhubung ke Google Sheets'; }
    else if (m.stale) { badge.className = 'badge err'; badge.textContent = 'Data tersimpan (gagal memuat ulang)'; }
    else { badge.className = 'badge snap'; badge.textContent = 'Data belum terhubung'; }
    var t = m.generatedAt ? new Date(m.generatedAt) : null;
    $('srcInfo').textContent = (m.unit ? m.unit + ' · ' : '') + (t ? 'diambil ' + t.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
    var w = [];
    if (m.source !== 'live') w.push(esc(m.reason || 'Data tidak terhubung ke Google Sheets.'));
    if (m.stale) w.push('Gagal memuat data terbaru: ' + esc(m.stale));
    (data.warnings || []).forEach(function (x) { w.push(esc(x)); });
    $('warn').hidden = !w.length; $('warn').className = 'warnbox'; $('warn').innerHTML = w.join('<br>');

    var years = tahunTersedia(data);
    $('tahunSel').innerHTML = years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    var opts = D.BULAN.map(function (b, i) { return '<option value="' + (i + 1) + '">' + D.cap(b) + '</option>'; }).join('');
    $('bulanSel').innerHTML = opts;
    if (!S.tahun || years.indexOf(S.tahun) < 0) { S.tahun = years[years.length - 1]; S.bulan = bulanBawaan(S.tahun); }
    if (!S.riskView) S.riskView = /inheren/i.test(data.risiko && data.risiko.tampilan) ? 'inheren' : /residu/i.test(data.risiko && data.risiko.tampilan) ? 'residual' : 'target';
    setPeriode(S.tahun, S.bulan);
    $('footNote').innerHTML = 'Sumber: Konman, Rendiklat, MLI Probis (sheet SMG), Profil Risiko, dan ' + sheetLink('Data Dashboard') + (m.source === 'live' ? ' · dimuat ulang otomatis tiap 5 menit' : '');
  }

  function load() {
    $('srcBadge').className = 'badge snap'; $('srcBadge').textContent = 'Memuat data…';
    var c = D.cachedData(); if (c && !S.data) boot(c);
    return D.loadData().then(boot).catch(function (e) {
      $('srcBadge').className = 'badge err'; $('srcBadge').textContent = 'Gagal memuat';
      $('warn').hidden = false; $('warn').className = 'warnbox'; $('warn').textContent = 'Data tidak bisa dimuat: ' + (e.message || e);
    });
  }

  /* ---------- events ---------- */
  $('tahunSel').addEventListener('change', function (e) { var y = +e.target.value; setPeriode(y, S.cache.konman[y] ? bulanBawaan(y) : S.bulan); });
  $('bulanSel').addEventListener('change', function (e) { setPeriode(S.tahun, +e.target.value); });
  function muatUlang() { try { sessionStorage.removeItem('dash-cache-v3'); } catch (e) {} return load(); }
  $('refreshBtn').addEventListener('click', muatUlang);
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var ind = t.closest('[data-ind]'); if (ind) return openInd(ind.getAttribute('data-ind'));
    var act = t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'kelas') return openKelas();
      if (a === 'hop') return openHop();
      if (a === 'tl') return openTL();
      if (a.indexOf('rekap:') === 0) return openRekap(a.split(':')[1]);
    }
    var kl = t.closest('[data-kl]'); if (kl) { S.mlKlausul = kl.getAttribute('data-kl'); return renderMl(); }
    var ml = t.closest('[data-ml]'); if (ml) { S.mlMode = ml.getAttribute('data-ml'); Array.prototype.forEach.call(document.querySelectorAll('[data-ml]'), function (b) { b.setAttribute('aria-pressed', b === ml); }); return renderMl(); }
    var rv = t.closest('[data-rv]'); if (rv) { S.riskView = rv.getAttribute('data-rv'); return renderRisk(); }
    var r = t.closest('[data-r]'); if (r) { var n = r.getAttribute('data-r'); S.riskOn = S.riskOn === n ? null : n; return renderRisk(); }
    if (t.closest('[data-close]') || t === $('modal')) return closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('modal').hidden) return closeModal();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card.click')) { e.preventDefault(); e.target.click(); }
  });

  /* dipakai input.js dan export.js */
  window.DashApp = {
    S: S, K: K, kelas: kelas, set: set, find: find, konmanAda: konmanAda, totalSkor: totalSkor, pengurang: pengurang,
    kepRows: kepRows, kepVal: kepVal, pegawai: pegawai, hop: hop, status: status, labelNo: labelNo, namaBulan: namaBulan, B: B,
    tlRows: tlRows, tlStatus: tlStatus, reload: muatUlang, toast: toast
  };
  function toast(t, ms) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, ms || 4000); }

  load();
  setInterval(function () {
    var bebas = Array.prototype.every.call(document.querySelectorAll('.modal'), function (m) { return m.hidden; });
    if (S.data && S.data.meta && S.data.meta.source === 'live' && document.visibilityState === 'visible' && bebas) { muatUlang(); }
  }, 5 * 60 * 1000);
})();
