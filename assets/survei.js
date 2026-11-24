/* Survei kepuasan pengguna dashboard.
   Pertanyaan diatur di tab "Survei Pertanyaan" (Admin bisa mengubah atau menambah baris);
   jawaban tersimpan di tab "Survei Jawaban". Semua akun (Admin & Lihat) bisa mengisi; hasil hanya untuk Admin. */
(function () {
  var A = function () { return window.DashApp; }, D = window.Dash, esc = D.esc;
  var SKALA = ['Sangat tidak setuju', 'Tidak setuju', 'Netral', 'Setuju', 'Sangat setuju'];
  var KUNCI = 'dash-survei-terisi', st = { tanya: null, jawab: {}, mode: 'isi' };
  function simpanLokal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  function bacaLokal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function kepala(sub, judul) {
    var adm = A().admin();
    return '<div class="modal-h"><div>' + (sub ? '<div class="desc">' + sub + '</div>' : '') + '<h3>' + (judul || 'Survei Kepuasan Pengguna') + '</h3></div>' +
      (adm ? '<div class="seg sv-seg" role="group" aria-label="Tampilan survei"><button type="button" data-sv-mode="isi" aria-pressed="' + (st.mode === 'isi') + '">Isi survei</button><button type="button" data-sv-mode="hasil" aria-pressed="' + (st.mode === 'hasil') + '">Hasil</button></div>' : '') +
      '<button class="btn" data-close>Tutup</button></div>';
  }
  function galat(e) {
    if (e.login) return A().keluar(e.message);
    A().openModal(kepala() + '<div class="empty">' + esc(/tidak dikenal/i.test(e.message) ? 'Survei butuh Apps Script terbaru. Tempel Code.gs terbaru lalu Deploy versi baru.' : e.message) + '</div>', 'wide');
  }

  /* ---------- formulir ---------- */
  function soal(q, i) {
    var v = st.jawab[q.no], h = '<div class="sv-q" data-sv-q="' + esc(q.no) + '"><div class="sv-t"><span class="sv-n">' + (i + 1) + '</span>' + esc(q.teks) + (q.wajib ? ' <span class="sv-w" title="Wajib">*</span>' : '') + '</div>';
    if (q.jenis === 'skala') {
      h += '<div class="sv-sk" role="radiogroup" aria-label="' + esc(q.teks) + '">' + SKALA.map(function (l, k) {
        return '<button type="button" role="radio" aria-checked="' + (v === String(k + 1)) + '" data-sv-v="' + (k + 1) + '" title="' + l + '"><b>' + (k + 1) + '</b><span>' + l + '</span></button>';
      }).join('') + (!q.wajib ? '<button type="button" role="radio" class="sv-na" aria-checked="' + (v === 'Tidak memakai') + '" data-sv-v="Tidak memakai"><span>Tidak memakai</span></button>' : '') + '</div>';
    } else if (q.jenis === 'pilihan') {
      h += '<div class="sv-pl" role="radiogroup" aria-label="' + esc(q.teks) + '">' + q.pilihan.map(function (p) {
        return '<button type="button" role="radio" class="chip" aria-checked="' + (v === p) + '" aria-pressed="' + (v === p) + '" data-sv-v="' + esc(p) + '">' + esc(p) + '</button>';
      }).join('') + '</div>';
    } else h += '<textarea rows="2" data-sv-teks maxlength="1000" placeholder="Tulis jawaban (opsional)">' + esc(v || '') + '</textarea>';
    return h + '</div>';
  }
  function form() {
    var Q = st.tanya, kel = '', i = 0, isi = '';
    Q.forEach(function (q) {
      if (q.kelompok !== kel) { if (kel !== '') isi += '</div>'; kel = q.kelompok; isi += '<div class="sv-grp"><h4>' + esc(kel || 'Pertanyaan') + '</h4>' + (q.jenis === 'skala' ? '<div class="desc">Skala 1 (sangat tidak setuju) sampai 5 (sangat setuju).' + (!q.wajib ? ' Pilih "Tidak memakai" bila bagian itu tidak Anda gunakan.' : '') + '</div>' : ''); }
      isi += soal(q, i++);
    });
    if (kel !== '') isi += '</div>';
    A().openModal(kepala('Sekitar 2 menit · jawaban dipakai untuk mengukur dan meningkatkan manfaat dashboard') +
      '<div class="sv-form">' + isi + '</div><div class="sv-foot"><span class="desc" id="svInfo">Tanda * wajib diisi.</span><button type="button" class="btn primary" data-sv="kirim">Kirim jawaban</button></div>', 'wide sv-modal');
  }
  function buka() {
    var s = D.sesi(); if (!s) return;
    st.mode = 'isi';
    A().openModal(kepala() + '<div class="empty">Memuat pertanyaan…</div>', 'wide sv-modal');
    D.api({ aksi: 'survei', token: s.token }).then(function (d) { st.tanya = d.tanya || []; form(); }).catch(galat);
  }
  function kirim(btn) {
    var kurang = st.tanya.filter(function (q) { return q.wajib && !String(st.jawab[q.no] || '').trim(); });
    document.querySelectorAll('.sv-q').forEach(function (el) { el.classList.toggle('kurang', kurang.some(function (q) { return q.no === el.getAttribute('data-sv-q'); })); });
    if (kurang.length) {
      var el = document.querySelector('.sv-q.kurang'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('svInfo').textContent = kurang.length + ' pertanyaan wajib belum dijawab.'; return;
    }
    btn.disabled = true; btn.textContent = 'Mengirim…';
    D.api({ aksi: 'surveiKirim', token: D.sesi().token, jawaban: st.jawab }).then(function () {
      simpanLokal(KUNCI, String(Date.now())); st.jawab = {}; tutupAjak();
      A().openModal(kepala() + '<div class="sv-ok"><div class="sv-ok-i" aria-hidden="true">✓</div><h4>Terima kasih</h4><p>Jawaban Anda sudah tersimpan dan akan dipakai untuk menyempurnakan dashboard.</p></div>', 'wide sv-modal');
    }).catch(function (e) { btn.disabled = false; btn.textContent = 'Kirim jawaban'; if (e.login) return A().keluar(e.message); document.getElementById('svInfo').textContent = e.message; });
  }

  /* ---------- hasil (Admin) ---------- */
  function hasil() {
    var s = D.sesi(); if (!s) return;
    st.mode = 'hasil';
    A().openModal(kepala() + '<div class="empty">Memuat hasil…</div>', 'wide sv-modal');
    D.api({ aksi: 'surveiHasil', token: s.token }).then(function (d) {
      var Q = d.tanya || [], J = d.jawaban || {}, n = d.responden || 0, semua = [];
      var baris = Q.map(function (q) {
        var a = J[q.no] || [];
        if (q.jenis === 'skala') {
          var x = a.map(Number).filter(function (v) { return v >= 1 && v <= 5; }), rt = x.length ? x.reduce(function (p, c) { return p + c; }, 0) / x.length : null;
          semua = semua.concat(x);
          var pct = x.length ? x.filter(function (v) { return v >= 4; }).length / x.length : null;
          return { q: q, h: '<div class="sv-r"><div class="sv-rl">' + esc(q.teks) + '</div><div class="sv-rb"><span style="width:' + (rt ? rt / 5 * 100 : 0).toFixed(1) + '%"></span></div><div class="sv-rv"><b>' + (rt === null ? '–' : D.fmt(rt, 2)) + '</b><small> · ' + x.length + ' jawaban' + (pct === null ? '' : ' · ' + D.pct(pct, 0) + ' setuju') + '</small></div></div>' };
        }
        if (q.jenis === 'pilihan') {
          var c = {}; a.forEach(function (v) { c[v] = (c[v] || 0) + 1; });
          var op = q.pilihan.concat(Object.keys(c).filter(function (k) { return q.pilihan.indexOf(k) < 0; }));
          return { q: q, h: '<div class="sv-p"><div class="sv-rl">' + esc(q.teks) + '</div><div class="chips2">' + op.map(function (o) { return '<span>' + esc(o) + ' <b>' + (c[o] || 0) + '</b></span>'; }).join('') + '</div></div>' };
        }
        return { q: q, h: a.length ? '<details class="sv-tx"><summary>' + esc(q.teks) + ' · ' + a.length + '</summary><ul>' + a.slice().reverse().map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>' : '' };
      });
      var rata = semua.length ? semua.reduce(function (p, c) { return p + c; }, 0) / semua.length : null, setuju = semua.length ? semua.filter(function (v) { return v >= 4; }).length / semua.length : null;
      var kel = '', isi = '';
      baris.forEach(function (b) { if (!b.h) return; if (b.q.kelompok !== kel) { kel = b.q.kelompok; isi += '<h4 class="sv-h">' + esc(kel) + '</h4>'; } isi += b.h; });
      A().openModal(kepala('Pertanyaan diatur di tab Survei Pertanyaan, jawaban di tab Survei Jawaban') +
        '<div class="sv-kpi"><div><b>' + D.fmt(n, 0) + '</b><span>responden</span></div><div><b>' + (rata === null ? '–' : D.fmt(rata, 2)) + '<small> / 5</small></b><span>indeks kepuasan (rata-rata semua skala)</span></div><div><b>' + (setuju === null ? '–' : D.pct(setuju, 0)) + '</b><span>jawaban setuju atau sangat setuju (4–5)</span></div><div><b>' + (d.terakhir ? new Date(d.terakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '–') + '</b><span>jawaban terakhir</span></div></div>' +
        (n ? isi : '<div class="empty">Belum ada jawaban. Bagikan ajakan mengisi survei ke pengguna akun Lihat.</div>') +
        '<div class="note">Ubah atau tambah pertanyaan di ' + A().sheetLink('Google Sheets', 'Survei Pertanyaan') + ': satu baris per pertanyaan, kolom Jenis diisi skala, pilihan, atau teks; kolom Pilihan dipisah titik koma; Aktif = Tidak untuk menyembunyikan. Pertanyaan baru langsung tampil di formulir.</div>', 'wide sv-modal');
    }).catch(galat);
  }

  /* ---------- ajakan sekali tampil untuk yang belum mengisi ---------- */
  function tutupAjak() { var el = document.getElementById('svAjak'); if (el) el.remove(); }
  function ajak() {
    if (!A() || !A().S || !A().S.data || document.getElementById('svAjak')) return;
    if (bacaLokal(KUNCI) || sessionStorage.getItem('dash-survei-nanti')) return;
    var el = document.createElement('div'); el.id = 'svAjak'; el.className = 'sv-ajak'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Ajakan survei');
    el.innerHTML = '<div><b>Bantu kami menilai dashboard ini</b><span>Survei kepuasan, sekitar 2 menit.</span></div><div class="sv-ab"><button type="button" class="btn" data-sv="nanti">Nanti</button><button type="button" class="btn primary" data-sv="buka">Isi survei</button></div>';
    document.body.appendChild(el);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-sv],[data-sv-v],[data-sv-mode],#svBtn');
    if (!t) return;
    if (t.id === 'svBtn') { var m = document.getElementById('mainMenu'); if (m && !m.hidden && A().tutupMenu) A().tutupMenu(); return buka(); }
    if (t.hasAttribute('data-sv-mode')) return t.getAttribute('data-sv-mode') === 'hasil' ? hasil() : buka();
    if (t.hasAttribute('data-sv-v')) {
      var q = t.closest('[data-sv-q]'), no = q.getAttribute('data-sv-q'), v = t.getAttribute('data-sv-v');
      st.jawab[no] = st.jawab[no] === v ? '' : v;
      q.querySelectorAll('[data-sv-v]').forEach(function (b) { var on = b.getAttribute('data-sv-v') === st.jawab[no]; b.setAttribute('aria-checked', on); if (b.classList.contains('chip')) b.setAttribute('aria-pressed', on); });
      q.classList.remove('kurang'); return;
    }
    var a = t.getAttribute('data-sv');
    if (a === 'kirim') return kirim(t);
    if (a === 'buka') { tutupAjak(); return buka(); }
    if (a === 'nanti') { try { sessionStorage.setItem('dash-survei-nanti', '1'); } catch (x) { /* abaikan */ } return tutupAjak(); }
  });
  document.addEventListener('input', function (e) {
    if (!e.target.matches || !e.target.matches('[data-sv-teks]')) return;
    var q = e.target.closest('[data-sv-q]'); st.jawab[q.getAttribute('data-sv-q')] = e.target.value;
  });
  document.addEventListener('dash:periode', function () { if (A() && !A().admin()) setTimeout(ajak, 4000); });
  window.DashSurvei = { buka: buka, hasil: hasil };
})();
