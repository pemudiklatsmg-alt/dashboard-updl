/* Notulensi rapat — format FR.SMT.019 Notula Rapat Internal Eksternal.
   Admin membuat & menyunting, akun Lihat membaca & mengunduh. Data disimpan di tab "Notulen" & "Notulen Isi";
   action item otomatis masuk Tugas Tim (tab "Tugas Lain", jenis "Tindak Lanjut Rapat").
   Unduh Word mengisi templat asli (assets/notulen/FR.SMT.019.docx) dengan JSZip; PDF lewat dialog cetak. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var $ = function (id) { return document.getElementById(id); };
  var JENIS = ['Rapat Internal', 'Performance Dialog', 'Rapat Tinjauan Manajemen', 'Koordinasi Bidang', 'Rapat Eksternal'];
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var PIC = ['TL EPMK', 'OF EPMK', 'ADM EPMK', 'Asman', 'Manager'];
  var N = { daftar: null, cur: null, mode: 'riwayat', q: '', fj: '', fb: '', ubah: false, sibuk: false, rng: null, edAkhir: 'diskusi', murni: true };

  var li = function (a) { return '<ul>' + a.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
  var TEMPLAT = {
    'Rapat Internal': { agenda: li(['<br>']), diskusi: li(['<br>']) },
    'Performance Dialog': { agenda: li(['Review capaian Kontrak Manajemen bulan berjalan', 'Pembahasan indikator di bawah target', 'Rencana tindak lanjut dan dukungan yang diperlukan']), diskusi: li(['<br>']) },
    'Rapat Tinjauan Manajemen': { agenda: li(['Status tindak lanjut tinjauan manajemen sebelumnya', 'Perubahan isu internal dan eksternal', 'Kinerja dan efektivitas sistem manajemen (kepuasan pelanggan, sasaran mutu, ketidaksesuaian, hasil audit)', 'Kecukupan sumber daya', 'Efektivitas tindakan menangani risiko dan peluang', 'Peluang perbaikan']), diskusi: li(['<br>']) },
    'Koordinasi Bidang': { agenda: li(['Update progres pekerjaan', 'Kendala dan kebutuhan dukungan', 'Koordinasi lintas bidang']), diskusi: li(['<br>']) },
    'Rapat Eksternal': { agenda: li(['Pembukaan dan perkenalan', 'Maksud dan tujuan pertemuan', 'Pembahasan', 'Kesepakatan dan langkah selanjutnya']), diskusi: li(['<br>']) }
  };

  /* ---------- util ---------- */
  function tgl(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function isoHari(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function tglPanjang(iso) { var d = tgl(iso); return d ? d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function hariTgl(iso) { var d = tgl(iso); return d ? HARI[d.getDay()] + ', ' + tglPanjang(iso) : ''; }
  function tglPendek(iso) { var d = tgl(iso); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : ''; }
  function teks(h) { var t = document.createElement('div'); t.innerHTML = h || ''; return (t.textContent || '').replace(/\s+/g, ' ').trim(); }
  function admin() { return A().admin(); }
  function user() { var S = A().S; return (S.data && S.data.meta && S.data.meta.user) || S.user || ''; }
  function api(b) { b.token = D.sesi().token; return D.api(b); }
  function tugasRows() { var S = A().S; return (S.data && S.data.tugasLain && S.data.tugasLain.rows) || []; }
  function tugasById(id) { return tugasRows().filter(function (r) { return r.id === id; })[0]; }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh / diblokir */ } }
  function drafKey(id) { return 'updl_nt_draf_' + (id || 'baru'); }
  function baru(jenis) {
    var t = TEMPLAT[jenis] || TEMPLAT['Rapat Internal'];
    return { id: '', jenis: jenis, judul: '', tanggal: isoHari(new Date()), waktu: '', lokasi: 'UPDL Semarang', peserta: 'Sesuai Daftar Hadir', noteTaker: user(), status: 'Draf',
      html: { agenda: t.agenda, diskusi: t.diskusi, aob: li(['<br>']), dok: '' }, ttd: { tanggal: '', jabatan: 'MANAGER', nama: 'SUNANDAR USMAN' }, aksi: [{ isu: '', aksi: '', pic: '', tenggat: '' }] };
  }
  function ttdTanggal(d) { return (d.ttd && d.ttd.tanggal) || ('Semarang, ' + (tglPanjang(d.tanggal) || '…')); }

  /* ---------- gaya dokumen (dipakai di layar & saat cetak PDF) ---------- */
  var CSS_DOK = '.nt-doc{--nt-b:#156082;--nt-s:#C1E4F5;--nt-g:#45B0E1;background:#fff;color:#000;font:11pt/1.45 Calibri,Carlito,"Segoe UI",Arial,sans-serif;width:100%;max-width:794px;margin:0 auto;padding:34px 60px 21px;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,.08),0 8px 34px rgba(0,0,0,.08);border-radius:3px}' +
    '.nt-doc *{box-sizing:border-box}.nt-hd{display:flex;align-items:center;gap:8px;margin:0 0 5px}.nt-hd img{width:34px;height:auto}.nt-hd div{display:grid;font-size:7.5pt;font-weight:700;line-height:1.35}' +
    '.nt-mom{width:100%;border-collapse:collapse;margin:0 0 13px;table-layout:fixed}.nt-mom td{border:1px solid #000;padding:3px 7px;vertical-align:middle}.nt-mom .t{font-size:24pt;font-weight:700;line-height:1.1}.nt-mom .k{width:100px;white-space:nowrap}.nt-mom .k i{float:right;font-style:normal}' +
    '.nt-mom input{width:100%;border:0;background:transparent;font:inherit;color:inherit;padding:2px 0;outline:none}.nt-mom input:focus{background:#FFFBD6}' +
    '.nt-h{font-weight:700;font-size:11pt;margin:13px 0 3px;display:flex;gap:13px}.nt-h span{width:21px}' +
    '.nt-ed{padding:0 0 0 34px;min-height:24px;outline:none;text-align:justify}.nt-ed[contenteditable=true]:focus{background:#FBFDFF;box-shadow:inset 2px 0 0 var(--nt-g)}.nt-ed:empty::before{content:attr(data-ph);color:#999}' +
    '.nt-ed ul,.nt-ed ol{margin:3px 0;padding-left:21px}.nt-ed li{margin:0 0 5px}.nt-ed p{margin:0 0 5px}' +
    '.nt-ed img{max-width:100%;height:auto;display:block;margin:5px auto;border-radius:2px}.nt-ed .nt-kartu{margin:8px 0;text-align:center}.nt-ed .nt-kartu img{border:1px solid #ddd}.nt-ed figcaption{font-size:9pt;color:#555;font-style:italic;margin-top:3px}' +
    '.nt-tbl{width:100%;border-collapse:collapse;margin:5px 0 8px}.nt-tbl th,.nt-tbl td{border:1px solid var(--nt-g);padding:3px 7px;vertical-align:top;text-align:left;min-width:40px}.nt-tbl th{background:var(--nt-b);color:#fff;font-weight:700}.nt-tbl tbody tr:nth-child(odd) td{background:#EAF6FC}' +
    '.nt-ak{width:100%;border-collapse:collapse;margin:3px 0 0}.nt-ak th{background:var(--nt-b);color:#fff;font-weight:700;border:1px solid var(--nt-g);padding:5px 7px;text-align:center}.nt-ak td{border:1px solid var(--nt-g);padding:3px 7px;vertical-align:top}.nt-ak tbody tr:nth-child(odd) td{background:var(--nt-s)}' +
    '.nt-ak .no{width:30px;text-align:center}.nt-ak .pic{width:130px;text-align:center}.nt-picw{position:relative;display:block;border-radius:3px}.nt-picv{display:block;padding:2px 13px 2px 0;font-size:10pt;line-height:1.3;word-break:break-word}.nt-picv::after{content:\"\\25BE\";position:absolute;right:0;top:2px;color:#398F98}.nt-picw select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.nt-picw:focus-within{background:#FFFBD6}.nt-ak .pic input{margin-top:3px;border-bottom:1px dashed #9AD2D8}.nt-ak .tg{width:100px;text-align:center}.nt-ak textarea,.nt-ak input{width:100%;border:0;background:transparent;font:inherit;color:inherit;resize:none;outline:none;padding:2px 0;overflow:hidden;field-sizing:content;min-height:22px}' +
    '.nt-ak textarea:focus,.nt-ak input:focus{background:#FFFBD6}.nt-ak .x{width:26px;padding:0;text-align:center;background:#fff!important;border:0}.nt-ak .x button{border:0;background:none;color:#B3261E;font-size:16px;cursor:pointer;padding:5px}' +
    '.nt-ak .tk{display:block;font-size:8.5pt;color:#555;margin-top:2px}.nt-ak .tk b{font-weight:600}' +
    '.nt-ttd{display:grid;grid-template-columns:1fr 1fr;margin:21px 0 0}.nt-ttd>div:last-child{text-align:center;display:grid;gap:5px}.nt-ttd .sp{height:55px}.nt-ttd [contenteditable=true]{outline:none;border-radius:2px}.nt-ttd [contenteditable=true]:focus{background:#FFFBD6}' +
    '.nt-paraf{display:flex;gap:13px;justify-content:center;margin-top:13px}.nt-paraf span:last-child{border-bottom:1px solid #000;width:140px}' +
    '.nt-ft{margin-top:34px;font-size:8pt;line-height:1.35;color:#333}' +
    '@media (max-width:700px){.nt-doc{padding:21px 13px 13px;font-size:10.5pt;border-radius:0}.nt-mom{font-size:9.5pt}.nt-mom .t{font-size:15pt}.nt-mom col:nth-child(1){width:23%!important}.nt-mom col:nth-child(2){width:22%!important}.nt-mom col:nth-child(3){width:23%!important}.nt-mom .k{white-space:normal}.nt-mom .k i{display:none}.nt-ed{text-align:left}.nt-ed{padding-left:13px}.nt-ak .pic,.nt-ak .tg{width:74px}}';
  function pasangCss() { if ($('ntCss')) return; var s = document.createElement('style'); s.id = 'ntCss'; s.textContent = CSS_DOK; document.head.appendChild(s); }

  /* PIC action item: tim EPMK, pegawai dari Data - Pegawai, atau "Lainnya" (tulis sendiri, mis. PIC di luar UPDL Semarang) */
  function daftarPegawai() {
    var o = A().S.data && A().S.data.org, L = ((o && o.pegawai) || []).map(function (r) { return String(r[0] || '').trim(); }).filter(Boolean);
    return L.filter(function (n, i) { return L.indexOf(n) === i; }).sort(function (a, b) { return a.localeCompare(b, 'id'); });
  }
  function picSel(v) {
    v = String(v || ''); var peg = daftarPegawai(), ada = !v || PIC.indexOf(v) >= 0 || peg.indexOf(v) >= 0;
    var op = function (n) { return '<option' + (n === v ? ' selected' : '') + '>' + esc(n) + '</option>'; };
    return '<span class="nt-picw"><span class="nt-picv">' + esc(!v ? 'Pilih PIC' : ada ? v : 'Lainnya') + '</span><select data-ak="picPil" aria-label="PIC"><option value=""' + (v ? '' : ' selected') + '>Pilih PIC</option><optgroup label="Tim / jabatan">' + PIC.map(op).join('') + '</optgroup>' +
      (peg.length ? '<optgroup label="Pegawai UPDL Semarang">' + peg.map(op).join('') + '</optgroup>' : '') +
      '<option value="__lain"' + (ada ? '' : ' selected') + '>Lainnya (tulis sendiri)…</option></select></span>' +
      '<input data-ak="pic" placeholder="Nama / unit PIC" value="' + esc(ada ? '' : v) + '"' + (ada ? ' hidden' : '') + '>';
  }

  /* ---------- isi dokumen (sunting = true untuk Admin) ---------- */
  function docHtml(d, ed) {
    var ce = ed ? ' contenteditable="true"' : '';
    var inp = function (k, ph, tipe) { return ed ? '<input data-ntk="' + k + '"' + (tipe ? ' type="' + tipe + '"' : '') + ' value="' + esc(d[k] || '') + '" placeholder="' + esc(ph) + '">' : esc(k === 'tanggal' ? hariTgl(d[k]) : d[k] || ''); };
    var sec = function (h, judul, f, ph) { return '<div class="nt-h"><span>' + h + '.</span>' + judul + '</div><div class="nt-ed" data-ntf="' + f + '" data-ph="' + esc(ph) + '"' + ce + '>' + (d.html[f] || '') + '</div>'; };
    var aksi = (d.aksi && d.aksi.length ? d.aksi : ed ? [] : [{}]).map(function (a, i) {
      var t = a.tid && admin() ? tugasById(a.tid) : null;
      var tk = t ? '<span class="tk">Tugas Tim: <b>' + esc(t.status) + '</b></span>' : '';
      if (!ed) return '<tr><td class="no">' + (i + 1) + '</td><td>' + esc(a.isu || '') + '</td><td>' + esc(a.aksi || '') + tk + '</td><td class="pic">' + esc(a.pic || '') + '</td><td class="tg">' + esc(tglPendek(a.tenggat)) + '</td></tr>';
      return '<tr data-i="' + i + '"><td class="no">' + (i + 1) + '</td><td><textarea rows="1" data-ak="isu" placeholder="Isu">' + esc(a.isu || '') + '</textarea></td><td><textarea rows="1" data-ak="aksi" placeholder="Action item">' + esc(a.aksi || '') + '</textarea>' + tk + '</td>' +
        '<td class="pic">' + picSel(a.pic) + '</td><td class="tg"><input type="date" data-ak="tenggat" value="' + esc(a.tenggat || '') + '"></td><td class="x"><button type="button" data-nta="hapusAksi" title="Hapus baris" aria-label="Hapus baris">×</button></td></tr>';
    }).join('');
    return '<article class="nt-doc">' +
      '<header class="nt-hd"><img src="assets/pln.png" alt="PLN"><div><span>FORMULIR</span><span>NOTULA RAPAT INTERNAL EKSTERNAL</span><span>PT PLN (PERSERO) UPDL SEMARANG</span></div></header>' +
      '<table class="nt-mom"><colgroup><col style="width:13%"><col style="width:36%"><col style="width:17%"><col></colgroup>' +
      '<tr><td colspan="2" rowspan="3" class="t">Minutes of Meeting</td><td class="k">Date<i>:</i></td><td>' + inp('tanggal', '', 'date') + '</td></tr>' +
      '<tr><td class="k">Time<i>:</i></td><td>' + inp('waktu', '09.00 – 11.00 WIB') + '</td></tr>' +
      '<tr><td class="k">Location<i>:</i></td><td>' + inp('lokasi', 'UPDL Semarang') + '</td></tr>' +
      '<tr><td>Attendees:</td><td>' + inp('peserta', 'Sesuai Daftar Hadir') + '</td><td class="k">Note Taker<i>:</i></td><td>' + inp('noteTaker', 'Nama') + '</td></tr></table>' +
      sec('A', 'AGENDA OVERVIEW', 'agenda', 'Agenda rapat') + sec('B', 'DISCUSSION POINTS', 'diskusi', 'Poin pembahasan') + sec('C', 'ANY OTHER BUSINESS (AOB)', 'aob', 'Hal lain (bila ada)') +
      '<div class="nt-h"><span>D.</span>ACTION ITEMS</div><table class="nt-ak"><thead><tr><th class="no">No</th><th>Isu</th><th>Action Item</th><th class="pic">PIC</th><th class="tg">Due Date</th>' + (ed ? '<th class="x"></th>' : '') + '</tr></thead><tbody>' + aksi + '</tbody></table>' +
      (ed ? '<button type="button" class="btn nt-tambah" data-nta="tambahAksi">+ Tambah action item</button>' : '') +
      sec('E', 'DOCUMENTATION', 'dok', ed ? 'Foto rapat, daftar hadir, atau kartu dashboard. Tempel / seret gambar ke sini.' : '') +
      '<div class="nt-ttd"><div></div><div><span data-ntt="tanggal"' + ce + '>' + esc(ttdTanggal(d)) + '</span><span>Penanggung Jawab Rapat</span><span data-ntt="jabatan"' + ce + '>' + esc(d.ttd.jabatan || '') + '</span><span class="sp"></span><span data-ntt="nama"' + ce + '>' + esc(d.ttd.nama || '') + '</span></div></div>' +
      '<div class="nt-paraf"><span>Paraf</span><span>:</span><span></span></div>' +
      '<footer class="nt-ft">FR.SMT.019 (Ed 1, Rev 1, 05-08-2025)<br><i>Uncontrolled when printed or downloaded</i></footer></article>';
  }

  /* ---------- kerangka layar ---------- */
  function wrap() {
    var w = $('ntWrap'); if (w) return w;
    pasangCss();
    w = document.createElement('div'); w.id = 'ntWrap'; w.className = 'lb-wrap nt-wrap'; w.hidden = true; document.body.appendChild(w);
    w.addEventListener('click', klik); w.addEventListener('input', ketik); w.addEventListener('change', ganti);
    w.addEventListener('paste', tempel); w.addEventListener('drop', jatuh); w.addEventListener('dragover', function (e) { if (e.target.closest && e.target.closest('.nt-ed')) e.preventDefault(); });
    document.addEventListener('selectionchange', function () {
      var s = window.getSelection(); if (!s.rangeCount || w.hidden) return;
      var n = s.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentNode), ed = el && el.closest && el.closest('.nt-ed[contenteditable=true]');
      if (ed) { N.rng = s.getRangeAt(0).cloneRange(); N.edAkhir = ed.getAttribute('data-ntf'); }
      var tb = w.querySelector('.nt-tbop'); if (tb) tb.hidden = !(el && el.closest && el.closest('.nt-ed td, .nt-ed th'));
    });
    return w;
  }
  function buka(mode) {
    var w = wrap();
    if (w.hidden) { try { history.pushState({ updlNt: 1 }, ''); } catch (e) { /* abaikan */ } }
    w.hidden = false; document.body.classList.add('lb-buka');
    if (mode === 'baru') return bukaEditor(null);
    riwayat(); muatDaftar();
  }
  function tutup(dariPop) {
    var w = $('ntWrap'); if (!w || w.hidden) return;
    if (!dariPop && history.state && history.state.updlNt) { history.go(history.state.updlNt === 2 ? -2 : -1); return; }
    w.hidden = true; document.body.classList.remove('lb-buka'); N.mode = 'riwayat';
  }
  window.addEventListener('popstate', function () {
    var s = history.state;
    if (!s || !s.updlNt) return tutup(true);
    if (s.updlNt === 1 && N.mode === 'edit') { N.mode = 'riwayat'; riwayat(); }
  });

  /* ---------- riwayat ---------- */
  function muatDaftar() {
    return api({ aksi: 'notulenDaftar' }).then(function (r) { N.daftar = r.daftar || []; if (N.mode === 'riwayat') riwayat(); })
      .catch(function (e) { if (!N.daftar) N.daftar = []; N.galat = e.message; if (N.mode === 'riwayat') riwayat(); });
  }
  function terbuka(n) { return (n.aksi || []).filter(function (a) { var t = a.tid && tugasById(a.tid); return t && t.status !== 'Selesai' && t.status !== 'Dibatalkan'; }); }
  function riwayat() {
    var w = wrap(); N.mode = 'riwayat';
    var L = N.daftar, bulan = {};
    (L || []).forEach(function (n) { if (n.tanggal) bulan[n.tanggal.slice(0, 7)] = 1; });
    var q = N.q.toLowerCase(), cocok = (L || []).filter(function (n) {
      if (N.fj && n.jenis !== N.fj) return false;
      if (N.fb && String(n.tanggal).slice(0, 7) !== N.fb) return false;
      return !q || [n.judul, n.jenis, n.ringkasan, n.peserta, n.lokasi, (n.aksi || []).map(function (a) { return a.aksi + ' ' + a.pic; }).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    var opt = function (v, t, s) { return '<option value="' + esc(v) + '"' + (v === s ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var item = function (n) {
      var d = tgl(n.tanggal), tb = admin() ? terbuka(n) : [], lewat = tb.filter(function (a) { var t = tugasById(a.tid), dd = t && tgl(t.tenggat); return dd && dd < new Date(new Date().toDateString()); }).length;
      return '<button type="button" class="nt-item" data-nto="' + esc(n.id) + '"><span class="nt-tg"><b>' + (d ? d.getDate() : '–') + '</b><small>' + (d ? BLN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : '') + '</small></span>' +
        '<span class="nt-it"><b>' + esc(n.judul || n.jenis || 'Notulen') + '</b><small>' + esc([n.jenis, n.waktu, n.lokasi].filter(Boolean).join(' · ')) + '</small>' + (n.ringkasan ? '<small class="rk">' + esc(n.ringkasan) + '</small>' : '') + '</span>' +
        '<span class="nt-st"><em class="nt-chip ' + (n.status === 'Final' ? 'fin' : 'drf') + '">' + esc(n.status || 'Draf') + '</em>' +
        (n.aksi && n.aksi.length ? '<small class="' + (lewat ? 'bad' : tb.length ? 'warn' : '') + '">' + (admin() ? (tb.length ? tb.length + ' tindak lanjut terbuka' + (lewat ? ' · ' + lewat + ' lewat' : '') : 'Tindak lanjut selesai') : n.aksi.length + ' action item') + '</small>' : '') + '</span></button>';
    };
    w.innerHTML = '<div class="lb-bar nt-bar"><button type="button" class="btn" data-nta="tutup">← Kembali ke dashboard</button><div class="nt-judul"><b>Riwayat Notulen</b><small>' + (L ? L.length + ' notulen rapat' : 'Memuat…') + '</small></div>' +
      '<div class="lb-aksi">' + (admin() ? '<button type="button" class="btn primary" data-nta="baru">+ Buat Notulen Baru</button>' : '') + '</div></div>' +
      '<div class="lb-scroll"><div class="nt-rw">' +
      '<div class="rw-fil"><input type="search" data-ntq placeholder="Cari judul, agenda, peserta, action item…" value="' + esc(N.q) + '"><select data-ntfj>' + opt('', 'Semua jenis rapat', N.fj) + JENIS.map(function (j) { return opt(j, j, N.fj); }).join('') + '</select>' +
      '<select data-ntfb>' + opt('', 'Semua bulan', N.fb) + Object.keys(bulan).sort().reverse().map(function (b) { return opt(b, BLN[+b.slice(5) - 1] + ' ' + b.slice(0, 4), N.fb); }).join('') + '</select></div>' +
      (N.galat ? '<p class="nt-galat">Riwayat belum bisa dimuat: ' + esc(N.galat) + '</p>' : '') +
      '<div class="nt-list">' + (!L ? '<p class="nt-kosong">Memuat riwayat notulen…</p>' : cocok.length ? cocok.map(item).join('') :
        '<div class="nt-kosong"><b>' + (L.length ? 'Tidak ada notulen yang cocok.' : 'Belum ada notulen.') + '</b>' + (admin() && !L.length ? '<span>Notulen yang disimpan akan muncul di sini, lengkap dengan status tindak lanjutnya.</span><button type="button" class="btn primary" data-nta="baru">+ Buat Notulen Baru</button>' : '') + '</div>') + '</div>' +
      '</div></div>';
  }

  /* ---------- editor / tampilan baca ---------- */
  function bukaEditor(id) {
    var w = wrap(); N.mode = 'edit'; N.ubah = false; N.murni = !id;
    try { if (!history.state || history.state.updlNt !== 2) history.pushState({ updlNt: 2 }, ''); } catch (e) { /* abaikan */ }
    if (!id) {
      var dr = admin() && lsGet(drafKey(''));
      N.cur = dr && dr.d ? dr.d : baru('Rapat Internal'); N.pulih = !!(dr && dr.d); N.murni = !N.pulih;
      return editor();
    }
    w.innerHTML = '<div class="lb-bar nt-bar"><button type="button" class="btn" data-nta="kembali">← Riwayat</button><div class="nt-judul"><b>Membuka notulen…</b></div></div><div class="lb-scroll"></div>';
    api({ aksi: 'notulenBuka', id: id }).then(function (r) {
      var d = r.notulen || {}; d.html = d.html || {}; d.ttd = d.ttd || {}; d.aksi = d.aksi || [];
      var dr = admin() && lsGet(drafKey(id));
      N.pulih = !!(dr && dr.d && dr.t > (d.meta && d.meta.diubah || 0)); N.cur = N.pulih ? dr.d : d; N.cur.meta = d.meta;
      if (N.mode === 'edit') editor();
    }).catch(function (e) { A().toast('Notulen gagal dibuka: ' + e.message, 6000); history.back(); });
  }
  function editor() {
    var w = wrap(), d = N.cur, ed = admin(), m = d.meta || {};
    var info = d.id ? (d.status || 'Draf') + ' · ' + (m.diubah ? 'diubah ' + new Date(m.diubah).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + (m.oleh ? ' oleh ' + m.oleh : '') : d.id) : 'Belum disimpan';
    var tb = function (a, t, h, x) { return '<button type="button" ' + (x || 'data-ntc') + '="' + a + '" title="' + esc(t) + '" aria-label="' + esc(t) + '">' + h + '</button>'; };
    w.innerHTML = '<div class="lb-bar nt-bar"><button type="button" class="btn" data-nta="kembali">← Riwayat</button><div class="nt-judul"><b>' + esc(d.judul || (d.id ? d.jenis : 'Notulen baru')) + '</b><small data-ntinfo>' + esc(info) + '</small></div>' +
      (ed ? '<div class="seg" role="group" aria-label="Status notulen">' + ['Draf', 'Final'].map(function (s) { return '<button type="button" data-nts="' + s + '" aria-pressed="' + (d.status === s) + '">' + s + '</button>'; }).join('') + '</div>' : '') +
      '<div class="lb-aksi">' + (ed ? '<button type="button" class="btn primary" data-nta="simpan">Simpan</button>' : '') +
      '<div class="lb-unduh"><button type="button" class="btn' + (ed ? '' : ' primary') + '" data-ntu aria-expanded="false" aria-haspopup="true">Unduh ▾</button><div class="lb-menu" role="menu" hidden>' +
      '<button type="button" role="menuitem" data-nta="word"><b>Word</b><small>Format FR.SMT.019, masih bisa disunting</small></button><button type="button" role="menuitem" data-nta="pdf"><b>PDF</b><small>Siap cetak / kirim</small></button>' +
      (ed && d.id ? '<button type="button" role="menuitem" data-nta="hapus" class="nt-del"><b>Hapus notulen</b><small>Action item di Tugas Tim ikut dibatalkan</small></button>' : '') + '</div></div></div></div>' +
      (ed ? '<div class="nt-tool" role="toolbar" aria-label="Alat sunting">' +
        tb('bold', 'Tebal', '<b>B</b>') + tb('italic', 'Miring', '<i>I</i>') + tb('underline', 'Garis bawah', '<u>U</u>') + '<i class="sep"></i>' +
        tb('insertUnorderedList', 'Daftar berpoin', '• Poin') + tb('insertOrderedList', 'Daftar bernomor', '1. Nomor') + '<i class="sep"></i>' +
        tb('tabel', 'Sisipkan tabel', 'Tabel', 'data-nta') + tb('gambar', 'Sisipkan gambar', 'Gambar', 'data-nta') + tb('kartu', 'Sisipkan kartu dashboard', 'Kartu dashboard', 'data-nta') +
        '<span class="lb-unduh"><button type="button" data-nta="std" aria-haspopup="true">Teks standar ▾</button><div class="lb-menu nt-std" role="menu" hidden>' +
        [['buka', 'Pembukaan rapat'], ['arahan', 'Arahan pimpinan'], ['sepakat', 'Kesepakatan rapat'], ['tutup', 'Penutupan rapat'], ['kinerja', 'Ringkasan kinerja bulan ini', 'Diambil dari dashboard'], ['tl', 'Status tindak lanjut rapat sebelumnya', 'Dari Tugas Tim'], ['templat', 'Terapkan templat ' + d.jenis, 'Mengganti isi Agenda & Discussion']].map(function (x) { return '<button type="button" role="menuitem" data-ntx="' + x[0] + '"><b>' + esc(x[1]) + '</b>' + (x[2] ? '<small>' + esc(x[2]) + '</small>' : '') + '</button>'; }).join('') + '</div></span>' +
        '<span class="nt-tbop" hidden><i class="sep"></i>' + tb('baris', 'Tambah baris', '+ Baris', 'data-ntb') + tb('kolom', 'Tambah kolom', '+ Kolom', 'data-ntb') + tb('hbaris', 'Hapus baris', '− Baris', 'data-ntb') + tb('htabel', 'Hapus tabel', 'Hapus tabel', 'data-ntb') + '</span>' +
        '<input type="file" accept="image/*" multiple hidden data-ntfile></div>' : '') +
      '<div class="lb-scroll nt-scroll">' +
      (N.pulih ? '<div class="nt-pulih">Draf yang belum disimpan dipulihkan dari perangkat ini. <button type="button" class="btn" data-nta="buangDraf">Buang draf</button></div>' : '') +
      (ed ? '<div class="nt-meta"><label>Nama rapat<input data-ntk="judul" value="' + esc(d.judul || '') + '" placeholder="mis. Performance Dialog November 2026"></label><label>Jenis rapat<select data-ntk="jenis">' + JENIS.map(function (j) { return '<option' + (j === d.jenis ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('') + '</select></label></div>' : '') +
      docHtml(d, ed) + '</div>' +
      '<div class="nt-imgpop" hidden>' + ['33', '50', '75', '100'].map(function (p) { return '<button type="button" data-ntw="' + p + '">' + p + '%</button>'; }).join('') + '<button type="button" data-ntw="hapus" class="nt-del">Hapus</button></div>';
  }
  function tandai() {
    N.ubah = true; var i = $('ntWrap').querySelector('[data-ntinfo]'); if (i) i.textContent = 'Ada perubahan belum disimpan';
    clearTimeout(N.tDraf); N.tDraf = setTimeout(function () { lsSet(drafKey(N.cur.id), { t: Date.now(), d: N.cur }); }, 800);
  }
  function ketik(e) {
    var t = e.target, d = N.cur; if (!d || N.mode !== 'edit') { if (t.matches('[data-ntq]')) { N.q = t.value; riwayatList(); } return; }
    if (t.matches('[data-ntk]')) { d[t.getAttribute('data-ntk')] = t.value; if (t.getAttribute('data-ntk') === 'tanggal') segarTtd(); if (t.getAttribute('data-ntk') === 'judul') $('ntWrap').querySelector('.nt-judul b').textContent = t.value || 'Notulen baru'; }
    else if (t.matches('[data-ak="picPil"]')) {
      var a = d.aksi[+t.closest('tr').getAttribute('data-i')], ip = t.parentNode.querySelector('[data-ak="pic"]');
      t.parentNode.querySelector('.nt-picv').textContent = t.value === '__lain' ? 'Lainnya' : t.value || 'Pilih PIC';
      ip = t.closest('td').querySelector('[data-ak="pic"]');
      if (t.value === '__lain') { a.pic = ip.value; ip.hidden = false; ip.focus(); } else { a.pic = t.value; ip.hidden = true; ip.value = ''; }
    }
    else if (t.matches('[data-ak]')) { d.aksi[+t.closest('tr').getAttribute('data-i')][t.getAttribute('data-ak')] = t.value; }
    else if (t.closest('.nt-ed')) { var f = t.closest('.nt-ed'); d.html[f.getAttribute('data-ntf')] = f.innerHTML; if (f.getAttribute('data-ntf') !== 'dok') N.murni = false; }
    else if (t.closest('[data-ntt]')) { var s = t.closest('[data-ntt]'); d.ttd[s.getAttribute('data-ntt')] = s.textContent.trim(); }
    else return;
    tandai();
  }
  function riwayatList() { clearTimeout(N.tq); N.tq = setTimeout(function () { var a = document.activeElement, pos = a && a.selectionStart; riwayat(); var q = $('ntWrap').querySelector('[data-ntq]'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* abaikan */ } } }, 200); }
  function segarTtd() { var s = $('ntWrap').querySelector('[data-ntt="tanggal"]'); if (s && !N.cur.ttd.tanggalManual) { N.cur.ttd.tanggal = ''; s.textContent = ttdTanggal(N.cur); } }
  function ganti(e) {
    var t = e.target;
    if (t.matches('[data-ntfj]')) { N.fj = t.value; return riwayat(); }
    if (t.matches('[data-ntfb]')) { N.fb = t.value; return riwayat(); }
    if (t.matches('[data-ntfile]')) { Array.prototype.forEach.call(t.files, sisipGambar); t.value = ''; return; }
    if (t.matches('select[data-ntk="jenis"]')) {
      N.cur.jenis = t.value; tandai();
      if (N.murni) terapkanTemplat(); else A().toast('Isi sudah disunting, templat tidak diganti. Pakai Teks standar → Terapkan templat bila perlu.', 6000);
      var x = $('ntWrap').querySelector('[data-ntx="templat"] b'); if (x) x.textContent = 'Terapkan templat ' + t.value;
    }
  }
  function terapkanTemplat() {
    var t = TEMPLAT[N.cur.jenis] || TEMPLAT['Rapat Internal'], w = $('ntWrap');
    N.cur.html.agenda = t.agenda; N.cur.html.diskusi = t.diskusi; N.murni = true;
    w.querySelector('[data-ntf="agenda"]').innerHTML = t.agenda; w.querySelector('[data-ntf="diskusi"]').innerHTML = t.diskusi; tandai();
  }
  function renderAksi() { var tb = $('ntWrap').querySelector('.nt-ak tbody'), tmp = document.createElement('div'); tmp.innerHTML = docHtml(N.cur, true); tb.innerHTML = tmp.querySelector('.nt-ak tbody').innerHTML; }

  /* ---------- sisip ke editor ---------- */
  function sisip(html) {
    var w = $('ntWrap'), ed = N.rng && w.contains(N.rng.startContainer) ? null : w.querySelector('.nt-ed[data-ntf="' + N.edAkhir + '"]');
    var s = window.getSelection();
    if (ed) { ed.focus(); var r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
    else { var e2 = N.rng.startContainer; (e2.nodeType === 1 ? e2 : e2.parentNode).closest('.nt-ed').focus(); s.removeAllRanges(); s.addRange(N.rng); }
    document.execCommand('insertHTML', false, html);
    var f = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentNode).closest('.nt-ed');
    if (f) { N.cur.html[f.getAttribute('data-ntf')] = f.innerHTML; tandai(); }
  }
  function kecilkan(src, maks, q) {
    return new Promise(function (ok, gagal) {
      var im = new Image(); im.onload = function () {
        var k = Math.min(1, maks / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', q || 0.75));
      }; im.onerror = function () { gagal(new Error('gambar tidak bisa dibaca')); }; im.src = src;
    });
  }
  function sisipGambar(file) {
    if (!/^image\//.test(file.type)) return;
    var fr = new FileReader(); fr.onload = function () { kecilkan(fr.result, 1400).then(function (u) { sisip('<img src="' + u + '" alt="Gambar" style="width:100%"><p><br></p>'); }).catch(function (e) { A().toast('Gambar gagal: ' + e.message); }); };
    fr.readAsDataURL(file);
  }
  function tempel(e) {
    var ed = e.target.closest && e.target.closest('.nt-ed[contenteditable=true]'); if (!ed) return;
    var cd = e.clipboardData, f = cd && Array.prototype.filter.call(cd.files || [], function (x) { return /^image\//.test(x.type); });
    if (f && f.length) { e.preventDefault(); f.forEach(sisipGambar); return; }
    var h = cd && cd.getData('text/html');
    if (h) { e.preventDefault(); document.execCommand('insertHTML', false, bersihkan(h)); }
  }
  function jatuh(e) {
    var ed = e.target.closest && e.target.closest('.nt-ed[contenteditable=true]'); if (!ed) return;
    var f = Array.prototype.filter.call(e.dataTransfer.files || [], function (x) { return /^image\//.test(x.type); }); if (!f.length) return;
    e.preventDefault();
    if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) N.rng = r; }
    f.forEach(sisipGambar);
  }
  /* tempelan dari Word/web: buang gaya, sisakan struktur dasar */
  function bersihkan(h) {
    var t = document.createElement('div'); t.innerHTML = h.replace(/<!--[\s\S]*?-->/g, '');
    var OK = { P: 1, BR: 1, B: 1, STRONG: 1, I: 1, EM: 1, U: 1, UL: 1, OL: 1, LI: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, IMG: 1 };
    (function jalan(el) {
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType !== 1) return; jalan(n);
        if (/^(SCRIPT|STYLE|META|LINK|TITLE|XML)$/.test(n.tagName)) return n.remove();
        if (!OK[n.tagName]) { if (/^(DIV|H\d)$/.test(n.tagName)) { var p = document.createElement('p'); while (n.firstChild) p.appendChild(n.firstChild); n.replaceWith(p); } else n.replaceWith.apply(n, Array.prototype.slice.call(n.childNodes)); return; }
        var src = n.tagName === 'IMG' && n.getAttribute('src'); Array.prototype.slice.call(n.attributes).forEach(function (a) { n.removeAttribute(a.name); });
        if (n.tagName === 'TABLE') n.className = 'nt-tbl';
        if (n.tagName === 'IMG') { if (/^data:image\//.test(src || '')) n.setAttribute('src', src); else n.remove(); }
      });
    })(t);
    return t.innerHTML;
  }
  function tabel() { var c = function (t, n) { var s = ''; for (var i = 0; i < n; i++) s += '<' + t + '>' + (t === 'th' ? 'Kolom ' + (i + 1) : '<br>') + '</' + t + '>'; return s; }; sisip('<table class="nt-tbl"><thead><tr>' + c('th', 3) + '</tr></thead><tbody><tr>' + c('td', 3) + '</tr><tr>' + c('td', 3) + '</tr></tbody></table><p><br></p>'); }
  function opTabel(op) {
    var s = window.getSelection(), n = s.anchorNode, sel = n && (n.nodeType === 1 ? n : n.parentNode).closest('td,th'); if (!sel) return;
    var tr = sel.parentNode, tbl = tr.closest('table'), idx = Array.prototype.indexOf.call(tr.children, sel), ed = tbl.closest('.nt-ed');
    if (op === 'baris') { var b = document.createElement('tr'); for (var i = 0; i < tr.children.length; i++) { var td = document.createElement('td'); td.innerHTML = '<br>'; b.appendChild(td); } (sel.tagName === 'TH' ? tbl.tBodies[0] || tbl : tr.parentNode).insertBefore(b, sel.tagName === 'TH' ? (tbl.tBodies[0] || tbl).firstChild : tr.nextSibling); }
    if (op === 'kolom') Array.prototype.forEach.call(tbl.rows, function (r) { var x = document.createElement(r.parentNode.tagName === 'THEAD' ? 'th' : 'td'); x.innerHTML = r.parentNode.tagName === 'THEAD' ? 'Kolom' : '<br>'; r.insertBefore(x, r.children[idx + 1] || null); });
    if (op === 'hbaris' && tbl.rows.length > 1) tr.remove();
    if (op === 'htabel') tbl.remove();
    N.cur.html[ed.getAttribute('data-ntf')] = ed.innerHTML; tandai();
  }
  function teksStd(x) {
    var d = N.cur, S = A().S;
    if (x === 'templat') return terapkanTemplat();
    if (x === 'buka') return sisip('<p>Rapat dibuka oleh ' + esc(d.ttd.jabatan ? d.ttd.jabatan.charAt(0) + d.ttd.jabatan.slice(1).toLowerCase() : 'pimpinan rapat') + ' pukul ' + esc((d.waktu || '…').split(/[–-]/)[0].trim() || '…') + ' dan dihadiri peserta sesuai daftar hadir.</p>');
    if (x === 'tutup') return sisip('<p>Rapat ditutup pukul … WIB.</p>');
    if (x === 'arahan') return sisip('<p><b>Arahan pimpinan:</b></p><ol><li><br></li></ol>');
    if (x === 'sepakat') return sisip('<p><b>Kesepakatan rapat:</b></p><ol><li><br></li></ol>');
    if (x === 'kinerja') {
      try {
        var a = A(), bl = a.namaBulan(S.bulan) + ' ' + ((S.data && S.data.meta && S.data.meta.tahun) || new Date().getFullYear()), Bn = a.B(), tot = a.konmanAda(Bn) ? a.totalSkor(Bn) : null;
        var p = (a.perhatian() || []).map(function (z) { return teks(z.t); }).filter(Boolean).slice(0, 6);
        return sisip('<p><b>Capaian kinerja ' + esc(bl) + '</b> (dari dashboard):</p><ul><li>Total skor Kontrak Manajemen: <b>' + (tot === null ? 'belum terisi' : D.fmt ? D.fmt(tot, 2) : tot.toFixed(2)) + '</b> (target 100)</li>' + p.map(function (z) { return '<li>' + esc(z) + '</li>'; }).join('') + '</ul>');
      } catch (e) { return A().toast('Data kinerja belum siap.'); }
    }
    if (x === 'tl') {
      var R = tugasRows().filter(function (r) { return r.jenis === 'Tindak Lanjut Rapat' && r.status !== 'Dibatalkan' && (!d.id || r.catatan.indexOf('Notulen ' + d.id) !== 0); })
        .filter(function (r) { return r.status !== 'Selesai' || (Date.now() - new Date(r.diubah || 0)) < 45 * 864e5; }).slice(0, 25);
      if (!R.length) return A().toast('Tidak ada tindak lanjut rapat sebelumnya yang terbuka.');
      return sisip('<p><b>Status tindak lanjut rapat sebelumnya:</b></p><table class="nt-tbl"><thead><tr><th>No</th><th>Tindak lanjut</th><th>PIC</th><th>Due Date</th><th>Status</th></tr></thead><tbody>' +
        R.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.uraian.replace(/ \(rapat: .*\)$/, '')) + '</td><td>' + esc(r.pic) + '</td><td>' + esc(tglPendek(r.tenggat)) + '</td><td>' + esc(r.status) + '</td></tr>'; }).join('') + '</tbody></table><p><br></p>');
    }
  }

  /* ---------- kartu dashboard → gambar ---------- */
  var VT = { ringkasan: 'Ringkasan', kinerja: 'Kinerja Unit', maturity: 'Maturity Level', pembelajaran: 'Rekap Pembelajaran', evaluasi: 'Evaluasi', perbaikan: 'Perbaikan Berkelanjutan', sdm: 'SDM & Inovasi', risiko: 'Risiko & Mutu' };
  function daftarKartu() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('main .panel'), function (p, i) {
      var h = p.querySelector('h2'), sec = p.closest('[data-bagian]'), rgk = p.closest('#rgk'); if (!h || !teks(h.innerHTML)) return;
      if (!sec && !rgk) return;
      var bag = sec ? sec.getAttribute('data-bagian') : null, tab = rgk ? 'ringkasan' : null;
      if (!tab) tab = tabDari(bag);
      if (!p.id) p.id = 'ntk' + i;
      out.push({ id: p.id, judul: teks(h.innerHTML), bag: bag, tab: tab || 'semua' });
    });
    return out;
  }
  function tabDari(bag) {
    var M = { kinerja: ['bulanan', 'banding', 'indikator'], maturity: ['maturity'], pembelajaran: ['ringkasan', 'pemb-grafik', 'rendik-kat', 'rendik-kal', 'rendik-biaya', 'rendik-mutu'], evaluasi: ['evaluasi', 'eval-grafik'], perbaikan: ['perbaikan', 'audit'], sdm: ['pengembangan'], risiko: ['isu', 'risiko', 'kri', 'fraud'] };
    for (var k in M) if (M[k].indexOf(bag) >= 0) return k; return null;
  }
  function pilihKartu() {
    var L = daftarKartu(), g = {};
    L.forEach(function (k) { (g[k.tab] = g[k.tab] || []).push(k); });
    var pop = document.createElement('div'); pop.className = 'nt-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Pilih kartu dashboard');
    pop.innerHTML = '<div class="nt-popk"><div class="nt-poph"><b>Sisipkan kartu dashboard</b><small>Kartu disisipkan sebagai gambar sesuai bulan yang sedang dipilih (' + esc(A().namaBulan(A().S.bulan)) + ').</small><button type="button" class="btn" data-ntp="tutup" aria-label="Tutup">✕</button></div><div class="nt-popl">' +
      Object.keys(VT).filter(function (t) { return g[t]; }).map(function (t) { return '<div class="nt-popg"><b>' + esc(VT[t]) + '</b>' + g[t].map(function (k) { return '<button type="button" data-ntp="' + esc(k.id) + '" data-tab="' + k.tab + '">' + esc(k.judul) + '</button>'; }).join('') + '</div>'; }).join('') + '</div></div>';
    $('ntWrap').appendChild(pop);
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ntp]'); if (!b && e.target !== pop) return;
      pop.remove(); if (!b || b.getAttribute('data-ntp') === 'tutup') return;
      var k = L.filter(function (x) { return x.id === b.getAttribute('data-ntp'); })[0]; if (k) potret(k);
    });
  }
  function muatH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = 'assets/vendor/html2canvas-1.4.1.min.js'; s.onload = function () { ok(window.html2canvas); }; s.onerror = function () { gagal(new Error('pustaka gambar tidak termuat')); }; document.head.appendChild(s); });
  }
  /* html2canvas belum paham color-mix()/color()/oklab: ubah semua warna hasil hitung jadi rgba lewat kanvas 1×1 */
  var kv = null, cacheW = {};
  function rgba(v) {
    if (cacheW[v]) return cacheW[v];
    if (!kv) { kv = document.createElement('canvas'); kv.width = kv.height = 1; kv = kv.getContext('2d', { willReadFrequently: true }); }
    kv.clearRect(0, 0, 1, 1); kv.fillStyle = '#000'; kv.fillStyle = v; kv.fillRect(0, 0, 1, 1);
    var p = kv.getImageData(0, 0, 1, 1).data; return (cacheW[v] = 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + (p[3] / 255).toFixed(3) + ')');
  }
  var ANEH = /color\(|color-mix|oklab|oklch|\blab\(|\blch\(/;
  function normalWarna(asli, klon) {
    var PROP = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke', 'stop-color', 'text-decoration-color', 'caret-color', 'column-rule-color'];
    var A1 = [asli].concat(Array.prototype.slice.call(asli.querySelectorAll('*'))), K1 = [klon].concat(Array.prototype.slice.call(klon.querySelectorAll('*')));
    A1.forEach(function (a, i) {
      var k = K1[i]; if (!k || !k.style) return; var cs = getComputedStyle(a);
      PROP.forEach(function (p) { var v = cs.getPropertyValue(p); if (v && ANEH.test(v)) k.style.setProperty(p, rgba(v), 'important'); else if (v && (p === 'fill' || p === 'stroke' || p === 'color' || p === 'background-color')) k.style.setProperty(p, v, 'important'); });
      ['background-image', 'box-shadow', 'text-shadow'].forEach(function (p) { var v = cs.getPropertyValue(p); if (v && ANEH.test(v)) k.style.setProperty(p, 'none', 'important'); });
      k.style.setProperty('animation', 'none', 'important'); k.style.setProperty('transition', 'none', 'important');
      if (cs.backdropFilter && cs.backdropFilter !== 'none') k.style.setProperty('backdrop-filter', 'none', 'important');
    });
  }
  function potret(k) {
    var a = A(), vt0 = a.S.vt, html = document.documentElement, tema0 = html.getAttribute('data-theme');
    A().toast('Menyiapkan gambar kartu…', 8000);
    if (vt0 !== 'semua' && k.tab !== vt0) a.pilihTab(k.tab);
    html.setAttribute('data-theme', 'light');
    var p = $(k.id), periode = a.namaBulan(a.S.bulan) + ' ' + ((a.S.data && a.S.data.meta && a.S.data.meta.tahun) || new Date().getFullYear());
    var pulih = function () { if (tema0) html.setAttribute('data-theme', tema0); else html.removeAttribute('data-theme'); if (a.S.vt !== vt0) a.pilihTab(vt0); };
    muatH2C().then(function (h2c) {
      return new Promise(function (r) { setTimeout(r, 450); }).then(function () {
        var sec = p.closest('[data-bagian]') || p; sec.classList.remove('anim-tunggu');
        try { (sec.getAnimations ? sec.getAnimations({ subtree: true }) : []).forEach(function (x) { try { x.finish(); } catch (e) { x.cancel(); } }); } catch (e) { /* abaikan */ }
        return h2c(p, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, onclone: function (doc, el) { normalWarna(p, el); } });
      });
    }).then(function (cv) {
      pulih();
      return kecilkan(cv.toDataURL('image/png'), 1600, 0.88);
    }).then(function (u) {
      $('toast').hidden = true;
      sisip('<figure class="nt-kartu" contenteditable="false"><img src="' + u + '" alt="' + esc(k.judul) + '" style="width:100%"><figcaption>' + esc(k.judul) + ' · ' + esc(periode) + '</figcaption></figure><p><br></p>');
    }).catch(function (e) { pulih(); A().toast('Kartu gagal dijadikan gambar: ' + e.message, 7000); });
  }

  /* ---------- simpan / hapus ---------- */
  function ringkas(d) { return teks(d.html.diskusi).slice(0, 300) || teks(d.html.agenda).slice(0, 300); }
  function simpan(b) {
    if (N.sibuk) return; var d = N.cur;
    if (!d.tanggal) return A().toast('Tanggal rapat wajib diisi.');
    if (!String(d.judul || '').trim()) { var j = $('ntWrap').querySelector('[data-ntk="judul"]'); if (j) j.focus(); return A().toast('Isi nama rapat dulu agar mudah dicari di riwayat.'); }
    N.sibuk = true; b.disabled = true; b.textContent = 'Menyimpan…';
    var kirim = JSON.parse(JSON.stringify(d)); delete kirim.meta; kirim.ringkasan = ringkas(d);
    kirim.aksi = (kirim.aksi || []).filter(function (a) { return String(a.aksi || a.isu || '').trim(); });
    api({ aksi: 'notulenSimpan', data: kirim }).then(function (r) {
      var lamaId = d.id; d.id = r.id; d.aksi = r.aksi && r.aksi.length ? r.aksi : d.aksi.filter(function (a) { return String(a.aksi || a.isu || '').trim(); });
      if (!d.aksi.length) d.aksi = [{ isu: '', aksi: '', pic: '', tenggat: '' }];
      d.meta = { diubah: Date.now(), oleh: user() };
      if (r.daftar) N.daftar = r.daftar;
      if (r.tugasLain && A().S.data) { A().S.data.tugasLain = r.tugasLain; try { A().renderTugas(); } catch (e) { /* abaikan */ } }
      lsSet(drafKey(lamaId), null); lsSet(drafKey(d.id), null); N.ubah = false; N.pulih = false;
      var nA = d.aksi.filter(function (a) { return a.tid; }).length;
      editor(); A().toast('Notulen tersimpan' + (nA ? ' · ' + nA + ' action item tercatat di Tugas Tim' : '') + '.', 5000);
    }).catch(function (e) { A().toast('Gagal menyimpan: ' + e.message, 7000); b.disabled = false; b.textContent = 'Simpan'; })
      .then(function () { N.sibuk = false; });
  }
  function hapus() {
    var d = N.cur; if (!d.id || !window.confirm('Hapus notulen "' + (d.judul || d.id) + '"? Action item terkait di Tugas Tim ditandai Dibatalkan.')) return;
    api({ aksi: 'notulenHapus', id: d.id }).then(function (r) {
      N.daftar = r.daftar || []; if (r.tugasLain && A().S.data) A().S.data.tugasLain = r.tugasLain; lsSet(drafKey(d.id), null); N.ubah = false;
      A().toast('Notulen dihapus.'); history.back();
    }).catch(function (e) { A().toast('Gagal menghapus: ' + e.message, 7000); });
  }

  /* ---------- klik ---------- */
  function klik(e) {
    var t = e.target, w = $('ntWrap');
    var u = t.closest('[data-ntu],[data-nta="std"]'), menu = u && u.parentNode.querySelector('.lb-menu');
    Array.prototype.forEach.call(w.querySelectorAll('.lb-menu'), function (m) { if (m !== menu && !m.contains(t)) m.hidden = true; });
    if (u) { menu.hidden = !menu.hidden; u.setAttribute('aria-expanded', !menu.hidden); return; }
    if (t.closest('.lb-menu [data-nta], .lb-menu [data-ntx]')) t.closest('.lb-menu').hidden = true;
    var pop = w.querySelector('.nt-imgpop');
    var img = t.closest('.nt-ed[contenteditable=true] img');
    if (img && pop) { N.img = img; var r = img.getBoundingClientRect(); pop.style.top = Math.max(8, r.top + 8) + 'px'; pop.style.left = Math.max(8, r.left + 8) + 'px'; pop.hidden = false; return; }
    var wd = t.closest('[data-ntw]');
    if (wd && N.img) { var x = wd.getAttribute('data-ntw'), ed = N.img.closest('.nt-ed'); if (x === 'hapus') (N.img.closest('figure') || N.img).remove(); else N.img.style.width = x + '%'; N.cur.html[ed.getAttribute('data-ntf')] = ed.innerHTML; tandai(); pop.hidden = true; return; }
    if (pop) pop.hidden = true;
    var c = t.closest('[data-ntc]'); if (c) { e.preventDefault(); if (N.rng) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(N.rng); } document.execCommand(c.getAttribute('data-ntc')); var f = document.activeElement && document.activeElement.closest && document.activeElement.closest('.nt-ed'); if (f) { N.cur.html[f.getAttribute('data-ntf')] = f.innerHTML; tandai(); } return; }
    var tb = t.closest('[data-ntb]'); if (tb) return opTabel(tb.getAttribute('data-ntb'));
    var sx = t.closest('[data-ntx]'); if (sx) return teksStd(sx.getAttribute('data-ntx'));
    var st = t.closest('[data-nts]'); if (st) { N.cur.status = st.getAttribute('data-nts'); Array.prototype.forEach.call(w.querySelectorAll('[data-nts]'), function (b) { b.setAttribute('aria-pressed', b === st); }); return tandai(); }
    var o = t.closest('[data-nto]'); if (o) return bukaEditor(o.getAttribute('data-nto'));
    var b = t.closest('[data-nta]'); if (!b) return;
    var a = b.getAttribute('data-nta');
    if (a === 'tutup') tutup();
    if (a === 'kembali') { if (N.ubah) A().toast('Perubahan disimpan sebagai draf di perangkat ini.'); history.back(); }
    if (a === 'baru') bukaEditor(null);
    if (a === 'simpan') simpan(b);
    if (a === 'hapus') hapus();
    if (a === 'buangDraf') { lsSet(drafKey(N.cur.id), null); N.pulih = false; if (N.cur.id) bukaEditor(N.cur.id); else { N.cur = baru('Rapat Internal'); N.murni = true; editor(); } }
    if (a === 'tambahAksi') { N.cur.aksi.push({ isu: '', aksi: '', pic: '', tenggat: '' }); renderAksi(); tandai(); var ta = w.querySelectorAll('.nt-ak textarea[data-ak="isu"]'); if (ta.length) ta[ta.length - 1].focus(); }
    if (a === 'hapusAksi') { N.cur.aksi.splice(+b.closest('tr').getAttribute('data-i'), 1); renderAksi(); tandai(); }
    if (a === 'tabel') tabel();
    if (a === 'gambar') w.querySelector('[data-ntfile]').click();
    if (a === 'kartu') pilihKartu();
    if (a === 'word') { b.disabled = true; unduhWord().catch(function (er) { A().toast('Word gagal dibuat: ' + er.message, 7000); }).then(function () { b.disabled = false; }); }
    if (a === 'pdf') cetakPdf();
  }

  /* ---------- unduh ---------- */
  function namaFile(ext) { var d = N.cur; return ('Notulen ' + (d.tanggal || '') + ' ' + (d.judul || d.jenis || '')).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.' + ext; }
  function cetakPdf() {
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    var d = f.contentWindow.document, isi = docHtml(N.cur, false).replace('src="assets/pln.png"', 'src="' + new URL('assets/pln.png', location.href).href + '"');
    d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(namaFile('pdf').replace(/\.pdf$/, '')) + '</title><style>' + CSS_DOK +
      '@page{size:A4;margin:16mm 24.9mm 18mm}body{margin:0}.nt-doc{box-shadow:none;max-width:none;padding:0;border-radius:0}.nt-ft{position:fixed;bottom:0;left:0;margin:0}.nt-ak tr,.nt-tbl tr,.nt-kartu,img{break-inside:avoid}.nt-ttd{break-inside:avoid}' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' + isi + '</body></html>'); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { A().toast('Dialog cetak tidak bisa dibuka: ' + e.message); } setTimeout(function () { f.remove(); }, 60000); }, 600);
    A().toast('Pilih "Simpan sebagai PDF" di dialog cetak, ukuran kertas A4.', 6000);
  }
  function muatZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = 'assets/vendor/jszip-3.10.1.min.js'; s.onload = function () { ok(window.JSZip); }; s.onerror = function () { gagal(new Error('pustaka Word tidak termuat')); }; document.head.appendChild(s); });
  }
  var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var NS = 'xmlns:w="' + W + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  function x(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var RPR = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>';
  function run(t, f) {
    f = f || {}; var pr = '<w:rPr>' + RPR + (f.b ? '<w:b/><w:bCs/>' : f.nb ? '<w:b w:val="0"/><w:bCs w:val="0"/>' : '') + (f.i ? '<w:i/><w:iCs/>' : '') + (f.u ? '<w:u w:val="single"/>' : '') + (f.c ? '<w:color w:val="' + f.c + '"/>' : '') + (f.sz ? '<w:sz w:val="' + f.sz + '"/><w:szCs w:val="' + f.sz + '"/>' : '') + '</w:rPr>';
    return String(t).split('\n').map(function (s, i) { return (i ? '<w:r>' + pr + '<w:br/></w:r>' : '') + (s ? '<w:r>' + pr + '<w:t xml:space="preserve">' + x(s) + '</w:t></w:r>' : ''); }).join('');
  }
  /* HTML editor → paragraf/tabel/gambar OOXML */
  function keOoxml(html, ctx) {
    var root = document.createElement('div'); root.innerHTML = html || ''; var out = [];
    var SP = '<w:spacing w:after="120" w:line="276" w:lineRule="auto"/>';
    function runs(node, f) {
      var s = '';
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) { var v = n.nodeValue.replace(/\s+/g, ' '); if (v.trim() || v === ' ') s += run(v, f); return; }
        if (n.nodeType !== 1) return; var tg = n.tagName;
        if (tg === 'BR') { if (n.nextSibling) s += '<w:r><w:br/></w:r>'; return; }
        if (tg === 'IMG') { s += gambarRun(n, ctx); return; }
        if (/^(UL|OL|TABLE|FIGURE)$/.test(tg)) return;
        var g = Object.assign({}, f); if (tg === 'B' || tg === 'STRONG') g.b = 1; if (tg === 'I' || tg === 'EM') g.i = 1; if (tg === 'U') g.u = 1;
        s += runs(n, g);
      });
      return s;
    }
    function para(inner, ind, jc, numXml) { return '<w:p><w:pPr><w:pStyle w:val="32"/>' + (numXml || '') + SP + '<w:ind w:left="' + ind + '"' + (numXml ? ' w:hanging="360"' : '') + '/><w:jc w:val="' + (jc || 'both') + '"/></w:pPr>' + inner + '</w:p>'; }
    function daftar(el, lvl) {
      var num = el.tagName === 'OL' ? ctx.numBaru() : 2;
      Array.prototype.forEach.call(el.children, function (li) {
        if (li.tagName !== 'LI') return;
        var r = runs(li, {}); if (r || !li.querySelector('ul,ol')) out.push(para(r, 720 + lvl * 360, 'both', '<w:numPr><w:ilvl w:val="' + (el.tagName === 'OL' ? lvl : Math.min(lvl, 1)) + '"/><w:numId w:val="' + num + '"/></w:numPr>'));
        Array.prototype.forEach.call(li.children, function (c) { if (c.tagName === 'UL' || c.tagName === 'OL') daftar(c, lvl + 1); else if (/^(TABLE|FIGURE)$/.test(c.tagName)) blok(c); });
      });
    }
    function tabelX(t) {
      var rows = Array.prototype.slice.call(t.rows), nk = Math.max.apply(null, rows.map(function (r) { return r.cells.length; }).concat([1])), lebar = Math.floor(9300 / nk);
      var B = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="45B0E1"/>'; }).join('') + '</w:tblBorders>';
      var s = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblInd w:w="360" w:type="dxa"/>' + B + '<w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>';
      for (var i = 0; i < nk; i++) s += '<w:gridCol w:w="' + lebar + '"/>';
      s += '</w:tblGrid>';
      rows.forEach(function (r, ri) {
        var kep = r.parentNode.tagName === 'THEAD' || Array.prototype.every.call(r.cells, function (c) { return c.tagName === 'TH'; });
        s += '<w:tr>' + (kep ? '<w:trPr><w:tblHeader/></w:trPr>' : '');
        Array.prototype.forEach.call(r.cells, function (c, ci) {
          var span = ci === r.cells.length - 1 ? nk - r.cells.length + 1 : 1;
          s += '<w:tc><w:tcPr><w:tcW w:w="' + lebar * span + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') + (kep ? '<w:shd w:val="clear" w:color="auto" w:fill="156082"/>' : ri % 2 ? '' : '<w:shd w:val="clear" w:color="auto" w:fill="EAF6FC"/>') + '</w:tcPr>' +
            '<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>' + runs(c, kep ? { b: 1, c: 'FFFFFF' } : {}) + '</w:p></w:tc>';
        });
        s += '</w:tr>';
      });
      out.push(s + '</w:tbl>'); out.push('<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>');
    }
    function blok(n) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(para(run(n.nodeValue.trim()), 360)); return; }
      if (n.nodeType !== 1) return; var tg = n.tagName;
      if (tg === 'UL' || tg === 'OL') return daftar(n, 0);
      if (tg === 'TABLE') return tabelX(n);
      if (tg === 'FIGURE') { var im = n.querySelector('img'), cap = n.querySelector('figcaption'); if (im) out.push(para(gambarRun(im, ctx), 360, 'center')); if (cap) out.push(para(run(cap.textContent, { i: 1, sz: 18, c: '555555' }), 360, 'center')); return; }
      if (tg === 'IMG') { out.push(para(gambarRun(n, ctx), 360, 'center')); return; }
      if (tg === 'DIV' && n.querySelector('p,ul,ol,table,figure,div')) { Array.prototype.forEach.call(n.childNodes, blok); return; }
      var r = runs(n, /^H\d$/.test(tg) ? { b: 1 } : {}); if (r) out.push(para(r, 360));
    }
    var inl = null;
    Array.prototype.forEach.call(root.childNodes, function (n) {
      var isInline = n.nodeType === 3 || (n.nodeType === 1 && /^(B|STRONG|I|EM|U|SPAN|BR|A)$/.test(n.tagName));
      if (isInline) { inl = inl || document.createElement('p'); inl.appendChild(n.cloneNode(true)); return; }
      if (inl) { blok(inl); inl = null; } blok(n);
    });
    if (inl) blok(inl);
    return out;
  }
  function gambarRun(img, ctx) {
    var m = String(img.getAttribute('src') || '').match(/^data:image\/(png|jpe?g|gif);base64,(.+)$/); if (!m) return '';
    var ext = m[1] === 'png' ? 'png' : m[1] === 'gif' ? 'gif' : 'jpeg', n = ++ctx.nImg, rid = 'rIdNt' + n, nama = 'nt' + n + '.' + ext;
    ctx.zip.file('word/media/' + nama, m[2], { base64: true }); ctx.rels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + nama + '"/>');
    var uk = ctx.ukuran[img.getAttribute('src').length + ':' + img.getAttribute('src').slice(-40)] || { w: 4, h: 3 }, pr = parseFloat(img.style.width) || 100;
    var maxW = 5486400 * Math.min(100, pr) / 100, cx = Math.round(maxW), cy = Math.round(cx * uk.h / uk.w);
    if (cy > 7200000) { cy = 7200000; cx = Math.round(cy * uk.w / uk.h); }
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + (5000 + n) + '" name="Gambar ' + n + '"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="' + n + '" name="' + nama + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function ukurGambar(d) {
    var src = []; ['agenda', 'diskusi', 'aob', 'dok'].forEach(function (f) { (String(d.html[f] || '').match(/src="data:image[^"]+"/g) || []).forEach(function (s) { src.push(s.slice(5, -1)); }); });
    var out = {};
    return Promise.all(src.map(function (s) { return new Promise(function (ok) { var im = new Image(); im.onload = function () { out[s.length + ':' + s.slice(-40)] = { w: im.naturalWidth, h: im.naturalHeight }; ok(); }; im.onerror = ok; im.src = s; }); })).then(function () { return out; });
  }
  function unduhWord() {
    var d = N.cur;
    return Promise.all([muatZip(), fetch('assets/notulen/FR.SMT.019.docx').then(function (r) { if (!r.ok) throw new Error('templat tidak ditemukan'); return r.arrayBuffer(); }), ukurGambar(d)]).then(function (v) {
      var JSZip = v[0], ukuran = v[2];
      return JSZip.loadAsync(v[1]).then(function (zip) {
        return Promise.all([zip.file('word/document.xml').async('string'), zip.file('word/_rels/document.xml.rels').async('string'), zip.file('word/numbering.xml').async('string')]).then(function (f) {
          var doc = new DOMParser().parseFromString(f[0], 'application/xml'), body = doc.getElementsByTagNameNS(W, 'body')[0];
          var E = Array.prototype.filter.call(body.childNodes, function (n) { return n.nodeType === 1; });
          var ctx = { zip: zip, rels: [], nImg: 0, ukuran: ukuran, nNum: 0, numBaru: function () { return 900 + (++ctx.nNum); } };
          var impor = function (xml) { var t = new DOMParser().parseFromString('<w:x ' + NS + '>' + xml + '</w:x>', 'application/xml'); return Array.prototype.slice.call(t.documentElement.childNodes).map(function (n) { return doc.importNode(n, true); }); };
          var ganti = function (el, xml) { impor(xml).forEach(function (n) { body.insertBefore(n, el); }); el.parentNode.removeChild(el); };
          var setSel = function (tc, s, f) {
            var p = tc.getElementsByTagNameNS(W, 'p')[0], rs = Array.prototype.slice.call(p.getElementsByTagNameNS(W, 'r')); rs.forEach(function (r) { r.parentNode.removeChild(r); });
            impor(run(s, f)).forEach(function (n) { p.appendChild(n); });
          };
          var sel = function (tbl, r, c) { var tr = tbl.getElementsByTagNameNS(W, 'tr')[r]; return Array.prototype.filter.call(tr.childNodes, function (n) { return n.localName === 'tc'; })[c]; };
          // tabel Minutes of Meeting
          setSel(sel(E[0], 0, 2), hariTgl(d.tanggal)); setSel(sel(E[0], 1, 2), d.waktu || ''); setSel(sel(E[0], 2, 2), d.lokasi || '');
          setSel(sel(E[0], 3, 1), d.peserta || ''); setSel(sel(E[0], 3, 3), d.noteTaker || '');
          // A, B, C, E
          var isi = function (f) { var o = teks(d.html[f]) || /<(img|table)/i.test(d.html[f] || '') ? keOoxml(d.html[f], ctx) : []; return o.length ? o.join('') : '<w:p><w:pPr><w:ind w:left="360"/></w:pPr>' + run('-') + '</w:p>'; };
          var xA = isi('agenda'), xB = isi('diskusi'), xC = isi('aob'), xE = String(d.html.dok || '').replace(/<br>|\s|&nbsp;/g, '') ? isi('dok') : '';
          ganti(E[2], xA); ganti(E[4], xB); ganti(E[7], xC);
          var pE = E[12].getElementsByTagNameNS(W, 'pPr')[0]; if (pE) { var kn = doc.createElementNS(W, 'w:keepNext'); var ps = pE.getElementsByTagNameNS(W, 'pStyle')[0]; pE.insertBefore(kn, ps ? ps.nextSibling : pE.firstChild); }
          if (xE) impor(xE).forEach(function (n) { body.insertBefore(n, E[13]); });
          // D. action items: baris 1 (berwarna) & 2 (putih) jadi pola, sisanya dibuang
          var trs = Array.prototype.slice.call(E[10].getElementsByTagNameNS(W, 'tr')), pola = [trs[1], trs[2]];
          trs.slice(1).forEach(function (r) { r.parentNode.removeChild(r); });
          var aksi = (d.aksi || []).filter(function (a) { return String(a.aksi || a.isu || '').trim(); }); if (!aksi.length) aksi = [{}];
          aksi.forEach(function (a, i) {
            var r = pola[i % 2].cloneNode(true); E[10].appendChild(r);
            var tcs = Array.prototype.filter.call(r.childNodes, function (n) { return n.localName === 'tc'; });
            [String(i + 1), a.isu || '', a.aksi || '', a.pic || '', tglPendek(a.tenggat)].forEach(function (s, k) { setSel(tcs[k], s, { nb: 1 }); if (k === 1 || k === 2) { var jc = tcs[k].getElementsByTagNameNS(W, 'jc')[0]; if (jc) jc.setAttributeNS(W, 'w:val', 'left'); } });
          });
          // tanda tangan
          var ts = Array.prototype.slice.call(E[13].getElementsByTagNameNS(W, 't'));
          ts.forEach(function (t) {
            var v = t.textContent;
            if (v === 'XXX') t.textContent = ttdTanggal(d); else if (/^(, |XX |XXX |2026)$/.test(v)) t.textContent = '';
            else if (v === 'MANAGER') t.textContent = d.ttd.jabatan || ''; else if (v === 'SUNANDAR USMAN') t.textContent = d.ttd.nama || '';
          });
          var xml = new XMLSerializer().serializeToString(doc);
          var rels = f[1].replace('</Relationships>', ctx.rels.join('') + '</Relationships>');
          var num = f[2];
          if (ctx.nNum) {
            var lv = ''; for (var l = 0; l < 3; l++) lv += '<w:lvl w:ilvl="' + l + '"><w:start w:val="1"/><w:numFmt w:val="' + ['decimal', 'lowerLetter', 'lowerRoman'][l] + '"/><w:lvlText w:val="%' + (l + 1) + '."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + (720 + l * 360) + '" w:hanging="360"/></w:pPr></w:lvl>';
            var abs = '<w:abstractNum w:abstractNumId="90"><w:multiLevelType w:val="hybridMultilevel"/>' + lv + '</w:abstractNum>', nums = '';
            for (var k = 1; k <= ctx.nNum; k++) nums += '<w:num w:numId="' + (900 + k) + '"><w:abstractNumId w:val="90"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>';
            num = num.replace(/<w:num [^>]*w:numId=/, function (m0) { return abs + m0; }).replace('</w:numbering>', nums + '</w:numbering>');
          }
          zip.file('word/document.xml', xml); zip.file('word/_rels/document.xml.rels', rels); zip.file('word/numbering.xml', num);
          return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        });
      });
    }).then(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = namaFile('docx'); document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    });
  }

  /* ---------- pintu masuk: sidebar & menu ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-nt]'); if (!b || b.closest('#ntWrap')) return;
    var m = b.getAttribute('data-nt');
    if (m === 'baru' && !admin()) return A().toast('Membuat notulen hanya untuk akun Admin.');
    buka(m);
  });
  window.DashNotulen = { buka: buka, _N: N, _word: function () { return unduhWord; } };
})();
