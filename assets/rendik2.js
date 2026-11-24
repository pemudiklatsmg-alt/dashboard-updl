/* Rendiklat Part 2 & 3: realisasi per kategori, kalender rencana/realisasi, biaya per diklat, kualitas delivery.
   Sumber: S.data.rendiklatRinci[tahun] = { kolom: [...], rows: [[...]] } dari sheet kategori file Rendiklat
   (LEADERSHIP, IKP KKJ, PIL, PENUGASAN, PINJAMSEWA, ACADEMY). Rencana = P.Tgl, realisasi = R.Tgl. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  var KAT = [['LEADERSHIP', 'Leadership (LDP)'], ['IKP KKJ', 'IKP KKJ'], ['PIL', 'PIL'], ['PENUGASAN', 'Penugasan'], ['PINJAMSEWA', 'Pinjam/Sewa'], ['ACADEMY', 'Academy']];
  var st = { kat: '', mode: 'rencana', kb: null, ky: null };
  var memo = { src: null, list: null };

  function nmKat(k) { for (var i = 0; i < KAT.length; i++) if (KAT[i][0] === k) return KAT[i][1]; return k; }
  function noKat(k) { for (var i = 0; i < KAT.length; i++) if (KAT[i][0] === k) return i + 1; return 6; }
  function tg(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; }
  function selisihHari(a, b) { return Math.round((b - a) / 864e5); }
  function tglPendek(d) { return d ? d.getDate() + ' ' + BL3[d.getMonth()] : '–'; }
  function rentang(a, b) { if (!a) return '–'; if (!b || +a === +b) return tglPendek(a); return tglPendek(a) + '–' + tglPendek(b); }
  function rp(n, ringkas) {
    if (n === null || n === undefined || !isFinite(n)) return '–';
    if (ringkas && Math.abs(n) >= 1e9) return 'Rp' + D.fmt(n / 1e9, 2) + ' M';
    if (ringkas && Math.abs(n) >= 1e6) return 'Rp' + D.fmt(n / 1e6, 1) + ' jt';
    return 'Rp' + D.fmt(n, 0);
  }
  function angka(x) { return x === '' || x === null || x === undefined || isNaN(Number(x)) ? null : Number(x); }
  function status(r) {
    var s = String(r.status || '').trim(), b = String(r.batal || '').toLowerCase();
    if (/batal/i.test(s) || /batal/.test(b)) return 'Dibatalkan';
    if (/tunda/i.test(s) || /tunda/.test(b)) return 'Ditunda';
    if (/selesai/i.test(s)) return 'Selesai';
    if (/berlangsung/i.test(s)) return 'Berlangsung';
    if (/terjadwal/i.test(s)) return 'Terjadwal';
    return 'Belum';
  }

  function semua() {
    var S = A().S, R = ((S.data || {}).rendiklatRinci || {})[S.tahun];
    if (!R || !R.rows) return null;
    if (memo.src === R) return memo.list;
    var c = {}; R.kolom.forEach(function (k, i) { c[k] = i; });
    memo.src = R;
    memo.list = R.rows.map(function (x) {
      var o = { kat: x[c.kat], id: x[c.id], judul: x[c.judul], metode: x[c.metode], pM: tg(x[c.pM]), pS: tg(x[c.pS]), rM: tg(x[c.rM]), rS: tg(x[c.rS]),
        jp: angka(x[c.jp]), renc: angka(x[c.renc]), real: angka(x[c.real]), status: x[c.status], batal: x[c.batal],
        rab: angka(x[c.rab]), honor: angka(x[c.honor]), akom: angka(x[c.akom]), total: angka(x[c.total]), ruang: x[c.ruang], anggaran: x[c.anggaran] };
      if (!o.pS) o.pS = o.pM; if (!o.rS) o.rS = o.rM;
      o.pAda = !!o.pM;   // P.Tgl kosong (mis. Penugasan, LDP, Pinjam/Sewa): jadwal memakai tanggal realisasi
      if (!o.pAda) { o.pM = o.rM; o.pS = o.rS; }
      o.st = status(o);
      if (o.st === 'Belum' && o.rS && o.rS < new Date()) o.st = 'Tanpa status';
      o.biaya = o.total !== null ? o.total : (o.honor !== null || o.akom !== null ? (o.honor || 0) + (o.akom || 0) : null);
      o.geser = o.pAda && o.rM && o.st !== 'Dibatalkan' ? selisihHari(o.pM, o.rM) : null;
      return o;
    });
    return memo.list;
  }
  function pilihKat(L) { return st.kat ? L.filter(function (r) { return r.kat === st.kat; }) : L; }
  function akhir(y, m) { return new Date(y, m, 0, 23, 59); }
  function diTahun(d, y) { return d && d.getFullYear() === y; }
  function terlaksana(r, y, m) { return r.st === 'Selesai' && diTahun(r.rS || r.rM, y) && (r.rS || r.rM) <= akhir(y, m); }
  function direncanakan(r, y, m) { return diTahun(r.pM, y) && r.pM <= akhir(y, m); }

  /* ---------- komponen kecil ---------- */
  function chips(L) {
    var ada = {}; L.forEach(function (r) { ada[r.kat] = (ada[r.kat] || 0) + 1; });
    var h = '<div class="chips rd-chips" role="group" aria-label="Kategori pembelajaran"><button type="button" class="chip" data-rk-kat="" aria-pressed="' + (!st.kat) + '">Gabungan</button>';
    KAT.forEach(function (k) { if (ada[k[0]]) h += '<button type="button" class="chip" data-rk-kat="' + esc(k[0]) + '" aria-pressed="' + (st.kat === k[0]) + '"><i class="rd-dot k' + noKat(k[0]) + '"></i>' + esc(k[1]) + '</button>'; });
    Object.keys(ada).forEach(function (k) { if (noKat(k) === 6 && k !== 'ACADEMY') h += '<button type="button" class="chip" data-rk-kat="' + esc(k) + '" aria-pressed="' + (st.kat === k) + '">' + esc(k) + '</button>'; });
    return h + '</div>';
  }
  function kepala(judul, desc, tambahan) {
    var a = A(), S = a.S;
    return '<div class="panel-h"><div><h2>' + judul + '</h2><div class="desc">' + desc + '</div></div>' + (tambahan || '<span class="follow" title="Mengikuti Tahun dan Bulan di bagian atas"><span class="per">' + esc(a.namaBulan(S.bulan) + ' ' + S.tahun) + '</span></span>') + '</div>';
  }
  function tile(l, v, s, c) { return '<div class="rd-tile' + (c ? ' ' + c : '') + '"><div class="rd-l">' + (c ? '<i class="rd-sd"></i>' : '') + l + '</div><div class="rd-v">' + v + '</div>' + (s ? '<div class="rd-s">' + s + '</div>' : '') + '</div>'; }
  function kosong(el, judul) { el.innerHTML = kepala(judul, 'Rincian per kategori dari file Rendiklat ' + A().S.tahun + '.') + '<div class="empty">Belum ada rincian Rendiklat per kategori untuk tahun ini. Data dibaca dari sheet LEADERSHIP, IKP KKJ, PIL, PENUGASAN, PINJAMSEWA, dan ACADEMY setelah Apps Script versi terbaru dipasang.</div>'; }

  /* grafik kolom berkelompok / bertumpuk 12 bulan */
  function kolom12(seri, opsi) {
    opsi = opsi || {};
    var W = 600, H = opsi.h || 170, pl = 34, pr = 6, pt = 13, pb = 21, iw = W - pl - pr, ih = H - pt - pb, bw = iw / 12;
    var maks = 0;
    for (var i = 0; i < 12; i++) { if (opsi.tumpuk) { var t = 0; seri.forEach(function (s) { t += s.v[i] || 0; }); maks = Math.max(maks, t); } else seri.forEach(function (s) { maks = Math.max(maks, s.v[i] || 0); }); }
    if (!maks) maks = 1;
    var langkah = Math.pow(10, Math.floor(Math.log10(maks))), atas = Math.ceil(maks / langkah) * langkah; if (atas / langkah > 6) langkah *= 2; atas = Math.ceil(maks / langkah) * langkah;
    var Y = function (v) { return pt + ih - ih * v / atas; }, g = '';
    for (var v = 0; v <= atas + 1e-9; v += langkah) g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="var(--line)" stroke-width="1"' + (v ? ' stroke-dasharray="2 4"' : '') + '/><text x="' + (pl - 5) + '" y="' + (Y(v) + 3).toFixed(1) + '" font-size="10" text-anchor="end" fill="var(--ink-3)">' + (opsi.fmt ? opsi.fmt(v) : D.fmt(v, 0)) + '</text>';
    for (i = 0; i < 12; i++) {
      var x0 = pl + bw * i, redup = opsi.sampai && i + 1 > opsi.sampai;
      g += '<text x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (H - 5) + '" font-size="10" text-anchor="middle" fill="' + (opsi.sampai === i + 1 ? 'var(--ink)' : 'var(--ink-3)') + '"' + (opsi.sampai === i + 1 ? ' font-weight="700"' : '') + '>' + BL3[i] + '</text>';
      if (opsi.tumpuk) {
        var y = pt + ih, w = Math.min(21, bw - 8), tt = [];
        seri.forEach(function (s) { var n = s.v[i] || 0; if (!n) return; var hh = ih * n / atas; g += '<rect x="' + (x0 + (bw - w) / 2).toFixed(1) + '" y="' + (y - hh).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, hh - 1).toFixed(1) + '" fill="' + s.c + '"' + (redup ? ' opacity=".35"' : '') + '/>'; y -= hh; tt.push(s.n + ' ' + n); });
        if (tt.length) g += '<rect x="' + x0.toFixed(1) + '" y="' + pt + '" width="' + bw.toFixed(1) + '" height="' + ih + '" fill="transparent"><title>' + BL3[i] + ': ' + esc(tt.join(' · ')) + '</title></rect>';
      } else {
        var n2 = seri.length, gw = Math.min(13, (bw - 8) / n2 - 2);
        seri.forEach(function (s, j) {
          var val = s.v[i] || 0, hh = ih * val / atas, x = x0 + (bw - (gw + 2) * n2) / 2 + j * (gw + 2);
          if (val) g += '<rect x="' + x.toFixed(1) + '" y="' + (pt + ih - hh).toFixed(1) + '" width="' + gw.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="2" fill="' + s.c + '"' + (redup ? ' opacity=".35"' : '') + '><title>' + BL3[i] + ' · ' + esc(s.n) + ': ' + (opsi.fmt ? opsi.fmt(val, true) : D.fmt(val, 0)) + '</title></rect>';
        });
      }
    }
    return '<svg class="rd-g" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opsi.label || 'Grafik per bulan') + '">' + g + '</svg>' +
      '<div class="legend">' + seri.map(function (s) { return '<span><i style="background:' + s.c + '"></i>' + esc(s.n) + '</span>'; }).join('') + '</div>';
  }
  /* batang mendatar */
  function batang(items, fmt) {
    var maks = 0; items.forEach(function (it) { maks = Math.max(maks, it.v || 0, it.ref || 0); }); if (!maks) maks = 1;
    return '<div class="rd-bars">' + items.map(function (it) {
      return '<div class="rd-bar"' + (it.act ? ' ' + it.act : '') + '><div class="rd-bl">' + (it.dot ? '<i class="rd-dot ' + it.dot + '"></i>' : '') + esc(it.l) + '</div><div class="rd-bt"><span style="width:' + (100 * (it.v || 0) / maks).toFixed(1) + '%;' + (it.c ? 'background:' + it.c : '') + '"></span>' +
        (it.ref ? '<b class="rd-ref" style="left:' + (100 * it.ref / maks).toFixed(1) + '%" title="' + esc(it.refL || '') + '"></b>' : '') + '</div><div class="rd-bv">' + (fmt ? fmt(it.v) : D.fmt(it.v, 0)) + (it.s ? '<small>' + it.s + '</small>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function baris(r) {
    return '<tr data-rk-id="' + esc(r.id) + '"><td><i class="rd-dot k' + noKat(r.kat) + '"></i></td><td class="rd-jd">' + esc(r.judul) + '<div class="desc">' + esc(nmKat(r.kat)) + (r.metode ? ' · ' + esc(r.metode) : '') + (r.jp !== null ? ' · ' + D.fmt(r.jp, 0) + ' JP' : '') + '</div></td><td class="num">' + rentang(r.pM, r.pS) + '</td><td class="num">' + rentang(r.rM, r.rS) + geserTag(r) + '</td><td><span class="rd-st s-' + r.st.toLowerCase() + '">' + r.st + '</span></td><td class="r num">' + (r.real !== null ? D.fmt(r.real, 0) : '–') + '<span class="desc"> / ' + (r.renc !== null ? D.fmt(r.renc, 0) : '–') + '</span></td><td class="r num">' + rp(r.biaya) + '</td></tr>';
  }
  function geserTag(r) { if (r.geser === null || !r.geser) return ''; return ' <span class="rd-gs ' + (r.geser > 0 ? 'mundur' : 'maju') + '" title="' + (r.geser > 0 ? 'mundur ' : 'maju ') + Math.abs(r.geser) + ' hari dari rencana">' + (r.geser > 0 ? '+' : '−') + Math.abs(r.geser) + 'h</span>'; }
  function tabelKelas(L) {
    return '<div class="tbl-wrap"><table class="tbl rd-tbl"><thead><tr><th></th><th>Judul</th><th>Rencana</th><th>Realisasi</th><th>Status</th><th class="r">Peserta</th><th class="r">Biaya</th></tr></thead><tbody>' + L.map(baris).join('') + '</tbody></table></div>';
  }
  function modalDaftar(judul, sub, L) {
    A().openModal('<div class="modal-h"><div><div class="desc">' + esc(sub) + '</div><h3>' + esc(judul) + ' (' + D.fmt(L.length, 0) + ')</h3></div><button class="btn" data-close>Tutup</button></div>' +
      (L.length > 8 ? '<input class="search" id="rkQ" type="search" placeholder="Cari judul…" aria-label="Cari judul">' : '') + '<div id="rkIsi">' + (L.length ? tabelKelas(L) : '<div class="empty">Tidak ada kelas.</div>') + '</div>', 'wide');
    var q = document.getElementById('rkQ');
    if (q) q.addEventListener('input', function () { var t = q.value.trim().toLowerCase(); document.getElementById('rkIsi').innerHTML = tabelKelas(L.filter(function (r) { return !t || String(r.judul).toLowerCase().indexOf(t) >= 0; })); });
  }

  /* ---------- Part 2a: realisasi per kategori + gabungan ---------- */
  function hitungKat(L, y, m) {
    var o = { tanpa: 0, renc: 0, laks: 0, jalan: 0, jadwal: 0, tunda: 0, batal: 0, belum: 0, peserta: 0, pesertaRenc: 0, jp: 0, biaya: 0 };
    L.forEach(function (r) {
      if (direncanakan(r, y, m)) {
        o.renc++;
        if (r.st === 'Berlangsung') o.jalan++; else if (r.st === 'Terjadwal') o.jadwal++; else if (r.st === 'Ditunda') o.tunda++; else if (r.st === 'Dibatalkan') o.batal++; else if (r.st === 'Belum') o.belum++; else if (r.st === 'Tanpa status') o.tanpa++;
      }
      if (terlaksana(r, y, m)) { o.laks++; o.peserta += r.real || 0; o.pesertaRenc += r.renc || 0; o.jp += r.jp || 0; o.biaya += r.biaya || 0; }
    });
    return o;
  }
  function renderKat(L) {
    var el = document.getElementById('rkKat'); if (!el) return;
    if (!L) return kosong(el, 'Realisasi per Kategori');
    var S = A().S, y = S.tahun, m = S.bulan, F = pilihKat(L), H = hitungKat(F, y, m), bl = A().namaBulan(m);
    var rencB = [], realB = [];
    for (var i = 1; i <= 12; i++) { rencB.push(F.filter(function (r) { return diTahun(r.pM, y) && r.pM.getMonth() + 1 === i; }).length); realB.push(F.filter(function (r) { var d = r.rS || r.rM; return r.st === 'Selesai' && diTahun(d, y) && d.getMonth() + 1 === i; }).length); }
    var pk = H.renc ? H.laks / H.renc : null, pp = H.pesertaRenc ? H.peserta / H.pesertaRenc : null;
    var tiles = tile('Kelas terlaksana', D.fmt(H.laks, 0) + '<small> / ' + D.fmt(H.renc, 0) + '</small>', pk === null ? 'belum ada rencana' : D.pct(pk, 0) + ' dari rencana s.d. ' + esc(bl), pk === null ? '' : pk >= .9 ? 'good' : pk >= .75 ? 'warn' : 'bad') +
      tile('Peserta', D.fmt(H.peserta, 0), pp === null ? '–' : D.pct(pp, 0) + ' dari rencana peserta kelas tsb.') +
      tile('Jam pelajaran', D.fmt(H.jp, 0) + '<small> JP</small>', 'kelas yang sudah selesai') +
      tile('Belum jalan', D.fmt(H.jalan + H.jadwal + H.belum, 0), D.fmt(H.tunda, 0) + ' ditunda · ' + D.fmt(H.batal, 0) + ' batal' + (H.tanpa ? ' · ' + D.fmt(H.tanpa, 0) + ' tanpa status' : ''));
    var tb = KAT.map(function (k) { return [k[0], hitungKat(L.filter(function (r) { return r.kat === k[0]; }), y, m)]; }).filter(function (x) { return x[1].renc || x[1].laks; });
    var tot = hitungKat(L, y, m);
    var t = '<div class="tbl-wrap"><table class="tbl rd-kt"><thead><tr><th>Kategori</th><th class="r">Rencana</th><th class="r">Terlaksana</th><th class="r">%</th><th class="r hp-x">Belum jalan</th><th class="r hp-x hp-l">Ditunda</th><th class="r hp-x hp-l">Batal</th><th class="r">Peserta</th></tr></thead><tbody>' +
      tb.map(function (x) { var h = x[1], p = h.renc ? h.laks / h.renc : null; return '<tr class="click" data-rk-kat="' + esc(x[0]) + '"' + (st.kat === x[0] ? ' aria-current="true"' : '') + '><td><i class="rd-dot k' + noKat(x[0]) + '"></i>' + esc(nmKat(x[0])) + '</td><td class="r num">' + D.fmt(h.renc, 0) + '</td><td class="r num"><b>' + D.fmt(h.laks, 0) + '</b></td><td class="r num">' + (p === null ? '–' : D.pct(p, 0)) + '</td><td class="r num hp-x">' + D.fmt(h.jalan + h.jadwal + h.belum, 0) + '</td><td class="r num hp-x hp-l">' + D.fmt(h.tunda, 0) + '</td><td class="r num hp-x hp-l">' + D.fmt(h.batal, 0) + '</td><td class="r num">' + D.fmt(h.peserta, 0) + '</td></tr>'; }).join('') +
      '<tr class="rd-tot click" data-rk-kat=""><td>Gabungan</td><td class="r num">' + D.fmt(tot.renc, 0) + '</td><td class="r num"><b>' + D.fmt(tot.laks, 0) + '</b></td><td class="r num">' + (tot.renc ? D.pct(tot.laks / tot.renc, 0) : '–') + '</td><td class="r num hp-x">' + D.fmt(tot.jalan + tot.jadwal + tot.belum, 0) + '</td><td class="r num hp-x hp-l">' + D.fmt(tot.tunda, 0) + '</td><td class="r num hp-x hp-l">' + D.fmt(tot.batal, 0) + '</td><td class="r num">' + D.fmt(tot.peserta, 0) + '</td></tr></tbody></table></div>';
    el.innerHTML = kepala('Realisasi per Kategori', 'Rencana dihitung dari tanggal rencana (P.Tgl), realisasi dari kelas berstatus Selesai (R.Tgl), kumulatif s.d. ' + esc(bl) + '. Bila P.Tgl kosong, jadwal memakai tanggal realisasi.') + chips(L) +
      '<div class="rd-tiles">' + tiles + '</div>' +
      '<div class="rd-2"><div class="rd-c"><div class="sub-h">Kelas per bulan · ' + esc(st.kat ? nmKat(st.kat) : 'gabungan') + '</div>' + kolom12([{ n: 'Rencana', v: rencB, c: 'var(--bar-dim)' }, { n: 'Terlaksana', v: realB, c: 'var(--bar)' }], { sampai: m, label: 'Kelas rencana dan terlaksana per bulan' }) + '</div>' +
      '<div class="rd-c"><div class="sub-h">Per kategori s.d. ' + esc(bl) + '</div>' + t + '</div></div>' +
      '<div class="rd-act"><button type="button" class="btn" data-rk="daftar">Daftar kelas ' + esc(st.kat ? nmKat(st.kat) : 'semua kategori') + '</button></div>';
  }

  /* ---------- Part 2b: kalender rencana / realisasi ---------- */
  function renderKal(L) {
    var el = document.getElementById('rkKal'); if (!el) return;
    if (!L) return kosong(el, 'Kalender Pembelajaran');
    var S = A().S; if (st.kb === null || st.ky !== S.tahun) { st.kb = S.bulan; st.ky = S.tahun; }
    var y = S.tahun, m = st.kb, F = pilihKat(L), ren = st.mode === 'rencana';
    var awal = new Date(y, m - 1, 1), akh = new Date(y, m, 0), hari = {}, n = 0;
    F.forEach(function (r) {
      var a = ren ? r.pM : r.rM, b = ren ? r.pS : r.rS; if (!a) return; if (!ren && r.st === 'Dibatalkan') return; if (!b || b < a) b = a;
      if (b < awal || a > akh) return; n++;
      var panjang = selisihHari(a, b) > 13;   // kelas panjang (mis. coaching berbulan-bulan) hanya ditandai di hari mulai
      var d0 = panjang ? a : (a < awal ? awal : a), d1 = panjang ? a : (b > akh ? akh : b);
      for (var d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) { if (d < awal || d > akh) continue; var k = d.getDate(); (hari[k] = hari[k] || []).push(r); }
    });
    var pad = (awal.getDay() + 6) % 7, sel = '', hariIni = new Date();
    for (var i = 0; i < pad; i++) sel += '<div class="rd-d kosong" aria-hidden="true"></div>';
    for (var dd = 1; dd <= akh.getDate(); dd++) {
      var isi = hari[dd] || [], tgl = new Date(y, m - 1, dd), libur = tgl.getDay() === 0 || tgl.getDay() === 6;
      var kini = tgl.toDateString() === hariIni.toDateString();
      sel += '<div class="rd-d' + (libur ? ' libur' : '') + (kini ? ' kini' : '') + (isi.length ? ' ada click" role="button" tabindex="0" data-rk-hari="' + dd + '" aria-label="' + dd + ' ' + BL3[m - 1] + ': ' + isi.length + ' kelas"' : '"') + '><div class="rd-dn"><span>' + dd + '</span>' + (isi.length ? '<b>' + isi.length + '</b>' : '') + '</div>' +
        isi.slice(0, 3).map(function (r) { return '<div class="rd-ev k' + noKat(r.kat) + '" title="' + esc(r.judul) + '">' + esc(r.judul) + '</div>'; }).join('') + (isi.length > 3 ? '<div class="rd-more">+' + (isi.length - 3) + ' lainnya</div>' : '') + '</div>';
    }
    var leg = KAT.filter(function (k) { return F.some(function (r) { return r.kat === k[0]; }); }).map(function (k) { return '<span><i class="rd-dot k' + noKat(k[0]) + '"></i>' + esc(k[1]) + '</span>'; }).join('');
    el.innerHTML = kepala('Kalender Pembelajaran', (ren ? 'Jadwal rencana (P.Tgl)' : 'Jadwal realisasi (R.Tgl), tanpa kelas batal') + ' · ' + D.fmt(n, 0) + ' kelas di ' + esc(A().namaBulan(m)) + ' ' + y + '. Kelas lebih dari dua minggu hanya ditandai di hari mulai.',
      '<div class="rd-kn"><div class="seg" role="group" aria-label="Jenis jadwal"><button type="button" data-rk-mode="rencana" aria-pressed="' + ren + '">Rencana</button><button type="button" data-rk-mode="realisasi" aria-pressed="' + !ren + '">Realisasi</button></div>' +
      '<div class="rd-nav"><button type="button" class="btn" data-rk-bln="-1" aria-label="Bulan sebelumnya"' + (m <= 1 ? ' disabled' : '') + '>‹</button><b>' + BL3[m - 1] + ' ' + y + '</b><button type="button" class="btn" data-rk-bln="1" aria-label="Bulan berikutnya"' + (m >= 12 ? ' disabled' : '') + '>›</button></div></div>') +
      chips(L) + '<div class="rd-cal"><div class="rd-hh">' + HARI.map(function (h) { return '<div>' + h + '</div>'; }).join('') + '</div><div class="rd-grid">' + sel + '</div></div><div class="legend">' + leg + '</div>';
    el._hari = hari;
  }

  /* ---------- Part 2c: realisasi biaya per diklat ---------- */
  function renderBiaya(L) {
    var el = document.getElementById('rkBiaya'); if (!el) return;
    if (!L) return kosong(el, 'Realisasi Biaya');
    var S = A().S, y = S.tahun, m = S.bulan, bl = A().namaBulan(m), F = pilihKat(L).filter(function (r) { return terlaksana(r, y, m); });
    var ber = F.filter(function (r) { return r.biaya !== null && r.biaya > 0; }), tot = 0, hon = 0, ak = 0, rab = 0, rabR = 0, nRab = 0, pes = 0;
    ber.forEach(function (r) { tot += r.biaya; hon += r.honor || 0; ak += r.akom || 0; pes += r.real || 0; if (r.rab) { rab += r.rab; rabR += r.biaya; nRab++; } });
    var cak = F.length ? ber.length / F.length : null;
    var tiles = tile('Realisasi biaya', rp(tot, true), 'honor ' + rp(hon, true) + ' · akomodasi ' + rp(ak, true)) +
      tile('Serapan RAB', nRab ? D.pct(rabR / rab, 0) : '–', nRab ? rp(rabR, true) + ' dari RAB ' + rp(rab, true) + ' (' + nRab + ' kelas)' : 'RAB belum diisi') +
      tile('Biaya per peserta', pes ? rp(tot / pes, true) : '–', D.fmt(pes, 0) + ' peserta di kelas yang berbiaya') +
      tile('Kelengkapan isian', cak === null ? '–' : D.pct(cak, 0), D.fmt(ber.length, 0) + ' dari ' + D.fmt(F.length, 0) + ' kelas selesai sudah ada biaya', cak === null ? '' : cak >= .9 ? 'good' : cak >= .5 ? 'warn' : 'bad');
    var perK = KAT.map(function (k) { var x = ber.filter(function (r) { return r.kat === k[0]; }), v = 0, rb = 0; x.forEach(function (r) { v += r.biaya; rb += r.rab || 0; }); return { l: k[1], v: v, ref: rb || 0, refL: 'RAB ' + rp(rb), s: ' · ' + x.length + ' kelas', dot: 'k' + noKat(k[0]), act: 'data-rk-kat="' + k[0] + '"' }; }).filter(function (x) { return x.v || x.ref; });
    var bH = [], bA = [];
    for (var i = 1; i <= 12; i++) { var hh = 0, aa = 0; pilihKat(L).forEach(function (r) { var d = r.rS || r.rM; if (r.st === 'Selesai' && diTahun(d, y) && d.getMonth() + 1 === i) { hh += r.honor || (r.biaya && !r.akom ? r.biaya : 0); aa += r.akom || 0; } }); bH.push(hh); bA.push(aa); }
    var top = ber.slice().sort(function (a, b) { return b.biaya - a.biaya; }).slice(0, 8);
    el.innerHTML = kepala('Realisasi Biaya', 'Biaya kelas yang selesai s.d. ' + esc(bl) + ' dari kolom RAB, Realisasi Honor Instruktur, Realisasi Akomodasi, dan Total di sheet kategori.') + chips(L) +
      '<div class="rd-tiles">' + tiles + '</div>' +
      (ber.length ? '<div class="rd-2"><div class="rd-c"><div class="sub-h">Biaya per bulan</div>' + kolom12([{ n: 'Honor instruktur', v: bH, c: 'var(--bar)' }, { n: 'Akomodasi', v: bA, c: 'var(--fung)' }], { tumpuk: true, sampai: m, fmt: function (v, rinci) { return rinci ? rp(v, true) : v >= 1e9 ? D.fmt(v / 1e9, 1) + 'M' : v >= 1e6 ? D.fmt(v / 1e6, 0) + 'jt' : D.fmt(v, 0); }, label: 'Biaya per bulan' }) + '</div>' +
        '<div class="rd-c"><div class="sub-h">Per kategori <span class="desc">· garis tipis = RAB</span></div>' + batang(perK, function (v) { return rp(v, true); }) + '</div></div>' +
        '<div class="sub-h rd-sh">Diklat dengan biaya terbesar</div><div class="tbl-wrap"><table class="tbl rd-bt2"><thead><tr><th>Judul</th><th class="r hp-x">Peserta</th><th class="r hp-x">Honor</th><th class="r hp-x">Akomodasi</th><th class="r">Total</th><th class="r hp-x">Per peserta</th></tr></thead><tbody>' +
        top.map(function (r) { return '<tr data-rk-id="' + esc(r.id) + '" class="click"><td><i class="rd-dot k' + noKat(r.kat) + '"></i>' + esc(r.judul) + '<div class="desc">' + esc(nmKat(r.kat)) + ' · ' + rentang(r.rM, r.rS) + '</div></td><td class="r num hp-x">' + (r.real !== null ? D.fmt(r.real, 0) : '–') + '</td><td class="r num hp-x">' + rp(r.honor) + '</td><td class="r num hp-x">' + rp(r.akom) + '</td><td class="r num"><b>' + rp(r.biaya) + '</b></td><td class="r num hp-x">' + (r.real ? rp(r.biaya / r.real) : '–') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="rd-act"><button type="button" class="btn" data-rk="biaya">Semua kelas berbiaya (' + D.fmt(ber.length, 0) + ')</button>' + (F.length - ber.length ? '<button type="button" class="btn" data-rk="tanpabiaya">Kelas selesai tanpa biaya (' + D.fmt(F.length - ber.length, 0) + ')</button>' : '') + '</div>'
        : '<div class="empty">Belum ada kelas selesai yang kolom biayanya terisi.</div>');
  }

  /* ---------- Part 3: kualitas delivery ---------- */
  var BIN = [['Maju > 30 hari', -1e9, -31], ['Maju 8–30 hari', -30, -8], ['Maju 1–7 hari', -7, -1], ['Tepat jadwal', 0, 0], ['Mundur 1–7 hari', 1, 7], ['Mundur 8–30 hari', 8, 30], ['Mundur > 30 hari', 31, 1e9]];
  function mutu(L, y, m) {
    var o = { semua: 0, renc: 0, dinilai: 0, tepat: 0, maju: 0, mundur: 0, sMaju: 0, sMundur: 0, batal: 0, tunda: 0, lewat: [], isi: 0, isiR: 0, tanpaReal: 0, bin: BIN.map(function () { return 0; }) };
    var kini = akhir(y, m), hariIni = new Date(); if (hariIni < kini) kini = hariIni;
    L.forEach(function (r) {
      if (!direncanakan(r, y, m)) return; o.semua++; if (!r.pAda) return; o.renc++;
      if (r.st === 'Dibatalkan') { o.batal++; return; }
      if (r.st === 'Ditunda') o.tunda++;
      if (r.geser !== null && (r.st === 'Selesai' || r.st === 'Berlangsung')) {
        o.dinilai++; var g = r.geser;
        if (g === 0) o.tepat++; else if (g < 0) { o.maju++; o.sMaju += -g; } else { o.mundur++; o.sMundur += g; }
        BIN.forEach(function (b, i) { if (g >= b[1] && g <= b[2]) o.bin[i]++; });
      }
      if ((r.st === 'Belum' || r.st === 'Terjadwal' || r.st === 'Ditunda') && r.pS && r.pS < kini && !r.rM) o.lewat.push(r);
      if (r.st === 'Selesai') { if (r.real !== null && r.renc) { o.isi += r.real; o.isiR += r.renc; } if (r.real === null) o.tanpaReal++; }
    });
    return o;
  }
  function renderMutu(L) {
    var el = document.getElementById('rkMutu'); if (!el) return;
    if (!L) return kosong(el, 'Kualitas Delivery');
    var S = A().S, y = S.tahun, m = S.bulan, bl = A().namaBulan(m), F = pilihKat(L), Q = mutu(F, y, m);
    var pT = Q.dinilai ? Q.tepat / Q.dinilai : null, pI = Q.isiR ? Q.isi / Q.isiR : null, pB = Q.renc ? (Q.batal + Q.tunda) / Q.renc : null;
    var tiles = tile('Tepat jadwal', pT === null ? '–' : D.pct(pT, 0), D.fmt(Q.tepat, 0) + ' dari ' + D.fmt(Q.dinilai, 0) + ' kelas yang sudah berjalan', pT === null ? '' : pT >= .8 ? 'good' : pT >= .6 ? 'warn' : 'bad') +
      tile('Maju / mundur', D.fmt(Q.maju, 0) + '<small> / </small>' + D.fmt(Q.mundur, 0), 'rata-rata maju ' + (Q.maju ? D.fmt(Q.sMaju / Q.maju, 0) : 0) + ' hari · mundur ' + (Q.mundur ? D.fmt(Q.sMundur / Q.mundur, 0) : 0) + ' hari') +
      tile('Batal + tunda', pB === null ? '–' : D.pct(pB, 0), D.fmt(Q.batal, 0) + ' batal · ' + D.fmt(Q.tunda, 0) + ' ditunda dari ' + D.fmt(Q.renc, 0) + ' rencana', pB === null ? '' : pB <= .05 ? 'good' : pB <= .15 ? 'warn' : 'bad') +
      tile('Lewat jadwal', D.fmt(Q.lewat.length, 0), 'rencana sudah lewat, belum ada realisasi', Q.lewat.length ? 'warn' : 'good') +
      tile('Keterisian peserta', pI === null ? '–' : D.pct(pI, 0), 'realisasi ÷ rencana peserta kelas selesai', pI === null ? '' : pI >= .9 ? 'good' : pI >= .75 ? 'warn' : 'bad');
    var warnaBin = ['var(--k1)', 'var(--k1)', 'var(--k1)', 'var(--good)', 'var(--warn)', 'var(--warn)', 'var(--bad)'];
    var hist = batang(BIN.map(function (b, i) { return { l: b[0], v: Q.bin[i], c: warnaBin[i], s: Q.dinilai ? ' · ' + D.pct(Q.bin[i] / Q.dinilai, 0) : '', act: Q.bin[i] ? 'data-rk-bin="' + i + '" role="button" tabindex="0"' : '' }; }));
    var sT = [], sM = [], sU = [], sB = [];
    for (var i = 1; i <= 12; i++) {
      var t = 0, a = 0, u = 0, b = 0;
      F.forEach(function (r) { if (!diTahun(r.pM, y) || r.pM.getMonth() + 1 !== i) return; if (r.st === 'Dibatalkan' || r.st === 'Ditunda') b++; else if (r.geser === null || (r.st !== 'Selesai' && r.st !== 'Berlangsung')) return; else if (r.geser === 0) t++; else if (r.geser < 0) a++; else u++; });
      sT.push(t); sM.push(a); sU.push(u); sB.push(b);
    }
    var tb = KAT.map(function (k) { return [k[0], mutu(L.filter(function (r) { return r.kat === k[0]; }), y, m)]; }).filter(function (x) { return x[1].renc; });
    var tabel = '<div class="tbl-wrap"><table class="tbl rd-kt"><thead><tr><th>Kategori</th><th class="r">Rencana</th><th class="r">Tepat</th><th class="r">Maju</th><th class="r">Mundur</th><th class="r hp-x">Batal/tunda</th><th class="r hp-x">Lewat jadwal</th><th class="r">Keterisian</th></tr></thead><tbody>' +
      tb.map(function (x) { var q = x[1]; return '<tr class="click" data-rk-kat="' + esc(x[0]) + '"' + (st.kat === x[0] ? ' aria-current="true"' : '') + '><td><i class="rd-dot k' + noKat(x[0]) + '"></i>' + esc(nmKat(x[0])) + '</td><td class="r num">' + D.fmt(q.renc, 0) + '</td><td class="r num"><b>' + (q.dinilai ? D.pct(q.tepat / q.dinilai, 0) : '–') + '</b></td><td class="r num">' + D.fmt(q.maju, 0) + '</td><td class="r num">' + D.fmt(q.mundur, 0) + '</td><td class="r num hp-x">' + D.fmt(q.batal + q.tunda, 0) + '</td><td class="r num hp-x">' + D.fmt(q.lewat.length, 0) + '</td><td class="r num">' + (q.isiR ? D.pct(q.isi / q.isiR, 0) : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var geserBesar = F.filter(function (r) { return direncanakan(r, y, m) && r.geser && (r.st === 'Selesai' || r.st === 'Berlangsung'); }).sort(function (a, b) { return Math.abs(b.geser) - Math.abs(a.geser); });
    el.innerHTML = kepala('Kualitas Delivery', 'Rencana (P.Tgl Mulai) dibanding realisasi (R.Tgl Mulai) untuk kelas yang direncanakan Januari s.d. ' + esc(bl) + ' ' + y + '. Hanya kelas yang tanggal rencananya (P.Tgl) terisi: ' + D.fmt(Q.renc, 0) + ' dari ' + D.fmt(Q.semua, 0) + ' kelas.') + chips(L) +
      '<div class="rd-tiles t5">' + tiles + '</div>' +
      '<div class="rd-2"><div class="rd-c"><div class="sub-h">Pergeseran jadwal mulai</div>' + hist + '</div>' +
      '<div class="rd-c"><div class="sub-h">Ketepatan per bulan rencana</div>' + kolom12([{ n: 'Tepat', v: sT, c: 'var(--good)' }, { n: 'Maju', v: sM, c: 'var(--k1)' }, { n: 'Mundur', v: sU, c: 'var(--warn)' }, { n: 'Batal/tunda', v: sB, c: 'var(--bad)' }], { tumpuk: true, sampai: m, label: 'Ketepatan jadwal per bulan' }) + '</div></div>' +
      '<div class="sub-h rd-sh">Per kategori</div>' + tabel +
      '<div class="rd-act">' + (Q.lewat.length ? '<button type="button" class="btn" data-rk="lewat">Lewat jadwal, belum terlaksana (' + Q.lewat.length + ')</button>' : '') + (geserBesar.length ? '<button type="button" class="btn" data-rk="geser">Pergeseran terbesar</button>' : '') + (Q.tanpaReal ? '<button type="button" class="btn" data-rk="tanpareal">Selesai tanpa realisasi peserta (' + Q.tanpaReal + ')</button>' : '') + '</div>';
    el._q = Q; el._geser = geserBesar;
  }

  function render() {
    if (!A() || !A().S || !A().S.data) return;
    var L = semua();
    if (L && st.kat && !L.some(function (r) { return r.kat === st.kat; })) st.kat = '';
    renderKat(L); renderKal(L); renderBiaya(L); renderMutu(L);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rk-kat],[data-rk-mode],[data-rk-bln],[data-rk-hari],[data-rk],[data-rk-id],[data-rk-bin]');
    if (!t || !t.closest('#rkKat,#rkKal,#rkBiaya,#rkMutu,#modalC')) return;
    var L = semua(); if (!L) return;
    var S = A().S, y = S.tahun, m = S.bulan, F = pilihKat(L), nmK = st.kat ? nmKat(st.kat) : 'Semua kategori';
    if (t.hasAttribute('data-rk-kat')) { st.kat = t.getAttribute('data-rk-kat'); return render(); }
    if (t.hasAttribute('data-rk-mode')) { st.mode = t.getAttribute('data-rk-mode'); return renderKal(L); }
    if (t.hasAttribute('data-rk-bln')) { st.kb = Math.max(1, Math.min(12, st.kb + Number(t.getAttribute('data-rk-bln')))); return renderKal(L); }
    if (t.hasAttribute('data-rk-hari')) { var dd = +t.getAttribute('data-rk-hari'); return modalDaftar(dd + ' ' + A().namaBulan(st.kb) + ' ' + y, (st.mode === 'rencana' ? 'Jadwal rencana' : 'Jadwal realisasi') + ' · ' + nmK, (document.getElementById('rkKal')._hari || {})[dd] || []); }
    if (t.hasAttribute('data-rk-bin')) { var b = BIN[+t.getAttribute('data-rk-bin')]; return modalDaftar(b[0], 'Kualitas delivery · ' + nmK, (document.getElementById('rkMutu')._geser || []).concat(F.filter(function (r) { return r.geser === 0 && direncanakan(r, y, m) && (r.st === 'Selesai' || r.st === 'Berlangsung'); })).filter(function (r) { return r.geser >= b[1] && r.geser <= b[2]; })); }
    if (t.hasAttribute('data-rk-id') && !t.closest('#modalC')) { var id = t.getAttribute('data-rk-id'), r = L.filter(function (x) { return x.id === id; }); return modalDaftar(r[0] ? r[0].judul : id, 'Rincian kelas', r); }
    var a = t.getAttribute('data-rk');
    if (a === 'daftar') return modalDaftar('Daftar kelas ' + nmK, 'Rencana atau realisasi ' + y, F.filter(function (r) { return diTahun(r.pM, y) || diTahun(r.rM, y); }).sort(function (p, q) { return (p.pM || p.rM) - (q.pM || q.rM); }));
    if (a === 'biaya') return modalDaftar('Kelas berbiaya', nmK + ' · s.d. ' + A().namaBulan(m), F.filter(function (r) { return terlaksana(r, y, m) && r.biaya; }).sort(function (p, q) { return q.biaya - p.biaya; }));
    if (a === 'tanpabiaya') return modalDaftar('Kelas selesai tanpa biaya', nmK + ' · isi kolom Realisasi Honor/Akomodasi di sheet kategori', F.filter(function (r) { return terlaksana(r, y, m) && !r.biaya; }));
    if (a === 'lewat') return modalDaftar('Lewat jadwal, belum terlaksana', nmK + ' · tanggal rencana selesai sudah lewat', (document.getElementById('rkMutu')._q || {}).lewat || []);
    if (a === 'geser') return modalDaftar('Pergeseran jadwal terbesar', nmK + ' · selisih R.Tgl Mulai terhadap P.Tgl Mulai', (document.getElementById('rkMutu')._geser || []).slice(0, 30));
    if (a === 'tanpareal') return modalDaftar('Selesai tanpa realisasi peserta', nmK + ' · isi kolom Realisasi Peserta', F.filter(function (r) { return direncanakan(r, y, m) && r.st === 'Selesai' && r.real === null; }));
  });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-rk-hari],[data-rk-bin]')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('dash:periode', function () { st.kb = null; setTimeout(render, 0); });
  document.addEventListener('dash:render', function () { setTimeout(render, 0); });
  window.DashRendik = { render: render, data: semua };
})();
