/* Tugas lain (di luar dashboard): disposisi, bantuan, koordinasi, jadwal zoom/dinas/diklat.
   Sumber data: tab "Tugas Lain" di spreadsheet. Ditampilkan di halaman Tugas Tim EPMK, khusus Admin. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var $ = function (id) { return document.getElementById(id); };
  var F = { st: 'aktif', buka: false, edit: null, sibuk: false };
  var PIC = ['TL EPMK', 'OF EPMK', 'ADM EPMK'];
  var JENIS = ['Disposisi', 'Bantuan', 'Koordinasi', 'Zoom / Rapat', 'Dinas', 'Diklat', 'Lainnya'];
  var STATUS = ['Belum Dimulai', 'Proses', 'Selesai', 'Hold', 'Dibatalkan'];

  function data() { var S = A().S; return (S.data && S.data.tugasLain) || { rows: [] }; }
  function hariIni() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function tgl(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmt(iso) { var d = tgl(iso); return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function isoHari(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  /* warna sesuai legenda: merah lewat tenggat, kuning proses / tenggat ≤3 hari, hijau selesai, abu belum dimulai, ungu hold, abu coret batal */
  function warna(x) {
    if (x.status === 'Selesai') return 'good';
    if (x.status === 'Dibatalkan') return 'batal';
    if (x.status === 'Hold') return 'hold';
    var t = tgl(x.tenggat), sisa = t ? Math.round((t - hariIni()) / 864e5) : null;
    if (sisa !== null && sisa < 0) return 'bad';
    if (x.status === 'Proses' || (sisa !== null && sisa <= 3)) return 'warn';
    return 'idle';
  }
  function tenggatTeks(x) {
    var t = tgl(x.tenggat); if (!t) return '';
    if (x.status === 'Selesai' || x.status === 'Dibatalkan') return 'Tenggat ' + fmt(x.tenggat);
    var sisa = Math.round((t - hariIni()) / 864e5);
    return sisa < 0 ? 'Lewat ' + (-sisa) + ' hari' : sisa === 0 ? 'Tenggat hari ini' : sisa + ' hari lagi';
  }
  function cocok(x) {
    if (F.st === 'semua') return true;
    if (F.st === 'aktif') return x.status !== 'Selesai' && x.status !== 'Dibatalkan';
    return x.status === F.st;
  }
  function form() {
    var e = F.edit || {}, opt = function (L, v) { return L.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); };
    return '<form class="tl2-form" id="tl2Form" autocomplete="off">' +
      '<label>Jenis<select name="jenis">' + opt(JENIS, e.jenis || 'Disposisi') + '</select></label>' +
      '<label>PIC<input name="pic" list="tl2Pic" value="' + esc(e.pic || '') + '" placeholder="mis. OF EPMK"><datalist id="tl2Pic">' + PIC.map(function (p) { return '<option value="' + p + '">'; }).join('') + '</datalist></label>' +
      '<label>Tanggal<input name="tgl" type="date" value="' + esc(e.tgl || isoHari(hariIni())) + '"></label>' +
      '<label>Tenggat / jadwal<input name="tenggat" type="date" value="' + esc(e.tenggat || '') + '"></label>' +
      '<label class="lebar">Uraian<textarea name="uraian" rows="2" required placeholder="mis. Disposisi Manajer: siapkan bahan rapat evaluasi diklat">' + esc(e.uraian || '') + '</textarea></label>' +
      '<label>Status<select name="status">' + opt(STATUS, e.status || 'Belum Dimulai') + '</select></label>' +
      '<label>Catatan<input name="catatan" value="' + esc(e.catatan || '') + '" placeholder="opsional"></label>' +
      '<div class="tl2-aksi"><button class="btn primary" type="submit"' + (F.sibuk ? ' disabled' : '') + '>' + (F.sibuk ? 'Menyimpan…' : e.id ? 'Simpan perubahan' : 'Tambah tugas') + '</button><button class="btn" type="button" data-tl2="batal">Batal</button></div></form>';
  }
  function render() {
    var el = $('tgLain'); if (!el || !A().admin()) return;
    var T = data(), L = (T.rows || []).slice();
    if (T.error) { el.innerHTML = '<div class="panel-h"><div><h2>Tugas lain</h2></div></div><div class="warnbox">Tab Tugas Lain tidak terbaca: ' + esc(T.error) + '</div>'; return; }
    L.sort(function (a, b) { var u = { bad: 0, warn: 1, idle: 2, hold: 3, good: 4, batal: 5 }; return (u[warna(a)] - u[warna(b)]) || String(a.tenggat || '9').localeCompare(String(b.tenggat || '9')); });
    var n = function (f) { return L.filter(f).length; };
    var aktif = n(function (x) { return x.status !== 'Selesai' && x.status !== 'Dibatalkan'; }), telat = n(function (x) { return warna(x) === 'bad'; });
    var chip = function (k, t, c) { return '<button type="button" class="chip' + (F.st === k ? ' on' : '') + '" data-tl2st="' + k + '">' + t + (c !== undefined ? ' <b>' + c + '</b>' : '') + '</button>'; };
    var tampil = L.filter(cocok);
    el.innerHTML = '<div class="panel-h"><div><h2 class="ber-ikon"><span class="ikb">' + A().ikon('kalender') + '</span>Tugas lain</h2>' +
      '<div class="desc">Disposisi, bantuan, koordinasi, serta jadwal zoom, dinas, dan diklat yang tidak tercatat di dashboard. Data tersimpan di tab <b>Tugas Lain</b>.</div></div>' +
      '<span class="pill ' + (telat ? 'bad' : aktif ? 'warn' : 'good') + '">' + (telat ? telat + ' lewat tenggat' : aktif ? aktif + ' berjalan' : 'Tidak ada tugas aktif') + '</span></div>' +
      '<div class="tg-fil"><div class="chips">' + chip('aktif', 'Berjalan', aktif) + chip('Hold', 'Hold', n(function (x) { return x.status === 'Hold'; })) + chip('Selesai', 'Selesai') + chip('Dibatalkan', 'Dibatalkan') + chip('semua', 'Semua', L.length) + '</div>' +
      (F.buka ? '' : '<button type="button" class="btn sm primary" data-tl2="tambah">+ Tambah tugas</button>') + '</div>' +
      (F.buka ? form() : '') +
      '<div class="tg-list">' + (tampil.length ? tampil.map(function (x) {
        var w = warna(x), tt = tenggatTeks(x);
        return '<div class="tg-row tl2-row" data-st="' + w + '"><i class="tg-dot" aria-hidden="true"></i><div class="tg-main"><b>' + esc(x.uraian) + '</b>' + (x.catatan ? '<span class="tg-ket">' + esc(x.catatan) + '</span>' : '') +
          '<span class="tg-meta"><span class="tg-tag">' + esc(x.jenis || 'Lainnya') + '</span>' + (x.tgl ? '<span>dicatat ' + esc(fmt(x.tgl)) + '</span>' : '') + '</span></div>' +
          '<div class="tg-when"><span class="tg-pic-c">' + esc(x.pic || 'PIC belum diisi') + '</span>' + (tt ? '<span>' + esc(tt) + '</span>' : '<small>tanpa tenggat</small>') + '</div>' +
          '<div class="tg-st"><select class="tl2-sel" data-tl2id="' + esc(x.id) + '" aria-label="Status tugas">' + STATUS.map(function (s) { return '<option' + (s === x.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="btn sm" data-tl2="ubah" data-id="' + esc(x.id) + '">Ubah</button></div></div>';
      }).join('') : '<div class="empty">' + (L.length ? 'Tidak ada tugas pada saringan ini.' : 'Belum ada tugas lain. Ketuk <b>+ Tambah tugas</b> untuk mencatat disposisi, bantuan, koordinasi, atau jadwal.') + '</div>') + '</div>';
  }
  function kirim(body) {
    var s = D.sesi(); body.token = s ? s.token : '';
    F.sibuk = true;
    return D.api(body).then(function (d) {
      A().S.data.tugasLain = d.tugasLain; A().toast(d.pesan); return d;
    }).catch(function (e) { if (e.login) A().keluar(e.message); A().toast('Gagal menyimpan: ' + e.message, 7000); throw e; })
      .then(function (d) { F.sibuk = false; return d; }, function () { F.sibuk = false; render(); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest || !t.closest('#tgLain')) return;
    var st = t.closest('[data-tl2st]'); if (st) { F.st = st.getAttribute('data-tl2st'); return render(); }
    var b = t.closest('[data-tl2]'); if (!b) return;
    var a = b.getAttribute('data-tl2');
    if (a === 'tambah') { F.buka = true; F.edit = null; render(); var u = document.querySelector('#tl2Form textarea'); if (u) u.focus(); }
    if (a === 'batal') { F.buka = false; F.edit = null; render(); }
    if (a === 'ubah') { F.edit = (data().rows || []).filter(function (x) { return x.id === b.getAttribute('data-id'); })[0] || null; F.buka = true; render(); var f = $('tl2Form'); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
  document.addEventListener('change', function (e) {
    var s = e.target.closest && e.target.closest('.tl2-sel'); if (!s) return;
    kirim({ aksi: 'tugasLain', op: 'status', data: { id: s.getAttribute('data-tl2id'), status: s.value } }).then(render);
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'tl2Form') return; e.preventDefault();
    var f = e.target, v = function (n) { return f.elements[n].value; };
    var d = { id: F.edit ? F.edit.id : '', jenis: v('jenis'), pic: v('pic'), tgl: v('tgl'), tenggat: v('tenggat'), uraian: v('uraian'), status: v('status'), catatan: v('catatan') };
    if (!d.uraian.trim()) return A().toast('Uraian tugas wajib diisi.');
    F.sibuk = true; render();
    kirim({ aksi: 'tugasLain', op: 'simpan', data: d }).then(function () { F.buka = false; F.edit = null; render(); });
  });
  window.DashTugasLain = { render: render, warna: warna };
})();
