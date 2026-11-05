/* Input data lewat website: login (1 akun bersama) -> pilih jenis data -> isi -> periksa -> simpan ke Google Sheets */
(function () {
  var D = window.Dash, A = function () { return window.DashApp; }, $ = function (id) { return document.getElementById(id); }, esc = D.esc;
  var TOKEN_KEY = 'dash-input-token';
  var BLN = D.BULAN.map(D.cap);
  var STATUS_TL = ['Belum Dimulai', 'Berjalan', 'Selesai'];

  /* ---------- definisi formulir (kolom = judul kolom di tab spreadsheet) ---------- */
  // field: [nama kolom, jenis, wajib, petunjuk, min, max]
  var F = {
    pegawai: { grp: 'Rutin bulanan', nama: 'Jumlah Pegawai', tab: 'Jumlah Pegawai', cara: 'Mengisi baris Tahun + Bulan yang dipilih. Kalau sudah ada isinya, angka lama diganti.',
      fields: [['Tahun', 'tahun', 1], ['Bulan', 'bulan', 1], ['Jumlah Pegawai', 'int', 1, 'Angka saja tanpa titik. Contoh: 49376', 1], ['Keterangan', 'teks', 0, 'Opsional. Contoh: sumber data SDM']],
      tips: ['Diisi sekali setiap awal bulan untuk bulan yang baru berjalan.', 'Angka ini pembagi HOP. Kalau kosong, HOP bulan itu tidak bisa dihitung.'] },
    konman: { grp: 'Rutin bulanan', nama: 'Realisasi Konman', tab: 'Konman', cara: 'Mengisi kolom REALISASI dan KET bulan terpilih. Target, skor, dan rumus tidak disentuh.', khusus: 'konman',
      tips: ['Bulan mengikuti pilihan Bulan di bagian atas dashboard.', 'Kotak yang Anda ubah ditandai warna; hanya baris itu yang disimpan.', 'Desimal pakai koma, contoh 2,45. Untuk indikator yang realisasinya persen, ketik angkanya saja (98 berarti 98%).', 'Skor dan pencapaian dihitung otomatis oleh rumus di spreadsheet.'] },
    kepatuhan: { grp: 'Rutin bulanan', nama: 'Kepatuhan', tab: 'Kepatuhan', cara: 'Mengisi kolom bulan terpilih untuk tiap aspek kepatuhan tahun ini.', khusus: 'kepatuhan',
      tips: ['Isi 0 kalau patuh (tidak ada pengurang).', 'Nilai tidak boleh melebihi batas maks tiap aspek.', 'Bulan mengikuti pilihan Bulan di bagian atas dashboard.'] },
    l1: { grp: 'Evaluasi pelatihan', nama: 'Kepuasan Peserta (L1)', tab: 'Rekap L1 Kepuasan', cara: 'Menambah satu baris baru di bawah data terakhir.',
      fields: [['Tanggal Selesai', 'tgl', 1], ['Judul Pelatihan', 'judul', 1, 'Ketik beberapa huruf, lalu pilih dari daftar Rendiklat'], ['Jumlah Responden', 'int', 1, '', 1], ['Nilai Kepuasan (1-5)', 'angka', 1, 'Contoh: 4,62', 1, 5], ['Keterangan', 'teks', 0]],
      tips: ['Satu baris = satu pelatihan.', 'Nilai kepuasan memakai skala 1 sampai 5.', 'Rata-rata di dashboard ditimbang dengan jumlah responden.'] },
    l2: { grp: 'Evaluasi pelatihan', nama: 'KSA & C&C (L2)', tab: 'Rekap L2', cara: 'Menambah satu baris baru di bawah data terakhir.', salahSatu: ['KSA Formatif (0-100)', 'C&C Sumatif (1-4)'],
      fields: [['Tanggal Selesai', 'tgl', 1], ['Judul Pelatihan', 'judul', 1], ['Jumlah Peserta', 'int', 1, '', 1], ['KSA Formatif (0-100)', 'angka', 0, 'Skala 0–100', 0, 100], ['C&C Sumatif (1-4)', 'angka', 0, 'Skala 1–4', 1, 4], ['Keterangan', 'teks', 0]],
      tips: ['KSA dan C&C boleh diisi salah satu kalau yang lain belum ada.', 'Rata-rata di dashboard ditimbang dengan jumlah peserta.'] },
    l3: { grp: 'Evaluasi pelatihan', nama: 'Dampak Perilaku (L3)', tab: 'Rekap L3 Perilaku', cara: 'Menambah satu baris baru di bawah data terakhir.',
      fields: [['Tanggal Evaluasi', 'tgl', 1, 'Tanggal pengukuran dilakukan'], ['Judul Pelatihan', 'judul', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, '', 0, 100], ['Keterangan', 'teks', 0]],
      tips: ['Tanggal evaluasi adalah tanggal pengukuran, bukan tanggal pelatihan.', 'Target L3 diambil dari Konman.'] },
    l4: { grp: 'Evaluasi pelatihan', nama: 'Dampak Kinerja (L4)', tab: 'Rekap L4 Kinerja', cara: 'Menambah satu baris baru di bawah data terakhir.',
      fields: [['Tanggal Evaluasi', 'tgl', 1, 'Tanggal pengukuran dilakukan'], ['Judul Pelatihan', 'judul', 1], ['Unit', 'teks', 0], ['Skor (0-100)', 'angka', 1, '', 0, 100], ['Keterangan', 'teks', 0]],
      tips: ['Tanggal evaluasi adalah tanggal pengukuran, bukan tanggal pelatihan.', 'Target L4 diambil dari Konman.'] },
    roti: { grp: 'Evaluasi pelatihan', nama: 'ROTI', tab: 'Rekap ROTI', cara: 'Menambah satu baris baru di bawah data terakhir.',
      fields: [['Tanggal', 'tgl', 1], ['Judul / Program', 'judul', 1], ['Unit', 'teks', 0], ['Nilai ROTI (%)', 'angka', 1, 'Tanpa tanda %. Contoh: 125 untuk 125%'], ['Keterangan', 'teks', 0]],
      tips: ['Isi persen tanpa tanda %.'] },
    sertifikat: { grp: 'Evaluasi pelatihan', nama: 'Sertifikat Terbit', tab: 'Rekap Sertifikat', cara: 'Menambah satu baris baru. Kolom % Terbit dihitung otomatis.',
      fields: [['Tanggal', 'tgl', 1], ['Judul Pelatihan', 'judul', 1], ['Peserta Lulus', 'int', 1, '', 0], ['Sertifikat Terbit', 'int', 1, 'Tidak boleh lebih dari peserta lulus', 0], ['Keterangan', 'teks', 0]],
      tips: ['Kolom % Terbit tidak perlu diisi; spreadsheet menghitungnya otomatis.'] },
    tl: { grp: 'Lainnya', nama: 'Tindak Lanjut Evaluasi', tab: 'Tindak Lanjut Evaluasi', cara: 'Menambah temuan baru, atau mengubah status temuan yang sudah ada.', mode: true,
      fields: [['Tanggal', 'tgl', 1], ['Temuan / Masukan', 'area', 1], ['Sumber', 'opsi:Evaluasi Level 1|Evaluasi Level 2|Evaluasi Level 3|Evaluasi Level 4|Audit|Masukan Pelanggan|Lainnya', 1], ['PIC', 'teks', 1], ['Status', 'opsi:' + STATUS_TL.join('|'), 1], ['Target Selesai', 'tgl', 0], ['Keterangan', 'teks', 0]],
      tips: ['Untuk memperbarui temuan lama, pilih "Ubah status temuan", jangan menambah baris baru.', 'Kolom No terisi otomatis.'] },
    koreksi: { grp: 'Lainnya', nama: 'Koreksi Rendiklat', tab: 'Koreksi Rendiklat', cara: 'Mengisi baris kelas yang dipilih. File Rendiklat asli tidak diubah.', khusus: 'koreksi',
      tips: ['Daftar kelas berasal dari tab Koreksi Rendiklat (menu Dashboard → Tarik daftar kelas tanpa realisasi).', 'Kosongkan Hari Kerja kalau hitungan otomatis sudah benar.', 'Kolom "Diisi Oleh" terisi otomatis.'] },
    hop: { grp: 'Lainnya', nama: 'Penyesuaian HOP', tab: 'Penyesuaian HOP', cara: 'Menambah satu baris baru.', salahSatu: ['Penyesuaian Orang-Hari (+/-)', 'HOP Final (timpa)'],
      fields: [['Tahun', 'tahun', 1], ['Bulan', 'bulan', 1], ['Penyesuaian Orang-Hari (+/-)', 'angka', 0, 'Boleh minus, contoh -120'], ['HOP Final (timpa)', 'angka', 0, 'Isi hanya bila HOP bulan ini harus diganti angka resmi', 0], ['Alasan', 'teks', 1]],
      tips: ['Pakai hanya bila ada keputusan resmi yang berbeda dari hitungan otomatis.', 'Kolom "Diisi Oleh" terisi otomatis.'] }
  };
  var UMUM = ['Kolom bertanda <b style="color:var(--bad)">*</b> wajib diisi.', 'Desimal pakai koma (4,62). Angka ribuan tanpa titik (49376).',
    'Setiap isian diberi catatan otomatis "(input web: nama akun, tanggal)" di kolom Keterangan.',
    'Salah input? Perbaiki atau hapus langsung di Google Sheets pada tab yang sama. Form ini tidak bisa menghapus data.',
    'Setelah tersimpan, dashboard memuat ulang data dengan sendirinya.', 'Klik <b>Keluar</b> bila memakai komputer bersama.'];

  var cur = null, mode = 'baru', awal = {}, kirim = null, lanjut = false;

  /* ---------- sesi & API ---------- */
  function sesi() { try { var s = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } }
  function simpanSesi(s) { try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(s)); } catch (e) {} }
  function hapusSesi() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function api(body) {
    var url = String((window.DASH_CONFIG || {}).API_URL || '').trim();
    if (!url) return Promise.reject(new Error('Alamat Apps Script belum diatur di config.js.'));
    return fetch(url, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var d; try { d = JSON.parse(t); } catch (e) { throw new Error('Apps Script belum mendukung input dari website. Tempel Code.gs terbaru lalu Deploy versi baru (lihat README).'); }
        if (!d.ok) { var er = new Error(d.error || 'Gagal.'); er.login = !!d.login; throw er; }
        return d;
      }, function () { throw new Error('Tidak bisa terhubung ke Google. Periksa koneksi internet lalu coba lagi.'); });
  }

  /* ---------- buka / tutup ---------- */
  var lastFocus = null;
  function buka(id) { lastFocus = lastFocus || document.activeElement; ['loginModal', 'inputModal', 'exportModal'].forEach(function (m) { $(m).hidden = m !== id; }); var f = $(id).querySelector('input:not([type=hidden]),select,textarea'); if (f) setTimeout(function () { f.focus(); }, 30); }
  function tutup() { ['loginModal', 'inputModal'].forEach(function (m) { $(m).hidden = true; }); if (lastFocus && lastFocus.focus) lastFocus.focus(); lastFocus = null; }
  document.addEventListener('click', function (e) { var t = e.target; if (!t.closest) return; if (t.closest('#loginModal [data-tutup], #inputModal [data-tutup]') || t === $('loginModal') || t === $('inputModal')) tutup(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (!$('loginModal').hidden || !$('inputModal').hidden)) tutup(); });

  $('inputBtn').addEventListener('click', function () {
    if (!A() || !A().S.data) { A() && A().toast('Data dashboard belum termuat. Tunggu sebentar atau klik Muat ulang.'); return; }
    var s = sesi(); if (s) { $('whoami').textContent = s.user; buka('inputModal'); if (!cur) pilih('l1'); else form(); } else bukaLogin();
  });
  function bukaLogin(pesan) {
    $('loginErr').hidden = !pesan; $('loginErr').textContent = pesan || ''; $('uPass').value = ''; buka('loginModal');
  }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('uName').value.trim(), p = $('uPass').value;
    $('uName').classList.toggle('err', !u); $('uPass').classList.toggle('err', !p);
    if (!u || !p) { $('loginErr').hidden = false; $('loginErr').textContent = 'Isi username dan password.'; return; }
    var b = $('loginBtn'); b.disabled = true; b.textContent = 'Memeriksa…'; $('loginErr').hidden = true;
    api({ aksi: 'login', username: u, password: p }).then(function (d) {
      simpanSesi({ token: d.token, user: d.user, exp: Date.now() + (d.berlakuDetik || 21600) * 1000 - 60000 });
      $('uPass').value = ''; $('whoami').textContent = d.user; buka('inputModal'); if (!cur) pilih('l1'); else if (!lanjut) form(); lanjut = false;
    }).catch(function (er) { $('loginErr').hidden = false; $('loginErr').textContent = er.message; $('uPass').select(); })
      .then(function () { b.disabled = false; b.textContent = 'Masuk'; });
  });
  $('logoutBtn').addEventListener('click', function () { var s = sesi(); if (s) api({ aksi: 'keluar', token: s.token }).catch(function () {}); hapusSesi(); tutup(); A().toast('Anda sudah keluar dari mode input.'); });

  /* ---------- menu ---------- */
  (function () {
    var h = '', g = '';
    Object.keys(F).forEach(function (k) { if (F[k].grp !== g) { g = F[k].grp; h += '<h4>' + g + '</h4>'; } h += '<button type="button" data-k="' + k + '">' + esc(F[k].nama) + '<small>tab ' + esc(F[k].tab) + '</small></button>'; });
    $('inMenu').innerHTML = h;
    $('inMenu').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) pilih(b.getAttribute('data-k')); });
  })();
  function pilih(k) {
    cur = k; mode = 'baru';
    Array.prototype.forEach.call($('inMenu').querySelectorAll('[data-k]'), function (b) { b.setAttribute('aria-current', b.getAttribute('data-k') === k ? 'true' : 'false'); });
    form(); panduan();
  }
  function panduan() {
    var d = F[cur];
    $('inGuide').innerHTML = '<div class="gcols"><div><h4>Petunjuk mengisi: ' + esc(d.nama) + '</h4><ul>' + d.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4>Petunjuk umum</h4><ul>' + UMUM.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div></div>';
  }
  // formulir Konman/Kepatuhan ikut berganti bila Tahun/Bulan di header diganti (bukan saat data dimuat ulang)
  var perForm = '';
  document.addEventListener('dash:periode', function () {
    if ($('inputModal').hidden || !(cur === 'konman' || cur === 'kepatuhan') || !$('fNext')) return;
    if (per().label !== perForm) form();
  });

  /* ---------- bantuan ---------- */
  function per() { var S = A().S; return { y: S.tahun, m: S.bulan, B: D.BULAN[S.bulan - 1], label: BLN[S.bulan - 1] + ' ' + S.tahun }; }
  function tahunList() {
    var ys = {}, S = A().S; ys[S.tahun] = 1; ys[new Date().getFullYear()] = 1;
    Object.keys(S.data.konman || {}).forEach(function (y) { ys[y] = 1; });
    return Object.keys(ys).map(Number).sort(function (a, b) { return b - a; });
  }
  function judulList() {
    var seen = {}, out = [];
    (A().kelas() || []).forEach(function (k) { var j = String(k.judul || '').trim(); if (j && !seen[j]) { seen[j] = 1; out.push(j); } });
    return out.sort();
  }
  function kunci(id, judul, mulai) {
    var t = D.tgl(mulai), iso = t ? t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2) : String(mulai || '').trim();
    return [String(id || '').replace(/^'/, '').trim(), String(judul || '').trim().toUpperCase(), iso].join('|');
  }
  function tglId(v) { var t = D.tgl(v); return t ? ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + '/' + t.getFullYear() : ''; }
  function rapikanInt(t) { t = String(t).trim(); return /^-?\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t; }

  function inputFor(f, i) {
    var nama = f[0], j = f[1], id = 'fi' + i, h, p = per();
    if (j === 'tgl') h = '<input class="inp" type="date" id="' + id + '">';
    else if (j === 'int' || j === 'angka') h = '<input class="inp num" inputmode="decimal" id="' + id + '" autocomplete="off">';
    else if (j === 'tahun') h = '<select class="inp" id="' + id + '">' + tahunList().map(function (y) { return '<option' + (y === p.y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';
    else if (j === 'bulan') h = '<select class="inp" id="' + id + '">' + BLN.map(function (b, k) { return '<option' + (k === p.m - 1 ? ' selected' : '') + '>' + b + '</option>'; }).join('') + '</select>';
    else if (j === 'judul') h = '<input class="inp" id="' + id + '" list="dlJudul" autocomplete="off">';
    else if (j === 'area') h = '<textarea class="inp" id="' + id + '" rows="3"></textarea>';
    else if (j.indexOf('opsi:') === 0) h = '<select class="inp" id="' + id + '">' + j.slice(5).split('|').map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>';
    else h = '<input class="inp" id="' + id + '" autocomplete="off">';
    var lebar = j === 'judul' || j === 'area' || nama === 'Keterangan' || nama === 'Alasan';
    return '<div class="field' + (lebar ? ' full' : '') + '" data-f="' + esc(nama) + '" data-j="' + j + '"' + (f[2] ? ' data-w="1"' : '') + (f[4] !== undefined ? ' data-min="' + f[4] + '"' : '') + (f[5] !== undefined ? ' data-max="' + f[5] + '"' : '') + '>' +
      '<label for="' + id + '">' + esc(nama) + (f[2] ? ' <em>*</em>' : '') + '</label>' + h + (f[3] ? '<span class="hint2">' + esc(f[3]) + '</span>' : '') + '<span class="now" hidden></span></div>';
  }
  function head(sub) {
    var d = F[cur];
    return '<div class="steps"><span' + (sub === 1 ? ' class="on"' : '') + '>1. Isi data</span><span' + (sub === 2 ? ' class="on"' : '') + '>2. Periksa</span><span' + (sub === 3 ? ' class="on"' : '') + '>3. Tersimpan</span></div>' +
      '<div><h3>' + esc(d.nama) + '</h3><div class="dest" style="margin-top:6px">Disimpan ke tab <b>' + esc(cur === 'konman' ? 'Konman ' + per().y : d.tab) + '</b>. ' + esc(d.cara) + '</div></div>';
  }

  /* ---------- langkah 1: formulir ---------- */
  function form() {
    var d = F[cur], h = head(1), p = per(); perForm = p.label;
    if (d.mode) h += '<div class="modeseg" role="group" aria-label="Pilih tindakan"><button type="button" class="btn' + (mode === 'baru' ? ' primary' : '') + '" data-mode="baru">＋ Tambah temuan baru</button><button type="button" class="btn' + (mode === 'ubah' ? ' primary' : '') + '" data-mode="ubah">✎ Ubah status temuan</button></div>';
    if (d.khusus === 'konman') h += formKonman(p);
    else if (d.khusus === 'kepatuhan') h += formKep(p);
    else if (d.khusus === 'koreksi') h += formKoreksi();
    else if (d.mode && mode === 'ubah') h += formUbahTL();
    else h += '<div class="grid2">' + d.fields.map(inputFor).join('') + '</div>';
    h += '<div class="errmsg" id="fErr" hidden></div><div class="actions"><button type="button" class="btn" id="fReset">Kosongkan</button><button type="button" class="btn primary" id="fNext">Lanjut periksa →</button></div>';
    h += '<datalist id="dlJudul">' + judulList().map(function (j) { return '<option value="' + esc(j) + '">'; }).join('') + '</datalist>';
    $('inForm').innerHTML = h; $('inForm').scrollTop = 0;
    Array.prototype.forEach.call($('inForm').querySelectorAll('[data-mode]'), function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); form(); }); });
    $('fReset').addEventListener('click', form);
    $('fNext').addEventListener('click', periksa);
    if (cur === 'pegawai') { var tampil = function () { infoPegawai(); }; ['fi0', 'fi1'].forEach(function (id) { $(id).addEventListener('change', tampil); }); tampil(); }
    if (d.khusus === 'koreksi') { $('kSel').addEventListener('change', infoKoreksi); $('kSel').addEventListener('input', infoKoreksi); }
    if (d.mode && mode === 'ubah') { $('tlSel').addEventListener('change', infoTL); infoTL(); }
    Array.prototype.forEach.call($('inForm').querySelectorAll('.etbl input'), function (i) { i.setAttribute('data-awal', i.value); });   // nilai awal sesuai isi kotak (baris baru dihapus browser)
    Array.prototype.forEach.call($('inForm').querySelectorAll('.etbl tr[data-b]'), function (tr) { var x = tr.querySelectorAll('input'); awal[tr.getAttribute('data-b')] = { r: x[0].value, k: x[1].value }; });
    Array.prototype.forEach.call($('inForm').querySelectorAll('.etbl input'), function (i) { i.addEventListener('input', function () { var tr = i.closest('tr'); tr.classList.toggle('chg', Array.prototype.some.call(tr.querySelectorAll('input'), function (x) { return x.value !== x.getAttribute('data-awal'); })); }); });
  }
  function infoPegawai() {
    var y = +$('fi0').value, m = BLN.indexOf($('fi1').value) + 1, v = A().pegawai(y, m), now = $('inForm').querySelector('[data-f="Jumlah Pegawai"] .now');
    now.hidden = v === null; now.textContent = v === null ? '' : 'Sekarang tercatat ' + D.fmt(v, 0) + ' — akan diganti';
  }

  function formKonman(p) {
    var K = A().K();
    if (!A().konmanAda(p.B)) return '<div class="errmsg">Tab Konman ' + p.y + ' tidak punya kolom bulan ' + BLN[p.m - 1] + '. Pilih bulan lain di bagian atas dashboard.</div>';
    awal = {};
    var rows = K.items.filter(function (it) { return !it.isGroup && !it.pengurang; }).map(function (it) {
      var tg = String(it.target[p.B].d || ''), rl = String(it.real[p.B].d || ''), kt = String(it.ket[p.B] || '').replace(/\s*\(input web:[^)]*\)/g, '').trim();
      awal[it.baris] = { r: rl, k: kt };
      // kolom realisasi berformat persen (disimpan 1 = 100%) dikenali dari isian bulan mana pun
      var persen = K.months.some(function (m) { return /%$/.test(String(it.real[m].d || '').trim()); });
      return '<tr data-b="' + it.baris + '" data-n="' + esc(it.namaAsli) + '" data-p="' + (persen ? 1 : 0) + '"><td class="kode">' + esc(A().labelNo(it)) + '</td><td>' + esc(it.pendek) + '<div class="tl-m">' + esc(it.satuan || '') + '</div></td><td class="num">' + esc(tg || '–') + '</td>' +
        '<td class="c-real"><input class="inp num" inputmode="decimal" value="' + esc(rl) + '" data-awal="' + esc(rl) + '" placeholder="' + (persen ? 'contoh 98%' : '') + '" aria-label="Realisasi ' + esc(it.pendek) + '"></td>' +
        '<td class="c-ket"><input class="inp" value="' + esc(kt) + '" data-awal="' + esc(kt) + '" aria-label="Keterangan ' + esc(it.pendek) + '"></td></tr>';
    }).join('');
    return '<div class="field"><label>Bulan</label><span class="follow" style="width:max-content">' + esc(p.label) + ' (ikut pilihan di atas)</span></div>' +
      '<div class="tbl-wrap" style="max-height:52vh;overflow:auto"><table class="etbl"><thead><tr><th>No</th><th>Indikator</th><th>Target</th><th>Realisasi</th><th>Keterangan</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function formKep(p) {
    var R = A().kepRows();
    if (!R.length) return '<div class="errmsg">Belum ada aspek kepatuhan untuk tahun ' + p.y + ' di tab Kepatuhan.</div>';
    return '<div class="field"><label>Bulan</label><span class="follow" style="width:max-content">' + esc(p.label) + ' (ikut pilihan di atas)</span></div>' +
      '<div class="tbl-wrap"><table class="etbl"><thead><tr><th>Aspek</th><th>Maks</th><th>Nilai pengurang</th></tr></thead><tbody>' + R.map(function (r) {
        var v = A().kepVal(r, p.B), s = v === null ? '' : String(v).replace('.', ',');
        return '<tr data-a="' + esc(String(r['Aspek Kepatuhan']).trim()) + '" data-max="' + esc(r['Maks Pengurang']) + '"><td>' + esc(r['Aspek Kepatuhan']) + '</td><td class="num">' + esc(r['Maks Pengurang']) + '</td>' +
          '<td class="c-real"><input class="inp num" inputmode="decimal" value="' + esc(s) + '" data-awal="' + esc(s) + '" placeholder="0" aria-label="Nilai ' + esc(r['Aspek Kepatuhan']) + '"></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  var korMap = {};
  function formKoreksi() {
    var R = D.rows(A().S.data.koreksi); korMap = {};
    if (!R.length) return '<div class="errmsg">Tab Koreksi Rendiklat masih kosong. Di spreadsheet jalankan menu Dashboard → Tarik daftar kelas tanpa realisasi.</div>';
    R.sort(function (a, b) { return (String(a['Realisasi Peserta (koreksi)']).trim() ? 1 : 0) - (String(b['Realisasi Peserta (koreksi)']).trim() ? 1 : 0); });
    var opts = R.map(function (r) {
      var lbl = String(r['Judul Pelatihan']).trim() + ' · ' + (tglId(r['Tgl Mulai']) || 'tanpa tanggal') + ' · ' + String(r['ID REN']).replace(/^'/, '');
      korMap[lbl] = r; return '<option value="' + esc(lbl) + '">';
    }).join('');
    return '<div class="grid2"><div class="field full" data-w="1"><label for="kSel">Kelas <em>*</em></label><input class="inp" id="kSel" list="dlKelas" placeholder="Ketik judul atau ID REN, lalu pilih dari daftar" autocomplete="off">' +
      '<span class="hint2">' + R.length + ' kelas di tab Koreksi Rendiklat; yang belum dikoreksi tampil lebih dulu.</span><span class="now" id="kInfo" hidden></span></div>' +
      inputFor(['Realisasi Peserta (koreksi)', 'int', 0, 'Jumlah peserta yang benar', 0], 1) + inputFor(['Hari Kerja (koreksi)', 'int', 0, 'Kosongkan kalau sudah benar', 0, 400], 2) +
      inputFor(['Ikut HOP?', 'opsi:Ya|Tidak', 1], 3) + inputFor(['Alasan', 'teks', 1, 'Contoh: data peserta dari absensi'], 4) + '</div><datalist id="dlKelas">' + opts + '</datalist>';
  }
  function infoKoreksi() {
    var r = korMap[$('kSel').value], el = $('kInfo');
    el.hidden = !r; if (!r) return;
    el.textContent = 'Rencana peserta ' + (r['Rencana Peserta'] || '–') + ' · ' + (tglId(r['Tgl Mulai']) || '?') + ' s.d. ' + (tglId(r['Tgl Selesai']) || '?') + (String(r['Realisasi Peserta (koreksi)']).trim() ? ' · koreksi sekarang: ' + r['Realisasi Peserta (koreksi)'] : '');
    if (String(r['Realisasi Peserta (koreksi)']).trim() && !$('fi1').value) $('fi1').value = r['Realisasi Peserta (koreksi)'];
  }
  function formUbahTL() {
    var R = A().tlRows();
    if (!R.length) return '<div class="errmsg">Belum ada temuan. Pilih "Tambah temuan baru".</div>';
    return '<div class="grid2"><div class="field full" data-w="1"><label for="tlSel">Temuan yang diubah <em>*</em></label><select class="inp" id="tlSel">' +
      R.map(function (r) { return '<option value="' + esc(r['No']) + '">' + esc(r['No'] + '. ' + String(r['Temuan / Masukan']).slice(0, 90) + ' — ' + A().tlStatus(r)) + '</option>'; }).join('') + '</select><span class="now" id="tlInfo" hidden></span></div>' +
      inputFor(['Status', 'opsi:' + STATUS_TL.join('|'), 1], 1) + inputFor(['Keterangan', 'teks', 0, 'Contoh: sudah diperbaiki tanggal 3 Nov'], 2) + '</div>';
  }
  function infoTL() {
    var r = A().tlRows().filter(function (x) { return String(x['No']) === $('tlSel').value; })[0]; if (!r) return;
    $('fi1').value = A().tlStatus(r); $('fi2').value = String(r['Keterangan'] || '').replace(/\s*\(input web:[^)]*\)/g, '').trim();
    $('tlInfo').hidden = false; $('tlInfo').textContent = 'PIC ' + (r['PIC'] || '–') + ' · status sekarang: ' + A().tlStatus(r);
  }

  /* ---------- langkah 2: periksa ---------- */
  function salah(msg, el) { $('fErr').hidden = false; $('fErr').textContent = msg; if (el) { el.classList.add('err'); el.focus(); } return false; }
  function kumpulkanField(data, rows) {
    var ok = true;
    Array.prototype.forEach.call($('inForm').querySelectorAll('.field[data-f]'), function (f) {
      if (!ok) return;
      var nama = f.getAttribute('data-f'), j = f.getAttribute('data-j'), inp = f.querySelector('.inp'), v = inp.value.trim();
      inp.classList.remove('err');
      if (j === 'int') v = rapikanInt(v);
      if (!v && f.hasAttribute('data-w')) { ok = salah('Kolom "' + nama + '" wajib diisi.', inp); return; }
      if (v && (j === 'int' || j === 'angka')) {
        var n = D.num(v);
        if (n === null || /%/.test(v)) { ok = salah('"' + nama + '" harus berupa angka.', inp); return; }
        if (j === 'int' && Math.round(n) !== n) { ok = salah('"' + nama + '" harus bilangan bulat (tanpa titik atau koma).', inp); return; }
        var mn = f.getAttribute('data-min'), mx = f.getAttribute('data-max');
        if (mn !== null && n < +mn) { ok = salah('"' + nama + '" minimal ' + mn + '.', inp); return; }
        if (mx !== null && n > +mx) { ok = salah('"' + nama + '" maksimal ' + mx + '.', inp); return; }
      }
      data[nama] = v;
      var tampil = v; if (j === 'tgl' && v) tampil = tglId(v);
      rows.push([nama, tampil || '—']);
    });
    return ok;
  }
  function periksa() {
    $('fErr').hidden = true;
    var d = F[cur], p = per(), data = {}, rows = [];
    if (d.khusus === 'konman') {
      var baris = [];
      Array.prototype.forEach.call($('inForm').querySelectorAll('tr[data-b]'), function (tr) {
        var ins = tr.querySelectorAll('input'), r = ins[0].value.trim(), k = ins[1].value.trim(), b = tr.getAttribute('data-b');
        if (r === awal[b].r && k === awal[b].k) return;
        if (r && D.num(r) === null) { baris = null; return salah('Realisasi "' + tr.children[1].firstChild.textContent + '" harus berupa angka.', ins[0]); }
        if (baris === null) return;
        var rk = r && tr.getAttribute('data-p') === '1' && !/%$/.test(r) ? r + '%' : r, kUbah = k !== awal[b].k;
        var item = { baris: +b, nama: tr.getAttribute('data-n'), realisasi: rk }; if (kUbah) item.ket = k;   // keterangan lama tidak dikirim, supaya baris barunya tetap utuh
        baris.push(item);
        rows.push([tr.children[1].firstChild.textContent, (r || '(dikosongkan)') + (kUbah ? ' · ket: ' + (k || '(dikosongkan)') : '')]);
      });
      if (baris === null) return;
      if (!baris.length) return salah('Belum ada yang diubah. Ubah kotak Realisasi atau Keterangan dulu.');
      kirim = { jenis: 'konman', data: { tahun: p.y, bulan: p.m, baris: baris } };
      rows.unshift(['Bulan', p.label]);
    } else if (d.khusus === 'kepatuhan') {
      var aspek = [], gagal = false;
      Array.prototype.forEach.call($('inForm').querySelectorAll('tr[data-a]'), function (tr) {
        if (gagal) return;
        var i = tr.querySelector('input'), v = i.value.trim(), mx = D.num(tr.getAttribute('data-max'));
        if (v === i.getAttribute('data-awal')) return;
        var n = D.num(v);
        if (v && (n === null || n < 0)) { gagal = true; return salah('Nilai harus angka 0 atau lebih.', i); }
        if (v && mx !== null && n > mx) { gagal = true; return salah('Nilai "' + tr.getAttribute('data-a') + '" melebihi maks ' + mx + '.', i); }
        aspek.push({ nama: tr.getAttribute('data-a'), nilai: v }); rows.push([tr.getAttribute('data-a'), v === '' ? '(dikosongkan)' : v]);
      });
      if (gagal) return;
      if (!aspek.length) return salah('Belum ada yang diubah.');
      kirim = { jenis: 'kepatuhan', data: { tahun: p.y, bulan: p.m, aspek: aspek } };
      rows.unshift(['Bulan', p.label]);
    } else if (d.khusus === 'koreksi') {
      var r = korMap[$('kSel').value];
      if (!r) return salah('Pilih kelas dari daftar (ketik lalu klik salah satu pilihan).', $('kSel'));
      if (!kumpulkanField(data, rows)) return;
      if (!data['Realisasi Peserta (koreksi)'] && !data['Hari Kerja (koreksi)'] && data['Ikut HOP?'] === 'Ya') return salah('Isi Realisasi Peserta atau Hari Kerja, atau pilih Ikut HOP = Tidak.');
      data.kunci = kunci(r['ID REN'], r['Judul Pelatihan'], r['Tgl Mulai']);
      rows.unshift(['Kelas', $('kSel').value]); rows.push(['Diisi Oleh', sesi() ? sesi().user + ' (otomatis)' : '']);
      kirim = { jenis: 'koreksi', data: data };
    } else if (d.mode && mode === 'ubah') {
      if (!$('tlSel')) return;
      if (!kumpulkanField(data, rows)) return;
      data.mode = 'ubah'; data.no = $('tlSel').value;
      rows.unshift(['Temuan', $('tlSel').options[$('tlSel').selectedIndex].text]);
      kirim = { jenis: 'tl', data: data };
    } else {
      if (!kumpulkanField(data, rows)) return;
      if (d.salahSatu && d.salahSatu.every(function (k) { return !data[k]; })) return salah('Isi minimal salah satu: ' + d.salahSatu.join(' atau ') + '.');
      if (cur === 'sertifikat' && D.num(data['Sertifikat Terbit']) > D.num(data['Peserta Lulus'])) return salah('Sertifikat Terbit tidak boleh lebih besar dari Peserta Lulus.');
      if (cur === 'hop') rows.push(['Diisi Oleh', sesi() ? sesi().user + ' (otomatis)' : '']);
      kirim = { jenis: cur, data: data };
    }
    var h = head(2) + '<p class="desc" style="margin:0">Periksa sekali lagi. Data di bawah akan ditulis ke Google Sheets.</p><dl class="review">' +
      rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="errmsg" id="sErr" hidden></div><div class="actions"><button type="button" class="btn" id="sBack">← Ubah lagi</button><button type="button" class="btn primary" id="sGo">✓ Simpan ke Google Sheets</button></div>';
    var nilai = Array.prototype.map.call($('inForm').querySelectorAll('.inp'), function (i) { return i.value; });
    $('inForm').innerHTML = h; $('inForm').scrollTop = 0;
    $('sBack').addEventListener('click', function () {
      form(); var ins = $('inForm').querySelectorAll('.inp');
      Array.prototype.forEach.call(ins, function (i, k) { if (nilai[k] !== undefined) { i.value = nilai[k]; i.dispatchEvent(new Event('input')); } });
    });
    $('sGo').addEventListener('click', function () { simpan(this); });
  }

  /* ---------- langkah 3: simpan ---------- */
  function simpan(btn) {
    var s = sesi(); if (!s) { lanjut = true; tutup(); return bukaLogin('Sesi sudah berakhir. Silakan masuk lagi; isian Anda masih ada.'); }
    btn.disabled = true; btn.textContent = 'Menyimpan…'; $('sBack').disabled = true;
    api({ aksi: 'simpan', token: s.token, jenis: kirim.jenis, data: kirim.data }).then(function (d) {
      $('inForm').innerHTML = head(3) + '<div class="done"><div class="ic">✓</div><h3>Tersimpan</h3><p class="desc" style="max-width:460px;margin:0">' + esc(d.pesan || 'Data tersimpan.') + '</p>' +
        '<div class="actions" style="justify-content:center"><button type="button" class="btn" id="dAgain">Input data lain</button><button type="button" class="btn primary" id="dDone">Selesai</button></div></div>';
      $('dAgain').addEventListener('click', form); $('dDone').addEventListener('click', tutup);
      A().reload();
    }).catch(function (er) {
      if (er.login) { hapusSesi(); btn.disabled = false; btn.textContent = '✓ Simpan ke Google Sheets'; $('sBack').disabled = false; lanjut = true; tutup(); bukaLogin(er.message + ' Isian Anda masih ada.'); return; }
      $('sErr').hidden = false; $('sErr').textContent = er.message; btn.disabled = false; btn.textContent = '✓ Coba simpan lagi'; $('sBack').disabled = false;
    });
  }
})();
