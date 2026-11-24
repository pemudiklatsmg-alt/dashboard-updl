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
      if (r) { o.kelas = r.kelas; o.peserta = r.peserta; o.sumber.push('Rendiklat ' + y); } if (h && h.nilai !== null) o.hop = h.nilai; }
    var x = M && M[m];
    if (x) { ['skor', 'kelas', 'peserta', 'hop'].forEach(function (k) { if (o[k] === null && x[k] !== null && x[k] !== undefined) { o[k] = x[k]; if (o.sumber.indexOf('isian manual') < 0) o.sumber.push('isian manual'); } }); }
    return o;
  }
  function selisih(a, b, des, persenAman) {
    if (a === null || b === null) return '<span class="desc">–</span>';
    var d = a - b, c = Math.abs(d) < Math.pow(10, -des) / 2 ? 'idle' : d > 0 ? 'good' : 'bad';
    var pct = b ? ' (' + (d >= 0 ? '+' : '−') + D.fmt(Math.abs(d / b * 100), 1) + '%)' : '';
    return '<span class="bd-d ' + c + '">' + (c === 'idle' ? '=' : d > 0 ? '▲ ' : '▼ ') + (c === 'idle' ? '' : D.fmt(Math.abs(d), des)) + (persenAman ? pct : '') + '</span>';
  }
  function garis(y0, y1, s0, s1) {
    var W = 560, H = 160, pl = 30, pr = 8, pt = 13, pb = 21, iw = W - pl - pr, ih = H - pt - pb, semua = s0.concat(s1).filter(function (v) { return v !== null; });
    if (!semua.length) return '';
    var lo = Math.min.apply(null, semua.concat([100])) * 0.97, hi = Math.max.apply(null, semua.concat([100])) * 1.02, X = function (i) { return pl + iw * i / 11; }, Y = function (v) { return pt + ih - ih * (v - lo) / (hi - lo); };
    var jalur = function (s, w, dash) { var p = '', on = false; s.forEach(function (v, i) { if (v === null) { on = false; return; } p += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; }); return '<path d="' + p + '" fill="none" stroke="' + w + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 5"' : '') + ' stroke-linejoin="round"/>' + s.map(function (v, i) { return v === null ? '' : '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3" fill="' + w + '"><title>' + BL3[i] + ': ' + D.fmt(v, 2) + '</title></circle>'; }).join(''); };
    var g = '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(100) + '" y2="' + Y(100) + '" stroke="var(--line)" stroke-dasharray="3 3"/><text x="' + (pl - 5) + '" y="' + (Y(100) + 3) + '" font-size="10" text-anchor="end" fill="var(--ink-2)">100</text>';
    g += BL3.map(function (b, i) { return '<text x="' + X(i) + '" y="' + (H - 5) + '" font-size="10" text-anchor="middle" fill="var(--ink-2)">' + b + '</text>'; }).join('');
    return '<svg class="bd-g" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Skor Kontrak Manajemen per bulan ' + y0 + ' dan ' + y1 + '">' + g + jalur(s0, 'var(--ink-2)', true) + jalur(s1, 'var(--accent)', false) + '</svg>' +
      '<div class="legend"><span><i style="background:var(--accent)"></i>' + y1 + '</span><span><i style="background:var(--ink-2)"></i>' + y0 + ' (putus-putus)</span></div>';
  }
  function render() {
    var el = document.getElementById('bandingPanel'); if (!el || !A() || !A().S.data) return;
    var a = A(), S = a.S, y1 = S.tahun, y0 = y1 - 1, m = S.bulan, M = manual(y0), bl = a.namaBulan(m);
    var n0 = nilai(y0, m, M), n1 = nilai(y1, m, null);
    var ada = n0.skor !== null || n0.kelas !== null || n0.hop !== null;
    var kepala = '<div class="panel-h"><div><h2>Banding Tahun Lalu</h2><div class="desc">' + esc(bl) + ' ' + y1 + ' dibanding ' + esc(bl) + ' ' + y0 + '. Kelas, peserta, dan HOP dihitung kumulatif s.d. bulan terpilih.</div></div><span class="follow" title="Mengikuti Tahun dan Bulan di bagian atas"><span class="per"></span></span></div>';
    if (!ada) {
      el.innerHTML = kepala + '<div class="empty">Data ' + y0 + ' belum ada. Tambahkan tab <b>Konman ' + y0 + '</b> (format sama dengan Konman ' + y1 + '), atau isi angka per bulan di tab <b>' + TAB + '</b>: kolom Tahun, Bulan, Skor Konman, Kelas Selesai, Peserta, HOP. ' + a.sheetLink('Buka Google Sheets', TAB) + '</div>';
      return;
    }
    var baris = [['Skor Kontrak Manajemen', n0.skor, n1.skor, 2, false], ['Kelas selesai', n0.kelas, n1.kelas, 0, true], ['Peserta', n0.peserta, n1.peserta, 0, true], ['Hari Orang Pelatihan (HOP)', n0.hop, n1.hop, 3, true]];
    var s0 = [], s1 = [];
    for (var i = 1; i <= 12; i++) { s0.push(nilai(y0, i, M).skor); s1.push(i <= 12 ? nilai(y1, i, null).skor : null); }
    var ind = '';
    if (S.cache.konman[y0]) {
      var B = D.BULAN[m - 1], lama = {};
      S.cache.konman[y0].items.forEach(function (it) { if (!it.isGroup && !it.pengurang && D.hasData(it, B)) lama[String(it.pendek || it.nama).toLowerCase()] = D.capaianItem(it, B); });
      var L = a.K().items.filter(function (it) { return !it.isGroup && !it.pengurang && lama[String(it.pendek || it.nama).toLowerCase()] !== undefined; });
      if (L.length) ind = '<details class="bd-ind"><summary>Per indikator yang sama di kedua tahun · ' + L.length + '</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th class="r">' + y0 + '</th><th class="r">' + y1 + '</th><th class="r">Selisih</th></tr></thead><tbody>' + L.map(function (it) {
        var v0 = lama[String(it.pendek || it.nama).toLowerCase()], v1 = D.hasData(it, B) ? D.capaianItem(it, B) : null;
        return '<tr><td>' + esc(it.pendek || it.nama) + '</td><td class="r num">' + (v0 === null ? '–' : D.pct(v0, 1)) + '</td><td class="r num">' + (v1 === null ? '–' : D.pct(v1, 1)) + '</td><td class="r">' + selisih(v1 === null ? null : v1 * 100, v0 === null ? null : v0 * 100, 1, false) + '</td></tr>';
      }).join('') + '</tbody></table></div></details>';
    }
    el.innerHTML = kepala + '<div class="bd-wrap"><div class="tbl-wrap"><table class="tbl bd-t"><thead><tr><th>Ukuran</th><th class="r">' + y0 + '</th><th class="r">' + y1 + '</th><th class="r">Selisih</th></tr></thead><tbody>' + baris.map(function (b) {
      return '<tr><td>' + b[0] + '</td><td class="r num">' + (b[1] === null ? '–' : D.fmt(b[1], b[3])) + '</td><td class="r num"><b>' + (b[2] === null ? '–' : D.fmt(b[2], b[3])) + '</b></td><td class="r">' + selisih(b[2], b[1], b[3], b[4]) + '</td></tr>';
    }).join('') + '</tbody></table></div><div class="bd-chart"><div class="sub-h">Skor Kontrak Manajemen per bulan</div>' + garis(y0, y1, s0, s1) + '</div></div>' + ind +
      '<div class="note">Sumber ' + y0 + ': ' + esc(n0.sumber.join(', ') || '–') + '.</div>';
  }
  document.addEventListener('dash:periode', function () { setTimeout(render, 0); });
  document.addEventListener('dash:render', function () { setTimeout(render, 0); });
  window.DashBanding = { render: render };
})();
