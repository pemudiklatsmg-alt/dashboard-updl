/* Banding tahun lalu: bulan yang sama & kumulatif, tahun berjalan vs tahun sebelumnya.
   Sumber tahun lalu (urutan): tab "Konman <tahun lalu>" + Rendiklat tahun lalu bila ada; bila tidak, tab "Pembanding Tahun Lalu" (isi manual). */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var BL3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var TAB = 'Pembanding Tahun Lalu';
  /* hitung dengan tahun lain tanpa mengubah tampilan: S.tahun ditukar sementara */
  function denganTahun(y, fn) { var S = A().S, asli = S.tahun; S.tahun = y; try { return fn(); } catch (e) { return null; } finally { S.tahun = asli; } }
  function manual(y) {
    var M = {}; D.rows(A().S.data.pembanding).forEach(function (r) {
      if (String(r['Tahun']).trim() !== String(y)) return;
      var b = D.BULAN.indexOf(String(r['Bulan'] || '').trim().toUpperCase()); if (b < 0) return;
      M[b + 1] = { skor: D.num(r['Skor Konman']), kelas: D.num(r['Kelas Selesai']), peserta: D.num(r['Peserta']), hop: D.num(r['HOP']) };
    });
    return M;
  }
  function nilai(y, m, M) {
    var a = A(), S = a.S, adaK = !!(S.cache.konman && S.cache.konman[y]), adaR = !!(S.cache.kelas && S.cache.kelas[y] && S.cache.kelas[y].length), o = { skor: null, kelas: null, peserta: null, hop: null, sumber: [] };
    if (adaK) { o.skor = denganTahun(y, function () { return a.konmanAda(D.BULAN[m - 1]) ? a.totalSkor(D.BULAN[m - 1]) : null; }); if (o.skor !== null) o.sumber.push('Konman ' + y); }
    if (adaR) { var r = denganTahun(y, function () { return D.hitungRendiklat(a.kelas(), y, m, a.set()); }), h = denganTahun(y, function () { return a.hop(y, m); });
      if (r) { o.kelas = r.kelas; o.peserta = r.peserta; o.sumber.push('Rendiklat ' + y); } if (h && h.nilai !== null) o.hopR = h.nilai; }
    var x = M && M[m];
    if (x && x.skor !== null && x.skor !== undefined) { o.skor = x.skor; o.sumber = o.sumber.filter(function (t) { return t !== 'Konman ' + y; }); o.sumber.push('skor resmi (tab ' + TAB + ')'); }
    if (adaK) {   // HOP tahun lalu dari realisasi indikator Tingkat Pelaksanaan Pembelajaran di Konman tahun itu
      var itH = S.cache.konman[y].items.filter(function (it) { return /Tingkat Pelaksanaan Pembelajaran/i.test(it.namaAsli || it.nama); })[0], Bm = D.BULAN[m - 1];
      if (itH && /HOP/i.test(itH.satuan || '') && D.hasData(itH, Bm)) { o.hop = D.num(itH.real[Bm].v); if (o.sumber.indexOf('Konman ' + y) < 0) o.sumber.push('HOP dari Konman ' + y); }
    }
    if (o.hop === null && o.hopR !== undefined) o.hop = o.hopR;   // HOP dari Konman (realisasi resmi) bila ada, agar kedua tahun sebanding
    if (x) { ['skor', 'kelas', 'peserta', 'hop'].forEach(function (k) { if (o[k] === null && x[k] !== null && x[k] !== undefined) { o[k] = x[k]; if (o.sumber.indexOf('isian manual') < 0) o.sumber.push('isian manual'); } }); }
    return o;
  }
  function selisih(a, b, des, persenAman) {
    if (a === null || b === null) return '<span class="desc">–</span>';
    var d = a - b, c = Math.abs(d) < Math.pow(10, -des) / 2 ? 'idle' : d > 0 ? 'good' : 'bad';
    var pct = b ? ' (' + (d >= 0 ? '+' : '−') + D.fmt(Math.abs(d / b * 100), 1) + '%)' : '';
    return '<span class="bd-d ' + c + '">' + (c === 'idle' ? '=' : d > 0 ? '▲ ' : '▼ ') + (c === 'idle' ? '' : D.fmt(Math.abs(d), des)) + (persenAman ? pct : '') + '</span>';
  }
  function garis(y0, y1, s0, s1, m) {
    var W = 560, H = 160, pl = 30, pr = 8, pt = 13, pb = 21, iw = W - pl - pr, ih = H - pt - pb, semua = s0.concat(s1).filter(function (v) { return v !== null; });
    if (!semua.length) return '';
    var lo = Math.min.apply(null, semua.concat([100])) * 0.97, hi = Math.max.apply(null, semua.concat([100])) * 1.02, X = function (i) { return pl + iw * i / 11; }, Y = function (v) { return pt + ih - ih * (v - lo) / (hi - lo); };
    var jalur = function (s, w, dash) { var p = '', on = false; s.forEach(function (v, i) { if (v === null) { on = false; return; } p += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; }); return '<path d="' + p + '" fill="none" stroke="' + w + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 5"' : '') + ' stroke-linejoin="round"/>' + s.map(function (v, i) { return v === null ? '' : '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3" fill="' + w + '"><title>' + BL3[i] + ': ' + D.fmt(v, 2) + '</title></circle>'; }).join(''); };
    var g = '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(100) + '" y2="' + Y(100) + '" stroke="var(--line)" stroke-dasharray="3 3"/><text x="' + (pl - 5) + '" y="' + (Y(100) + 3) + '" font-size="10" text-anchor="end" fill="var(--ink-2)">100</text>';
    g += BL3.map(function (b, i) { var on = m && i === m - 1; return '<text x="' + X(i) + '" y="' + (H - 5) + '" font-size="10" text-anchor="middle" fill="var(' + (on ? '--ink' : '--ink-2') + ')"' + (on ? ' font-weight="700"' : '') + '>' + b + '</text>'; }).join('');
    // angka hanya di bulan terpilih (kedua tahun) agar grafik tetap bersih; bulan lain lewat kursor (title)
    var k = m ? m - 1 : -1, a0 = k >= 0 ? s0[k] : null, a1 = k >= 0 ? s1[k] : null, lbl = '';
    if (k >= 0 && (a0 !== null || a1 !== null)) {
      g = '<rect class="gx-selcol" x="' + (X(k) - 15).toFixed(1) + '" y="' + (pt - 8) + '" width="30" height="' + (ih + 10) + '" rx="6"/>' + g;
      var atas1 = a0 === null || a1 === null || a1 >= a0, ax = X(k) > W - 40 ? 'end' : 'middle', tx = ax === 'end' ? X(k) + 6 : X(k);
      var tulis = function (v, w, diAtas, tebal) { var y = Y(v) + (diAtas ? -8 : 15); y = Math.max(pt - 1, Math.min(pt + ih + 4, y)); return '<text x="' + tx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="11" text-anchor="' + ax + '" fill="' + w + '"' + (tebal ? ' font-weight="700"' : '') + ' class="bd-lbl">' + D.fmt(v, 2) + '</text>'; };
      if (a1 !== null) lbl += tulis(a1, 'var(--accent)', atas1, true);
      if (a0 !== null) lbl += tulis(a0, 'var(--ink-2)', !atas1, false);
    }
    return '<svg class="bd-g" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Skor Kontrak Manajemen per bulan ' + y0 + ' dan ' + y1 + '">' + g + jalur(s0, 'var(--ink-2)', true) + jalur(s1, 'var(--accent)', false) + lbl + '</svg>' +
      '<div class="legend"><span><i style="background:var(--accent)"></i>' + y1 + '</span><span><i style="background:var(--ink-2)"></i>' + y0 + ' (putus-putus)</span></div>';
  }
  function render() {
    var el = document.getElementById('bandingPanel'); if (!el || !A() || !A().S.data) return;
    var a = A(), S = a.S, y1 = S.tahun, y0 = y1 - 1, m = S.bulan, M = manual(y0), bl = a.namaBulan(m);
    var n0 = nilai(y0, m, M), n1 = nilai(y1, m, null);
    var ada = n0.skor !== null || n0.kelas !== null || n0.hop !== null;
    var kepala = '<div class="panel-h"><div><h2>Banding Tahun Lalu</h2><div class="desc">' + esc(bl) + ' ' + y1 + ' dibanding ' + esc(bl) + ' ' + y0 + '. Kelas, peserta, dan HOP dihitung kumulatif s.d. bulan terpilih.</div></div><span class="follow" title="Mengikuti Tahun dan Bulan di bagian atas"><span class="per">' + esc(bl + ' ' + y1) + '</span></span></div>';
    if (!ada) {
      el.innerHTML = kepala + '<div class="empty">Data ' + y0 + ' belum ada. Tambahkan tab <b>Konman ' + y0 + '</b> (format sama dengan Konman ' + y1 + '), atau isi angka per bulan di tab <b>' + TAB + '</b>: kolom Tahun, Bulan, Skor Konman, Kelas Selesai, Peserta, HOP. ' + a.sheetLink('Buka Google Sheets', TAB) + '</div>';
      return;
    }
    var baris = [['Skor Kontrak Manajemen', n0.skor, n1.skor, 2, false], ['Kelas selesai', n0.kelas, n1.kelas, 0, true], ['Peserta', n0.peserta, n1.peserta, 0, true], ['Hari Orang Pelatihan (HOP)', n0.hop, n1.hop, 3, true]].filter(function (b) { return b[1] !== null; });   // baris tanpa data tahun lalu tidak ditampilkan
    var s0 = [], s1 = [];
    for (var i = 1; i <= 12; i++) { s0.push(nilai(y0, i, M).skor); s1.push(i <= 12 ? nilai(y1, i, null).skor : null); }
    var ind = '';
    if (S.cache.konman[y0]) {
      var B = D.BULAN[m - 1], lama = {};
      S.cache.konman[y0].items.forEach(function (it) { if (!it.isGroup && !it.pengurang && D.hasData(it, B)) lama[String(it.pendek || it.nama).toLowerCase()] = D.capaianItem(it, B); });
      var L = a.K().items.filter(function (it) { return !it.isGroup && !it.pengurang && lama[String(it.pendek || it.nama).toLowerCase()] !== undefined; });
      if (L.length) ind = '<details class="bd-ind" open><summary>Per indikator yang sama di kedua tahun · ' + L.length + '</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th class="r">' + y0 + '</th><th class="r">' + y1 + '</th><th class="r">Selisih</th></tr></thead><tbody>' + L.map(function (it) {
        var v0 = lama[String(it.pendek || it.nama).toLowerCase()], v1 = D.hasData(it, B) ? D.capaianItem(it, B) : null;
        return '<tr><td>' + esc(it.pendek || it.nama) + '</td><td class="r num">' + (v0 === null ? '–' : D.pct(v0, 1)) + '</td><td class="r num">' + (v1 === null ? '–' : D.pct(v1, 1)) + '</td><td class="r">' + selisih(v1 === null ? null : v1 * 100, v0 === null ? null : v0 * 100, 1, false) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    }
    el.innerHTML = kepala + '<div class="bd-wrap"><div class="bd-kiri"><div class="tbl-wrap"><table class="tbl bd-t"><thead><tr><th>Ukuran</th><th class="r">' + y0 + '</th><th class="r">' + y1 + '</th><th class="r">Selisih</th></tr></thead><tbody>' + baris.map(function (b) {
      return '<tr><td>' + b[0] + '</td><td class="r num">' + (b[1] === null ? '–' : D.fmt(b[1], b[3])) + '</td><td class="r num"><b>' + (b[2] === null ? '–' : D.fmt(b[2], b[3])) + '</b></td><td class="r">' + selisih(b[2], b[1], b[3], b[4]) + '</td></tr>';
    }).join('') + '</tbody></table></div>' + ind + '</div><div class="bd-chart"><div class="sub-h">Skor Kontrak Manajemen per bulan</div>' + garis(y0, y1, s0, s1, m) + '</div></div>' +
      '<div class="note">Sumber ' + y0 + ': ' + esc(n0.sumber.join(', ') || '–') + '.</div>';
  }
  /* di Kinerja Unit, kartu ini bertumpuk di bawah Kepatuhan: tinggi daftar per indikator disesuaikan
     agar kolom kanan sama tinggi dengan kartu Indikator Kinerja di kiri (tanpa ruang kosong) */
  function sesuaikan() {
    var el = document.getElementById('bandingPanel'), pr = el && el.closest('.pair-3');
    var w = el && el.querySelector('.bd-ind[open] .tbl-wrap'); if (!pr || !w) return;
    w.style.maxHeight = '';
    if (window.innerWidth <= 1000 || el.hidden) return;
    var kiri = pr.children[0], kep = pr.children[1];
    kiri.style.alignSelf = 'start'; var tinggiKiri = kiri.offsetHeight; kiri.style.alignSelf = '';   // tinggi alami kartu kiri
    var lebih = (kep.offsetHeight + el.offsetHeight + 14) - tinggiKiri;
    if (lebih > 0) w.style.maxHeight = Math.max(150, w.offsetHeight - lebih) + 'px';
  }
  function renderLalu() { render(); window.requestAnimationFrame(sesuaikan); }
  window.addEventListener('resize', function () { window.requestAnimationFrame(sesuaikan); });
  document.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('bd-ind')) sesuaikan(); }, true);
  document.addEventListener('dash:periode', function () { setTimeout(renderLalu, 0); });
  document.addEventListener('dash:render', function () { setTimeout(renderLalu, 0); });
  window.DashBanding = { render: renderLalu, sesuaikan: sesuaikan };
})();
