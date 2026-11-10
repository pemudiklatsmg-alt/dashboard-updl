(function () {
  var D = window.Dash, $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var S = { orgView: 'peg', orgOn: null, data: null, tahun: null, bulan: null, mlMode: 'ver', mlKlausul: 'Semua', riskView: null, riskOn: null };
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
  function admin() { return S.peran === 'admin'; }
  function sheetLink(label, tab) {
    var url = (S.data.meta.links && S.data.meta.links.data) || DEFAULT_LINKS.data;
    return (admin() ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' : esc(label)) + (tab ? ' (tab <b>' + esc(tab) + '</b>)' : '');
  }
  /* Ringkasan evaluasi dari data mentah, kumulatif s.d. bulan terpilih */
  function ev(nama, y, m) {
    var E = (S.data && S.data.eval) || {}, f = { kepuasan: D.evalKepuasan, instruktur: D.evalInstruktur, ksa: D.evalKsa, cc: D.evalCc, sertifikat: D.evalSert }[nama];
    return f(E[nama], y || S.tahun, m || S.bulan);
  }
  function skala5(v, t) {   // status nilai skala 5: pakai target bila ada
    if (v === null || v === undefined) return { c: 'idle', t: 'Belum ada data' };
    if (t) return status(v / t);
    return v >= 4.5 ? { c: 'good', t: 'Sangat Baik' } : v >= 4 ? { c: 'good', t: 'Baik' } : v >= 3 ? { c: 'warn', t: 'Cukup' } : { c: 'bad', t: 'Kurang' };
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

    var Kp = ev('kepuasan'), In = ev('instruktur'), p = set();
    function mini(o) {
      var v = o.v, st = skala5(v, o.t), f = v === null ? null : (o.t ? v / o.t : v / 5);
      return card({ title: o.title, hint: o.hint, val: v === null ? '–' : D.fmt(v, 2) + ' <small>/ 5</small>', cls: v === null ? 'idle' : st.c, click: o.click,
        ring: ring(f, st.c, pctTxt(f), o.title + ' ' + pctTxt(f) + (o.t ? ' dari target' : ' dari skala 5')),
        foot: v === null ? 'Belum ada data s.d. ' + bl : o.foot + ' <span class="more">→</span>' }).replace('class="card', 'class="card mini2');
    }
    h += '<div class="stack2">' +
      mini({ title: 'Kepuasan Peserta', hint: 'EL1 · rata-rata semua butir', v: Kp ? Kp.nilai : null, t: p.targetL1, click: 'kepuasan',
        foot: Kp ? D.fmt(Kp.responden, 0) + ' responden · ' + Kp.pelatihan + ' pelatihan' : '' }) +
      mini({ title: 'Penilaian Instruktur', hint: 'EL1 · rata-rata semua butir', v: In ? In.nilai : null, t: p.targetInstruktur, click: 'instruktur',
        foot: In ? In.instruktur.length + ' instruktur · ' + D.fmt(In.penilaian, 0) + ' penilaian' : '' }) + '</div>';
    $('kpis').innerHTML = h;
  }

  function renderMinis() {
    var bl = namaBulan(S.bulan), Bn = B(), p = set(), h = '';
    function rekapCard(o) {
      var rows = D.rekapSampai(S.data[o.data], o.kolTgl, S.tahun, S.bulan), a = D.rataTertimbang(rows, o.kolNilai);
      var st = !a ? { c: 'idle', t: 'Belum diisi' } : o.target ? status(a.nilai / o.target) : { c: 'idle', t: a.n + ' data' };
      var fr = !a ? null : o.target ? a.nilai / o.target : a.nilai / 100;
      var rc = !a ? 'idle' : o.target ? st.c : (fr >= 0.8 ? 'good' : fr >= 0.6 ? 'warn' : 'bad');
      return card({ title: o.title, hint: o.hint, val: a ? o.fmtV(a.nilai) : '–', cls: st.c, click: 'rekap:' + o.data,
        foot: !a ? 'Belum diisi' : (o.target ? (a.nilai / o.target >= 0.9999 ? 'Mencapai target ' : 'Dari target ') + D.fmt(o.target, 2) : a.n + ' data s.d. ' + bl),
        ring: ring(fr, rc, pctTxt(fr), o.title + ' ' + pctTxt(fr)) });
    }
    function konTarget(re) { var it = find(re); return it && konmanAda(Bn) ? D.num(it.target[Bn].v) : null; }

    var K = ev('ksa'), kv = K ? K.nilai : null, kt = p.targetKSA, kf = kv === null ? null : kt ? kv / kt : kv / 100;
    var kc = kv === null ? 'idle' : kt ? status(kf).c : (kf >= 0.8 ? 'good' : kf >= 0.6 ? 'warn' : 'bad');
    h += card({ title: 'Peningkatan KSA', hint: 'EL2 formatif · Hadir & Lulus', val: kv === null ? '–' : D.fmt(kv, 1), click: 'ksa', cls: kv === null ? 'idle' : kt ? kc : 'idle',
      ring: ring(kf, kc, pctTxt(kf), 'KSA ' + pctTxt(kf) + (kt ? ' dari target' : ' dari skala 100')),
      foot: kv === null ? 'Belum ada data s.d. ' + bl : D.fmt(K.peserta, 0) + ' peserta Hadir & Lulus' });
    h += rekapCard({ title: 'Dampak pada Perilaku', hint: 'Evaluasi Level 3', data: 'l3', kolTgl: 'Tanggal Evaluasi', kolNilai: 'Skor (0-100)', target: konTarget(/Perubahan Perilaku/i), fmtV: function (v) { return D.fmt(v, 2); } });
    h += rekapCard({ title: 'ROTI', hint: 'Return on Training Investment', data: 'roti', kolTgl: 'Tanggal', kolNilai: 'Nilai ROTI (%)', fmtV: function (v) { return D.fmt(v, 1) + '<small>%</small>'; } });

    var C = ev('cc'), sk = p.skalaCC || 4, ct = p.targetCC, cn = C ? C.nilai : null, cst = cn === null ? { c: 'idle' } : ct ? status(cn / ct) : { c: 'idle' };
    h += card({ title: 'Confidence & Commitment', hint: 'EL2 sumatif · skala 1–' + sk, click: 'cc', cls: cst.c,
      html: '<div class="duo"><div><b class="num">' + (C && C.conf !== null ? D.fmt(C.conf, 2) : '–') + '</b><span>Confidence</span></div><div><b class="num">' + (C && C.comm !== null ? D.fmt(C.comm, 2) : '–') + '</b><span>Commitment</span></div></div>',
      foot: cn === null ? 'Belum ada data s.d. ' + bl : (ct ? (cn / ct >= 0.9999 ? 'Mencapai target ' : 'Target ') + D.fmt(ct, 2) + ' · ' : '') + D.fmt(C.n, 0) + ' pengisian' });
    h += rekapCard({ title: 'Dampak pada Kinerja', hint: 'Evaluasi Level 4', data: 'l4', kolTgl: 'Tanggal Evaluasi', kolNilai: 'Skor (0-100)', target: konTarget(/Pada Kinerja/i), fmtV: function (v) { return D.fmt(v, 2); } });

    var Se = ev('sertifikat'), sp = Se ? Se.pct : null, sc = sp === null ? 'idle' : sp >= 0.95 ? 'good' : sp >= 0.8 ? 'warn' : 'bad';
    h += card({ title: 'Sertifikat Terbit', hint: 'Status Finish TTE GM · s.d. ' + bl, val: Se && Se.total ? D.fmt(Se.terbit, 0) : '–', click: 'sert', cls: 'idle',
      ring: ring(sp, sc, pctTxt(sp), 'Sertifikat terbit ' + pctTxt(sp) + ' dari seluruh sertifikat'),
      foot: Se && Se.total ? '<b class="num" style="color:var(--ink)">+' + D.fmt(Se.bulan, 0) + '</b> terbit di ' + bl + ' <span class="more">→</span>' : 'Belum ada data s.d. ' + bl });
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
  /* Status asli 5 pilihan -> 3 kelompok. Selesai = Selesai + Sudah Dilaporkan; Berjalan = OFI + Proses Tindak Lanjut */
  var TL_GRUP = { 'SELESAI': 'Selesai', 'SUDAH DILAPORKAN': 'Selesai', 'OFI': 'Berjalan', 'PROSES TINDAK LANJUT': 'Berjalan', 'BERJALAN': 'Berjalan' };
  var TL_KLS = { 'Selesai': 'good', 'Berjalan': 'warn', 'Belum Dimulai': 'bad' };
  function tlRows() { return D.rows(S.data.tindaklanjut).filter(function (r) { return String(r['Komentar'] || '').trim(); }); }
  function tlAsli(r) { return String(r['Status'] || '').trim() || 'Belum Dimulai'; }
  function tlStatus(r) { return TL_GRUP[tlAsli(r).toUpperCase()] || 'Belum Dimulai'; }
  function renderTL() {
    var R = tlRows(), c = { 'Selesai': 0, 'Berjalan': 0, 'Belum Dimulai': 0 }, pic = {};
    R.forEach(function (r) {
      var g = tlStatus(r), k = String(r['PIC'] || '').trim() || '(tanpa PIC)'; c[g]++;
      if (!pic[k]) pic[k] = { 'Selesai': 0, 'Berjalan': 0, 'Belum Dimulai': 0, n: 0 };
      pic[k][g]++; pic[k].n++;
    });
    var n = R.length;
    $('tlDesc').textContent = n + ' komentar & temuan (semua periode)';
    if (!n) { $('tlBody').innerHTML = '<div class="empty">Belum ada komentar atau temuan. Tempel data di ' + sheetLink('Google Sheets', 'Tindak Lanjut Evaluasi') + '.</div>'; return; }
    var seg = [['Selesai', 'good', 'Selesai + Sudah Dilaporkan'], ['Berjalan', 'warn', 'OFI + Proses TL'], ['Belum Dimulai', 'bad', 'Belum Dimulai']];
    var mx = Math.max.apply(null, Object.keys(pic).map(function (k) { return pic[k].n; }));
    var bars = Object.keys(pic).sort(function (a, b) { return pic[b].n - pic[a].n || a.localeCompare(b); }).map(function (k) {
      var x = pic[k];
      return '<div class="r" title="' + esc(k + ': ' + seg.map(function (s) { return s[0] + ' ' + x[s[0]]; }).join(', ')) + '"><span>' + esc(k) + '</span><span class="t">' +
        seg.map(function (s) { return x[s[0]] ? '<i style="width:' + (x[s[0]] / mx * 100) + '%;background:var(--' + s[1] + ')"></i>' : ''; }).join('') + '</span><span class="num">' + x.n + '</span></div>';
    }).join('');
    $('tlBody').innerHTML = '<div class="tl-top">' + donut(seg.map(function (s) { return { n: c[s[0]], c: s[1], t: s[0] }; }), D.fmt(c['Selesai'] / n * 100, 0) + '%', 'selesai') +
      '<div class="tl-sum">' + seg.map(function (s) { return '<div><b class="num ' + s[1] + '">' + c[s[0]] + '</b><span>' + s[2] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="sub-h">Per PIC</div><div class="bars">' + bars + '</div>' +
      '<div class="legend"><span><i style="background:var(--good)"></i>Selesai</span><span><i style="background:var(--warn)"></i>Berjalan</span><span><i style="background:var(--bad)"></i>Belum dimulai</span></div>' +
      '<button class="btn" style="align-self:flex-start" data-act="tl">Lihat daftar lengkap →</button>';
  }
  function openTL() {
    var R = tlRows();
    openModal('<div class="modal-h"><div><h3>Tindak Lanjut Evaluasi</h3><div class="desc">' + R.length + ' komentar & temuan · ' + (admin() ? 'ubah status lewat Input Data → Tindak Lanjut, atau langsung di Google Sheets' : 'status diperbarui oleh admin') + '</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tools"><input class="inp" id="tlQ" type="search" placeholder="Cari komentar, pelatihan, PIC…" aria-label="Cari"><select class="inp" id="tlF" aria-label="Saring status" style="max-width:220px"><option value="">Semua status</option><option>Selesai</option><option>Berjalan</option><option>Belum Dimulai</option></select></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Komentar</th><th>Kategori</th><th>Sumber</th><th>PIC</th><th>Status</th><th>Keterangan</th></tr></thead><tbody id="tlT"></tbody></table></div><div class="note" id="tlN"></div>');
    function fill() {
      var q = $('tlQ').value.toLowerCase(), f = $('tlF').value;
      var L = R.filter(function (r) { return (!f || tlStatus(r) === f) && (!q || [r['Judul Diklat'], r['Komentar'], r['PIC'], r['Kategori Komentar'], r['Sumber']].join(' ').toLowerCase().indexOf(q) >= 0); });
      $('tlT').innerHTML = L.map(function (r) {
        return '<tr><td>' + esc(r['Judul Diklat']) + (r['Angkatan'] ? '<div class="tl-m">Angkatan ' + esc(r['Angkatan']) + '</div>' : '') + '</td><td>' + esc(r['Komentar']) + '</td><td>' + esc(r['Kategori Komentar']) + '</td><td>' + esc(r['Sumber']) + '</td><td>' + esc(r['PIC']) +
          '</td><td><span class="pill ' + TL_KLS[tlStatus(r)] + '">' + esc(tlAsli(r)) + '</span></td><td class="ket">' + esc(String(r['Keterangan'] || '')) + '</td></tr>';
      }).join('') || '<tr><td colspan="7" class="desc">Tidak ada yang cocok.</td></tr>';
      $('tlN').textContent = L.length + ' dari ' + R.length + ' baris';
    }
    $('tlQ').addEventListener('input', fill); $('tlF').addEventListener('change', fill); fill();
  }

  /* ---------- maturity (sheet SMG) ---------- */
  /* Tempat bar ringkasan maturity; dibuat sendiri bila halaman yang tersimpan di browser masih versi lama */
  function wadahMl() {
    var el = $('mlSum'); if (el) return el;
    var g = $('mlGauge'); if (g) g.remove();
    el = document.createElement('div'); el.className = 'ml-sum'; el.id = 'mlSum';
    var seg = document.querySelector('[data-ml]'), row = seg && seg.closest('.panel-h');
    if (row) row.parentNode.insertBefore(el, row); else $('mlList').parentNode.insertBefore(el, $('mlList'));
    return el;
  }
  function renderMl() {
    var M = (S.data.maturity || []).map(function (r) { return { no: String(r[0]), ke: r[1], sa: D.num(r[2]), ver: D.num(r[3]) }; });
    if (!M.length) { $('mlList').innerHTML = '<div class="empty">Data MLI Probis (sheet SMG) belum terbaca.</div>'; wadahMl().innerHTML = ''; return; }
    var it = find(/Pengelolaan Proses Bisnis/i), Bn = B(), tgt = null;
    if (it) { tgt = konmanAda(Bn) ? D.num(it.target[Bn].v) : null; if (tgt === null) tgt = D.num(S.bulan <= 6 ? it.target1 : it.target2); }
    var vals = M.map(function (x) { return S.mlMode === 'ver' ? (x.ver !== null ? x.ver : x.sa) : x.sa; });
    var avg = vals.reduce(function (a, b) { return a + (b || 0); }, 0) / vals.length;
    var capai = tgt === null ? null : avg >= tgt, warna = capai === false ? 'bad' : 'good';
    wadahMl().innerHTML = '<div class="ml-sum-h"><div><b class="ml-avg num">' + D.fmt(avg, 2) + '</b><span class="ml-dari">rata-rata dari 5 · ' + (S.mlMode === 'ver' ? 'verifikasi' : 'self assessment') + '</span></div>' +
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
    var list = R.map(function (r) { return { no: String(r['No']), id: r['ID Risk'], des: r['Deskripsi Risiko'], p: parseLabel(r[col]) }; });
    var g = '<div class="rk-map" role="group" aria-label="Peta risiko ' + col + '">';
    ['E', 'D', 'C', 'B', 'A'].forEach(function (k) {
      g += '<div class="ry">' + KEM[k] + ' (' + k + ')</div>';
      for (var d = 1; d <= 5; d++) {
        var lv = MATRIKS[k][d - 1], here = list.filter(function (x) { return x.p && x.p.k === k && x.p.d === d; });
        g += '<div class="c" data-l="' + LV[lv] + '" title="' + k + d + ' · ' + lv + '">' +
          here.map(function (x) { return '<button type="button" class="rdot' + (S.riskOn === x.no ? ' on' : '') + '" data-r="' + esc(x.no) + '" title="' + esc(x.no + '. ' + x.des) + '">' + esc(x.no) + '</button>'; }).join('') + '</div>';
      }
    });
    g += '<div></div>';
    for (var d = 1; d <= 5; d++) g += '<div class="rx">' + d + '<br>' + DAM[d - 1] + '</div>';
    g += '</div><div class="rk-ax"><span>↑ Kemungkinan</span><span>Dampak →</span></div>';
    var urut = ['Rendah', 'Moderat', 'Tinggi', 'Sangat Tinggi', 'Ekstrem'], cnt = {};
    list.forEach(function (x) { if (x.p) cnt[x.p.level] = (cnt[x.p.level] || 0) + 1; });
    var ringkas = '<div class="rk-sum"><div class="rk-total"><b class="num">' + list.length + '</b><span>risiko</span></div><div class="rk-chips">' +
      urut.map(function (l) { return '<span' + (cnt[l] ? '' : ' class="nol"') + '><i style="background:var(--risk-' + LV[l] + ')"></i>' + l + ' <b class="num">' + (cnt[l] || 0) + '</b></span>'; }).join('') + '</div></div>';
    var daftar = '<div class="rk-list"><div class="rk-lh"><span>Daftar risiko · ' + col + '</span><span>' + list.length + '</span></div><div class="rk-rows" id="rkRows">' + (list.length ?
      list.map(function (x) {
        return '<button type="button" class="rk-row' + (S.riskOn === x.no ? ' on' : '') + '" data-r="' + esc(x.no) + '" title="' + esc(x.id) + '"><span class="num">' + esc(x.no) + '</span><span>' + esc(x.des) + '</span>' +
          (x.p ? '<span class="lv" style="background:var(--risk-' + LV[x.p.level] + ')">' + esc(x.p.level) + ' (' + x.p.k + x.p.d + ')</span>' : '<span class="lv">–</span>') + '</button>';
      }).join('') : '<div class="empty" style="border:0">File Profil Risiko belum terbaca.</div>') + '</div></div>';
    $('riskBody').innerHTML = '<div class="rk-l">' + g + ringkas + '</div>' + daftar;
    var on = S.riskOn && $('rkRows') && $('rkRows').querySelector('.rk-row.on');
    if (on) { var box = $('rkRows'); if (on.offsetTop < box.scrollTop || on.offsetTop > box.scrollTop + box.clientHeight - 30) box.scrollTop = on.offsetTop - 40; }
  }

  /* ---------- pengembangan pegawai (IDP) ---------- */
  var JALUR = [['Pembelajaran', 4, 7, 8], ['Coaching / Mentoring', 5, 9, 10], ['Penugasan', 6, 11, 12]];   // [nama, kolom rencana, realisasi, tanggal]
  var KEL_IDP = [
    ['4a', 'MAK, MA, MM, MD', /\b(MAK|MA|MM|MD)\b|MANAJ/i, /jenjang jabatan MAK/i],
    ['4b', 'Sr Specialist, Specialist, Profesi Khusus', /SPECIALIST|SPESIALIS|PROFESI/i, /Senior Specialist/i],
    ['4c', 'Generalist Tertentu & Generalist', /GENERALIS/i, /Generalist Tertentu/i],
    ['4d', 'Future Talent', /FUTURE/i, /Future Talent/i],
    ['4e', 'Suksesor Direksi BUMN', /SUKSESOR|DIREKSI/i, /suksesor Direksi/i]
  ];
  function idpRows() {
    return (S.data.idp || []).map(function (r) {
      var j = JALUR.map(function (x) { return { ren: !!String(r[x[1]] || '').trim(), real: !!String(r[x[2]] || '').trim(), tg: r[x[3]] }; });
      var ada = j.filter(function (x) { return x.ren; }), sel = ada.length && ada.every(function (x) { return x.real; });
      var kel = KEL_IDP.filter(function (k) { return k[2].test(r[3]); })[0] || KEL_IDP.filter(function (k) { return k[2].test(r[2]); })[0];
      return { r: r, j: j, ada: ada.length, selesai: !!sel, kel: kel ? kel[0] : '–' };
    });
  }
  function kelKonman(k) {
    var it = find(k[3]), Bn = B(); if (!it || !konmanAda(Bn) || !D.hasData(it, Bn)) return null;
    return D.capaianItem(it, Bn);
  }
  function renderIdp() {
    var L = idpRows(), el = $('idpBody');
    if (!S.data.idp) { el.innerHTML = '<div class="empty">Data IDP belum terbaca. Pastikan Apps Script sudah versi terbaru dan tab <b>Data - IDP</b> ada.</div>'; return; }
    if (!L.length) { el.innerHTML = '<div class="empty">Tab Data - IDP masih kosong. Tempel data di ' + sheetLink('Google Sheets', 'Data - IDP') + '.</div>'; return; }
    var sel = L.filter(function (x) { return x.selesai; }).length, tanpa = L.filter(function (x) { return !x.ada; }).length;
    var jal = JALUR.map(function (x, i) { var ren = L.filter(function (p) { return p.j[i].ren; }), done = ren.filter(function (p) { return p.j[i].real; }).length; return [x[0], done, ren.length]; });
    var lain = L.filter(function (p) { return p.kel === '–'; }).length;
    el.innerHTML = '<div class="mini-sum"><div><b class="num">' + L.length + '</b><span>pegawai punya IDP</span></div><div><b class="num good">' + sel + '</b><span>selesai semua jalur</span></div><div><b class="num ' + (L.length - sel ? 'warn' : '') + '">' + (L.length - sel) + '</b><span>belum lengkap' + (tanpa ? ' (' + tanpa + ' tanpa rencana)' : '') + '</span></div></div>' +
      '<div class="sub-h">Per jalur (10-20-70)</div><div class="bars">' + jal.map(function (x) { return '<div class="r"><span>' + x[0] + '</span><span class="t"><i style="width:' + (x[2] ? x[1] / x[2] * 100 : 0) + '%;background:var(--good)"></i></span><span class="num">' + x[1] + '/' + x[2] + '</span></div>'; }).join('') + '</div>' +
      '<div class="sub-h">Per kelompok jenjang (indikator Konman 4a–4e)</div><div class="tbl-wrap"><table class="tbl2"><thead><tr><th>Kelompok</th><th class="r">Pegawai</th><th>Selesai</th><th class="r">Konman ' + D.BLN3[S.bulan - 1] + '</th></tr></thead><tbody>' +
      KEL_IDP.map(function (k) {
        var g = L.filter(function (p) { return p.kel === k[0]; }), d = g.filter(function (p) { return p.selesai; }).length, kv = kelKonman(k), st = status(kv);
        return '<tr><td>' + k[0] + ' · ' + esc(k[1]) + '</td><td class="r">' + g.length + '</td><td>' + (g.length ? '<div class="pbar"><span><i style="width:' + (d / g.length * 100) + '%"></i></span><b class="num">' + d + '</b></div>' : '<span class="desc">tidak ada peserta</span>') + '</td>' +
          '<td class="r ' + st.c + '"><b>' + (kv === null ? '–' : D.fmt(kv * 100, 0) + '%') + '</b></td></tr>';
      }).join('') + '</tbody></table></div>' +
      (lain ? '<div class="warnbox">' + lain + ' pegawai belum masuk kelompok mana pun. Periksa isi kolom Pemetaan IDP (mis. GENERALIST, SPECIALIST, FUTURE TALENT).</div>' : '') +
      '<button class="btn" type="button" data-act="idp">Lihat per pegawai →</button>';
  }
  function openIdp() {
    var L = idpRows();
    openModal('<div class="modal-h"><div><h3>IDP per pegawai</h3><div class="desc">✓ = sudah ada realisasi · – = belum · kosong = tidak direncanakan · ' + L.length + ' pegawai</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tools"><input class="inp" id="idQ" type="search" placeholder="Cari nama" aria-label="Cari nama"><select class="inp" id="idK" aria-label="Kelompok" style="max-width:220px"><option value="">Semua kelompok</option>' + KEL_IDP.map(function (k) { return '<option value="' + k[0] + '">' + k[0] + ' · ' + esc(k[1]) + '</option>'; }).join('') + '<option value="–">Belum berkelompok</option></select>' +
      '<select class="inp" id="idS" aria-label="Status" style="max-width:180px"><option value="">Semua status</option><option value="b">Belum lengkap</option><option value="s">Selesai</option></select></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pegawai</th><th>Kelompok</th>' + JALUR.map(function (x) { return '<th>' + x[0] + '</th>'; }).join('') + '<th>Eviden</th></tr></thead><tbody id="idT"></tbody></table></div><div class="note" id="idN"></div>');
    function sel(p, i) {
      var x = p.j[i], r = p.r; if (!x.ren) return '<td class="desc"></td>';
      return '<td title="' + esc('Rencana: ' + r[JALUR[i][1]] + (x.real ? '\nRealisasi: ' + r[JALUR[i][2]] : '')) + '">' + (x.real ? '<span class="ok">✓</span> <span class="desc">' + esc(String(x.tg || '').slice(0, 24)) + '</span>' : '<span class="no">– belum</span>') + '</td>';
    }
    function fill() {
      var q = $('idQ').value.toLowerCase(), k = $('idK').value, st = $('idS').value;
      var F = L.filter(function (p) { return (!q || String(p.r[0]).toLowerCase().indexOf(q) >= 0) && (!k || p.kel === k) && (!st || (st === 's') === p.selesai); });
      $('idT').innerHTML = F.map(function (p) {
        var link = String(p.r[13] || '').trim();
        return '<tr><td><b>' + esc(judulNama(p.r[0])) + '</b><div class="desc">' + esc(p.r[2] || p.r[1] || '') + '</div></td><td>' + esc(p.kel) + '</td>' + sel(p, 0) + sel(p, 1) + sel(p, 2) +
          '<td>' + (/^https?:\/\//i.test(link) ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">buka ↗</a>' : '<span class="desc">' + esc(link || '–') + '</span>') + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="desc">Tidak ada yang cocok.</td></tr>';
      $('idN').textContent = F.length + ' dari ' + L.length + ' pegawai · arahkan kursor ke sel untuk melihat rencana dan realisasi';
    }
    ['idQ', 'idK', 'idS'].forEach(function (id) { $(id).addEventListener(id === 'idQ' ? 'input' : 'change', fill); }); fill();
  }

  /* ---------- pengembangan inovasi ---------- */
  var TAHAP = ['1. Ide', '2. Perencanaan', '3. Uji Coba', '4. Implementasi', '5. Replikasi / Standardisasi'];
  function inoRows() {
    var hari = new Date(); hari.setHours(0, 0, 0, 0);
    return D.rows(S.data.inovasi).filter(function (r) { return String(r['Judul Inovasi'] || '').trim(); }).map(function (r) {
      var th = String(r['Tahun'] || '').trim(), mulai = D.tgl(r['Tgl Mulai']);
      if (!th && mulai) th = String(mulai.getFullYear());
      var tp = parseInt(String(r['Tahap'] || ''), 10), st = String(r['Status'] || '').trim(), tgt = D.tgl(r['Target Selesai']), sls = D.tgl(r['Realisasi Selesai']);
      var w;   // status ketepatan waktu
      if (/dihentikan/i.test(st)) w = ['Dihentikan', ''];
      else if (/selesai/i.test(st)) w = tgt && sls && sls > tgt ? ['Selesai terlambat', 'warn'] : ['Selesai tepat waktu', 'good'];
      else if (tgt && tgt < hari) w = ['Lewat target, belum selesai', 'bad'];
      else if (/tertunda/i.test(st)) w = ['Tertunda', 'warn'];
      else if (/belum/i.test(st)) w = ['Belum dimulai', ''];
      else w = ['Berjalan', ''];
      return { r: r, tahun: th, kinerja: /kinerja/i.test(r['Kategori']), tahap: tp >= 1 && tp <= 5 ? tp : 0, w: w, nilai: D.num(r['Nilai Manfaat (Rp/tahun)']), tgt: tgt };
    }).filter(function (x) { return x.tahun === String(S.tahun); });
  }
  function rupiah(n) {
    if (!n) return 'Rp 0';
    return n >= 1e9 ? 'Rp ' + D.fmt(n / 1e9, 2) + ' M' : n >= 1e6 ? 'Rp ' + D.fmt(n / 1e6, 1) + ' jt' : 'Rp ' + D.fmt(n, 0);
  }
  function renderIno() {
    var el = $('inoBody'), it = find(/Pengembangan Inovasi/i), Bn = B(), kv = it && konmanAda(Bn) && D.hasData(it, Bn) ? D.capaianItem(it, Bn) : null, kst = status(kv);
    $('inoKon').className = 'kon ' + (kv === null ? '' : kst.c); $('inoKon').textContent = 'Konman no. 9 · ' + namaBulan(S.bulan) + ': ' + (kv === null ? '–' : D.fmt(kv * 100, 0) + '%');
    $('inoDesc').textContent = 'Tab Data - Inovasi · tahun ' + S.tahun;
    if (!S.data.inovasi || !S.data.inovasi.length) { el.innerHTML = '<div class="empty">Data inovasi belum terbaca. Pastikan Apps Script sudah versi terbaru dan tab <b>Data - Inovasi</b> ada.</div>'; return; }
    var L = inoRows();
    if (!L.length) { el.innerHTML = '<div class="empty">Belum ada inovasi tahun ' + S.tahun + '. Isi di ' + sheetLink('Google Sheets', 'Data - Inovasi') + ' (kolom Tahun = ' + S.tahun + ').</div>'; return; }
    var nk = L.filter(function (x) { return x.kinerja; }).length, impl = L.filter(function (x) { return x.tahap >= 4; }).length, tot = L.reduce(function (s, x) { return s + (x.nilai || 0); }, 0), mx = L.length;
    var wk = {}; L.forEach(function (x) { wk[x.w[0]] = wk[x.w[0]] || [0, x.w[1]]; wk[x.w[0]][0]++; });
    var urutW = ['Selesai tepat waktu', 'Selesai terlambat', 'Berjalan', 'Lewat target, belum selesai', 'Tertunda', 'Belum dimulai', 'Dihentikan'];
    el.innerHTML = '<div class="mini-sum"><div><b class="num">' + L.length + '</b><span>inovasi · <span class="pk">' + nk + ' Kinerja</span> <span class="pk u">' + (L.length - nk) + ' UPDL</span></span></div>' +
      '<div><b class="num good">' + impl + '</b><span>sudah implementasi / replikasi</span></div><div><b class="num">' + rupiah(tot) + '</b><span>nilai manfaat per tahun</span></div></div>' +
      '<div class="sub-h">Per tahap</div><div class="bars">' + TAHAP.map(function (t, i) {
        var a = L.filter(function (x) { return x.tahap === i + 1 && x.kinerja; }).length, b = L.filter(function (x) { return x.tahap === i + 1 && !x.kinerja; }).length;
        return '<div class="r" title="' + esc(t + ': ' + a + ' Kinerja, ' + b + ' UPDL') + '"><span>' + t + '</span><span class="t">' + (a ? '<i style="width:' + (a / mx * 100) + '%;background:var(--accent)"></i>' : '') + (b ? '<i style="width:' + (b / mx * 100) + '%;background:var(--bar)"></i>' : '') + '</span><span class="num">' + (a + b) + '</span></div>';
      }).join('') + (L.some(function (x) { return !x.tahap; }) ? '<div class="note">' + L.filter(function (x) { return !x.tahap; }).length + ' inovasi belum diisi kolom Tahap.</div>' : '') + '</div>' +
      '<div class="legend" style="margin-top:0"><span><i style="background:var(--accent)"></i>Kinerja (Konman)</span><span><i style="background:var(--bar)"></i>UPDL</span></div>' +
      '<div class="sub-h">Status &amp; ketepatan waktu</div><div class="chips2">' + urutW.filter(function (k) { return wk[k]; }).map(function (k) { return '<span class="' + wk[k][1] + '">' + k + ' ' + wk[k][0] + '</span>'; }).join('') + '</div>' +
      '<button class="btn" type="button" data-act="ino">Lihat daftar inovasi →</button>';
  }
  function openIno() {
    var L = inoRows(), tot = L.reduce(function (s, x) { return s + (x.nilai || 0); }, 0), nk = L.filter(function (x) { return x.kinerja; }).length, f = '';
    openModal('<div class="modal-h"><div><h3>Daftar Inovasi · ' + S.tahun + '</h3><div class="desc">' + L.length + ' inovasi · nilai manfaat ' + rupiah(tot) + '/tahun · klik baris untuk rincian</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tabs" role="tablist"><button type="button" data-if="" aria-selected="true">Semua (' + L.length + ')</button><button type="button" data-if="k" aria-selected="false">Kinerja (' + nk + ')</button><button type="button" data-if="u" aria-selected="false">UPDL (' + (L.length - nk) + ')</button></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Inovasi</th><th>Kategori</th><th>PIC</th><th>Tahap</th><th class="r">Progres</th><th>Target</th><th>Status</th><th class="r">Manfaat/thn</th></tr></thead><tbody id="inT"></tbody></table></div>');
    function fill() {
      $('inT').innerHTML = L.filter(function (x) { return !f || (f === 'k') === x.kinerja; }).map(function (x, i) {
        var r = x.r, pr = D.num(r['Progres (%)']), t = x.tgt;
        return '<tr class="klik" tabindex="0" data-in="' + L.indexOf(x) + '"><td><b>' + esc(r['Judul Inovasi']) + '</b><div class="desc">' + esc([r['Ketua Tim'] ? 'Ketua: ' + r['Ketua Tim'] : '', r['Jenis Inovasi']].filter(Boolean).join(' · ')) + '</div></td>' +
          '<td><span class="pk' + (x.kinerja ? '' : ' u') + '">' + (x.kinerja ? 'Kinerja' : 'UPDL') + '</span></td><td>' + esc(r['Bidang / PIC']) + '</td><td>' + esc(x.tahap ? TAHAP[x.tahap - 1] : '–') + '</td>' +
          '<td class="r">' + (pr === null ? '–' : D.fmt(pr, 0) + '%') + '</td><td>' + (t ? ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) : '–') + '</td><td class="' + x.w[1] + '">' + x.w[0] + '</td><td class="r">' + (x.nilai ? rupiah(x.nilai) : '–') + '</td></tr>' +
          '<tr class="det" data-dn="' + L.indexOf(x) + '" hidden><td colspan="8" class="ket"><b>Masalah:</b> ' + esc(r['Masalah yang Diselesaikan'] || '–') + '<br><b>Manfaat:</b> ' + esc(r['Manfaat'] || '–') + '<br><b>Anggota:</b> ' + esc(r['Anggota Tim'] || '–') +
          (r['Kompetisi / Pengakuan'] ? '<br><b>Pengakuan:</b> ' + esc(r['Kompetisi / Pengakuan']) : '') + (/^https?:\/\//i.test(String(r['Link Eviden'] || '')) ? '<br><a href="' + esc(r['Link Eviden']) + '" target="_blank" rel="noopener">Buka eviden ↗</a>' : '') + (r['Keterangan'] ? '<br><b>Keterangan:</b> ' + esc(r['Keterangan']) : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="8" class="desc">Tidak ada.</td></tr>';
    }
    fill();
    Array.prototype.forEach.call($('modalC').querySelectorAll('[data-if]'), function (b) { b.addEventListener('click', function () { f = b.getAttribute('data-if'); Array.prototype.forEach.call($('modalC').querySelectorAll('[data-if]'), function (x) { x.setAttribute('aria-selected', x === b); }); fill(); }); });
    function buka(e) { var tr = e.target.closest('[data-in]'); if (!tr || e.target.closest('a')) return; if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); var d = $('inT').querySelector('[data-dn="' + tr.getAttribute('data-in') + '"]'); d.hidden = !d.hidden; }
    $('inT').addEventListener('click', buka); $('inT').addEventListener('keydown', buka);
  }

  /* ---------- struktur organisasi ---------- */
  function judulNama(t) {   // HURUF BESAR -> Huruf Awal Besar, singkatan tetap
    return String(t || '').toLowerCase().replace(/(^|[\s(\/,.-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/\b(Pln|Updl|Tl|Sof|K3l|Pdkb|Pt|Cs|Fo|Jar|Pku|Pbj|Lab|Asman)\b/g, function (w) { return w === 'Asman' ? 'Asman' : w.toUpperCase(); })
      .replace(/\b(Dan)\b/g, 'dan');
  }
  function openOrg() {
    openModal('<div class="modal-h"><div><h3>Struktur Organisasi</h3><div class="desc" id="orgDesc">PLN UPDL Semarang</div></div>' +
      '<div class="row-gap"><div class="seg" role="group" aria-label="Tampilan struktur"><button type="button" data-ov="peg" aria-pressed="true">Pegawai PLN</button><button type="button" data-ov="ad" aria-pressed="false">Tenaga Alih Daya</button></div><button class="btn" data-close>Tutup</button></div></div><div id="orgBody"></div>', 'xwide');
    renderOrg();
  }
  function renderOrg() {
    var O = S.data.org, el = $('orgBody');
    Array.prototype.forEach.call(document.querySelectorAll('[data-ov]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ov') === S.orgView); });
    if (!el) return;
    if (!O) { el.innerHTML = '<div class="empty">Data struktur organisasi belum terbaca. Pastikan Apps Script sudah versi terbaru dan tab <b>Data - Pegawai</b> ada di spreadsheet.</div>'; return; }
    $('orgDesc').textContent = 'PLN UPDL Semarang' + (O.periode ? ' · data pegawai periode ' + O.periode : '') + ' · bagan disusun dari kolom Atasan Langsung';
    var P = O.pegawai || [], AD = O.alihDaya || [];
    if (S.orgView === 'ad') {
      var bg = {}, ur = [], pr = {};
      AD.forEach(function (x) { var k = x[2] + '|' + x[1]; if (!bg[k]) { bg[k] = { b: x[2], p: x[1], n: [], lok: {} }; ur.push(k); } bg[k].n.push(x[0]); if (x[3]) bg[k].lok[x[3]] = 1; pr[x[1] || '–'] = (pr[x[1] || '–'] || 0) + 1; });
      var mx = Math.max.apply(null, ur.map(function (k) { return bg[k].n.length; }).concat([1]));
      ur.sort(function (a, b) { return bg[b].n.length - bg[a].n.length || a.localeCompare(b); });
      el.innerHTML = '<div class="org-v"><div class="org-sum"><div><b class="num">' + AD.length + '</b><span>tenaga alih daya</span></div>' +
        Object.keys(pr).map(function (p) { return '<div><b class="num">' + pr[p] + '</b><span>' + esc(judulNama(p)) + '</span></div>'; }).join('') + '</div>' +
        (AD.length ? '<div class="sub-h">Per bagian (klik untuk melihat nama)</div><div class="ad">' + ur.map(function (k) {
          var x = bg[k];
          return '<details class="grp"><summary><span><b>' + esc(x.b) + '</b><small>' + esc(judulNama(x.p)) + (Object.keys(x.lok).length ? ' · ' + esc(Object.keys(x.lok).map(judulNama).join(', ')) : '') + '</small></span><span class="c num">' + x.n.length + '</span><span class="bar"><i style="width:' + (x.n.length / mx * 100) + '%"></i></span></summary><ol>' +
            x.n.map(function (n) { return '<li>' + esc(judulNama(n)) + '</li>'; }).join('') + '</ol></details>';
        }).join('') + '</div>' : '<div class="empty">Tab Data - Alih Daya masih kosong.</div>') + '</div>';
      return;
    }
    if (!P.length) { el.innerHTML = '<div class="empty">Tab Data - Pegawai masih kosong.</div>'; return; }
    /* satu kotak = satu jabatan dengan atasan yang sama (bisa beberapa pemegang) */
    var G = [], idx = {};
    P.forEach(function (p) {
      var j = p[1].toUpperCase(), a = String(p[2] || '').toUpperCase(), k = j + '|' + a;
      if (!idx[k]) { idx[k] = { id: G.length, j: j, a: a, fung: /FUNGSIONAL/i.test(p[3]), org: [], kids: [] }; G.push(idx[k]); }
      idx[k].org.push(judulNama(p[0]));
    });
    var root = null;
    G.forEach(function (g) { var par = G.filter(function (x) { return x !== g && x.j === g.a; })[0]; if (par) { g.par = par; par.kids.push(g); } });
    root = G.filter(function (g) { return !g.par; })[0];
    G.forEach(function (g) { if (!g.par && g !== root) { g.par = root; g.yatim = true; root.kids.push(g); } });   // atasan tidak ditemukan: diletakkan di bawah pimpinan
    root.kids.sort(function (a, b) { return a.kids.length - b.kids.length; });
    S.orgG = G;
    function node(g, cls) {
      return '<button type="button" class="onode' + (g.fung ? ' fung' : '') + (cls ? ' ' + cls : '') + (S.orgOn === g.id ? ' on' : '') + '" data-og="' + g.id + '"><span class="j">' + esc(judulNama(g.j)) + '</span><span class="n">' +
        g.org.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</span></button>';
    }
    function tree(g) { return node(g) + (g.kids.length ? '<div class="kids">' + g.kids.map(function (k) { return '<div>' + tree(k) + '</div>'; }).join('') + '</div>' : ''); }
    var st = P.filter(function (p) { return !/FUNGSIONAL/i.test(p[3]); }).length, yatim = G.filter(function (g) { return g.yatim; });
    el.innerHTML = '<div class="org-v"><div class="org-sum"><div><b class="num">' + P.length + '</b><span>pegawai PLN</span></div><div><b class="num">' + st + '</b><span>struktural</span></div><div><b class="num">' + (P.length - st) + '</b><span>fungsional</span></div><div><b class="num">' + AD.length + '</b><span>tenaga alih daya</span></div></div>' +
      '<div class="org">' + node(root, 'root') + (root.kids.length ? '<div class="vline v2"></div><div class="lv1" style="--k:' + root.kids.length + '">' + root.kids.map(function (k) { return '<div class="col">' + tree(k) + '</div>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="org-leg"><span><i></i>Struktural</span><span><i class="f"></i>Fungsional</span></div>' +
      (yatim.length ? '<div class="warnbox">Atasan langsung tidak ditemukan untuk: ' + yatim.map(function (g) { return esc(judulNama(g.j)) + ' (atasan tertulis "' + esc(g.a) + '")'; }).join('; ') + '. Samakan isi kolom Atasan Langsung dengan kolom Jabatan atasannya.</div>' : '') +
      '<div class="org-info" id="orgInfo">' + orgInfo(S.orgOn) + '</div></div>';
  }
  function orgInfo(id) {
    var g = S.orgG && S.orgG[id]; if (!g) return 'Klik kotak jabatan untuk melihat atasan dan jumlah bawahannya.';
    var bawah = 0; (function c(x) { x.kids.forEach(function (k) { bawah += k.org.length; c(k); }); })(g);
    return '<b>' + esc(judulNama(g.j)) + '</b> · ' + g.org.map(esc).join(', ') + '<br>Atasan langsung: ' + (g.par ? esc(judulNama(g.par.j)) : '–') + ' · Bawahan (semua tingkat): ' + bawah + ' orang · ' + (g.fung ? 'Fungsional' : 'Struktural');
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
  var REKAP = { l3: ['Rekap L3 Perilaku', 'l3', 'Tanggal Evaluasi'], l4: ['Rekap L4 Kinerja', 'l4', 'Tanggal Evaluasi'], roti: ['Rekap ROTI', 'roti', 'Tanggal'] };

  /* ---------- rincian evaluasi dari data mentah ---------- */
  function tglPendek(iso) { var t = D.tgl(iso); return t ? t.getDate() + ' ' + D.BLN3[t.getMonth()] + ' ' + t.getFullYear() : ''; }
  function nilaiKls(v, t) { return v === null || v === undefined ? 'idle' : skala5(v, t).c; }
  function barH(label, v, maks, teksV, warna, judul) {
    return '<div class="r"' + (judul ? ' title="' + esc(judul) + '"' : '') + '><span>' + esc(label) + '</span><span class="t"><i style="width:' + (v === null ? 0 : Math.max(0, Math.min(1, v / maks)) * 100) + '%;background:var(--' + (warna || 'bar') + ')"></i></span><span class="num">' + teksV + '</span></div>';
  }
  function kosongEval(tab) { return '<div class="empty">Belum ada data s.d. ' + namaBulan(S.bulan) + ' ' + S.tahun + '. Tempel hasil tarikan di ' + sheetLink('Google Sheets', tab) + '.</div>'; }
  function judulEval(judul, desc) { return '<div class="modal-h"><div><h3>' + judul + '</h3><div class="desc">' + desc + '</div></div><button class="btn" data-close>Tutup</button></div>'; }
  function pasangTab() {
    Array.prototype.forEach.call($('modalC').querySelectorAll('[data-tab]'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call($('modalC').querySelectorAll('[data-tab]'), function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); $(x.getAttribute('data-tab')).hidden = x !== b; });
      });
    });
  }
  function urutPel(L) { return L.slice().sort(function (a, b) { return a.tg < b.tg ? 1 : a.tg > b.tg ? -1 : 0; }); }

  function openKepuasan() {
    var K = ev('kepuasan'), per = ' · s.d. ' + namaBulan(S.bulan) + ' ' + S.tahun;
    if (!K || !K.pelatihan) return openModal(judulEval('Kepuasan Peserta' + per, 'Evaluasi Level 1') + kosongEval('Data - Kepuasan EL1'));
    var t = set().targetL1;
    openModal(judulEval('Kepuasan Peserta' + per, 'Rata-rata ' + D.fmt(K.nilai, 2) + ' dari semua butir (kolom berakhiran -Val tidak dihitung) · ' + D.fmt(K.responden, 0) + ' responden · ' + K.pelatihan + ' pelatihan' + (t ? ' · target ' + D.fmt(t, 2) : '')) +
      '<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-tab="kA">Per aspek</button><button type="button" role="tab" aria-selected="false" data-tab="kB">Per butir</button><button type="button" role="tab" aria-selected="false" data-tab="kC">Per pelatihan</button></div>' +
      '<div id="kA" class="bars">' + K.aspek.map(function (a) { return barH(a.nama, a.nilai, 5, D.fmt(a.nilai, 2), nilaiKls(a.nilai, t) === 'bad' ? 'bad' : 'bar', D.fmt(a.n, 0) + ' jawaban'); }).join('') + '</div>' +
      '<div id="kB" class="tbl-wrap scroll" hidden><table class="tbl"><thead><tr><th>Aspek</th><th>Butir (judul kolom)</th><th class="r">Rata-rata</th><th class="r">Jawaban</th></tr></thead><tbody>' +
        K.butir.map(function (b) { return '<tr><td>' + esc(b.aspek) + '</td><td>' + esc(b.label) + '</td><td class="r ' + nilaiKls(b.nilai, t) + '"><b>' + D.fmt(b.nilai, 2) + '</b></td><td class="r">' + D.fmt(b.n, 0) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div id="kC" class="tbl-wrap scroll" hidden><table class="tbl"><thead><tr><th>Pelatihan</th><th>Selesai</th><th class="r">Responden</th><th class="r">Nilai</th></tr></thead><tbody>' +
        urutPel(K.pel).map(function (x) { return '<tr><td>' + esc(x.judul) + '</td><td>' + tglPendek(x.tg) + '</td><td class="r">' + D.fmt(x.n, 0) + '</td><td class="r ' + nilaiKls(x.nilai, t) + '"><b>' + D.fmt(x.nilai, 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="note">Judul butir mengikuti judul kolom di tab <b>Data - Kepuasan EL1</b>. Aspek = awalan sebelum tanda "-" (Ins, Mat, Sarpras, Dig).</div>');
    pasangTab();
  }

  function openInstruktur() {
    var I = ev('instruktur'), per = ' · s.d. ' + namaBulan(S.bulan) + ' ' + S.tahun, t = set().targetInstruktur;
    if (!I || !I.instruktur.length) return openModal(judulEval('Penilaian Instruktur' + per, 'Evaluasi Level 1') + kosongEval('Data - Instruktur EL1'));
    var dUmum = I.instruktur.length + ' instruktur · ' + D.fmt(I.penilaian, 0) + ' penilaian · rata-rata ' + D.fmt(I.nilai, 2) + ' (kolom -Val, K. dan Durasi Mengajar tidak dihitung)';
    openModal(judulEval('<span id="insJ">Penilaian Instruktur' + per + '</span>', '<span id="insD">' + esc(dUmum) + '</span>') +
      '<div id="insList" style="display:grid;gap:10px"><div class="tools"><input class="inp" id="insQ" type="search" placeholder="Cari nama instruktur" aria-label="Cari nama instruktur">' +
      '<select class="inp" id="insSort" aria-label="Urutkan" style="max-width:200px"><option value="t">Nilai tertinggi</option><option value="r">Nilai terendah</option><option value="n">Nama A–Z</option><option value="p">Pelatihan terbanyak</option></select></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Instruktur</th><th>Tipe</th><th class="r">Pelatihan</th><th class="r">Penilaian</th><th class="r">Nilai</th></tr></thead><tbody id="insBody"></tbody></table></div><div class="note">Klik nama untuk melihat nilai per pelatihan.</div></div>' +
      '<div id="insDet" hidden style="display:grid;gap:10px"></div>');
    function daftar() {
      var q = $('insQ').value.toLowerCase(), so = $('insSort').value;
      var L = I.instruktur.filter(function (x) { return x.nama.toLowerCase().indexOf(q) >= 0; });
      L.sort(function (a, b) { return so === 't' ? (b.nilai || 0) - (a.nilai || 0) : so === 'r' ? (a.nilai || 0) - (b.nilai || 0) : so === 'p' ? b.pel.length - a.pel.length : a.nama.localeCompare(b.nama); });
      $('insBody').innerHTML = L.map(function (x) {
        return '<tr class="klik" tabindex="0" data-ins="' + x.i + '"><td><b>' + esc(x.nama) + '</b></td><td>' + esc(x.tipe) + '</td><td class="r">' + x.pel.length + '</td><td class="r">' + D.fmt(x.n, 0) + '</td><td class="r ' + nilaiKls(x.nilai, t) + '"><b>' + D.fmt(x.nilai, 2) + '</b></td></tr>';
      }).join('') || '<tr><td colspan="5" class="desc">Tidak ada nama yang cocok.</td></tr>';
    }
    function detail(i) {
      var x = I.instruktur.filter(function (o) { return o.i === i; })[0]; if (!x) return;
      $('insJ').textContent = x.nama; $('insD').textContent = (x.tipe ? x.tipe + ' · ' : '') + x.pel.length + ' pelatihan · ' + D.fmt(x.n, 0) + ' penilaian · rata-rata ' + D.fmt(x.nilai, 2);
      $('insDet').innerHTML = '<button class="back" type="button" id="insBack">← Semua instruktur</button>' +
        '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Angkatan</th><th>Selesai</th><th class="r">Penilaian</th><th class="r">Nilai</th></tr></thead><tbody>' +
        urutPel(x.pel).map(function (p) { return '<tr><td>' + esc(p.judul) + '</td><td>' + esc(p.angkatan) + '</td><td>' + tglPendek(p.tg) + '</td><td class="r">' + D.fmt(p.n, 0) + '</td><td class="r ' + nilaiKls(p.nilai, t) + '"><b>' + D.fmt(p.nilai, 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="sub-h">Rata-rata per butir</div><div class="bars">' + x.butir.filter(function (b) { return b.nilai !== null; }).map(function (b) { return barH(b.label, b.nilai, 5, D.fmt(b.nilai, 2)); }).join('') + '</div>';
      $('insList').hidden = true; $('insDet').hidden = false;
      $('insBack').addEventListener('click', function () { $('insJ').textContent = 'Penilaian Instruktur' + per; $('insD').textContent = dUmum; $('insDet').hidden = true; $('insList').hidden = false; });
      $('insBack').focus();
    }
    $('insQ').addEventListener('input', daftar); $('insSort').addEventListener('change', daftar); daftar();
    $('insBody').addEventListener('click', function (e) { var tr = e.target.closest('[data-ins]'); if (tr) detail(+tr.getAttribute('data-ins')); });
    $('insBody').addEventListener('keydown', function (e) { var tr = e.target.closest('[data-ins]'); if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); detail(+tr.getAttribute('data-ins')); } });
  }

  function openKsa() {
    var K = ev('ksa'), per = ' · s.d. ' + namaBulan(S.bulan) + ' ' + S.tahun;
    if (!K || !K.pel.length) return openModal(judulEval('Peningkatan KSA' + per, 'Evaluasi Level 2 formatif') + kosongEval('Data - KSA EL2'));
    openModal(judulEval('Peningkatan KSA' + per, 'Rata-rata nilai ' + D.fmt(K.nilai, 1) + ' · hanya peserta Kehadiran = Hadir dan Kelulusan = Lulus (' + D.fmt(K.peserta, 0) + ' dari ' + D.fmt(K.semua, 0) + ' baris)') +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Selesai</th><th class="r">Hadir & Lulus</th><th class="r">Semua peserta</th><th class="r">Rata-rata</th></tr></thead><tbody>' +
      urutPel(K.pel).map(function (x) { return '<tr><td>' + esc(x.judul) + '</td><td>' + tglPendek(x.tg) + '</td><td class="r">' + D.fmt(x.n, 0) + '</td><td class="r">' + D.fmt(x.semua, 0) + '</td><td class="r"><b>' + D.fmt(x.nilai, 1) + '</b></td></tr>'; }).join('') + '</tbody></table></div>');
  }

  function openCc() {
    var C = ev('cc'), per = ' · s.d. ' + namaBulan(S.bulan) + ' ' + S.tahun;
    if (!C || !C.pel.length) return openModal(judulEval('Confidence & Commitment' + per, 'Evaluasi Level 2 sumatif') + kosongEval('Data - C&C EL2'));
    openModal(judulEval('Confidence & Commitment' + per, 'Confidence ' + D.fmt(C.conf, 2) + ' · Commitment ' + D.fmt(C.comm, 2) + ' · skala 1–' + (set().skalaCC || 4) + ' · ' + D.fmt(C.n, 0) + ' pengisian') +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Selesai</th><th class="r">Pengisian</th><th class="r">Confidence</th><th class="r">Commitment</th></tr></thead><tbody>' +
      urutPel(C.pel).map(function (x) { return '<tr><td>' + esc(x.judul) + '</td><td>' + tglPendek(x.tg) + '</td><td class="r">' + D.fmt(x.n, 0) + '</td><td class="r"><b>' + D.fmt(x.conf, 2) + '</b></td><td class="r"><b>' + D.fmt(x.comm, 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>');
  }

  function openSert() {
    var Se = ev('sertifikat'), bl = namaBulan(S.bulan);
    if (!Se || !Se.total) return openModal(judulEval('Sertifikat · ' + S.tahun, 'Status penerbitan sertifikat') + kosongEval('Data - Sertifikat'));
    var mx = Math.max.apply(null, Se.cnt.concat([1]));
    var warna = function (i) { return i === 0 ? 'good' : i <= 4 ? 'warn' : i <= 6 ? 'bad' : 'idle'; };
    openModal(judulEval('Sertifikat · s.d. ' + bl + ' ' + S.tahun, 'Terbit = status Finish TTE GM, dihitung dari Tgl.Terbit. Yang belum terbit dihitung menurut tanggal selesai pelatihan.') +
      '<div class="tl-sum"><div><b class="num good">' + D.fmt(Se.terbit, 0) + '</b><span>Terbit s.d. ' + bl + '</span></div><div><b class="num">' + D.fmt(Se.bulan, 0) + '</b><span>Terbit di ' + bl + ' saja</span></div>' +
      '<div><b class="num">' + D.fmt(Se.pct * 100, 0) + '% / ' + D.fmt((1 - Se.pct) * 100, 0) + '%</b><span>Terbit / belum terbit (' + D.fmt(Se.total, 0) + ' sertifikat)</span></div></div>' +
      '<div class="sub-h">Jumlah per status</div><div class="bars">' + Se.status.map(function (st, i) { return barH(st, Se.cnt[i], mx, D.fmt(Se.cnt[i], 0), warna(i)); }).join('') + '</div>');
  }

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
  function openModal(html, kelas) { lastFocus = document.activeElement; $('modalC').className = 'modal-c' + (kelas ? ' ' + kelas : ''); $('modalC').innerHTML = html; $('modal').hidden = false; var b = $('modalC').querySelector('[data-close]'); if (b) b.focus(); }
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
  /* Satu bagian yang gagal tidak menghentikan bagian lain */
  function renderAll() {
    var gagal = [];
    [['Kartu utama', renderKpis], ['Evaluasi', renderMinis], ['Grafik bulanan', renderChart], ['Indikator', renderInd], ['Kepatuhan', renderKep],
     ['Tindak lanjut', renderTL], ['Maturity', renderMl], ['IDP', renderIdp], ['Inovasi', renderIno], ['Peta risiko', renderRisk], ['Struktur organisasi', renderOrg]].forEach(function (x) {
      try { x[1](); } catch (e) { gagal.push(x[0]); if (window.console) console.error(x[0], e); }
    });
    var w = $('warn'), id = 'warnRender', ada = $(id);
    if (ada) ada.remove();
    if (!gagal.length && !w.textContent.trim()) w.hidden = true;
    if (gagal.length) {
      var d = document.createElement('div'); d.id = id;
      d.innerHTML = 'Bagian ' + gagal.map(esc).join(', ') + ' tidak bisa ditampilkan. Tekan <b>Muat ulang</b> di browser (Ctrl+Shift+R / Cmd+Shift+R) untuk memuat versi terbaru website.';
      w.hidden = false; w.className = 'warnbox'; w.appendChild(d);
    }
  }

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
    if (m.peran) aturPeran(m.peran, m.user);
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
    $('footNote').textContent = 'Sumber: Konman, Rendiklat, MLI Probis (sheet SMG), Profil Risiko, dan spreadsheet Data Dashboard UPDL Semarang' + (m.source === 'live' ? ' · dimuat ulang otomatis tiap 5 menit' : '');
  }

  /* ---------- login & peran ---------- */
  function aturPeran(peran, user) {
    S.peran = peran === 'admin' ? 'admin' : 'lihat';
    document.body.classList.toggle('peran-admin', S.peran === 'admin');
    $('who').textContent = (user ? user + ' · ' : '') + (S.peran === 'admin' ? 'Admin' : 'Akun Lihat');
    $('avatar').textContent = (user || 'U').charAt(0).toUpperCase();
  }
  function tampilLogin(pesan) {
    S.data = null; S.cache = null; S.tahun = null; S.bulan = null; S.riskOn = null;
    document.body.classList.remove('peran-admin');
    Array.prototype.forEach.call(document.querySelectorAll('.modal'), function (m) { m.hidden = true; });
    $('app').hidden = true; $('loginGate').hidden = false;
    $('loginErr').hidden = !pesan; $('loginErr').textContent = pesan || '';
    $('uPass').value = ''; setTimeout(function () { ($('uName').value ? $('uPass') : $('uName')).focus(); }, 30);
  }
  function tampilApp() { $('loginGate').hidden = true; $('app').hidden = false; window.scrollTo(0, 0); }
  function keluar(pesan) {
    var s0 = D.sesi(); if (s0) D.api({ aksi: 'keluar', token: s0.token }).catch(function () {});
    D.hapusSesi(); tampilLogin(pesan);
    if (!pesan) toast('Anda sudah keluar. Data dihapus dari browser ini.');
  }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('uName').value.trim(), pw = $('uPass').value;
    $('uName').classList.toggle('err', !u); $('uPass').classList.toggle('err', !pw);
    if (!u || !pw) { $('loginErr').hidden = false; $('loginErr').textContent = 'Isi username dan password.'; return; }
    var b = $('loginBtn'); b.disabled = true; b.textContent = 'Memeriksa…'; $('loginErr').hidden = true;
    D.api({ aksi: 'login', username: u, password: pw }).then(function (d) {
      D.simpanSesi({ token: d.token, user: d.user, peran: d.peran, exp: Date.now() + (d.berlakuDetik || 21600) * 1000 - 60000 });
      $('uPass').value = ''; aturPeran(d.peran, d.user); tampilApp(); return load();
    }).catch(function (er) { $('loginErr').hidden = false; $('loginErr').textContent = er.message; $('uPass').select(); })
      .then(function () { b.disabled = false; b.textContent = 'Masuk'; });
  });
  $('logoutBtn').addEventListener('click', function () { keluar(); });

  function load() {
    $('srcBadge').className = 'badge snap'; $('srcBadge').textContent = 'Memuat data…';
    var c = D.cachedData(); if (c && !S.data) boot(c);
    return D.loadData().then(boot).catch(function (e) {
      if (e.login) { D.hapusSesi(); return tampilLogin(e.message === 'Silakan masuk.' ? '' : e.message); }
      $('srcBadge').className = 'badge err'; $('srcBadge').textContent = 'Gagal memuat';
      $('warn').hidden = false; $('warn').className = 'warnbox'; $('warn').textContent = 'Data tidak bisa dimuat: ' + (e.message || e);
    });
  }
  /* ---------- events ---------- */
  $('tahunSel').addEventListener('change', function (e) { var y = +e.target.value; setPeriode(y, S.cache.konman[y] ? bulanBawaan(y) : S.bulan); });
  $('bulanSel').addEventListener('change', function (e) { setPeriode(S.tahun, +e.target.value); });
  function muatUlang() { D.hapusCache(); return load(); }
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
      if (a === 'kepuasan') return openKepuasan();
      if (a === 'instruktur') return openInstruktur();
      if (a === 'ksa') return openKsa();
      if (a === 'cc') return openCc();
      if (a === 'sert') return openSert();
      if (a === 'org') return openOrg();
      if (a === 'idp') return openIdp();
      if (a === 'ino') return openIno();
      if (a.indexOf('rekap:') === 0) return openRekap(a.split(':')[1]);
    }
    var kl = t.closest('[data-kl]'); if (kl) { S.mlKlausul = kl.getAttribute('data-kl'); return renderMl(); }
    var ml = t.closest('[data-ml]'); if (ml) { S.mlMode = ml.getAttribute('data-ml'); Array.prototype.forEach.call(document.querySelectorAll('[data-ml]'), function (b) { b.setAttribute('aria-pressed', b === ml); }); return renderMl(); }
    var ov = t.closest('[data-ov]'); if (ov) { S.orgView = ov.getAttribute('data-ov'); return renderOrg(); }
    var og = t.closest('[data-og]'); if (og) { var gi = +og.getAttribute('data-og'); S.orgOn = S.orgOn === gi ? null : gi; Array.prototype.forEach.call(document.querySelectorAll('.onode'), function (n) { n.classList.toggle('on', +n.getAttribute('data-og') === S.orgOn); }); $('orgInfo').innerHTML = orgInfo(S.orgOn); return; }
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
    tlRows: tlRows, tlStatus: tlStatus, tlAsli: tlAsli, ev: ev, admin: admin, keluar: keluar, reload: muatUlang, toast: toast, openModal: openModal
  };
  function toast(t, ms) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, ms || 4000); }

  var s0 = D.sesi();
  if (s0) { aturPeran(s0.peran, s0.user); tampilApp(); load(); } else tampilLogin('');
  setInterval(function () {
    var bebas = Array.prototype.every.call(document.querySelectorAll('.modal'), function (m) { return m.hidden; });
    if (S.data && S.data.meta && S.data.meta.source === 'live' && document.visibilityState === 'visible' && bebas) { muatUlang(); }
  }, 5 * 60 * 1000);
})();
