/* Admin → Lisensi Template: kunci RSA, pemasangan SDK di template, pengaturan domain, daftar lisensi terjual */
(function (w) {
  'use strict';
  const N = w.NK, { esc, ic, ACT, INPUT, route, toast, api, use } = N, A = w.NKA, { head, skelBox, empty } = A, CFG = w.NK_CONFIG || {};
  const LS = { pid: '', busy: false };
  const set = r => { N.sset('u', 'lic.adm', r.data); N.softRender(); };

  /* ---------- pembuatan kunci di browser admin (kunci privat tidak pernah lewat pihak ketiga) ---------- */
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  async function genKey() {
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const pk = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey)), sp = new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey));
    return { private: '-----BEGIN PRIVATE KEY-----\n' + b64(pk).match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----', public: b64(sp) };
  }
  const baseUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const cfgOf = (d, p) => { const c = { api: CFG.GAS_URL || '', pid: p.id, nama: p.judul, pub: d.key.public, owner: d.owner, beli: baseUrl() + '#/produk/' + p.id }; if (!/^file:/.test(location.protocol)) c.situs = location.origin; return c; };
  const cfgLine = c => 'window.NKL=' + JSON.stringify(c) + ';';
  const snippet = () => '<!-- Letakkan di <head> template, paling atas -->\n<script src="nk-license.js"></script>\n\n<!-- Menu lisensi: landing page → buka  domain-anda.com/#key\n     Dasbor → tambahkan menu dengan atribut:  <a href="#" data-nk-license>Lisensi</a> -->';
  const chosen = d => d.produk.find(p => p.id === LS.pid) || d.produk[0];
  const dtf = x => x ? N.dt(x) : '—';

  function keyCard(d) {
    const ada = d.key.ada;
    return '<div class="card"><div class="row between wrap" style="gap:12px"><div class="row" style="gap:12px"><span class="pill ' + (ada ? 'ok' : 'warn') + '">' + (ada ? ic('check', 'sm') + 'Kunci aktif' : 'Belum dibuat') + '</span><div><h3 style="font-size:17px">1. Kunci lisensi</h3><p class="small muted" style="margin:2px 0 0">Pasangan kunci RSA dibuat di browser Anda. Kunci privat disimpan hanya di Script Properties Apps Script; kunci publik dipasang di template untuk memeriksa token secara offline.</p></div></div>' +
      '<button class="btn ' + (ada ? 'soft' : 'pri') + '" data-act="lic-key">' + ic('key', 'sm') + (ada ? 'Buat Ulang Kunci' : 'Buat Kunci Sekarang') + '</button></div>' +
      (ada ? '<div class="hint" style="margin-top:10px">Peringatan: membuat ulang kunci membuat semua template yang sudah terpasang ditolak sampai Anda mengunduh dan memasang ulang <span class="mono">nk-license.js</span> yang baru.</div>' : '') + '</div>';
  }
  function installCard(d) {
    if (!d.produk.length) return '<div class="card"><h3 style="font-size:17px">2. Pasang di template</h3><div class="alert info" style="margin-top:10px">' + ic('info') + '<span>Belum ada produk Template Web. Buat produknya dulu, isi “Link produk” dengan link Google Drive file template Anda.</span></div><button class="btn pri" data-act="lic-newprod" style="margin-top:12px">' + ic('plus', 'sm') + 'Tambah Produk Template</button></div>';
    const p = chosen(d), opts = d.produk.map(x => '<option value="' + esc(x.id) + '" ' + (x.id === p.id ? 'selected' : '') + '>' + esc(x.judul) + '</option>').join('');
    const body = !d.key.ada ? '<div class="alert warn" style="margin-top:10px">' + ic('alert') + '<span>Buat kunci lisensi (langkah 1) agar kode konfigurasi tersedia.</span></div>' :
      '<pre class="lic-code" id="lic-snip">' + esc(snippet()) + '</pre><div class="row wrap" style="gap:8px"><button class="btn soft" data-act="lic-copy">' + ic('copy', 'sm') + 'Salin Kode Pasang</button><button class="btn pri" data-act="lic-dl">' + ic('download', 'sm') + 'Unduh nk-license.js</button></div>' +
      '<ol class="lic-steps small"><li>Klik <b>Unduh nk-license.js</b> (berisi konfigurasi produk ini + SDK v4).</li><li>Beri template + berkas itu ke Claude dengan skill <b>proteksi-template-nabire</b>. Skill akan menyisipkan SDK, menambah copyright, menyegel berkas, dan menambahkan menu lisensi (di dasbor, atau lewat <span class="mono">domain.com/#key</span> untuk landing page).</li><li>Unggah template ke Google Drive Anda, lalu tempel link-nya di “Link produk”.</li><li>Pembeli memasukkan kode <b>sekali</b>; setelah itu semua pengunjung tidak diminta kode. Belum aktif = tampil DEMO + link beli.</li></ol>';
    return '<div class="card"><div class="row between wrap"><h3 style="font-size:17px">2. Pasang di template</h3><select class="in" style="max-width:300px" data-input="lic-pid" aria-label="Pilih produk template">' + opts + '</select></div>' + body + '</div>';
  }
  function setCard(d) {
    return '<div class="card"><h3 style="font-size:17px">3. Aturan domain</h3><div class="grid2 mt"><div class="fg"><label class="fl" for="lic-own">Domain milik Anda (bebas kode)</label><input class="in mono" id="lic-own" value="' + esc(d.owner.join(', ')) + '" placeholder="nabirekreatif.com, demo.com" autocapitalize="off" spellcheck="false"><div class="hint">Domain & semua subdomain-nya (link., www., dst.) menampilkan template tanpa kode — untuk demo Anda sendiri. Pisahkan dengan koma.</div></div>' +
      '<div class="fg"><label class="fl" for="lic-max">Batas domain per kode (bawaan)</label><input class="in" id="lic-max" type="number" min="1" max="20" value="' + d.maks_default + '"><div class="hint">Bisa diubah per produk di Produk → “Batas domain per lisensi”.</div></div></div><button class="btn pri" data-act="lic-set">' + ic('check', 'sm') + 'Simpan Aturan</button></div>';
  }
  function listCard(d) {
    const rows = d.rows.map(r => '<tr><td><span class="mono bold">' + esc(r.kode) + '</span><div class="small muted">' + esc(r.produk) + '</div></td><td>' + esc(r.pemilik) + '<div class="small muted">' + esc(r.email) + '</div></td><td>' + (r.aktif.length ? r.aktif.map(a => '<div class="row" style="gap:4px"><span class="mono small">' + esc(a.domain) + '</span><button class="btn ghost xs" data-act="lic-free" data-id="' + esc(a.id) + '" aria-label="Lepas domain ' + esc(a.domain) + '">' + ic('x', 'sm') + '</button></div>').join('') : '<span class="muted small">belum dipakai</span>') + '<div class="small muted">' + r.aktif.length + '/' + r.maks + ' domain</div></td><td>' + (r.dicabut ? '<span class="pill err">Dicabut</span>' : '<span class="pill ok">Aktif</span>') + '<div class="small muted">' + dtf(r.tgl) + '</div></td><td class="right"><button class="btn ' + (r.dicabut ? 'soft' : 'danger') + ' xs" data-act="lic-rev" data-k="' + esc(r.kode) + '" data-a="' + (r.dicabut ? 'pulihkan' : 'cabut') + '">' + (r.dicabut ? 'Pulihkan' : 'Cabut') + '</button></td></tr>').join('');
    return '<div class="card"><div class="row between"><h3 style="font-size:17px">4. Lisensi terjual (' + d.rows.length + ')</h3></div><p class="small muted">Setiap pembeli template mendapat satu kode (dari persetujuan pembayaran atau Redeem Kode Lynk.id). Cabut lisensi untuk memblokir semua domainnya pada pengecekan berikutnya (maksimal 24 jam).</p>' +
      (d.rows.length ? '<div class="tw"><table class="t"><thead><tr><th>Kode</th><th>Pemilik</th><th>Domain aktif</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : empty('key', 'Belum ada lisensi terjual. Lisensi muncul saat pembeli menyelesaikan pembayaran atau Redeem kode template.')) + '</div>';
  }

  route(/^\/admin\/lisensi$/, A.adm({
    title: 'Lisensi Template',
    render() {
      const d = use('lic.adm', { ttl: 20000 });
      const h = head('Katalog', 'Lisensi Template Web', 'Jual template web Anda dengan kode akses. Template yang dipasang di domain lain otomatis terkunci sampai kode lisensi dimasukkan — hanya Anda yang bisa menjualnya.');
      if (!d) return h + skelBox(120) + '<div class="mt">' + skelBox(220) + '</div>';
      const alur = '<div class="card flat lic-flow small"><b>Alur:</b> pembeli memilih template → membayar → kode akses + link unduh Drive muncul di Aset Saya → template dipasang di domain pembeli → halaman meminta kode → server mendaftarkan domain dan menerbitkan token bertanda tangan → template terbuka.</div>';
      return h + alur + '<div class="col" style="gap:16px;margin-top:16px">' + keyCard(d) + installCard(d) + setCard(d) + listCard(d) + '</div>';
    }
  }));

  ACT['lic-key'] = async el => {
    const d = N.sget('u', 'lic.adm'); const ada = d && d.v && d.v.key.ada;
    if (!(w.crypto && crypto.subtle)) return toast('Browser ini tidak mendukung pembuatan kunci. Buka lewat HTTPS.', 'err', 6000);
    if (!await N.confirmBox(ada ? 'Buat ulang kunci? Template yang sudah terpasang HARUS diganti dengan nk-license.js baru, jika tidak akan terkunci.' : 'Buat kunci lisensi baru sekarang?', { ok: ada ? 'Ya, Buat Ulang' : 'Buat Kunci', danger: !!ada })) return;
    N.busy(el, true);
    try { const k = await genKey(); const r = await api('license.key', k); if (!r.success) throw new Error(r.message || 'Gagal menyimpan kunci.'); set(r); toast('Kunci lisensi dibuat 🔑 — unduh nk-license.js untuk dipasang di template.', 'ok', 6000); }
    catch (e) { toast(e.message || 'Gagal membuat kunci.', 'err', 6000); }
    N.busy(el, false);
  };
  INPUT['lic-pid'] = el => { LS.pid = el.value; N.softRender(); };
  ACT['lic-copy'] = () => { const e = N.$('#lic-snip'); if (e) N.copy(e.textContent, 'Kode pasang disalin'); };
  ACT['lic-dl'] = async el => {
    const e = N.sget('u', 'lic.adm'), d = e && e.v; if (!d || !d.key.ada) return; const p = chosen(d);
    N.busy(el, true);
    try { const r = await fetch('sdk/nk-license.js', { cache: 'no-cache' }); if (!r.ok) throw new Error('Berkas SDK tidak ditemukan di situs (folder sdk/).'); const sdk = await r.text(); N.download('nk-license.js', cfgLine(cfgOf(d, p)) + '\n' + sdk, 'text/javascript'); toast('nk-license.js diunduh untuk: ' + p.judul, 'ok'); }
    catch (x) { toast(x.message || 'Gagal mengunduh.', 'err', 5000); }
    N.busy(el, false);
  };
  ACT['lic-newprod'] = () => A.openForm('Products', '', { tipe: 'digital', tipe_file: 'template', judul: 'Template Web Premium', label: 'Berlisensi per domain', harga: 249000, maks_domain: 1, deskripsi: 'Template web siap pakai. Dapatkan kode lisensi setelah pembayaran dan pasang di domain Anda.' }, () => { N.revalidate('u', 'lic.adm', {}); A.refreshPublic(); N.revalidate('u', 'c:Products', {}); });
  ACT['lic-set'] = async el => {
    const own = N.$('#lic-own').value, mx = N.$('#lic-max').value; N.busy(el, true);
    const r = await api('settings.save', { settings: { lisensi_domain_pemilik: own, lisensi_maks_domain: String(Math.max(1, Math.min(20, +mx || 1))) } }); N.busy(el, false);
    if (!r.success) return toast(r.message || 'Gagal menyimpan.', 'err', 5000);
    N.stale('u', 'lic.adm'); await N.revalidate('u', 'lic.adm', {}); N.softRender(); toast('Aturan domain disimpan. Unduh ulang nk-license.js bila daftar domain milik Anda berubah.', 'ok', 6000);
  };
  ACT['lic-rev'] = async el => {
    const k = el.getAttribute('data-k'), a = el.getAttribute('data-a');
    if (a === 'cabut' && !await N.confirmBox('Cabut lisensi ' + k + '? Semua domain pemakainya akan terkunci pada pengecekan berikutnya.', { ok: 'Cabut Lisensi', danger: true })) return;
    N.busy(el, true); const r = await api('license.admin', { aksi: a, kode: k }); N.busy(el, false);
    if (!r.success) return toast(r.message || 'Gagal.', 'err'); set(r); toast(a === 'cabut' ? 'Lisensi dicabut' : 'Lisensi dipulihkan', 'ok');
  };
  ACT['lic-free'] = async el => {
    if (!await N.confirmBox('Lepas domain ini dari lisensi? Slotnya kosong kembali.', { ok: 'Lepas', danger: true })) return;
    N.busy(el, true); const r = await api('license.admin', { aksi: 'lepas', id: el.getAttribute('data-id') }); N.busy(el, false);
    if (!r.success) return toast(r.message || 'Gagal.', 'err'); set(r); toast('Domain dilepas', 'ok');
  };
})(window);
