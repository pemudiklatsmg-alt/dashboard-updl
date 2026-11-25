/* Audit Internal: rekap temuan (NC/OFI) dari tab "Audit Internal" + skor per elemen dari tab "Audit Internal - Skor".
   Analisis: tren antar tahun per sistem manajemen, status tindak lanjut, per bagian, temuan berulang, skor PP 50/2012. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var st = { th: null }, SIS = ['SMM', 'SMK3', 'SML', 'SMP'];
  var NM = { SMM: 'Mutu (ISO 9001)', SMK3: 'K3 (ISO 45001 · PP 50)', SML: 'Lingkungan (ISO 14001)', SMP: 'Pengamanan (Perpol 7/2019)' };
  function $(id) { return document.getElementById(id); }
  function semua() { var S = A().S; return D.rows((S.data && S.data.audit) || []); }
  function skorRows() { var S = A().S; return D.rows((S.data && S.data.auditSkor) || []); }
  function s(v) { return String(v === null || v === undefined ? '' : v).trim(); }
  function tahun(r) { return parseInt(r['Tahun'], 10) || null; }
  function isNc(r) { return /^NC/i.test(s(r['Jenis Temuan'])); }
  function mayor(r) { return /mayor/i.test(s(r['Jenis Temuan'])); }
  function stat(r) { var t = s(r['Status']).toLowerCase(); return /selesai/.test(t) ? 'Selesai' : /verifikasi/.test(t) ? 'Menunggu Verifikasi' : /proses/.test(t) ? 'Proses' : 'Terbuka'; }
  var KLS = { 'Selesai': 'good', 'Menunggu Verifikasi': 'warn', 'Proses': 'warn', 'Terbuka': 'bad' };
  function tgl(v) { if (!v) return null; var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], m[2] - 1, +m[3]); m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], m[2] - 1, +m[1]) : null; }
  function fTgl(v) { var d = tgl(v); return d ? d.getDate() + ' ' + D.BLN3[d.getMonth()] + ' ' + d.getFullYear() : s(v); }
  function lewat(r) { var t = tgl(r['Tenggat']), h = new Date(); h.setHours(0, 0, 0, 0); return !!t && stat(r) !== 'Selesai' && t < h; }
  function sistem(r) { var t = s(r['Sistem Manajemen']).toUpperCase(); return SIS.filter(function (k) { return new RegExp('\\b' + k + '\\b').test(t); }); }
  function bagian(r) { return s(r['Bagian']).split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function tahunAda(R) { var o = {}; R.forEach(function (r) { var t = tahun(r); if (t) o[t] = 1; }); return Object.keys(o).map(Number).sort(function (a, b) { return b - a; }); }
  /* klausul per standar, mis. "ISO 9001:2015 7.1.3; 8.2 · PP 50/2012 6.7" -> ["ISO 9001 7.1.3", "ISO 9001 8.2", "PP 50 6.7"] */
  function klausul(r) {
    var out = [];
    s(r['Standar & Klausul']).split('·').forEach(function (bg) {
      var m = bg.match(/(ISO\s*\d+|PP\s*50|Perpol\s*7)[^\s]*\s*(?:Klausul|Kriteria|Elemen)?\s*(.*)/i); if (!m) return;
      var std = m[1].replace(/\s+/g, ' ').toUpperCase().replace('PERPOL', 'Perpol');
      (m[2] || '').split(/[;,]/).forEach(function (k) { k = k.trim().replace(/\s.*$/, ''); if (/^[\dIVX]/.test(k)) out.push(std + ' ' + k); });
    });
    return out;
  }
  function skorPp(th) { var r = skorRows().filter(function (x) { return tahun(x) === th && /PP\s*50/i.test(s(x['Standar'])) && /total/i.test(s(x['Elemen'])); })[0]; return r ? D.num(r['Skor (%)']) : null; }

  function render() {
    var el = $('auditBody'); if (!el || !A() || !A().S.data) return;
    var R = semua(), TH = tahunAda(R);
    if (!R.length) { el.innerHTML = '<div class="empty">Belum ada temuan audit. Isi ' + A().sheetLink('Google Sheets', 'Audit Internal') + ' dari Laporan Hasil Audit (LHA).</div>'; $('auditDesc').textContent = 'Temuan & tindak lanjut audit internal'; return; }
    if (st.th === null || (st.th !== 'semua' && TH.indexOf(st.th) < 0)) st.th = TH[0];
    var F = R.filter(function (r) { return st.th === 'semua' || tahun(r) === st.th; }), N = F.filter(isNc), O = F.filter(function (r) { return !isNc(r); });
    var nSel = N.filter(function (r) { return stat(r) === 'Selesai'; }).length, nVer = N.filter(function (r) { return stat(r) === 'Menunggu Verifikasi'; }).length, nLw = F.filter(lewat).length;
    var thP = st.th === 'semua' ? TH[0] : st.th, sk = skorPp(thP), skL = skorPp(thP - 1);
    $('auditDesc').textContent = 'Temuan & tindak lanjut audit internal · ' + TH.slice().reverse().join(', ') + ' · ' + R.length + ' temuan';
    var chip = function (v, t) { return '<button type="button" class="chip' + (st.th === v ? ' on' : '') + '" data-ai-th="' + v + '">' + t + '</button>'; };
    var tile = function (v, t, c, sub) { return '<div class="ai-tile"><b class="num ' + (c || '') + '">' + v + '</b><span>' + t + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
    var dSkor = sk !== null && skL !== null ? (sk - skL >= 0 ? '▲ ' : '▼ ') + D.fmt(Math.abs(sk - skL), 2) + ' vs ' + (thP - 1) : '';

    // per sistem manajemen: perbandingan tahun (selalu semua tahun, maks. 3 terbaru)
    var thT = TH.slice(0, 3).reverse();
    var hit = function (th, k, nc) { return R.filter(function (r) { return tahun(r) === th && isNc(r) === nc && sistem(r).indexOf(k) >= 0; }).length; };
    var sisAda = SIS.filter(function (k) { return R.some(function (r) { return sistem(r).indexOf(k) >= 0; }); });
    var mxS = Math.max.apply(null, [1].concat(sisAda.map(function (k) { return Math.max.apply(null, thT.map(function (t) { return hit(t, k, true) + hit(t, k, false); })); })));
    var tabSis = '<div class="ai-sis">' + sisAda.map(function (k) {
      return '<div class="ai-sr"><div class="ai-sn"><b>' + k + '</b><small>' + esc(NM[k]) + '</small></div><div class="ai-sb">' + thT.map(function (t, i) {
        var a = hit(t, k, true), b = hit(t, k, false);
        return '<div class="ai-sl"><span class="ai-th' + (i === thT.length - 1 ? ' on' : '') + '">' + t + '</span><span class="ai-st"><i class="nc" style="width:' + (a / mxS * 100) + '%"></i><i class="ofi" style="width:' + (b / mxS * 100) + '%"></i></span><span class="num">' + a + '<small> · ' + b + '</small></span></div>';
      }).join('') + '</div></div>';
    }).join('') + '</div><div class="legend"><span><i style="background:var(--bad)"></i>Ketidaksesuaian (NC)</span><span><i style="background:var(--idle)"></i>Peluang perbaikan (OFI)</span></div>';

    // per bagian (tahun terpilih)
    var pb = {}; F.forEach(function (r) { bagian(r).forEach(function (b) { var o = pb[b] || (pb[b] = { n: 0, Selesai: 0, 'Menunggu Verifikasi': 0, Proses: 0, Terbuka: 0, ofi: 0 }); o.n++; if (isNc(r)) o[stat(r)]++; else o.ofi++; }); });
    var kB = Object.keys(pb).sort(function (a, b) { return pb[b].n - pb[a].n || a.localeCompare(b); }), mxB = Math.max.apply(null, [1].concat(kB.map(function (k) { return pb[k].n; })));
    var barB = kB.map(function (k) {
      var o = pb[k], seg = [['Selesai', 'sel'], ['Menunggu Verifikasi', 'ver'], ['Proses', 'ver'], ['Terbuka', 'buka']].map(function (x) { return o[x[0]] ? '<i class="' + x[1] + '" style="width:' + (o[x[0]] / mxB * 100) + '%"></i>' : ''; }).join('') + (o.ofi ? '<i class="ofi" style="width:' + (o.ofi / mxB * 100) + '%"></i>' : '');
      return '<div class="ai-pr" title="' + esc(k + ': ' + (o.n - o.ofi) + ' NC, ' + o.ofi + ' OFI') + '"><span>' + esc(k) + '</span><span class="ai-st">' + seg + '</span><span class="num">' + o.n + '</span></div>';
    }).join('');

    // temuan berulang: klausul sama di bagian yang sama pada tahun berbeda
    var g = {}; R.forEach(function (r) { var th = tahun(r); klausul(r).forEach(function (k) { bagian(r).forEach(function (b) { var key = b + '|' + k, o = g[key] || (g[key] = { b: b, k: k, th: {}, n: 0 }); o.th[th] = 1; o.n++; }); }); });
    var ul = Object.keys(g).map(function (k) { return g[k]; }).filter(function (o) { return Object.keys(o.th).length > 1; }).sort(function (a, b) { return b.n - a.n; });
    var uniq = {}; ul = ul.filter(function (o) { var k = o.b + o.k.replace(/\.\d+$/, ''); if (uniq[k]) return false; uniq[k] = 1; return true; }).slice(0, 5);
    var berulang = ul.length ? '<ul class="ai-ul">' + ul.map(function (o) { return '<li><b>' + esc(o.b) + '</b> · ' + esc(o.k) + '<small>' + Object.keys(o.th).join(' & ') + '</small></li>'; }).join('') + '</ul>' : '<p class="desc">Belum ada klausul yang berulang di bagian yang sama.</p>';

    // skor PP 50 per elemen (2 tahun terakhir)
    var SK = skorRows().filter(function (x) { return /PP\s*50/i.test(s(x['Standar'])) && !/total/i.test(s(x['Elemen'])); }), thS = tahunAda(SK).slice(0, 2).reverse(), tabSk = '';
    if (SK.length) {
      var el2 = {}; SK.forEach(function (x) { var k = s(x['Elemen']); (el2[k] = el2[k] || { u: s(x['Uraian']), v: {} }).v[tahun(x)] = D.num(x['Skor (%)']); });
      tabSk = '<div class="sub-h">PP 50/2012 · skor per elemen</div><div class="tbl-wrap ai-gulir"><table class="tbl ai-sk"><thead><tr><th>Elemen</th>' + thS.map(function (t) { return '<th class="num">' + t + '</th>'; }).join('') + (thS.length > 1 ? '<th class="num">Δ</th>' : '') + '</tr></thead><tbody>' +
        Object.keys(el2).sort(function (a, b) { return a - b; }).map(function (k) {
          var o = el2[k], a = o.v[thS[0]], b = o.v[thS[thS.length - 1]], d = thS.length > 1 && a !== undefined && b !== undefined ? b - a : null;
          return '<tr><td><span class="ai-no">' + esc(k) + '</span>' + esc(o.u) + '</td>' + thS.map(function (t) { var v = o.v[t]; return '<td class="num' + (v !== undefined && v < 80 ? ' bad' : '') + '">' + (v === undefined || v === null ? '–' : D.fmt(v, 0) + '%') + '</td>'; }).join('') +
            (thS.length > 1 ? '<td class="num ' + (d === null || Math.abs(d) < 0.5 ? '' : d > 0 ? 'good' : 'bad') + '">' + (d === null ? '–' : Math.abs(d) < 0.5 ? '=' : (d > 0 ? '▲ ' : '▼ ') + D.fmt(Math.abs(d), 0)) + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    el.innerHTML = '<div class="chips ai-chips">' + TH.map(function (t) { return chip(t, t); }).join('') + (TH.length > 1 ? chip('semua', 'Semua tahun') : '') + '</div>' +
      '<div class="ai-tiles">' + tile(N.length, 'Ketidaksesuaian (NC)', N.length ? 'bad' : '', N.filter(mayor).length ? N.filter(mayor).length + ' mayor' : 'semua minor') +
      tile(O.length, 'Peluang perbaikan (OFI)', '') +
      tile(N.length ? D.fmt(nSel / N.length * 100, 0) + '%' : '–', 'NC tuntas (efektif)', nSel === N.length ? 'good' : 'warn', nSel + ' dari ' + N.length) +
      tile(nVer, 'Menunggu verifikasi', nVer ? 'warn' : '') +
      tile(nLw, 'Lewat tenggat', nLw ? 'bad' : 'good', nLw ? 'belum selesai' : 'aman') +
      (sk !== null ? tile(D.fmt(sk, 2) + '%', 'Skor PP 50/2012 ' + thP, sk >= 85 ? 'good' : 'warn', dSkor) : '') + '</div>' +
      '<div class="ai-grid"><div class="ai-kol"><div class="sub-h">Per sistem manajemen · NC · OFI per tahun</div>' + tabSis +
      '<div class="sub-h">Temuan berulang · klausul sama di bagian yang sama</div>' + berulang + '</div>' +
      '<div class="ai-kol"><div class="sub-h">Per bagian · ' + (st.th === 'semua' ? 'semua tahun' : st.th) + '</div><div class="ai-pb">' + barB + '</div>' +
      '<div class="legend"><span><i style="background:var(--good)"></i>Selesai</span><span><i style="background:var(--warn)"></i>Menunggu verifikasi / proses</span><span><i style="background:var(--bad)"></i>Terbuka</span><span><i style="background:var(--idle)"></i>OFI</span></div>' + tabSk + '</div></div>' +
      '<button class="btn" type="button" data-ai-daftar>Lihat daftar temuan (' + F.length + ') <span aria-hidden="true">→</span></button>';
  }

  function daftar() {
    var R = semua().filter(function (r) { return st.th === 'semua' || tahun(r) === st.th; }), f = { j: '', s: '' };
    var opsi = function (id, a, lbl) { return '<select id="' + id + '" class="sel"><option value="">' + lbl + '</option>' + a.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>'; };
    A().openModal('<div class="modal-h"><div><div class="desc">Audit Internal · ' + (st.th === 'semua' ? 'semua tahun' : st.th) + ' · ketuk baris untuk rincian</div><h3>Daftar Temuan Audit</h3></div><button class="btn" data-close>Tutup</button></div>' +
      '<div class="ai-fil">' + opsi('aiJ', ['NC Minor', 'NC Mayor', 'OFI'], 'Semua jenis') + opsi('aiS', ['Terbuka', 'Proses', 'Menunggu Verifikasi', 'Selesai'], 'Semua status') + '<span class="desc" id="aiN"></span></div>' +
      '<div class="tbl-wrap scroll m-gulir"><table class="tbl ai-t"><thead><tr><th>ID</th><th>Jenis</th><th>Bagian</th><th>Temuan</th><th>Klausul</th><th>Status</th></tr></thead><tbody id="aiT"></tbody></table></div>', 'wide');
    function isi() {
      var L = R.filter(function (r) { return (!f.j || s(r['Jenis Temuan']) === f.j) && (!f.s || stat(r) === f.s); });
      $('aiN').textContent = L.length + ' temuan';
      $('aiT').innerHTML = L.map(function (r, i) {
        var stt = stat(r), lw = lewat(r);
        var rinci = [['Analisis penyebab', r['Analisis Penyebab']], ['Koreksi', r['Koreksi']], ['Tindakan korektif / action item', r['Tindakan Korektif / Action Item']], ['Bukti tindakan', r['Bukti Tindakan']], ['Tenggat', r['Tenggat'] ? fTgl(r['Tenggat']) : ''], ['Verifikasi', s(r['Hasil Verifikasi']) ? r['Hasil Verifikasi'] + (r['Tgl Verifikasi'] ? ' · ' + fTgl(r['Tgl Verifikasi']) : '') : ''], ['Auditor', r['Auditor']], ['Keterangan', r['Keterangan']]]
          .filter(function (x) { return s(x[1]); }).map(function (x) { return '<div><b>' + x[0] + '</b><span>' + esc(s(x[1])) + '</span></div>'; }).join('');
        return '<tr class="klik" data-ai-i="' + i + '"><td class="nw">' + esc(s(r['ID'])) + '</td><td><span class="pill ' + (isNc(r) ? 'bad' : 'idle') + '">' + esc(s(r['Jenis Temuan'])) + '</span></td><td>' + esc(s(r['Bagian'])) + '</td><td>' + esc(s(r['Uraian Temuan'])) + '</td><td class="ai-kl">' + esc(s(r['Standar & Klausul'])) + '</td><td><span class="pill ' + (lw ? 'bad' : KLS[stt]) + '">' + (lw ? 'Lewat tenggat' : stt) + '</span></td></tr>' +
          '<tr class="ai-rinci" hidden><td colspan="6"><div class="ai-rg">' + rinci + '</div></td></tr>';
      }).join('') || '<tr><td colspan="6" class="desc">Tidak ada temuan untuk filter ini.</td></tr>';
    }
    isi();
    $('aiJ').onchange = function () { f.j = this.value; isi(); };
    $('aiS').onchange = function () { f.s = this.value; isi(); };
    $('aiT').onclick = function (e) { var tr = e.target.closest('tr[data-ai-i]'); if (!tr) return; var n = tr.nextElementSibling; n.hidden = !n.hidden; tr.classList.toggle('buka', !n.hidden); };
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-ai-th]');
    if (t) { var v = t.getAttribute('data-ai-th'); st.th = v === 'semua' ? 'semua' : +v; render(); return; }
    if (e.target.closest && e.target.closest('[data-ai-daftar]')) daftar();
  });
  /* dipakai notifikasi "Perlu perhatian" */
  function ringkas() {
    var R = semua(); if (!R.length) return null;
    return { ncBuka: R.filter(function (r) { return isNc(r) && stat(r) !== 'Selesai'; }).length, lewat: R.filter(lewat).length };
  }
  window.DashAudit = { render: render, ringkas: ringkas };
})();
