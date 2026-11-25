/* Riwayat perubahan data (Admin): setiap simpan lewat dashboard & edit manual di spreadsheet, dari tab "Log Perubahan". */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var R = { rows: [], tab: '', lewat: '', q: '', batas: 60 };
  function jam(t) { var d = new Date(t); return isNaN(d) ? String(t) : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function kepala(sub) { return '<div class="modal-h"><div>' + (sub ? '<div class="desc">' + sub + '</div>' : '') + '<h3>Riwayat Perubahan</h3></div><button class="btn" data-close>Tutup</button></div>'; }
  function cocok(r) {
    if (R.tab && r.tab !== R.tab) return false;
    if (R.lewat && r.l !== R.lewat) return false;
    if (R.q) { var q = R.q.toLowerCase(); if ((r.a + ' ' + r.tab + ' ' + r.b + ' ' + r.u).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }
  function isi() {
    var L = R.rows.filter(cocok), tampil = L.slice(0, R.batas), hari = '';
    var badan = tampil.map(function (r) {
      var d = new Date(r.t), h = isNaN(d) ? '' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), sep = '';
      if (h !== hari) { hari = h; sep = '<tr class="rw-hari"><td colspan="5">' + esc(h) + '</td></tr>'; }
      return sep + '<tr><td class="num">' + esc(isNaN(d) ? '' : d.getHours() + d.getMinutes() + d.getSeconds() === 0 ? '–' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })) + '</td><td><b>' + esc(r.tab) + '</b>' + (r.b ? '<div class="desc">' + esc(r.b) + '</div>' : '') + '</td><td class="rw-u">' + esc(r.u || '–') + '</td><td>' + esc(r.a) + '</td><td><span class="pill ' + (r.l === 'dashboard' ? 'good' : r.l === 'manual' ? 'warn' : 'idle') + '">' + esc({ dashboard: 'Dashboard', manual: 'Edit manual', 'riwayat Drive': 'Riwayat Drive', impor: 'Impor data', sistem: 'Sistem' }[r.l] || r.l || 'Edit manual') + '</span></td></tr>';
    }).join('');
    var el = document.getElementById('rwIsi'); if (!el) return;
    el.innerHTML = (L.length ? '<div class="tbl-wrap"><table class="tbl rw-t"><thead><tr><th>Jam</th><th>Tab · bagian</th><th>Perubahan</th><th>Akun</th><th>Lewat</th></tr></thead><tbody>' + badan + '</tbody></table></div>' +
      (L.length > R.batas ? '<div class="rw-lagi"><button class="btn" type="button" data-rw="lagi">Tampilkan lebih banyak (' + (L.length - R.batas) + ' lagi)</button></div>' : '')
      : '<div class="empty">' + (R.rows.length ? 'Tidak ada perubahan yang cocok dengan saringan.' : 'Belum ada perubahan tercatat. Pencatatan dimulai sejak Apps Script terbaru dipasang.') + '</div>');
    var n = document.getElementById('rwN'); if (n) n.textContent = L.length + ' perubahan';
  }
  function tampil(d) {
    R.rows = d.rows || []; R.batas = 60;
    var tabs = {}; R.rows.forEach(function (r) { tabs[r.tab] = (tabs[r.tab] || 0) + 1; });
    var opt = Object.keys(tabs).sort().map(function (t) { return '<option value="' + esc(t) + '"' + (t === R.tab ? ' selected' : '') + '>' + esc(t) + ' (' + tabs[t] + ')</option>'; }).join('');
    A().openModal(kepala('Semua simpan lewat dashboard dan edit manual di Google Sheets · ' + (d.total || 0) + ' tercatat') +
      '<div class="rw-fil"><input type="search" id="rwQ" placeholder="Cari akun, tab, atau isi perubahan" value="' + esc(R.q) + '">' +
      '<select id="rwTab"><option value="">Semua tab</option>' + opt + '</select>' +
      '<select id="rwLewat"><option value="">Semua sumber</option><option value="dashboard"' + (R.lewat === 'dashboard' ? ' selected' : '') + '>Lewat dashboard</option><option value="manual"' + (R.lewat === 'manual' ? ' selected' : '') + '>Edit manual</option></select><span class="desc" id="rwN"></span></div>' +
      '<div id="rwIsi"></div><div class="note">Data lengkap ada di ' + A().sheetLink('Google Sheets', 'Log Perubahan') + '. Edit manual oleh akun Google di luar organisasi bisa tercatat tanpa nama akun. Isi sandi tidak pernah dicatat.</div>', 'wide');
    isi();
  }
  function buka() {
    var s = D.sesi(); if (!s) return;
    A().openModal(kepala() + '<div class="empty">Memuat…</div>', 'wide');
    D.api({ aksi: 'riwayat', token: s.token }).then(tampil).catch(function (e) {
      if (e.login) return A().keluar(e.message);
      A().openModal(kepala() + '<div class="empty">' + esc(/tidak dikenal/i.test(e.message) ? 'Fitur ini butuh Apps Script terbaru. Tempel Code.gs terbaru lalu Deploy versi baru.' : e.message) + '</div>', 'wide');
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#rwBtn, [data-rw="buka"]')) return buka();
    if (e.target.closest && e.target.closest('[data-rw="lagi"]')) { R.batas += 100; isi(); }
  });
  document.addEventListener('input', function (e) { if (e.target.id === 'rwQ') { R.q = e.target.value.trim(); R.batas = 60; isi(); } });
  document.addEventListener('change', function (e) { if (e.target.id === 'rwTab') { R.tab = e.target.value; isi(); } if (e.target.id === 'rwLewat') { R.lewat = e.target.value; isi(); } });
  window.DashRiwayat = { buka: buka };
})();
