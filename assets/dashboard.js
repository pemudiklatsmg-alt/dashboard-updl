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
      '<h3>' + o.title + (o.tag || '') + '</h3>' + (o.hint || o.delta ? '<div class="hint">' + (o.hint || '') + (o.delta || '') + '</div>' : '') +
      body + '<div class="foot ' + (o.cls || 'idle') + '">' + (o.foot || '') + '</div></div>';
  }
  /* ▲▼ dibanding bulan sebelumnya. arah: 1 = naik itu baik, 0 = netral (angka kumulatif) */
  function delta(cur, prev, des, sat, arah) {
    if (S.bulan < 2 || cur === null || cur === undefined || prev === null || prev === undefined || !isFinite(cur) || !isFinite(prev)) return '';
    var d = cur - prev, r = Math.round(d * Math.pow(10, des)) / Math.pow(10, des), lalu = D.BLN3[S.bulan - 2];
    var c = !r ? 'flat' : arah ? (r > 0 ? 'up' : 'down') : 'netral';
    var ikon = !r ? '=' : r > 0 ? '▲' : '▼';
    return '<span class="dl ' + c + '" title="Dibanding ' + namaBulan(S.bulan - 1) + '">' + ikon + ' ' + (r ? (r > 0 ? '+' : '−') + D.fmt(Math.abs(r), des) : 'tetap') + (sat || '') + ' <i>vs ' + lalu + '</i></span>';
  }
  function pctTxt(f) { return f === null || f === undefined || !isFinite(f) ? '–' : D.fmt(f * 100, 0) + '%'; }

  function renderKpis() {
    var bl = namaBulan(S.bulan), Bn = B(), h = '';
    var tot = konmanAda(Bn) ? totalSkor(Bn) : null, tv = tot === null ? null : tot / 100, st = status(tv);
    var Bp = S.bulan > 1 ? D.BULAN[S.bulan - 2] : null, totP = Bp && konmanAda(Bp) ? totalSkor(Bp) : null;
    h += card({ title: 'Capaian Kinerja', hint: 'Skor Konman ' + bl + ' ' + S.tahun, delta: delta(tot, totP, 1, ' poin', 1), html: gauge(tv), foot: konmanAda(Bn) ? st.t : 'Tidak ada data Konman bulan ini', cls: st.c });

    var r = D.hitungRendiklat(kelas(), S.tahun, S.bulan, set());
    var pctP = r.rencanaPeserta ? r.peserta / r.rencanaPeserta : null;
    var rP = S.bulan > 1 ? D.hitungRendiklat(kelas(), S.tahun, S.bulan - 1, set()) : null;
    h += card({ title: 'Total Peserta', hint: 'Rendiklat s.d. ' + bl, delta: rP && r.kelas ? delta(r.peserta, rP.peserta, 0, '', 0) : '', val: r.kelas ? D.fmt(r.peserta, 0) : '–',
      ring: ring(pctP, r.pakaiRencana || r.tanpaPeserta ? 'warn' : status(pctP).c, pctTxt(pctP), 'Peserta ' + pctTxt(pctP) + ' dari rencana peserta'),
      tag: r.pakaiRencana ? tag('perkiraan', 'warn') : (r.dikoreksi ? tag('dikoreksi') : ''),
      foot: !r.kelas ? 'Belum ada kelas selesai' : (r.pakaiRencana ? r.pakaiRencana + ' kelas memakai rencana peserta' : (r.tanpaPeserta ? r.tanpaPeserta + ' kelas tanpa realisasi' : D.pct(pctP) + ' dari rencana peserta')),
      cls: r.pakaiRencana || r.tanpaPeserta ? 'warn' : status(pctP).c, click: 'kelas' });

    var pctK = r.terjadwal ? r.kelas / r.terjadwal : null;
    h += card({ title: 'Total Kelas', hint: 'Rendiklat, status Selesai s.d. ' + bl, delta: rP && r.kelas ? delta(r.kelas, rP.kelas, 0, '', 0) : '', val: r.kelas ? D.fmt(r.kelas, 0) : '–',
      ring: ring(pctK, status(pctK).c, pctTxt(pctK), 'Kelas selesai ' + pctTxt(pctK) + ' dari terjadwal'),
      foot: r.terjadwal ? D.pct(pctK) + ' dari ' + D.fmt(r.terjadwal, 0) + ' kelas terjadwal · +' + r.kelasBulan + ' di ' + bl : 'Belum ada data Rendiklat', cls: status(pctK).c, click: 'kelas' });

    var H = hop(S.tahun, S.bulan), itH = find(/Tingkat Pelaksanaan Pembelajaran/i), tgt = itH && konmanAda(Bn) ? D.num(itH.target[Bn].v) : null;
    var hc = H.nilai !== null && tgt ? H.nilai / tgt : null, HP = S.bulan > 1 ? hop(S.tahun, S.bulan - 1) : null;
    h += card({ title: 'Hari Orang Pelatihan', hint: 'Rendiklat ÷ jumlah pegawai', delta: HP ? delta(H.nilai, HP.nilai, 3, '', 0) : '',
      tag: H.disesuaikan ? tag('disesuaikan') : (r.pakaiRencana ? tag('perkiraan', 'warn') : ''),
      val: H.nilai !== null ? D.fmt(H.nilai, 3) : '–',
      ring: ring(hc, status(hc).c, pctTxt(hc), 'HOP ' + pctTxt(hc) + ' dari target'),
      foot: H.pegawai === null && H.adj.timpa === null ? 'Jumlah pegawai ' + bl + ' belum diisi' : (tgt ? D.pct(hc) + ' dari target ' + D.fmt(tgt, 3) : 'Target Konman belum ada'),
      cls: H.pegawai === null && H.adj.timpa === null ? 'warn' : status(hc).c, click: 'hop' });

    var Kp = ev('kepuasan'), In = ev('instruktur'), p = set();
    var KpP = S.bulan > 1 ? ev('kepuasan', S.tahun, S.bulan - 1) : null, InP = S.bulan > 1 ? ev('instruktur', S.tahun, S.bulan - 1) : null;
    function mini(o) {
      var v = o.v, st = skala5(v, o.t), f = v === null ? null : (o.t ? v / o.t : v / 5);
      return card({ title: o.title, hint: o.hint, delta: delta(v, o.p, 2, '', 1), val: v === null ? '–' : D.fmt(v, 2) + ' <small>/ 5</small>', cls: v === null ? 'idle' : st.c, click: o.click,
        ring: ring(f, st.c, pctTxt(f), o.title + ' ' + pctTxt(f) + (o.t ? ' dari target' : ' dari skala 5')),
        foot: v === null ? 'Belum ada data s.d. ' + bl : o.foot + ' <span class="more">→</span>' }).replace('class="card', 'class="card mini2');
    }
    h += '<div class="stack2">' +
      mini({ title: 'Kepuasan Peserta', hint: 'EL1 · rata-rata semua butir', v: Kp ? Kp.nilai : null, p: KpP ? KpP.nilai : null, t: p.targetL1, click: 'kepuasan',
        foot: Kp ? D.fmt(Kp.responden, 0) + ' responden · ' + Kp.pelatihan + ' pelatihan' : '' }) +
      mini({ title: 'Penilaian Instruktur', hint: 'EL1 · rata-rata semua butir', v: In ? In.nilai : null, p: InP ? InP.nilai : null, t: p.targetInstruktur, click: 'instruktur',
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

  /* ---------- kesegaran data per sumber ---------- */
  function bulanTerakhir(fn) { var last = 0; for (var m = 1; m <= 12; m++) if (fn(m)) last = m; return last; }
  /* tanggal ISO terbaru di dalam sebuah tabel/objek (tidak melewati hari ini) */
  function isoMaks(x) {
    var m = null, kini = new Date().toISOString().slice(0, 10);
    JSON.stringify(x || null).replace(/"(\d{4}-\d{2}-\d{2})/g, function (_, d) { if (d <= kini && (!m || d > m)) m = d; return _; });
    return m;
  }
  function kesegaran() {
    var out = [], y = S.tahun, sel = S.bulan, akhir = new Date(y, sel, 0);
    var leaves = K().items.filter(function (it) { return !it.isGroup && !it.pengurang; });
    function bulanan(nama, tab, m) {
      out.push({ nama: nama, tab: tab, label: m ? namaBulan(m) + ' ' + y : 'belum ada', c: m >= sel ? 'good' : 'warn', t: m >= sel ? 'Lengkap s.d. ' + namaBulan(sel) : 'Belum s.d. ' + namaBulan(sel), kurang: m < sel });
    }
    function tanggal(nama, tab, iso) {
      var d = iso ? new Date(iso + 'T00:00:00') : null, umur = d ? Math.round((akhir - d) / 864e5) : null;
      out.push({ nama: nama, tab: tab, label: d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'belum ada',
        c: !d ? 'idle' : umur <= 45 ? 'good' : 'warn', t: !d ? 'Belum ada data' : umur <= 45 ? 'Terbaru' : 'Lebih dari 45 hari' });
    }
    function ada(nama, tab, n, ket) { out.push({ nama: nama, tab: tab, label: n ? ket || D.fmt(n, 0) + ' baris' : 'belum terbaca', c: n ? 'good' : 'bad', t: n ? 'Terbaca' : 'Belum terbaca' }); }
    bulanan('Realisasi Konman', 'Konman ' + y, bulanTerakhir(function (m) {
      var Bn = D.BULAN[m - 1]; if (!konmanAda(Bn)) return false;
      var f = leaves.filter(function (it) { return D.hasData(it, Bn); }).length; return f && f >= leaves.length * 0.5;
    }));
    bulanan('Jumlah Pegawai', 'Jumlah Pegawai', bulanTerakhir(function (m) { return pegawai(y, m) !== null; }));
    bulanan('Kepatuhan', 'Kepatuhan', bulanTerakhir(function (m) { var Bn = D.BULAN[m - 1]; return kepRows().some(function (x) { return kepVal(x, Bn) !== null; }); }));
    var kini = new Date(), ks = kelas().filter(function (k) { return k.status === 'Selesai' && k.selesai && k.selesai <= kini; });
    var kMax = ks.reduce(function (a, k) { return !a || k.selesai > a ? k.selesai : a; }, null);
    tanggal('Rendiklat (kelas selesai)', 'file Rendiklat ' + y, kMax ? kMax.getFullYear() + '-' + ('0' + (kMax.getMonth() + 1)).slice(-2) + '-' + ('0' + kMax.getDate()).slice(-2) : null);
    var cadRen = ((S.data.meta || {}).rendiklatCadangan || {})[y];
    if (cadRen) { var rR = out[out.length - 1]; rR.tab = 'cadangan per ' + cadRen + ' (file Rendiklat sedang tidak bisa dibaca)'; rR.c = 'warn'; rR.t = 'Data cadangan'; }
    var E = S.data.eval || {};
    var SE = (S.data.meta && S.data.meta.sumberEval) || {};
    tanggal('Kepuasan Peserta EL1', SE.kepuasan || 'Data - Kepuasan EL1', isoMaks(E.kepuasan));
    tanggal('Penilaian Instruktur EL1', 'Data - Instruktur EL1', isoMaks(E.instruktur));
    tanggal('KSA EL2', 'Data - KSA EL2', isoMaks(E.ksa));
    tanggal('Confidence & Commitment EL2', SE.cc || 'Data - C&C EL2', isoMaks(E.cc));
    tanggal('Sertifikat', 'Data - Sertifikat', isoMaks(E.sertifikat));
    tanggal('Evaluasi Level 3', 'Rekap L3 Perilaku', isoMaks(S.data.l3));
    tanggal('Evaluasi Level 4', 'Rekap L4 Kinerja', isoMaks(S.data.l4));
    tanggal('ROTI', 'Rekap ROTI', isoMaks(S.data.roti));
    ada('Perbaikan Berkelanjutan', 'Perbaikan Berkelanjutan', tlRows().length);
    ada('IDP', 'Data - IDP', S.data.idp ? (S.data.idp || []).length : 0, S.data.idp ? (S.data.idp || []).length + ' pegawai' : null);
    ada('Inovasi', 'Data - Inovasi', D.rows(S.data.inovasi).length);
    ada('Maturity Level (MLI Probis)', 'file MLI Probis', (S.data.maturity || []).length, (S.data.maturity || []).length + ' key element');
    ada('Peta Risiko', 'file Profil Risiko', S.data.risiko && S.data.risiko.rows ? D.rows(S.data.risiko.rows).length : 0, null);
    ada('Pemantauan KRI', 'file Profil Risiko tab 10', kriRows().length, kriRows().length ? kriRows().length + ' KRI' : null);
    ada('Fraud Risk Assessment', 'file FRA (FRA_ID di Pengaturan)', fra() && fra().ringkas ? fra().ringkas.n : 0, fra() && fra().ringkas ? fra().ringkas.n + ' risiko' + (fra().periode ? ' · ' + fra().periode : '') : null);
    ada('Isu & Pihak Berkepentingan', 'file Profil Risiko tab 2b/2c', S.data.konteks ? kIsu().length + kPihak().length : 0, S.data.konteks ? kIsu().length + ' isu · ' + kPihak().length + ' pihak' : null);
    return out;
  }
  function openSegar() {
    var L = kesegaran(), m = S.data.meta || {}, t = m.generatedAt ? new Date(m.generatedAt) : null;
    openModal('<div class="modal-h"><div><div class="desc">Data terakhir per sumber · patokan ' + namaBulan(S.bulan) + ' ' + S.tahun + (t ? ' · diambil ' + esc(t.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '') + '</div><h3>Status Data</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sumber</th><th>Data terakhir</th><th>Status</th></tr></thead><tbody>' +
      L.map(function (x) { return '<tr><td><b>' + esc(x.nama) + '</b><div class="desc">' + esc(x.tab) + '</div></td><td class="num">' + esc(x.label) + '</td><td><span class="pill ' + x.c + '">' + esc(x.t) + '</span></td></tr>'; }).join('') +
      '</tbody></table></div><div class="note">Sumber bulanan dianggap lengkap bila sudah terisi s.d. bulan terpilih. Data evaluasi ditandai bila tanggal terakhirnya lebih dari 45 hari sebelum akhir bulan terpilih. Isi atau perbarui di ' + sheetLink('Google Sheets') + '.</div>');
  }

  /* ---------- perlu perhatian ---------- */
  function namaSingkat(L, f) { var n = L.slice(0, 3).map(function (x) { return esc(f(x)); }).join(', '); return n + (L.length > 3 ? ' +' + (L.length - 3) + ' lainnya' : ''); }
  function perhatian() {
    var L = [], Bn = B(), bl = namaBulan(S.bulan);
    if (konmanAda(Bn)) {
      var bawah = [], hampir = [];
      K().items.forEach(function (it) {
        if (it.isGroup || it.pengurang || !D.hasData(it, Bn)) return;
        var v = D.capaianItem(it, Bn); if (v === null || v === undefined) return;
        if (v < 0.95) bawah.push(it); else if (v < 0.9999) hampir.push(it);
      });
      var pn = function (it) { return it.pendek; };
      if (bawah.length) L.push({ c: 'bad', t: '<b>' + bawah.length + ' indikator</b> di bawah 95%: ' + namaSingkat(bawah, pn), go: 'indikator' });
      if (hampir.length) L.push({ c: 'warn', t: '<b>' + hampir.length + ' indikator</b> hampir tercapai (95–99%): ' + namaSingkat(hampir, pn), go: 'indikator' });
    }
    var asp = kepRows().filter(function (x) { var n = kepVal(x, Bn); return n !== null && n !== 0; });
    if (asp.length) L.push({ c: 'bad', t: 'Pengurang kepatuhan <b>−' + D.fmt(pengurang(Bn), 2) + '</b>: ' + namaSingkat(asp, function (x) { return String(x['Aspek Kepatuhan']).trim(); }), go: 'kepatuhan' });
    var kr = kesegaran().filter(function (x) { return x.kurang; });
    if (kr.length) L.push({ c: 'warn', t: 'Data ' + bl + ' belum diisi: <b>' + kr.map(function (x) { return esc(x.nama); }).join(', ') + '</b>', act: 'segar' });
    var r = D.hitungRendiklat(kelas(), S.tahun, S.bulan, set()), nk = r.pakaiRencana || r.tanpaPeserta;
    if (nk) L.push({ c: 'warn', t: '<b>' + nk + ' kelas</b> selesai belum ada realisasi peserta', act: 'kelas' });
    var tb = tlRows().filter(function (x) { return tlStatus(x) === 'Belum Dimulai'; }).length;
    if (tb) L.push({ c: tb >= 5 ? 'bad' : 'warn', t: '<b>' + tb + ' perbaikan berkelanjutan</b> belum dimulai', act: 'tl' });
    if (S.data.inovasi && S.data.inovasi.length) {
      var lw = inoRows().filter(function (x) { return x.w[1] === 'bad'; });
      if (lw.length) L.push({ c: 'bad', t: '<b>' + lw.length + ' inovasi</b> lewat target, belum selesai: ' + namaSingkat(lw, function (x) { return x.r['Judul Inovasi']; }), act: 'ino' });
    }
    if (S.data.konteks) {
      var pb = kPihak().filter(function (x) { return /tinggi/i.test(x.prio) && kStatus(x.st) !== 'good' && (x.pr === null || x.pr < 50); });
      if (pb.length) L.push({ c: 'warn', t: '<b>' + pb.length + ' pihak berkepentingan</b> prioritas tinggi, progres &lt; 50%: ' + namaSingkat(pb, function (x) { return x.nama; }), act: 'pb' });
    }
    var kriM = kriRows().filter(function (k) { var a = kriAkhir(k); return a && a.st === 'bad'; });
    if (kriM.length) L.push({ c: 'bad', t: '<b>' + kriM.length + ' KRI merah</b>: ' + namaSingkat(kriM, function (k) { return k.kri; }), go: 'kri' });
    var G = fra() && fra().ringkas;
    if (G) {
      var resT = (G.res['Tinggi'] || 0) + (G.res['Sangat Tinggi'] || 0) + (G.res['Ekstrem'] || 0);
      if (G.kejadian) L.push({ c: 'bad', t: '<b>' + G.kejadian + ' kejadian fraud</b> tercatat di Monev FRA', go: 'fraud' });
      if (G.redflag || resT) L.push({ c: 'warn', t: 'FRA: ' + [G.redflag ? '<b>' + G.redflag + ' red flag</b> muncul' : '', resT ? '<b>' + resT + ' risiko</b> residual Tinggi ke atas' : ''].filter(Boolean).join(' · '), go: 'fraud' });
    }
    return L.sort(function (a, b) { return (a.c === 'bad' ? 0 : 1) - (b.c === 'bad' ? 0 : 1); });
  }
  /* Ditampilkan seperti notifikasi: bisa diperkecil (–) atau ditutup (✕); tombol lonceng di header membukanya lagi.
     Pilihan disimpan di browser ini dan berlaku sampai isi notifikasinya berubah. */
  var PH_KEY = 'updl_perhatian';
  function phSidik(L) { var t = S.tahun + '-' + S.bulan + '|' + L.map(function (x) { return x.t; }).join('|'), h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return String(h); }
  function phBaca() { try { return JSON.parse(localStorage.getItem(PH_KEY) || '{}'); } catch (e) { return {}; } }
  function phSimpan(o) { try { localStorage.setItem(PH_KEY, JSON.stringify(o)); } catch (e) { /* abaikan */ } }
  function phMode(m) {
    var el = $('perhatian'), L = S.phL || [];
    if (!L.length) { el.classList.toggle('lihat', m === 'buka'); return; }
    phSimpan({ sidik: phSidik(L), mode: m });
    el.classList.toggle('kecil', m === 'kecil'); el.classList.toggle('tutup', m === 'tutup');
    var b = el.querySelector('[data-ph="kecil"]'); if (b) { b.setAttribute('aria-expanded', m !== 'kecil'); b.title = m === 'kecil' ? 'Perbesar' : 'Perkecil'; }
    if (m === 'buka') el.classList.remove('kecil', 'tutup');
  }
  function renderPerhatian() {
    var el = $('perhatian'); if (!el) return;
    var L = perhatian(), bl = namaBulan(S.bulan) + ' ' + S.tahun, nb = L.filter(function (x) { return x.c === 'bad'; }).length;
    S.phL = L; el.hidden = false;
    var btn = $('notifBtn'), n = $('notifN');
    if (btn) { btn.hidden = false; n.hidden = !L.length; n.textContent = L.length; n.className = 'nbadge' + (nb ? ' bad' : ''); btn.title = btn.ariaLabel = L.length ? 'Perlu perhatian: ' + L.length + ' hal' : 'Tidak ada yang perlu perhatian'; }
    if (!L.length) { el.className = 'perhatian ok'; el.innerHTML = '<span class="ph-ok" aria-hidden="true">✓</span><span>Tidak ada yang perlu perhatian untuk ' + bl + '.</span><button type="button" class="ph-x" data-ph="tutup" aria-label="Tutup" title="Tutup">✕</button>'; return; }
    var st = phBaca(), mode = st.sidik === phSidik(L) ? st.mode : 'buka';
    el.className = 'perhatian' + (L.length > 2 ? ' ringkas' : '') + (mode === 'kecil' ? ' kecil' : mode === 'tutup' ? ' tutup' : '');
    el.innerHTML = '<div class="ph-h"><button type="button" class="ph-judul" data-ph="kecil" aria-expanded="' + (mode !== 'kecil') + '"><b>Perlu perhatian</b><span class="ph-n' + (nb ? ' bad' : '') + '">' + L.length + '</span><span class="ph-sub">' + bl + '</span></button>' +
      '<span class="ph-ctl"><button type="button" class="ph-x" data-ph="kecil" aria-label="Perkecil" title="Perkecil"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 12h12"/><path class="v" d="M12 6v12"/></svg></button>' +
      '<button type="button" class="ph-x" data-ph="tutup" aria-label="Tutup notifikasi" title="Tutup (buka lagi lewat ikon lonceng)"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></span></div><div class="ph-list">' +
      L.map(function (x) { return '<button type="button" class="ph-i ' + x.c + '"' + (x.act ? ' data-act="' + x.act + '"' : ' data-loncat="' + x.go + '"') + '><i aria-hidden="true"></i><span>' + x.t + '</span><em aria-hidden="true">→</em></button>'; }).join('') + '</div>' +
      (L.length > 2 ? '<button type="button" class="ph-more" data-phmore aria-expanded="false">Tampilkan semua (' + L.length + ')</button>' : '');
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

  /* ---------- perbaikan berkelanjutan (dulu: tindak lanjut evaluasi) ---------- */
  /* Status asli 5 pilihan -> 4 kelompok. OFI = masukan membangun/pujian/netral (tidak perlu tindakan).
     Tingkat penyelesaian dihitung dari masukan yang perlu tindakan saja (selain OFI). */
  var TL_GRUP = { 'SELESAI': 'Selesai', 'SUDAH DILAPORKAN': 'Selesai', 'OFI': 'OFI', 'PROSES TINDAK LANJUT': 'Proses', 'BERJALAN': 'Proses' };
  var TL_KLS = { 'Selesai': 'good', 'Proses': 'warn', 'Belum Dimulai': 'bad', 'OFI': 'idle' };
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }
  function tlRows() { return D.rows(S.data.tindaklanjut).filter(function (r) { return String(r['Komentar'] || '').trim(); }); }
  function tlAsli(r) { return String(r['Status'] || '').trim() || 'Belum Dimulai'; }
  function tlStatus(r) { return TL_GRUP[tlAsli(r).toUpperCase()] || 'Belum Dimulai'; }
  function renderTL() {
    var R = tlRows(), c = { 'Selesai': 0, 'Proses': 0, 'Belum Dimulai': 0, 'OFI': 0 }, pic = {};
    R.forEach(function (r) {
      var g = tlStatus(r), k = String(r['PIC'] || '').trim() || '(tanpa PIC)'; c[g]++;
      if (!pic[k]) pic[k] = { 'Selesai': 0, 'Proses': 0, 'Belum Dimulai': 0, 'OFI': 0, n: 0 };
      pic[k][g]++; pic[k].n++;
    });
    var n = R.length;
    $('tlDesc').textContent = n + ' komentar & temuan (semua periode)';
    if (!n) { $('tlBody').innerHTML = '<div class="empty">Belum ada komentar atau temuan. Tempel data di ' + sheetLink('Google Sheets', 'Perbaikan Berkelanjutan') + '.</div>'; return; }
    var seg = [['Selesai', 'good', 'Selesai + Sudah Dilaporkan'], ['Proses', 'warn', 'Proses Tindak Lanjut'], ['Belum Dimulai', 'bad', 'Belum Dimulai'], ['OFI', 'idle', 'OFI (tidak perlu tindakan)']];
    var perlu = n - c['OFI'];
    var mx = Math.max.apply(null, Object.keys(pic).map(function (k) { return pic[k].n - pic[k]['OFI']; }).concat([1]));
    var tind = function (x) { return x.n - x['OFI']; };
    var bars = Object.keys(pic).sort(function (a, b) { return tind(pic[b]) - tind(pic[a]) || pic[b].n - pic[a].n || a.localeCompare(b); }).map(function (k) {
      var x = pic[k];
      return '<div class="r" title="' + esc(k + ': ' + seg.map(function (s) { return s[0] + ' ' + x[s[0]]; }).join(', ')) + '"><span>' + esc(k) + '</span><span class="t">' +
        seg.slice(0, 3).map(function (s) { return x[s[0]] ? '<i style="width:' + (x[s[0]] / mx * 100) + '%;background:var(--' + s[1] + ')"></i>' : ''; }).join('') + '</span><span class="num">' + tind(x) + '</span></div>';
    }).join('');
    $('tlBody').innerHTML = '<div class="tl-top">' + donut(seg.slice(0, 3).map(function (s) { return { n: c[s[0]], c: s[1], t: s[0] }; }), perlu ? D.fmt(c['Selesai'] / perlu * 100, 0) + '%' : '–', 'tuntas') +
      '<div class="tl-sum">' + seg.map(function (s) { return '<div><b class="num ' + s[1] + '">' + c[s[0]] + '</b><span>' + s[2] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="sub-h">Per PIC · masukan yang perlu tindakan</div><div class="bars">' + bars + '</div>' +
      '<div class="legend"><span><i style="background:var(--good)"></i>Selesai</span><span><i style="background:var(--warn)"></i>Proses</span><span><i style="background:var(--bad)"></i>Belum dimulai</span></div>' +
      '<div class="note">Persen tuntas = (Selesai + Sudah Dilaporkan) ÷ ' + D.fmt(perlu, 0) + ' masukan yang perlu tindakan (selain OFI).</div>' +
      '<button class="btn" style="align-self:flex-start" data-act="tl">Lihat daftar lengkap →</button>';
  }
  function openTL() {
    var R = tlRows();
    openModal('<div class="modal-h"><div><h3>Perbaikan Berkelanjutan</h3><div class="desc">' + R.length + ' komentar & temuan · ' + (admin() ? 'ubah status lewat Input Data → Perbaikan Berkelanjutan, atau langsung di Google Sheets' : 'status diperbarui oleh admin') + '</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tools"><input class="inp" id="tlQ" type="search" placeholder="Cari komentar, pelatihan, PIC…" aria-label="Cari"><select class="inp" id="tlF" aria-label="Saring status" style="max-width:200px"><option value="">Semua status</option><option value="perlu">Perlu tindakan (selain OFI)</option><option>Belum Dimulai</option><option>Proses</option><option>Selesai</option><option>OFI</option></select>' +
      '<select class="inp" id="tlP" aria-label="Saring PIC" style="max-width:180px"><option value="">Semua PIC</option>' + uniq(R.map(function (r) { return String(r['PIC'] || '').trim(); }).filter(Boolean)).sort().map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
      '<select class="inp" id="tlS" aria-label="Saring sumber" style="max-width:180px"><option value="">Semua sumber</option>' + uniq(R.map(function (r) { return String(r['Sumber'] || '').trim(); }).filter(Boolean)).sort().map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pelatihan</th><th>Komentar</th><th>Kategori</th><th>Sumber</th><th>PIC</th><th>Status</th><th>Keterangan</th></tr></thead><tbody id="tlT"></tbody></table></div><div class="note" id="tlN"></div>');
    function fill() {
      var q = $('tlQ').value.toLowerCase(), f = $('tlF').value, fp = $('tlP').value, fs = $('tlS').value;
      var L = R.filter(function (r) { return (!f || (f === 'perlu' ? tlStatus(r) !== 'OFI' : tlStatus(r) === f)) && (!fp || String(r['PIC'] || '').trim() === fp) && (!fs || String(r['Sumber'] || '').trim() === fs) && (!q || [r['Judul Diklat'], r['Komentar'], r['PIC'], r['Kategori Komentar'], (arti(r['Kategori Komentar']) || {}).tanya, r['Sumber']].join(' ').toLowerCase().indexOf(q) >= 0); });
      var MAKS = 300, semua = L.length; L = L.slice(0, MAKS);
      $('tlT').innerHTML = L.map(function (r) {
        return '<tr><td>' + esc(r['Judul Diklat']) + (r['Angkatan'] ? '<div class="tl-m">Angkatan ' + esc(r['Angkatan']) + '</div>' : '') + '</td><td>' + esc(r['Komentar']) + '</td><td>' + (arti(r['Kategori Komentar']) ? butirHtml(r['Kategori Komentar']) : esc(r['Kategori Komentar'])) + '</td><td>' + esc(r['Sumber']) + '</td><td>' + esc(r['PIC']) +
          '</td><td><span class="pill ' + TL_KLS[tlStatus(r)] + '">' + esc(tlAsli(r)) + '</span></td><td class="ket">' + esc(String(r['Keterangan'] || '')) + '</td></tr>';
      }).join('') || '<tr><td colspan="7" class="desc">Tidak ada yang cocok.</td></tr>';
      $('tlN').textContent = (semua > MAKS ? 'Menampilkan ' + MAKS + ' pertama dari ' + semua + ' yang cocok' : semua + ' yang cocok') + ' · total ' + R.length + ' baris. Pakai pencarian atau saringan untuk mempersempit.';
    }
    var tunda; $('tlQ').addEventListener('input', function () { clearTimeout(tunda); tunda = setTimeout(fill, 150); });
    ['tlF', 'tlP', 'tlS'].forEach(function (id) { $(id).addEventListener('change', fill); }); fill();
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

  /* ---------- Key Risk Indicator (Profil Risiko tab 10) ---------- */
  var BLN_KRI = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function kriRows() { return (S.data.kri && S.data.kri.rows) || []; }
  /* Maks: hijau >= batas atas, kuning >= batas bawah, merah di bawahnya. Min: kebalikannya. */
  function kriStatus(k, v) {
    if (v === null || v === undefined || v === '' || k.bb === null || k.ba === null || k.bb === '' || k.ba === '') return null;
    if (k.pol === 'Min') return v <= k.bb ? 'good' : v <= k.ba ? 'warn' : 'bad';
    return v >= k.ba ? 'good' : v >= k.bb ? 'warn' : 'bad';
  }
  function kriFmt(k, v) {
    if (v === null || v === undefined || v === '') return '–';
    return k.pct ? D.fmt(v * 100, Math.abs(v * 100 - Math.round(v * 100)) > 0.05 ? 1 : 0) + '%' : D.fmt(v, Math.abs(v - Math.round(v)) > 0.001 ? 2 : 0);
  }
  /* realisasi terakhir s.d. bulan terpilih (tahun KRI = tahun berjalan file) */
  function kriAkhir(k) { for (var m = S.bulan - 1; m >= 0; m--) { var v = k.bulan[m]; if (v !== null && v !== undefined && v !== '') return { m: m, v: v, st: kriStatus(k, v) }; } return null; }
  var KRI_TEKS = { good: 'Hijau', warn: 'Kuning', bad: 'Merah' };
  function renderKri() {
    var el = $('kriBody'); if (!el) return;
    var R = kriRows();
    Array.prototype.forEach.call(document.querySelectorAll('[data-kv]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-kv') === (S.kriView || 'semua')); });
    if (!R.length) { el.innerHTML = '<div class="empty">Tab 10. Pemantauan KRI belum terbaca dari file Profil Risiko' + (S.data.kri === null ? '' : '') + '.</div>'; return; }
    var cnt = { good: 0, warn: 0, bad: 0, nol: 0 };
    var L = R.map(function (k) { var a = kriAkhir(k); cnt[a && a.st ? a.st : 'nol']++; return { k: k, a: a }; });
    $('kriDesc').textContent = R.length + ' KRI · status realisasi terakhir s.d. ' + namaBulan(S.bulan) + ' · Profil Risiko tab ' + (S.data.kri.tab || '10');
    var tampil = S.kriView === 'perhatian' ? L.filter(function (x) { return x.a && (x.a.st === 'bad' || x.a.st === 'warn'); }) : L;
    var sum = '<div class="kri-sum">' + [['good', 'Hijau'], ['warn', 'Kuning'], ['bad', 'Merah'], ['nol', 'Belum diukur']].map(function (x) {
      return '<div><b class="num ' + (x[0] === 'nol' ? 'idle' : x[0]) + '">' + cnt[x[0]] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
    var head = '<tr><th>KRI</th><th>Target</th>' + BLN_KRI.map(function (b, i) { return '<th class="c' + (i + 1 > S.bulan ? ' nanti' : '') + '">' + b + '</th>'; }).join('') + '<th class="r">Terakhir</th><th>Status</th><th>PIC</th></tr>';
    var body = tampil.map(function (x) {
      var k = x.k, st = x.a && x.a.st;
      return '<tr><td><b>' + esc(k.kri) + '</b><div class="tl-m">' + esc(k.no + '. ' + k.peristiwa) + (k.jenis === 'Peluang' ? ' · <span class="pill good">Peluang</span>' : '') + '</div></td>' +
        '<td class="kri-t">' + (k.target === null || k.target === '' ? '–' : (k.pol === 'Min' ? '≤ ' : '≥ ') + kriFmt(k, k.pol === 'Min' ? k.bb : k.ba)) + '<div class="tl-m">' + esc(k.pol === 'Min' ? 'makin rendah makin baik' : 'makin tinggi makin baik') + '</div></td>' +
        k.bulan.map(function (v, i) { var s2 = kriStatus(k, v); return '<td class="c' + (i + 1 > S.bulan ? ' nanti' : '') + '">' + (v === null || v === '' ? '<i class="kd"></i>' : '<i class="kd ' + (s2 || 'idle') + '" title="' + esc(BLN_KRI[i] + ': ' + kriFmt(k, v) + (s2 ? ' · ' + KRI_TEKS[s2] : '')) + '"></i>') + '</td>'; }).join('') +
        '<td class="r num"><b>' + (x.a ? kriFmt(k, x.a.v) : '–') + '</b>' + (x.a ? '<div class="tl-m">' + BLN_KRI[x.a.m] + '</div>' : '') + '</td>' +
        '<td>' + (st ? '<span class="pill ' + st + '">' + KRI_TEKS[st] + '</span>' : '<span class="pill idle">Belum diukur</span>') + '</td><td class="tl-m">' + esc(String(k.pic || '').replace(/\s*\(R\)$/, '')) + '</td></tr>';
    }).join('') || '<tr><td colspan="17" class="desc">Tidak ada KRI kuning atau merah s.d. ' + namaBulan(S.bulan) + '.</td></tr>';
    el.innerHTML = sum + '<div class="tbl-wrap scroll kri-tbl"><table class="tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="legend"><span><i style="background:var(--good)"></i>Hijau</span><span><i style="background:var(--warn)"></i>Kuning</span><span><i style="background:var(--bad)"></i>Merah</span><span><i style="background:var(--track)"></i>Belum diisi</span></div>' +
      '<div class="note">Realisasi bulanan diisi di file Profil Risiko, ' + (S.data.meta.links && S.data.meta.links.profilRisiko && admin() ? '<a href="' + esc(S.data.meta.links.profilRisiko) + '" target="_blank" rel="noopener">tab ' + esc(S.data.kri.tab || '10. Pemantauan KRI') + '</a>' : 'tab ' + esc(S.data.kri.tab || '10. Pemantauan KRI')) + '. Status dihitung dari batas bawah dan batas atas tiap KRI.</div>';
  }

  /* ---------- Risiko fraud (FRA) ---------- */
  var LV_FRA = ['Ekstrem', 'Sangat Tinggi', 'Tinggi', 'Moderat', 'Rendah'];
  var KM_KODE = { 'Sangat Besar': 'E', 'Besar': 'D', 'Sedang': 'C', 'Kecil': 'B', 'Sangat Kecil': 'A' };
  function fra() { return S.data.fra || null; }
  function renderFra() {
    var el = $('fraBody'); if (!el) return;
    var F = fra(), v = S.fraView || 'res';
    Array.prototype.forEach.call(document.querySelectorAll('[data-fv]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fv') === v); });
    if (!F || !F.ringkas) { el.innerHTML = '<div class="empty">File FRA belum terhubung. Isi <b>FRA_ID</b> di tab Pengaturan.</div>'; $('fraDesc').textContent = 'Fraud Risk Assessment UPDL Semarang'; return; }
    var G = F.ringkas, nmV = v === 'inh' ? 'inheren' : 'residual';
    $('fraDesc').textContent = G.n + ' risiko fraud · ' + (F.periode ? 'Monev ' + F.periode + ' · ' : '') + 'peta ' + nmV;
    // peta 5x5: Admin melihat kode FR, akun Lihat melihat jumlah
    var peta = v === 'inh' ? G.petaInh : G.petaRes, R = F.risiko || null;
    var g = '<div class="rk-map fr-map" role="group" aria-label="Peta risiko fraud ' + nmV + '">';
    ['E', 'D', 'C', 'B', 'A'].forEach(function (k) {
      g += '<div class="ry">' + KEM[k] + '</div>';
      for (var d = 1; d <= 5; d++) {
        var key = KEM[k] + '|' + DAM[d - 1], n = peta[key] || 0, lv = MATRIKS[k][d - 1], isi = '';
        if (n && R) {
          var di = R.filter(function (r) { return (v === 'inh' ? r.km : (r.kmR || r.km)) === KEM[k] && (v === 'inh' ? r.dm : (r.dmR || r.dm)) === DAM[d - 1]; });
          // sel tetap seukuran: lebih dari 4 risiko diringkas jadi satu tombol jumlah
          isi = di.length > 4 ? '<button type="button" class="fr-many" data-frsel="' + esc(key) + '" title="' + esc(di.map(function (r) { return r.id; }).join(', ')) + '"><b>' + di.length + '</b>risiko</button>'
            : di.map(function (r) { return '<button type="button" class="rdot fr-dot" data-fr="' + esc(r.id) + '" title="' + esc(r.id + ': ' + r.des) + '">' + esc(r.id.replace(/^FR0?/, '')) + '</button>'; }).join('');
        } else if (n) isi = '<span class="fr-n">' + n + '</span>';
        g += '<div class="c" data-l="' + LV[lv] + '" title="' + esc(KEM[k] + ' × ' + DAM[d - 1] + ' · ' + lv + (n ? ' · ' + n + ' risiko' : '')) + '">' + isi + '</div>';
      }
    });
    g += '<div></div>';
    var DSK = ['Tdk sig.', 'Minor', 'Medium', 'Sig.', 'Sgt sig.'];
    for (var d = 1; d <= 5; d++) g += '<div class="rx"><span class="pj">' + DAM[d - 1] + '</span><span class="pd">' + DSK[d - 1] + '</span></div>';
    g += '</div><div class="rk-ax"><span>↑ Kemungkinan</span><span>Dampak →</span></div>';
    // inheren -> residual
    var mx = Math.max.apply(null, LV_FRA.map(function (l) { return Math.max(G.inh[l] || 0, G.res[l] || 0); }).concat([1]));
    var geser = '<div class="fr-geser"><div class="sub-h">Sebelum → sesudah mitigasi</div>' + LV_FRA.map(function (l) {
      return '<div class="fg-r' + (!(G.inh[l] || G.res[l]) ? ' nol' : '') + '"><span class="fg-l"><i style="background:var(--risk-' + LV[l] + ')"></i>' + l + '</span>' +
        '<span class="fg-b"><i class="inh" style="width:' + ((G.inh[l] || 0) / mx * 100) + '%"></i><b class="num">' + (G.inh[l] || 0) + '</b></span>' +
        '<span class="fg-b"><i class="res" style="width:' + ((G.res[l] || 0) / mx * 100) + '%;background:var(--risk-' + LV[l] + ')"></i><b class="num">' + (G.res[l] || 0) + '</b></span></div>';
    }).join('') + '<div class="fg-r fg-k"><span></span><span>Inheren</span><span>Residual</span></div></div>';
    var aksiN = G.aksi.Belum + G.aksi.Proses + G.aksi.Selesai;
    var stat = '<div class="fr-stat">' +
      '<div><b class="num">' + G.n + '</b><span>risiko fraud</span></div>' +
      '<div><b class="num ' + (G.kejadian ? 'bad' : 'good') + '">' + G.kejadian + '</b><span>kejadian fraud</span></div>' +
      '<div><b class="num ' + (G.redflag ? 'warn' : 'good') + '">' + G.redflag + '</b><span>red flag muncul</span></div>' +
      '<div><b class="num">' + (aksiN ? G.aksi.Selesai + '/' + aksiN : '–') + '</b><span>kegiatan mitigasi selesai</span></div></div>';
    // per proses bisnis
    var P = Object.keys(G.proses), mp = Math.max.apply(null, P.map(function (p) { return LV_FRA.reduce(function (a, l) { return a + (G.proses[p][v][l] || 0); }, 0); }).concat([1]));
    var proses = '<div class="sub-h">Per proses bisnis · ' + nmV + '</div><div class="fr-pro">' + P.map(function (p) {
      var x = G.proses[p][v], tot = LV_FRA.reduce(function (a, l) { return a + (x[l] || 0); }, 0);
      return '<div class="fp" title="' + esc(p + ': ' + LV_FRA.filter(function (l) { return x[l]; }).map(function (l) { return l + ' ' + x[l]; }).join(', ')) + '"><span class="fp-l">' + esc(p.replace(/\s*\(.*\)$/, '')) + '</span><span class="num">' + tot + '</span><span class="t">' +
        LV_FRA.slice().reverse().map(function (l) { return x[l] ? '<i style="width:' + (x[l] / mp * 100) + '%;background:var(--risk-' + LV[l] + ')"></i>' : ''; }).join('') + '</span></div>';
    }).join('') + '</div>';
    var SKN = { Corruption: 'Korupsi', AssetMisappropriation: 'Penyalahgunaan aset', FraudulentStatement: 'Kecurangan laporan', ScammingDataTheft: 'Penipuan & pencurian data' };
    var skema = '<div class="sub-h">Skema fraud</div><div class="fr-skema">' + Object.keys(G.skema).sort(function (a, b) { return G.skema[b] - G.skema[a]; }).map(function (k) {
      return '<span><b class="num">' + G.skema[k] + '</b>' + esc(SKN[k] || k) + '</span>'; }).join('') + '</div>';
    var aksi = admin() && R ? '<button class="btn" style="align-self:flex-start" data-act="fra">Daftar risiko fraud →</button>' : '<div class="note">Rincian per risiko fraud hanya dapat dilihat dengan akun Admin.</div>';
    el.innerHTML = '<div class="fr-l">' + g + '</div><div class="fr-m">' + stat + geser + '</div><div class="fr-r">' + proses + skema + aksi + '</div>';
  }
  function frLv(l) { return l ? '<span class="lv" style="background:var(--risk-' + (LV[l] || 1) + ')">' + esc(l) + '</span>' : '–'; }
  function openFra(fokus, sel) {
    var F = fra(); if (!F || !F.risiko || !admin()) return;
    openModal('<div class="modal-h"><div><h3>Risiko Fraud (FRA)</h3><div class="desc">' + F.risiko.length + ' risiko · ' + (F.periode ? 'Monev ' + esc(F.periode) + ' · ' : '') + 'klik baris untuk rincian · khusus Admin</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tools"><input class="inp" id="frQ" type="search" placeholder="Cari risiko, PIC, skema…" aria-label="Cari"><select class="inp" id="frF" aria-label="Saring level residual" style="max-width:220px"><option value="">Semua level residual</option>' + LV_FRA.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>ID</th><th>Risiko fraud</th><th>Proses</th><th>Inheren</th><th>Residual</th><th>PIC</th></tr></thead><tbody id="frT"></tbody></table></div><div class="note" id="frN"></div>');
    function fill() {
      var q = $('frQ').value.toLowerCase(), f = $('frF').value;
      var L = F.risiko.filter(function (r) { return (!sel || (S.fraView === 'inh' ? r.km + '|' + r.dm : (r.kmR || r.km) + '|' + (r.dmR || r.dm)) === sel) && (!f || (r.res || r.inh) === f) && (!q || [r.id, r.des, r.pic, r.skema, r.tipe, r.proses].join(' ').toLowerCase().indexOf(q) >= 0); });
      $('frT').innerHTML = L.map(function (r) { return '<tr class="klik" tabindex="0" data-fr="' + esc(r.id) + '"><td><b>' + esc(r.id) + '</b></td><td>' + esc(r.des) + (/^ya/i.test(r.rfMuncul) ? ' <span class="pill warn">red flag</span>' : '') + (/^terjadi/i.test(r.kejadian) ? ' <span class="pill bad">terjadi</span>' : '') + '</td><td class="tl-m">' + esc(r.proses) + '</td><td>' + frLv(r.inh) + '</td><td>' + frLv(r.res || r.inh) + '</td><td class="tl-m">' + esc(r.pic) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="desc">Tidak ada yang cocok.</td></tr>';
      $('frN').innerHTML = L.length + ' dari ' + F.risiko.length + ' risiko' + (sel ? ' · sel ' + esc(sel.replace('|', ' × ')) + ' (' + (S.fraView === 'inh' ? 'inheren' : 'residual') + ') · <a href="#" data-frsel="">tampilkan semua</a>' : '');
    }
    $('frQ').addEventListener('input', fill); $('frF').addEventListener('change', fill); fill();
    if (fokus) openFr(fokus, true);
  }
  function openFr(id, dariDaftar) {
    var F = fra(); if (!F || !F.risiko || !admin()) return;
    var r = F.risiko.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var A = (F.aksi || []).filter(function (a) { return a[0] === id; });
    var kv = function (k, v) { return '<div class="kx-f"><span class="sub-h">' + k + '</span><div>' + v + '</div></div>'; };
    openModal('<div class="modal-h"><div><div class="desc">' + esc(r.id + ' · ' + r.proses + ' · ' + r.sub) + '</div><h3>' + esc(r.des) + '</h3></div><button class="btn" data-close>Tutup</button></div>' +
      (dariDaftar !== false ? '<div><button class="btn kx-back" type="button" data-act="fra">← Daftar risiko fraud</button></div>' : '') +
      '<div class="fr-det"><div class="fr-lv"><div><span>Inheren</span>' + frLv(r.inh) + '<em>' + esc(r.km + ' × ' + r.dm) + '</em></div><div class="arr">→</div><div><span>Residual</span>' + frLv(r.res || r.inh) + '<em>' + esc((r.kmR || r.km) + ' × ' + (r.dmR || r.dm)) + '</em></div>' +
      '<div><span>Kejadian</span><b class="' + (/^terjadi/i.test(r.kejadian) ? 'bad' : 'good') + '">' + esc(r.kejadian || '–') + '</b></div><div><span>Red flag</span><b class="' + (/^ya/i.test(r.rfMuncul) ? 'warn' : 'good') + '">' + esc(r.rfMuncul || '–') + '</b></div></div><div class="kx-grid">' +
      kv('Skema', esc(r.skema + (r.tipe ? ' · ' + r.tipe : ''))) + kv('Penyebab', baris(r.penyebab)) + kv('Indikator red flag', baris(r.redflag)) + kv('Kontrol eksisting', baris(r.kontrol)) +
      kv('Mitigasi', baris(r.mitigasi)) + kv('PIC · target', esc(r.pic + (r.target ? ' · ' + r.target : ''))) + kv('Efektivitas', esc(r.efektif || 'Belum dievaluasi') + (r.catatan ? '<div class="tl-m">' + esc(r.catatan) + '</div>' : '')) +
      kv('Risiko profil terkait', '<div class="kx-chips">' + chipRisiko([r.profil, r.profilLain].filter(Boolean).join(', ')) + '</div>') + '</div></div>' +
      (A.length ? '<div class="sub-h">Rencana aksi mitigasi</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Kegiatan</th><th>Output</th><th>PIC</th><th>Target</th><th>Status</th></tr></thead><tbody>' +
        A.map(function (a) { var st = /selesai/i.test(a[7]) ? 'good' : /proses/i.test(a[7]) ? 'warn' : 'idle'; return '<tr><td>' + esc(a[1]) + '</td><td>' + esc(a[2]) + '</td><td class="tl-m">' + esc(a[3]) + '</td><td class="tl-m">' + esc(a[4] + (a[5] ? ' · ' + a[5] : '')) + '</td><td class="tl-m">' + esc(a[6]) + '</td><td><span class="pill ' + st + '">' + esc(a[7] || 'Belum') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : ''));
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
    var el = $('inoBody');
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
      inoRingkas(L) +
      '<button class="btn" type="button" data-act="ino">Lihat daftar inovasi →</button>';
  }
  /* daftar ringkas: yang perlu perhatian dulu, lalu tahap tertinggi; maksimal 4 */
  function inoRingkas(L) {
    var bobot = { bad: 0, warn: 1, '': 2, good: 3 };
    var A = L.slice().sort(function (a, b) { return (bobot[a.w[1]] - bobot[b.w[1]]) || (b.tahap - a.tahap); }).slice(0, 4);
    return '<div class="sub-h">Daftar inovasi' + (L.length > 4 ? ' · 4 dari ' + L.length : '') + '</div><div class="ino-l">' + A.map(function (x) {
      return '<div class="ino-i" title="' + esc(x.r['Judul Inovasi']) + '"><span class="ino-t"><b>' + esc(x.r['Judul Inovasi']) + '</b> <span class="ino-m">· ' + (x.tahap ? esc(TAHAP[x.tahap - 1].replace(/^\d\.\s*/, '')) : 'tahap belum diisi') + (x.kinerja ? ' · Kinerja' : '') + '</span></span><span class="pill ' + x.w[1] + '">' + esc(x.w[0]) + '</span></div>';
    }).join('') + '</div>';
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

  /* ---------- Tahap 3: isu internal & eksternal, pihak berkepentingan ---------- */
  function kCol(o, awal) { var k = Object.keys(o).filter(function (x) { return x.indexOf(awal) === 0; })[0]; return k ? String(o[k] || '').trim() : ''; }
  function kIsu() {
    var K = S.data.konteks; if (!K || !K.isu) return [];
    return D.rows(K.isu).map(function (r) { return { kode: kCol(r, 'Kode'), jenis: kCol(r, 'Jenis'), isu: kCol(r, 'Isu'), sas: kCol(r, 'Sasaran'), rk: kCol(r, 'No. Risiko'), pb: kCol(r, 'Pihak'), ket: kCol(r, 'Keterangan') }; }).filter(function (x) { return x.kode; });
  }
  function kPihak() {
    var K = S.data.konteks; if (!K || !K.pihak) return [];
    return D.rows(K.pihak).map(function (r) {
      var st = kCol(r, 'Status'), pr = D.num(String(kCol(r, 'Progres')).replace('%', ''));
      return { r: r, kode: kCol(r, 'Kode'), nama: kCol(r, 'Pihak'), kat: kCol(r, 'Kategori'), pic: kCol(r, 'PIC'), prio: kCol(r, 'Prioritas'), rk: kCol(r, 'No. Risiko'), st: st || 'Belum Dimulai', pr: pr };
    }).filter(function (x) { return x.kode; });
  }
  function kSasaran() { var o = {}; ((S.data.konteks && S.data.konteks.sasaran) || []).forEach(function (s) { o[String(s[0]).trim()] = s[1]; }); return o; }
  function daftar(t) { return String(t || '').split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  /* daftar risiko di Peta Risiko: nomor dan ID */
  function petaRisiko() { return (S.data.risiko && S.data.risiko.rows) ? D.rows(S.data.risiko.rows).map(function (r) { return { no: String(r['No']).trim(), id: String(r['ID Risk'] || ''), des: r['Deskripsi Risiko'] }; }) : []; }
  function chipRisiko(t) {
    var P = petaRisiko(), L = daftar(t);
    if (!L.length) return '<span class="desc">–</span>';
    return L.map(function (x) {
      var m = x.match(/([A-Z]\.\d{2}\.\d{2}\.\d{3})/), lab = x, hit = null;
      if (/^\d+$/.test(x)) { var n = String(parseInt(x, 10)); hit = P.filter(function (p) { return p.no === n; })[0]; lab = n; }
      else if (m) { hit = P.filter(function (p) { return p.id.slice(-m[1].length) === m[1]; })[0]; var lk = x.match(/\(([^)]+)\)/); lab = lk ? lk[1] : m[1]; }
      return hit ? '<button type="button" class="rchip" data-rk="' + esc(hit.no) + '" title="' + esc('Risiko ' + hit.no + ': ' + hit.des + ' · ketuk untuk menyorot di Peta Risiko') + '">R' + esc(lab) + '</button>'
        : '<span class="rchip off" title="' + esc(x + ' · tidak ada di Peta Risiko (cek tab 4. Peta Risiko di file Profil Risiko)') + '">R' + esc(lab) + '</span>';
    }).join('');
  }
  function kStatus(st) { return /tercapai|selesai/i.test(st) ? 'good' : /berjalan|progress/i.test(st) ? 'warn' : 'idle'; }
  function baris(t) { return esc(t || '–').replace(/\n/g, '<br>'); }
  function kosongKonteks(el) {
    el.innerHTML = '<div class="empty">Data isu &amp; pihak berkepentingan belum terbaca. Pastikan Apps Script sudah versi terbaru (Deploy versi baru) dan tab <b>2b. Pihak Berkepentingan</b> serta <b>2c. Isu &amp; Kaitan Risiko</b> ada di file Profil Risiko.</div>';
  }
  function renderIsu() {
    var el = $('isuBody'); if (!el) return;
    if (!S.data.konteks) return kosongKonteks(el);
    var L = kIsu(), SS = kSasaran();
    if (!L.length) { el.innerHTML = '<div class="empty">Belum ada isu di tab 2c. Isu &amp; Kaitan Risiko.</div>'; return; }
    var nI = L.filter(function (x) { return /intern/i.test(x.jenis); }).length, nR = L.filter(function (x) { return daftar(x.rk).length; }).length;
    var per = Object.keys(SS).map(function (k) { return [k, SS[k], L.filter(function (x) { return daftar(x.sas).indexOf(k) >= 0; }).length]; });
    var mx = Math.max.apply(null, per.map(function (x) { return x[2]; }).concat([1]));
    el.innerHTML = '<div class="mini-sum"><div><b class="num">' + L.length + '</b><span>isu ' + esc(String(S.tahun)) + '</span></div><div><b class="num">' + nI + ' · ' + (L.length - nI) + '</b><span>internal · eksternal</span></div><div><b class="num ' + (nR < L.length ? 'warn' : 'good') + '">' + nR + '</b><span>terkait risiko</span></div></div>' +
      (per.length ? '<div class="sub-h">Per sasaran strategis</div><div class="bars">' + per.map(function (x) { return '<div class="r" title="' + esc(x[0] + '. ' + x[1]) + '"><span>' + esc(x[0] + '. ' + x[1]) + '</span><span class="t"><i style="width:' + (x[2] / mx * 100) + '%;background:var(--bar)"></i></span><span class="num">' + x[2] + '</span></div>'; }).join('') + '</div>' : '') +
      '<div class="sub-h">Isu dan risiko terkait · ketuk R untuk menyorot di Peta Risiko</div><div class="kx-list">' +
      L.map(function (x) { return '<div class="kx-row"><span class="kx-kode ' + (/intern/i.test(x.jenis) ? 'i' : 'e') + '">' + esc(x.kode) + '</span><span class="kx-t">' + esc(x.isu) + '</span><span class="kx-chips">' + chipRisiko(x.rk) + '</span></div>'; }).join('') + '</div>' +
      '<button class="btn" type="button" data-act="isu">Lihat tabel isu →</button>';
  }
  function renderPihak() {
    var el = $('pbBody'); if (!el) return;
    if (!S.data.konteks) return kosongKonteks(el);
    var L = kPihak();
    if (!L.length) { el.innerHTML = '<div class="empty">Belum ada data di tab 2b. Pihak Berkepentingan.</div>'; return; }
    var c = { good: 0, warn: 0, idle: 0 }; L.forEach(function (x) { c[kStatus(x.st)]++; });
    var pr = L.filter(function (x) { return x.pr !== null; }), rata = pr.length ? pr.reduce(function (s, x) { return s + x.pr; }, 0) / pr.length : null;
    el.innerHTML = '<div class="mini-sum"><div><b class="num">' + L.length + '</b><span>pihak · rata-rata progres ' + (rata === null ? '–' : D.fmt(rata, 0) + '%') + '</span></div><div><b class="num good">' + c.good + '</b><span>tercapai</span></div><div><b class="num ' + (c.warn ? 'warn' : '') + '">' + (c.warn + c.idle) + '</b><span>berjalan / belum</span></div></div>' +
      '<div class="sub-h">Progres pemenuhan kebutuhan & harapan · ketuk untuk rincian</div><div class="kx-list">' +
      L.map(function (x) {
        var k = kStatus(x.st), w = x.pr === null ? 0 : Math.max(0, Math.min(100, x.pr));
        return '<button type="button" class="kx-pb" data-pb="' + esc(x.kode) + '"><span class="kx-n"><b>' + esc(x.nama) + '</b><small>' + esc([x.kat, x.pic].filter(Boolean).join(' · ')) + '</small></span>' +
          '<span class="kx-bar"><span><i class="' + k + '" style="width:' + w + '%"></i></span><b class="num">' + (x.pr === null ? '–' : D.fmt(x.pr, 0) + '%') + '</b></span><span class="kx-st ' + k + '">' + esc(x.st) + '</span></button>';
      }).join('') + '</div>' +
      '<button class="btn" type="button" data-act="pb">Lihat matriks lengkap →</button>';
  }
  function openIsu() {
    var L = kIsu(), SS = kSasaran(), PB = {}, f = '';
    kPihak().forEach(function (p) { PB[p.kode] = p.nama; });
    openModal('<div class="modal-h"><div><h3>Isu Internal &amp; Eksternal ' + esc(String(S.tahun)) + '</h3><div class="desc">File Profil Risiko · tab 2c. Isu &amp; Kaitan Risiko · arahkan kursor ke nomor sasaran atau kode pihak untuk melihat namanya</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tabs" role="tablist"><button type="button" data-kf="" aria-selected="true">Semua (' + L.length + ')</button><button type="button" data-kf="i" aria-selected="false">Internal</button><button type="button" data-kf="e" aria-selected="false">Eksternal</button></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Kode</th><th>Isu</th><th>Sasaran</th><th>Risiko</th><th>Pihak berkepentingan</th><th>Keterangan</th></tr></thead><tbody id="kxT"></tbody></table></div>', 'wide');
    function fill() {
      $('kxT').innerHTML = L.filter(function (x) { return !f || (f === 'i') === /intern/i.test(x.jenis); }).map(function (x) {
        return '<tr><td><span class="kx-kode ' + (/intern/i.test(x.jenis) ? 'i' : 'e') + '">' + esc(x.kode) + '</span></td><td>' + esc(x.isu) + '</td>' +
          '<td>' + (daftar(x.sas).map(function (s) { return '<span class="kx-tag" title="' + esc(SS[s] || 'Sasaran ' + s) + '">' + esc(s) + '</span>'; }).join('') || '–') + '</td>' +
          '<td>' + chipRisiko(x.rk) + '</td><td>' + (daftar(x.pb).map(function (p) { return PB[p] ? '<button type="button" class="kx-tag link" data-pb="' + esc(p) + '" title="' + esc(PB[p]) + '">' + esc(p) + '</button>' : '<span class="kx-tag">' + esc(p) + '</span>'; }).join('') || '–') + '</td>' +
          '<td class="desc">' + esc(x.ket) + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="desc">Tidak ada.</td></tr>';
    }
    fill();
    Array.prototype.forEach.call($('modalC').querySelectorAll('[data-kf]'), function (b) { b.addEventListener('click', function () { f = b.getAttribute('data-kf'); Array.prototype.forEach.call($('modalC').querySelectorAll('[data-kf]'), function (x) { x.setAttribute('aria-selected', x === b); }); fill(); }); });
  }
  function openPbList() {
    var L = kPihak();
    openModal('<div class="modal-h"><div><h3>Matriks Pihak Berkepentingan ' + esc(String(S.tahun)) + '</h3><div class="desc">File Profil Risiko · tab 2b. Pihak Berkepentingan · ketuk baris untuk rincian</div></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Pihak</th><th>Kategori</th><th>PIC</th><th class="r">Prioritas</th><th class="r">Progres</th><th>Status</th><th>Risiko</th></tr></thead><tbody id="pbT">' +
      L.map(function (x) {
        return '<tr class="klik" tabindex="0" data-pb="' + esc(x.kode) + '"><td><b>' + esc(x.nama) + '</b><div class="desc">' + esc(x.kode) + '</div></td><td>' + esc(x.kat) + '</td><td>' + esc(x.pic) + '</td><td class="r">' + esc(x.prio || '–') + '</td>' +
          '<td class="r">' + (x.pr === null ? '–' : D.fmt(x.pr, 0) + '%') + '</td><td><span class="kx-st ' + kStatus(x.st) + '">' + esc(x.st) + '</span></td><td>' + chipRisiko(x.rk) + '</td></tr>';
      }).join('') + '</tbody></table></div>', 'wide');
  }
  function openPihak(kode, kembali) {
    var x = kPihak().filter(function (p) { return p.kode === kode; })[0]; if (!x) return;
    var r = x.r, isu = kIsu().filter(function (i) { return daftar(i.pb).indexOf(kode) >= 0; }), k = kStatus(x.st), w = x.pr === null ? 0 : Math.max(0, Math.min(100, x.pr));
    function f(lbl, awal) { var v = kCol(r, awal); return v ? '<div class="kx-f"><span class="sub-h">' + lbl + '</span><div>' + baris(v) + '</div></div>' : ''; }
    openModal('<div class="modal-h"><div><h3>' + esc(x.nama) + '</h3><div class="desc">' + esc([x.kode, x.kat, 'PIC ' + (x.pic || '–'), 'prioritas ' + (x.prio || '–'), 'target ' + (kCol(r, 'Target') || '–')].join(' · ')) + '</div></div><div class="row-gap">' + (kembali ? '<button class="btn kx-back" type="button" data-kembali="' + kembali + '">← Kembali</button>' : '') + '<button class="btn" data-close>Tutup</button></div></div>' +
      '<div class="kx-head"><span class="kx-st ' + k + '">' + esc(x.st) + '</span><span class="kx-bar big"><span><i class="' + k + '" style="width:' + w + '%"></i></span><b class="num">' + (x.pr === null ? '–' : D.fmt(x.pr, 0) + '%') + '</b></span></div>' +
      '<div class="kx-grid">' + f('Kebutuhan', 'Kebutuhan') + f('Harapan', 'Harapan') + f('Strategi / media pemenuhan', 'Strategi') + f('Sasaran kinerja (KPI) terkait', 'Sasaran Kinerja') + f('Manfaat', 'Manfaat') +
      '<div class="kx-f"><span class="sub-h">Risiko</span><div>' + baris(kCol(r, 'Risiko')) + '<div class="kx-chips" style="margin-top:6px">' + chipRisiko(x.rk) + '</div></div></div>' +
      f('Mitigasi risiko', 'Mitigasi') + f('Uraian progres', 'Uraian') + f('Media komunikasi / pelaporan', 'Media') + f('Tinjauan pemenuhan', 'Tinjauan') +
      (isu.length ? '<div class="kx-f"><span class="sub-h">Isu terkait</span><div>' + isu.map(function (i) { return '<div><span class="kx-kode ' + (/intern/i.test(i.jenis) ? 'i' : 'e') + '">' + esc(i.kode) + '</span> ' + esc(i.isu) + '</div>'; }).join('') + '</div></div>' : '') +
      '</div>', 'wide');
  }
  function sorotRisiko(no) {
    var ada = petaRisiko().some(function (p) { return p.no === no; });
    if (!ada) return toast('Risiko ' + no + ' tidak ada di Peta Risiko.');
    S.riskOn = no; renderRisk();
    var p = $('riskPanel'); if (p) p.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- struktur organisasi ---------- */
  function judulNama(t) {   // HURUF BESAR -> Huruf Awal Besar, singkatan tetap
    return String(t || '').toLowerCase().replace(/(^|[\s(\/,.-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/\b(Pln|Updl|Tl|Sof|K3l|Pdkb|Pt|Cs|Fo|Jar|Pku|Pbj|Lab|Asman)\b/g, function (w) { return w === 'Asman' ? 'Asman' : w.toUpperCase(); })
      .replace(/\b(Dan)\b/g, 'dan');
  }
  function openOrg() {
    openModal('<div class="modal-h"><div><h3>Struktur Organisasi</h3><div class="desc" id="orgDesc">PLN UPDL Semarang</div></div>' +
      '<div class="row-gap"><input class="og-cari" id="orgCari" type="search" placeholder="Cari nama atau jabatan…" aria-label="Cari nama atau jabatan">' +
      '<div class="seg" role="group" aria-label="Tampilan struktur"><button type="button" data-ov="peg" aria-pressed="true">Pegawai PLN</button><button type="button" data-ov="ad" aria-pressed="false">Alih Daya</button></div><button class="btn" data-close>Tutup</button></div></div><div id="orgBody"></div>', 'xwide');
    $('orgCari').addEventListener('input', cariOrg);
    renderOrg();
  }
  function cariOrg() {
    var q = ($('orgCari') && $('orgCari').value || '').trim().toLowerCase(), body = $('orgBody'); if (!body) return;
    Array.prototype.forEach.call(body.querySelectorAll('.og-pc'), function (c) { c.classList.toggle('hit', !!q && c.getAttribute('data-q').indexOf(q) >= 0); });
    Array.prototype.forEach.call(body.querySelectorAll('.og-adc'), function (d) { var m = !q || d.getAttribute('data-q').indexOf(q) >= 0; d.hidden = !m; d.open = !!q && m; });
    Array.prototype.forEach.call(body.querySelectorAll('.og-kat,.og-co'), function (k) { k.hidden = !k.querySelector('.og-adc:not([hidden])'); });
    var f = q && body.querySelector('.og-pc.hit, .og-adc[open]'); if (f) f.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function inisial(n) { var w = String(n).trim().split(/\s+/); return ((w[0] || '?').charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase(); }
  function renderOrg() {
    var O = S.data.org, el = $('orgBody');
    Array.prototype.forEach.call(document.querySelectorAll('[data-ov]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ov') === S.orgView); });
    if (!el) return;
    if (!O) { el.innerHTML = '<div class="empty">Data struktur organisasi belum terbaca. Pastikan Apps Script sudah versi terbaru dan tab <b>Data - Pegawai</b> ada di spreadsheet.</div>'; return; }
    $('orgDesc').textContent = 'PLN UPDL Semarang' + (O.periode ? ' · data pegawai periode ' + O.periode : '') + ' · bagan disusun dari kolom Atasan Langsung';
    var P = (O.pegawai || []).map(function (r) { return { nama: String(r[0] || '').trim(), jab: String(r[1] || '').trim(), atas: String(r[2] || '').trim(), lvl: String(r[3] || '') }; }).filter(function (p) { return p.nama || p.jab; });
    var AD = O.alihDaya || [], nS = P.filter(function (p) { return !/FUNGSIONAL/i.test(p.lvl); }).length;
    var sum = '<div class="og-stats"><div><b class="num">' + P.length + '</b><span>pegawai PLN</span></div><div><b class="num">' + nS + '</b><span>struktural</span></div><div><b class="num">' + (P.length - nS) + '</b><span>fungsional</span></div><div><b class="num">' + AD.length + '</b><span>tenaga alih daya</span></div></div>';
    if (S.orgView === 'ad') { el.innerHTML = sum + orgAlihDaya(AD); return cariOrg(); }
    if (!P.length) { el.innerHTML = sum + '<div class="empty">Tab Data - Pegawai masih kosong.</div>'; return; }
    var adaJab = {}; P.forEach(function (p) { adaJab[p.jab.toUpperCase()] = 1; });
    function urut(x, y) { return x.jab.localeCompare(y.jab, 'id') || x.nama.localeCompare(y.nama, 'id'); }
    var puncak = P.filter(function (p) { return !adaJab[p.atas.toUpperCase()]; });
    var root = puncak.filter(function (p) { return /MANAGER|GENERAL MANAGER|^-?$/i.test(p.jab) || /^-?$/.test(p.atas); })[0] || puncak[0] || P[0];
    var yatim = puncak.filter(function (p) { return p !== root; });
    function anak(p) { return P.filter(function (q) { return q !== p && (q.atas.toUpperCase() === p.jab.toUpperCase() || (p === root && yatim.indexOf(q) >= 0)); }).sort(urut); }
    function kartu(p, cls, h) {
      return '<div class="og-pc' + (cls ? ' ' + cls : '') + '"' + (h ? ' style="--h:var(' + h + ')"' : '') + ' data-q="' + esc((p.nama + ' ' + p.jab).toLowerCase()) + '"><span class="og-av">' + esc(inisial(p.nama)) + '</span><span class="og-t"><span class="og-j">' + esc(judulNama(p.jab)) + '</span><span class="og-n">' + esc(judulNama(p.nama)) + '</span></span></div>';
    }
    var direct = anak(root), lanes = direct.filter(function (p) { return anak(p).length; }), staf = direct.filter(function (p) { return !anak(p).length; });
    var sl = staf.slice(0, Math.ceil(staf.length / 2)), sr = staf.slice(Math.ceil(staf.length / 2)), WARNA = ['--og-1', '--og-2', '--og-3'];
    var h = '<div class="og-apex">' + kartu(root, 'big', '--og-mgr') + '</div>' +
      (staf.length ? '<div class="og-mid"><div class="og-staf l"><span class="og-lb">Langsung di bawah ' + esc(judulNama(root.jab).replace(/ PLN.*$/i, '')) + '</span>' + sl.map(function (p) { return kartu(p, '', '--og-staf'); }).join('') + '</div><div class="og-ln"></div><div class="og-staf r"><span class="og-lb">&nbsp;</span>' + sr.map(function (p) { return kartu(p, '', '--og-staf'); }).join('') + '</div></div>' : '<div class="og-stem"></div>') +
      '<div class="og-lanes" style="--n:' + Math.max(1, lanes.length) + '">';
    var wi = 0;
    lanes.forEach(function (a) {
      var kids = anak(a), tim = kids.filter(function (k) { return !/FUNGSIONAL/i.test(k.lvl) || anak(k).length; }), fung = kids.filter(function (k) { return tim.indexOf(k) < 0; });
      var total = 1; (function hitung(p) { anak(p).forEach(function (c) { total++; hitung(c); }); })(a);
      var hc = /PENYELENGGARAAN|PEMBELAJARAN/i.test(a.jab) ? '--og-kuning' : /PELAYANAN|KEUANGAN/i.test(a.jab) ? '--og-biru' : WARNA[wi++ % WARNA.length];
      h += '<section class="og-lane" style="--h:var(' + hc + ')">' + kartu(a, 'asman') + '<div class="og-sum">' + total + ' orang · ' + tim.length + ' tim' + (fung.length ? ' · ' + fung.length + ' fungsional' : '') + '</div><div class="og-body">';
      tim.forEach(function (t) { var m = anak(t); h += '<div class="og-team">' + kartu(t) + (m.length ? '<div class="og-mem">' + m.map(function (x) { return kartu(x); }).join('') + '</div>' : '') + '</div>'; });
      if (fung.length) h += '<div class="og-lb">Fungsional langsung di bawah Asman</div><div class="og-fung">' + fung.map(function (x) { return kartu(x); }).join('') + '</div>';
      h += '</div></section>';
    });
    h += '</div>';
    el.innerHTML = sum + '<div class="og-tree">' + h + '</div>' +
      (yatim.length ? '<div class="warnbox">Atasan langsung tidak ditemukan untuk: ' + yatim.map(function (p) { return esc(judulNama(p.jab)) + ' (atasan tertulis "' + esc(p.atas) + '")'; }).join('; ') + '. Samakan isi kolom Atasan Langsung dengan kolom Jabatan atasannya.</div>' : '');
    cariOrg();
  }
  function orgAlihDaya(AD) {
    if (!AD.length) return '<div class="empty">Tab Data - Alih Daya masih kosong.</div>';
    var KN = { CS: 'Cleaning Service', ADMIN: 'Administrasi', SATPAM: 'Keamanan (Satpam)', TEKNISI: 'Teknisi', DRIVER: 'Pengemudi', OPDIK: 'Operator Pendidikan' };
    var IC = { SATPAM: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>', CS: '<path d="M4 20h16M7 20V10l5-6 5 6v10M10 20v-5h4v5"/>', TEKNISI: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', DRIVER: '<rect x="3" y="11" width="18" height="6" rx="2"/><path d="M5 11l2-5h10l2 5M7 17v2M17 17v2"/>', ADMIN: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', LAIN: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' };
    function kat(b) { return String(b || 'Lainnya').trim().split(/[\s(]+/)[0].toUpperCase() || 'LAINNYA'; }
    function sub(b, k) { var r = String(b || '').trim().slice(k.length).trim().replace(/^\(|\)$/g, ''); return judulNama(r || b || 'Lainnya'); }
    function n(o) { return Object.keys(o).reduce(function (s, k) { return s + (Array.isArray(o[k]) ? o[k].length : n(o[k])); }, 0); }
    var T = {}; AD.forEach(function (r) { var c = String(r[1] || 'Lainnya').trim(), k = kat(r[2]), b = String(r[2] || 'Lainnya').trim(); T[c] = T[c] || {}; T[c][k] = T[c][k] || {}; (T[c][k][b] = T[c][k][b] || []).push(r); });
    var CW = ['--og-c1', '--og-c2', '--og-c3', '--og-c4'];
    var parts = Object.keys(T).sort(function (a, b) { return n(T[b]) - n(T[a]) || a.localeCompare(b, 'id'); }).map(function (c, ci) {
      var kk = Object.keys(T[c]).sort(function (a, b) { return n(T[c][b]) - n(T[c][a]) || a.localeCompare(b, 'id'); });
      return '<section class="og-co" style="--c:var(' + CW[ci % CW.length] + ')"><header class="og-coh"><span class="og-cdot"></span><h4>' + esc(judulNama(c)) + '</h4><b>' + n(T[c]) + ' orang</b><span class="og-cchips">' + kk.map(function (k) { return '<span>' + esc(KN[k] || judulNama(k)) + ' ' + n(T[c][k]) + '</span>'; }).join('') + '</span></header><div class="og-kats">' +
        kk.map(function (k) {
          var bag = T[c][k], bk = Object.keys(bag).sort(function (a, b) { return bag[b].length - bag[a].length || a.localeCompare(b, 'id'); });
          return '<div class="og-kat" style="--k:' + Math.min(bk.length, 4) + '"><div class="og-kh"><span class="og-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (IC[k] || IC.LAIN) + '</svg></span><span>' + esc(KN[k] || judulNama(k)) + '</span><b>' + n(bag) + ' orang</b></div><div class="og-ad">' +
            bk.map(function (b) {
              var rows = bag[b].slice().sort(function (x, y) { return String(x[0]).localeCompare(String(y[0]), 'id'); }), lok = {};
              rows.forEach(function (r) { var l = String(r[3] || '').trim(); if (l) lok[l] = (lok[l] || 0) + 1; });
              return '<details class="og-adc" data-q="' + esc((b + ' ' + c + ' ' + rows.map(function (r) { return r[0]; }).join(' ')).toLowerCase()) + '"><summary><span><b>' + esc(sub(b, k)) + '</b><small>' + Object.keys(lok).map(function (l) { return esc(judulNama(l)) + ' ' + lok[l]; }).join(' · ') + '</small></span><span class="og-cnt num">' + rows.length + '</span></summary><ul>' +
                rows.map(function (r) { return '<li>' + esc(judulNama(r[0])) + '<span>' + esc(judulNama(r[3] || '')) + '</span></li>'; }).join('') + '</ul></details>';
            }).join('') + '</div></div>';
        }).join('') + '</div></section>';
    });
    return '<div class="og-adwrap' + (parts.length > 1 ? '' : ' one') + '">' + parts[0] + (parts.length > 1 ? '<div class="og-adside">' + parts.slice(1).join('') + '</div>' : '') + '</div>';
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

  /* ---------- arti singkatan butir evaluasi (tab Master Evaluasi L1) ---------- */
  function kunciButir(x) { return String(x || '').toLowerCase().replace(/(\d)\s*0f\s*(\d)/, '$1of$2').replace(/[^a-z0-9]/g, ''); }
  var MASTER = null, MASTER_SRC = null;
  function arti(label) {
    var M = S.data && S.data.masterL1;
    if (MASTER_SRC !== M) { MASTER = {}; MASTER_SRC = M; (M || []).forEach(function (r) { MASTER[kunciButir(r[0])] = { singkat: r[0], objek: r[1], aspek: r[2], tanya: r[3] }; }); }
    return MASTER[kunciButir(label)] || null;
  }
  /* "Mat-Sat 1 of 2" + pertanyaannya (kecil di bawah) */
  function butirHtml(label) {
    var a = arti(label);
    return '<b>' + esc(label) + '</b>' + (a ? '<div class="tl-m">' + esc(a.tanya) + '</div>' : '');
  }

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
      '<div id="kB" class="tbl-wrap scroll" hidden><table class="tbl"><thead><tr><th>Objek · aspek</th><th>Butir</th><th class="r">Rata-rata</th><th class="r">Jawaban</th></tr></thead><tbody>' +
        K.butir.map(function (b) { var a = arti(b.label); return '<tr><td>' + esc(a ? a.objek + ' · ' + a.aspek : b.aspek) + '</td><td>' + butirHtml(b.label) + '</td><td class="r ' + nilaiKls(b.nilai, t) + '"><b>' + D.fmt(b.nilai, 2) + '</b></td><td class="r">' + D.fmt(b.n, 0) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div id="kC" class="tbl-wrap scroll" hidden><table class="tbl"><thead><tr><th>Pelatihan</th><th>Selesai</th><th class="r">Responden</th><th class="r">Nilai</th></tr></thead><tbody>' +
        urutPel(K.pel).map(function (x) { return '<tr><td>' + esc(x.judul) + '</td><td>' + tglPendek(x.tg) + '</td><td class="r">' + D.fmt(x.n, 0) + '</td><td class="r ' + nilaiKls(x.nilai, t) + '"><b>' + D.fmt(x.nilai, 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="note">Sumber: <b>' + esc(((S.data.meta || {}).sumberEval || {}).kepuasan || 'Data - Kepuasan EL1') + '</b>; pertanyaannya dari tab <b>Master Evaluasi L1</b>. Data per jadwal dibobot jumlah pengisi (P.Isi), jadi "jawaban" = jumlah pengisi.</div>');
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
        '<div class="sub-h">Rata-rata per butir</div><div class="tbl-wrap scroll"><table class="tbl"><thead><tr><th>Butir</th><th class="r">Rata-rata</th></tr></thead><tbody>' +
        x.butir.filter(function (b) { return b.nilai !== null; }).map(function (b) { return '<tr><td>' + butirHtml(b.label) + '</td><td class="r ' + nilaiKls(b.nilai, t) + '"><b>' + D.fmt(b.nilai, 2) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
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
  var G = window.Genie, modalAsal = null, menutup = 0;
  function openModal(html, kelas) {
    var baru = $('modal').hidden || !!menutup;
    menutup = 0; if (G) { G.bersih($('modal')); G.bersih($('modalC')); }
    if ($('modal').hidden) { lastFocus = document.activeElement; modalAsal = G ? G.catat() : null; }
    $('modalC').className = 'modal-c' + (kelas ? ' ' + kelas : ''); $('modalC').innerHTML = html; $('modal').hidden = false;
    var b = $('modalC').querySelector('[data-close]'); if (b) b.focus({ preventScroll: true });
    if (G && modalAsal && baru) { G.pudar($('modal'), true); G.jalan($('modalC'), modalAsal.r || G.balik(modalAsal), true); }
  }
  function closeModal() {
    if ($('modal').hidden || menutup) return;
    var token = menutup = Date.now();
    function selesai() { if (menutup !== token) return; menutup = 0; $('modal').hidden = true; $('modalC').innerHTML = ''; if (G) { G.bersih($('modal')); } if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
    if (!G) return selesai();
    G.pudar($('modal'), false); G.jalan($('modalC'), G.balik(modalAsal), false).then(selesai);
  }

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
    [['Perlu perhatian', renderPerhatian], ['Kartu utama', renderKpis], ['Evaluasi', renderMinis], ['Grafik bulanan', renderChart], ['Indikator', renderInd], ['Kepatuhan', renderKep],
     ['Tindak lanjut', renderTL], ['Maturity', renderMl], ['IDP', renderIdp], ['Inovasi', renderIno], ['Peta risiko', renderRisk], ['KRI', renderKri], ['FRA', renderFra], ['Isu', renderIsu], ['Pihak berkepentingan', renderPihak], ['Struktur organisasi', renderOrg]].forEach(function (x) {
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
    if (m.judul) { $('judul').textContent = m.judul; document.title = m.judul; }
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
  /* label perangkat untuk tab Log Login (tanpa data pribadi): jenis perangkat + browser */
  function perangkat() {
    var ua = navigator.userAgent || '', jenis = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'HP' : 'Komputer';
    var br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser lain';
    return jenis + ' · ' + br;
  }
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
    D.api({ aksi: 'login', username: u, password: pw, perangkat: perangkat() }).then(function (d) {
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
  $('tahunSel').addEventListener('change', function (e) { if (!S.data) return; var y = +e.target.value; setPeriode(y, S.cache.konman[y] ? bulanBawaan(y) : S.bulan); });
  $('bulanSel').addEventListener('change', function (e) { if (!S.data) return; setPeriode(S.tahun, +e.target.value); });
  function muatUlang() { D.hapusCache(); return load(); }
  $('refreshBtn').addEventListener('click', muatUlang);
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var ind = t.closest('[data-ind]'); if (ind) return openInd(ind.getAttribute('data-ind'));
    var rkc = t.closest('[data-rk]'); if (rkc) { var no = rkc.getAttribute('data-rk'); if (!$('modal').hidden) closeModal(); return sorotRisiko(no); }
    var kb = t.closest('[data-kembali]'); if (kb) return kb.getAttribute('data-kembali') === 'isu' ? openIsu() : openPbList();
    var pbc = t.closest('[data-pb]'); if (pbc) return openPihak(pbc.getAttribute('data-pb'), pbc.closest('#pbT') ? 'pb' : pbc.closest('#kxT') ? 'isu' : '');
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
      if (a === 'isu') return openIsu();
      if (a === 'pb') return openPbList();
      if (a === 'segar') return openSegar();
      if (a === 'fra') return openFra();
      if (a === 'idp') return openIdp();
      if (a === 'ino') return openIno();
      if (a.indexOf('rekap:') === 0) return openRekap(a.split(':')[1]);
    }
    var phx = t.closest('[data-ph]');
    if (phx) { var pe = $('perhatian'); if (phx.getAttribute('data-ph') === 'tutup') { if (pe.classList.contains('ok')) pe.classList.remove('lihat'); else phMode('tutup'); } else phMode(pe.classList.contains('kecil') ? 'buka' : 'kecil'); return; }
    if (t.closest('#notifBtn')) {
      var pn = $('perhatian'), tertutup = pn.classList.contains('tutup') || pn.classList.contains('kecil') || (pn.classList.contains('ok') && !pn.classList.contains('lihat'));
      phMode(tertutup ? 'buka' : 'tutup');
      if (tertutup) window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var phm = t.closest('[data-phmore]'); if (phm) { var bk = $('perhatian').classList.toggle('buka'); phm.setAttribute('aria-expanded', bk); phm.textContent = bk ? 'Ringkas' : 'Tampilkan semua (' + $('perhatian').querySelectorAll('.ph-i').length + ')'; return; }
    var kl = t.closest('[data-kl]'); if (kl) { S.mlKlausul = kl.getAttribute('data-kl'); return renderMl(); }
    var ml = t.closest('[data-ml]'); if (ml) { S.mlMode = ml.getAttribute('data-ml'); Array.prototype.forEach.call(document.querySelectorAll('[data-ml]'), function (b) { b.setAttribute('aria-pressed', b === ml); }); return renderMl(); }
    var ov = t.closest('[data-ov]'); if (ov) { S.orgView = ov.getAttribute('data-ov'); return renderOrg(); }
    var rv = t.closest('[data-rv]'); if (rv) { S.riskView = rv.getAttribute('data-rv'); return renderRisk(); }
    var kv = t.closest('[data-kv]'); if (kv) { S.kriView = kv.getAttribute('data-kv'); return renderKri(); }
    var fv = t.closest('[data-fv]'); if (fv) { S.fraView = fv.getAttribute('data-fv'); return renderFra(); }
    var fs = t.closest('[data-frsel]'); if (fs) { e.preventDefault && e.preventDefault(); return openFra(null, fs.getAttribute('data-frsel') || null); }
    var fr = t.closest('[data-fr]'); if (fr) return openFr(fr.getAttribute('data-fr'), !!fr.closest('#frT'));
    var r = t.closest('[data-r]'); if (r) { var n = r.getAttribute('data-r'); S.riskOn = S.riskOn === n ? null : n; return renderRisk(); }
    if (t.closest('[data-close]') || t === $('modal')) return closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('modal').hidden) return closeModal();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card.click, tr.klik[data-pb]')) { e.preventDefault(); e.target.click(); }
  });

  /* dipakai input.js dan export.js */
  window.DashApp = {
    S: S, K: K, kelas: kelas, set: set, find: find, konmanAda: konmanAda, totalSkor: totalSkor, pengurang: pengurang,
    kepRows: kepRows, kepVal: kepVal, pegawai: pegawai, hop: hop, status: status, labelNo: labelNo, namaBulan: namaBulan, B: B,
    tlRows: tlRows, tlStatus: tlStatus, tlAsli: tlAsli, ev: ev, admin: admin, keluar: keluar, reload: muatUlang, toast: toast, openModal: openModal,
    idpRows: idpRows, inoRows: inoRows, kIsu: kIsu, kPihak: kPihak, kSasaran: kSasaran, JALUR: JALUR, KEL_IDP: KEL_IDP, TAHAP: TAHAP, judulNama: judulNama,
    kesegaran: kesegaran, perhatian: perhatian, sheetLink: sheetLink
  };
  function toast(t, ms) { var el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, ms || 4000); }

  var s0 = D.sesi();
  if (s0) { aturPeran(s0.peran, s0.user); tampilApp(); load(); } else tampilLogin('');
  setInterval(function () {
    var bebas = Array.prototype.every.call(document.querySelectorAll('.modal'), function (m) { return m.hidden; });
    if (S.data && S.data.meta && S.data.meta.source === 'live' && document.visibilityState === 'visible' && bebas) { muatUlang(); }
  }, 5 * 60 * 1000);
})();
