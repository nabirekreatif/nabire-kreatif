/* Halaman publik: beranda, katalog, produk, redeem, auth, checkout */
(function (w) {
  'use strict';
  const N = w.NK, { esc, rp, ic, ACT, FORM, INPUT, route, go, toast, api, use, setting, safeUrl, S } = N;
  const SS = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }, del(k) { try { sessionStorage.removeItem(k); } catch (e) { } } };

  /* ---------- komponen bersama ---------- */
  const SVC_ICON = [[/landing|promosi/i, 'globe'], [/toko|online|belanja/i, 'cart'], [/profile|company|profil/i, 'file'], [/undangan/i, 'mail'], [/kasir|pos|aplikasi/i, 'server']];
  const svcIcon = n => { for (const x of SVC_ICON) if (x[0].test(n)) return x[1]; return 'globe'; };
  function owned(id) { const b = N.bootData(); return !!(b && b.library && b.library.some(p => p.id === id)); }
  function pending(id) { const b = N.bootData(); return !!(b && b.orders && b.orders.some(o => o.id_produk === id && o.status === 'Menunggu')); }
  function coverHTML(p, chip) {
    const img = safeUrl(p.cover_url);
    return '<div class="cover">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async">' : N.ic(p.tipe === 'kelas' ? 'video' : 'box', 'lg')) + '<span class="chip">' + N.ic(p.tipe === 'kelas' ? 'video' : 'file', 'sm') + esc(chip || (p.tipe === 'kelas' ? 'Kelas Video' : 'Produk Digital')) + '</span>' + (p.badge ? '<span class="chip r">' + esc(p.badge) + '</span>' : '') + '</div>';
  }
  function pcard(p) {
    const disc = Number(p.harga_coret) > Number(p.harga) ? Math.round((1 - p.harga / p.harga_coret) * 100) : 0, own = owned(p.id), pend = pending(p.id);
    const meta = p.tipe_file === 'template' ? '<span>' + ic('code', 'sm') + 'Kode lisensi per domain</span><span>' + ic('download', 'sm') + 'Unduh via Drive</span>' : p.tipe_file === 'linkbio' ? '<span>' + ic('link', 'sm') + 'Editor mandiri + 6 produk</span><span>' + ic('shield', 'sm') + 'Akses Selamanya</span>' : p.tipe === 'kelas' ? '<span>' + ic('video', 'sm') + (p.modul || 0) + ' Modul Video</span><span>' + ic('users', 'sm') + 'Akses Selamanya</span>' : '<span>' + ic(p.tipe_file === 'pdf' ? 'eye' : 'download', 'sm') + (p.tipe_file === 'pdf' ? 'Baca langsung di web' : 'Unduh via Drive') + '</span><span>' + ic('shield', 'sm') + 'Akses Selamanya</span>';
    return '<article class="card pc hov">' + '<a href="#/produk/' + esc(p.id) + '" aria-label="' + esc(p.judul) + '">' + coverHTML(p) + '</a><div class="pc-b">' + (p.label ? '<div class="lbl">' + esc(p.label) + '</div>' : '') + '<a href="#/produk/' + esc(p.id) + '"><h4>' + esc(p.judul) + '</h4></a><p class="desc">' + esc(p.deskripsi) + '</p><div class="meta">' + meta + '</div><div class="pr">' + (disc ? '<s>' + rp(p.harga_coret) + '</s>' : '') + '<b>' + rp(p.harga) + '</b>' + (disc ? '<span class="pill or">Hemat ' + disc + '%</span>' : '') + '</div><div class="acts">' + (own ? '<a class="btn nav" href="#/saya" style="grid-column:1/-1">' + ic('check', 'sm') + 'Sudah Dimiliki · Buka</a>' : pend ? '<a class="btn soft" href="#/saya/riwayat" style="grid-column:1/-1">' + ic('clock', 'sm') + 'Menunggu persetujuan</a>' : '<a class="btn pri" href="#/beli/' + esc(p.id) + '">' + ic('cart', 'sm') + 'Beli</a><a class="btn soft" href="#/redeem?p=' + esc(p.id) + '">' + ic('key', 'sm') + 'Kode Akses</a>') + '</div></div></article>';
  }
  function demoCard(d) {
    const img = safeUrl(d.cover_url), link = safeUrl(d.link_demo);
    return '<article class="card pc demo hov"><div class="cover">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async">' : ic('globe', 'lg')) + '<span class="chip">' + ic('globe', 'sm') + esc(d.kategori || 'Demo') + '</span>' + (d.badge ? '<span class="pill or">' + esc(d.badge) + '</span>' : '') + '</div><div class="pc-b"><h4>' + esc(d.judul) + '</h4><p class="desc">' + esc(d.deskripsi) + '</p><div class="acts" style="grid-template-columns:1fr;margin-top:auto">' + (link ? '<a class="btn nav" href="' + esc(link) + '" target="_blank" rel="noopener">Buka Demo Interaktif ' + ic('ext', 'sm') + '</a>' : '<span class="btn soft" style="pointer-events:none">Segera hadir</span>') + '</div></div></article>';
  }
  function secHead(eyebrow, title, sub, right) { return '<div class="sec-h"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h2 class="h2 mt" style="margin-top:6px">' + title + '</h2></div>' + (sub ? '<p class="muted">' + esc(sub) + '</p>' : '') + (right || '') + '</div>'; }
  const skel = n => Array.from({ length: n }, () => '<div class="card"><div class="sk" style="height:140px"></div><div class="sk" style="height:18px;margin-top:14px;width:70%"></div><div class="sk" style="height:14px;margin-top:10px"></div></div>').join('');

  /* ---------- BERANDA ---------- */
  function secLayanan(P) {
    const sv = P.services || [], web = sv.filter(s => s.kategori !== 'Aplikasi'), app = sv.filter(s => s.kategori === 'Aplikasi');
    const fit = s => String(s.fitur || '').split('|').filter(Boolean).map(f => '<li>' + ic('check') + esc(f) + '</li>').join('');
    return '<section class="sec" id="sec-layanan"><div class="wrap-c">' + secHead('Fitur utama', web.length + app.length + ' Layanan Unggulan Siap Pakai', 'Pilihan paket disesuaikan dengan skala usaha lokal di Nabire. Transparan, bergaransi, dan ramah pengguna pemula.') + '<div class="svc-grid">' +
      web.map(s => '<a class="card svc hov" href="#/jasa?l=' + encodeURIComponent(s.nama) + '"><div class="row between"><div class="ico">' + ic(svcIcon(s.nama)) + '</div><span class="price">Mulai ' + rp(s.harga_mulai) + '</span></div><h3>' + esc(s.nama) + '</h3><p class="small muted">' + esc(s.deskripsi) + '</p><ul>' + fit(s) + '</ul><span class="btn soft sm">Pilih Layanan ini</span></a>').join('') + '</div>' +
      app.map(s => '<div class="card svc svc-app"><div><div class="row wrap" style="gap:10px"><span class="pill" style="background:var(--orange);color:#fff">Rekomendasi UMKM</span><span class="price">Mulai ' + rp(s.harga_mulai) + '</span></div><h3>' + esc(s.nama) + '</h3><p class="small">' + esc(s.deskripsi) + '</p><a class="btn pri" href="#/jasa?l=' + encodeURIComponent(s.nama) + '">Pesan Aplikasi Web</a></div><ul>' + fit(s) + '</ul></div>').join('') + '</div></section>';
  }
  function marquee() {
    const it = [['cart', 'Website Toko Online'], ['server', 'Aplikasi Kasir / POS'], ['link', 'Link Bio Kustom'], ['video', 'Kelas Video Online'], ['key', 'Redeem Kode Akses'], ['shield', 'Transfer Bank & QRIS'], ['mail', 'Undangan Digital'], ['globe', 'Website UMKM'], ['file', 'Template & E-Book']], row = it.map(x => '<span>' + ic(x[0]) + x[1] + '</span>').join('');
    return '<div class="mq" aria-hidden="true"><div class="mq-t">' + row + row + '</div></div>';
  }
  function secDemo(P) {
    const d = P.demos || [];
    return '<section class="sec" id="sec-demo" style="background:#fff"><div class="wrap-c">' + secHead('Showcase portofolio', 'Galeri Karya Demo Nyata', 'Coba langsung demo website dan aplikasi yang sudah beroperasi di Nabire sebelum Anda memutuskan untuk memesan.') + (d.length ? '<div class="g3">' + d.map(demoCard).join('') + '</div>' : '<div class="card empty">' + ic('globe') + '<p>Karya demo akan segera ditampilkan.</p></div>') + '</div></section>';
  }
  function secKatalog(P) {
    const pr = (P.products || []).slice(0, 6);
    return '<section class="sec" id="sec-katalog"><div class="wrap-c">' + secHead('Katalog digital & kelas', 'Peralatan Digital Siap Unduh & Belajar', '', '<div class="row"><a class="btn soft sm" href="#/katalog">Lihat Semua Produk</a><a class="btn nav sm" href="#/redeem">' + ic('key', 'sm') + 'Redeem Kode</a></div>') + (pr.length ? '<div class="g3">' + pr.map(pcard).join('') + '</div>' : '<div class="card empty">' + ic('box') + '<p>Produk akan segera tersedia.</p></div>') + '</div></section>';
  }
  function secTesti(P) {
    const t = P.testimonials || []; if (!t.length) return '';
    return '<section class="sec" id="sec-testimoni" style="background:#fff"><div class="wrap-c center"><div class="eyebrow">Bukti kepuasan klien</div><h2 class="h2" style="margin:6px 0 24px">Apa Kata Pemilik Usaha di Nabire?</h2><div class="g3" style="text-align:left">' + t.map(x => '<div class="card quote"><div class="stars">' + '★'.repeat(Math.max(1, Math.min(5, Number(x.rating) || 5))) + '</div><p>“' + esc(x.isi) + '”</p><div class="row"><div class="avatar">' + (safeUrl(x.foto_url) ? '<img src="' + esc(safeUrl(x.foto_url)) + '" alt="" loading="lazy">' : esc(N.initials(x.nama))) + '</div><div><b>' + esc(x.nama) + '</b><div class="tiny muted">' + esc(x.jabatan) + '</div></div></div></div>').join('') + '</div></div></section>';
  }
  function secPesan(P, q) {
    const sv = P.services || [], me = S.session, pre = q.get('l') || SS.get('nk.svc') || '';
    return '<section class="sec" id="sec-pesan"><div class="wrap-c"><div class="card" style="padding:0;overflow:hidden"><div class="g2c" style="display:grid;gap:0;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div style="padding:28px;background:linear-gradient(135deg,#eaf3ff,#fff)"><div class="eyebrow">Formulir pesanan cepat</div><h2 class="h2" style="margin:6px 0 10px">Siap Membawa Bisnis Anda Go Digital?</h2><p class="muted">Isi data kebutuhan Anda. Tim kami akan menghubungi untuk estimasi biaya dan konfirmasi lewat WhatsApp atau Gmail sesuai pilihan Anda.</p><div class="col mt2" style="gap:16px"><div class="row" style="align-items:flex-start"><span class="stepn">' + ic('clock') + '</span><div><b>Respons cepat</b><p class="small muted">Konsultasi awal gratis, tanpa kewajiban.</p></div></div><div class="row" style="align-items:flex-start"><span class="stepn o">' + ic('users') + '</span><div><b>Dukungan tatap muka di Nabire</b><p class="small muted">Bisa bertemu langsung untuk diskusi kebutuhan.</p></div></div><div class="row" style="align-items:flex-start"><span class="stepn">' + ic('shield') + '</span><div><b>Pengerjaan transparan</b><p class="small muted">Teknologi Google Sheets & Drive, tanpa langganan bulanan.</p></div></div></div></div>' +
      '<div style="padding:28px" id="req-box"><form data-form="request" novalidate><div class="grid2"><div class="fg"><label class="fl" for="r-nama">Nama Lengkap / Nama Usaha *</label><input class="in" id="r-nama" name="nama" required maxlength="80" autocomplete="name" value="' + esc(me ? me.nama : '') + '" placeholder="Contoh: Rubon Rumah Makan"></div><div class="fg"><label class="fl" for="r-email">Alamat Email</label><input class="in" id="r-email" name="email" type="email" autocomplete="email" value="' + esc(me ? me.email : '') + '" placeholder="nama@gmail.com"></div></div><div class="grid2"><div class="fg"><label class="fl" for="r-wa">Nomor WhatsApp *</label><input class="in" id="r-wa" name="wa" inputmode="tel" required autocomplete="tel" placeholder="081234567890"></div><div class="fg"><label class="fl" for="r-l">Pilihan Layanan</label><select class="in" id="r-l" name="layanan">' + sv.map(s => '<option ' + (s.nama === pre ? 'selected' : '') + '>' + esc(s.nama) + '</option>').join('') + '<option>Lainnya / belum tahu</option></select></div></div><div class="fg"><label class="fl" for="r-d">Deskripsi Kebutuhan & Detail Usaha</label><textarea class="in" id="r-d" name="deskripsi" maxlength="1500" placeholder="Ceritakan jenis usaha, lokasi di Nabire, dan fitur khusus yang Anda inginkan."></textarea></div><div class="fg"><label class="fl">Kirim konfirmasi melalui</label><div class="row wrap"><label class="row card flat" style="padding:10px 14px;cursor:pointer"><input type="radio" name="preferensi" value="WhatsApp" checked> ' + ic('chat', 'sm') + ' WhatsApp Admin</label><label class="row card flat" style="padding:10px 14px;cursor:pointer"><input type="radio" name="preferensi" value="Gmail"> ' + ic('mail', 'sm') + ' Email (Gmail)</label></div></div><div class="err-t hide" id="r-err"></div><button class="btn pri block" type="submit">' + ic('send') + 'Kirim Permintaan Pemesanan Jasa</button></form></div></div></div></div></section>';
  }
  function homePage(anchor) {
    return {
      layout: 'pub', title: anchor === 'sec-pesan' ? 'Pesan Jasa Website' : '', anchor: anchor,
      render(m, q) {
        const P = N.usePub(), st = N.jsonSetting('hero_stat'), order = String(setting('beranda_bagian') || 'layanan,demo,katalog,testimoni,pesan').split(',').map(x => x.trim());
        const parts = { layanan: secLayanan, demo: secDemo, katalog: secKatalog, testimoni: secTesti, pesan: s => secPesan(s, q) };
        const hero = '<section class="hero"><div class="wrap-c hero-g"><div><span class="pill" style="background:#fff;box-shadow:var(--sh)"><span class="dot"></span>' + esc(setting('hero_badge')) + '</span><h1 class="h1" style="margin-top:16px"><span class="b">' + esc(setting('hero_judul')) + '</span> <span class="a">' + esc(setting('hero_judul_aksen')) + '</span></h1><p class="muted" style="margin-top:14px;font-size:16px;max-width:520px">' + esc(setting('hero_sub')) + '</p><div class="row wrap mt"><a class="btn pri" href="#/jasa">' + ic('send') + 'Pesan Jasa Website</a><a class="btn out" href="#/demo">' + ic('eye') + 'Lihat Demo Portofolio & Katalog</a></div><div class="hero-st">' + st.map(s => '<div><b>' + esc(s.n) + '</b><span>' + esc(s.l) + '</span></div>').join('') + '</div></div><div class="hero-img" aria-hidden="true"><div class="chipbox"><img src="' + esc(safeUrl(setting('logo_url')) || 'assets/logo.png') + '" alt=""></div><div class="hero-badge">' + ic('shield') + '<span>Verifikasi Instan<br><span style="font-weight:500;color:var(--mute)">Otomatis via Gmail & Sheets</span></span></div></div></div></section>';
        return hero + marquee() + order.filter(k => parts[k]).map(k => parts[k](P)).join('') + (order.indexOf('pesan') < 0 ? '' : '');
      },
      mount(root, m, q) { if (q.get('l')) SS.set('nk.svc', q.get('l')); }
    };
  }
  route(/^\/$/, homePage(''));
  route(/^\/layanan$/, homePage('sec-layanan'));
  route(/^\/demo$/, homePage('sec-demo'));
  route(/^\/testimoni$/, homePage('sec-testimoni'));
  route(/^\/jasa$/, homePage('sec-pesan'));

  FORM.request = async (f) => {
    const btn = f.querySelector('button[type=submit]'), err = N.$('#r-err'), d = Object.fromEntries(new FormData(f).entries());
    err.classList.add('hide');
    if (!d.nama.trim()) { err.textContent = 'Nama wajib diisi.'; err.classList.remove('hide'); return; }
    if (!/^(\+?62|0)8\d{7,12}$/.test(String(d.wa).replace(/[\s-]/g, ''))) { err.textContent = 'Nomor WhatsApp tidak valid (contoh 081234567890).'; err.classList.remove('hide'); return; }
    if (d.preferensi === 'Gmail' && !d.email.trim()) { err.textContent = 'Isi email bila memilih konfirmasi lewat Gmail.'; err.classList.remove('hide'); return; }
    N.busy(btn, true); const r = await api('request.create', d); N.busy(btn, false);
    if (!r.success) { err.textContent = r.message; err.classList.remove('hide'); return; }
    const wa = r.data.wa_admin || setting('wa_admin'), text = 'Halo ' + N.appName() + ', saya ' + d.nama + '. Saya ingin memesan: ' + d.layanan + '.' + (d.deskripsi ? ' ' + d.deskripsi.slice(0, 300) : '');
    N.$('#req-box').innerHTML = '<div class="center" style="padding:24px 0"><div class="stepn" style="margin:0 auto 14px;width:56px;height:56px;border-radius:50%;background:var(--ok)">' + ic('check', 'lg') + '</div><h3 class="h2" style="font-size:22px">Permintaan terkirim!</h3><p class="muted mt">Tim kami akan menghubungi Anda lewat ' + (d.preferensi === 'Gmail' ? 'email' : 'WhatsApp') + ' sesegera mungkin.</p>' + (wa ? '<a class="btn wa mt" href="' + esc(N.waLink(wa, text)) + '" target="_blank" rel="noopener">' + ic('chat', 'sm') + 'Chat Admin Sekarang</a>' : '') + '<p class="mt"><a href="#/">Kembali ke beranda</a></p></div>';
    SS.del('nk.svc');
  };

  /* ---------- KATALOG ---------- */
  const CAT = { q: '' };
  function catList(P, tab) {
    let a = (P.products || []).slice(); if (tab) a = a.filter(p => p.tipe === tab);
    const q = CAT.q.trim().toLowerCase(); if (q) a = a.filter(p => (p.judul + ' ' + p.deskripsi + ' ' + p.label).toLowerCase().indexOf(q) > -1); return a;
  }
  function catalogPage(tab) {
    return {
      layout: 'pub', title: tab === 'kelas' ? 'Kelas Online' : 'Produk Digital',
      render(m, q) {
        const P = N.usePub(), all = P.products || [], nd = all.filter(p => p.tipe === 'digital').length, nk = all.filter(p => p.tipe === 'kelas').length, list = catList(P, tab);
        return '<section class="sec tight"><div class="wrap-c"><div class="row wrap between" style="align-items:flex-end;gap:20px"><div style="max-width:620px"><span class="pill">' + ic('box', 'sm') + 'Katalog resmi ' + esc(N.appName()) + '</span><h1 class="h1" style="margin-top:12px">Produk Digital Terkurasi & Kelas Praktis Nabire</h1><p class="muted mt" style="margin-top:10px;font-size:16px">Pilih aset siap pakai untuk akselerasi UMKM atau ikuti kurikulum video step-by-step. Akses lewat transfer bank lokal, QRIS, maupun penukaran kode.</p></div><div class="card" style="min-width:min(100%,340px)"><div class="row small bold" style="color:var(--navy)">' + ic('key', 'sm') + 'Punya Kode Akses?<span class="mono muted tiny" style="margin-left:auto">LYNK.ID / PROMO</span></div><form class="row mt" data-form="quick-redeem" style="margin-top:10px"><input class="in mono" name="kode" placeholder="NK-XXXX-XXXX" autocomplete="off" style="min-height:44px"><button class="btn nav" style="min-height:44px">Klaim</button></form><p class="tiny muted" style="margin-top:6px">Akses langsung ditautkan ke akun member Anda.</p></div></div>' +
          '<div class="row wrap between mt2" style="margin-top:28px"><div class="tabs"><a class="tab ' + (!tab ? 'on' : '') + '" href="#/katalog">' + ic('grid', 'sm') + 'Semua <em>' + all.length + '</em></a><a class="tab ' + (tab === 'digital' ? 'on' : '') + '" href="#/katalog/digital">' + ic('file', 'sm') + 'Produk Digital <em>' + nd + '</em></a><a class="tab ' + (tab === 'kelas' ? 'on' : '') + '" href="#/katalog/kelas">' + ic('video', 'sm') + 'Kelas Online <em>' + nk + '</em></a></div><div class="searchbox">' + ic('search', 'sm') + '<input class="in" data-input="cat-q" placeholder="Cari produk, kelas, atau kata kunci" value="' + esc(CAT.q) + '" aria-label="Cari"></div></div></div></section>' +
          '<section class="sec tight"><div class="wrap-c"><div class="g3" id="cat-grid">' + (all.length || N.hasEntry('pub', 'pub') ? (list.length ? list.map(pcard).join('') : '<div class="card empty" style="grid-column:1/-1">' + ic('search') + '<p>Tidak ada produk yang cocok.</p></div>') : skel(3)) + '</div></div></section>' +
          '<section class="sec cta-band"><div class="wrap-c center"><span class="pill">Standar transaksi aman</span><h2 class="h2" style="margin:10px 0 6px">Alur Pembelian 3 Langkah Sederhana</h2><p class="muted" style="max-width:560px;margin:0 auto 24px">Diverifikasi manual oleh pemilik. Kode akses otomatis dikirim ke Gmail Anda.</p><div class="steps3" style="text-align:left"><div class="card"><div class="row between"><span class="stepn">1</span><span class="eyebrow" style="color:var(--mute)">Langkah pertama</span></div><h4 class="h3 mt">Rincian Pesanan</h4><p class="small muted">Pilih produk atau kelas, cek harga, lalu masuk dengan akun member.</p></div><div class="card"><div class="row between"><span class="stepn o">2</span><span class="eyebrow">Langkah kedua</span></div><h4 class="h3 mt">Transfer Bank / QRIS</h4><p class="small muted">Bayar sesuai nominal ke rekening atau scan QRIS resmi.</p></div><div class="card"><div class="row between"><span class="stepn">3</span><span class="eyebrow" style="color:var(--mute)">Langkah ketiga</span></div><h4 class="h3 mt">Bukti & Akses Gmail</h4><p class="small muted">Unggah bukti bayar. Setelah disetujui, akses terbuka dan kode dikirim ke email.</p></div></div></div></section>';
      }
    };
  }
  route(/^\/katalog$/, catalogPage(''));
  route(/^\/katalog\/digital$/, catalogPage('digital'));
  route(/^\/katalog\/kelas$/, catalogPage('kelas'));
  INPUT['cat-q'] = el => {
    CAT.q = el.value; const g = N.$('#cat-grid'); if (!g) return;
    const P = N.pubData(), tab = /kelas$/.test(location.hash) ? 'kelas' : /digital$/.test(location.hash) ? 'digital' : '', list = catList(P, tab);
    g.innerHTML = list.length ? list.map(pcard).join('') : '<div class="card empty" style="grid-column:1/-1">' + ic('search') + '<p>Tidak ada produk yang cocok.</p></div>';
  };
  FORM['quick-redeem'] = f => { const kode = String(new FormData(f).get('kode') || '').trim(); if (!kode) return toast('Masukkan kode akses.', 'err'); if (!S.session) { SS.set('nk.code', kode); toast('Masuk dulu untuk mengklaim kode.'); return go('/masuk'); } SS.set('nk.code', kode); go('/saya/klaim'); };

  /* ---------- DETAIL PRODUK ---------- */
  route(/^\/produk\/([\w-]+)$/, {
    layout: 'pub', title: m => { const p = (N.pubData().products || []).find(x => x.id === m[1]); return p ? p.judul : 'Produk'; },
    render(m) {
      const P = N.usePub(), p = (P.products || []).find(x => x.id === m[1]);
      if (!p) return '<div class="wrap-c sec center">' + (N.hasEntry('pub', 'pub') ? '<h2 class="h2">Produk tidak ditemukan</h2><a class="btn pri mt" href="#/katalog">Ke Katalog</a>' : '<div class="sk" style="height:300px"></div>') + '</div>';
      const own = owned(p.id), pend = pending(p.id), disc = Number(p.harga_coret) > Number(p.harga) ? Math.round((1 - p.harga / p.harga_coret) * 100) : 0;
      return '<section class="sec tight"><div class="wrap-c"><a class="btn ghost sm" href="#/katalog">' + ic('back', 'sm') + 'Katalog</a><div class="cx" style="grid-template-columns:1fr;max-width:none;margin-top:10px"><div class="g3" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;align-items:start"><div>' + coverHTML(p) + '</div><div class="col" style="gap:14px"><div class="row wrap"><span class="pill">' + (p.tipe === 'kelas' ? 'Kelas Video' : 'Produk Digital') + '</span>' + (p.badge ? '<span class="pill or">' + esc(p.badge) + '</span>' : '') + '</div><h1 class="h2" style="font-size:28px;line-height:36px">' + esc(p.judul) + '</h1>' + (p.label ? '<div class="mono small" style="color:var(--orange-d)">' + esc(p.label) + '</div>' : '') + '<p class="muted" style="white-space:pre-line">' + esc(p.deskripsi) + '</p><div class="row wrap">' + (p.tipe_file === 'linkbio' ? '<span class="pill">' + ic('link', 'sm') + 'Editor Link Bio mandiri</span>' : p.tipe === 'kelas' ? '<span class="pill">' + ic('video', 'sm') + (p.modul || 0) + ' modul video</span>' : '<span class="pill">' + ic(p.tipe_file === 'pdf' ? 'eye' : 'download', 'sm') + (p.tipe_file === 'pdf' ? 'Baca PDF langsung di web' : 'Unduh via link') + '</span>') + '<span class="pill ok">' + ic('shield', 'sm') + 'Akses selamanya</span></div><div class="pr row" style="align-items:baseline;gap:12px">' + (disc ? '<s class="mono muted">' + rp(p.harga_coret) + '</s>' : '') + '<b style="font-size:34px;color:var(--navy);letter-spacing:-.02em">' + rp(p.harga) + '</b>' + (disc ? '<span class="pill or">Hemat ' + disc + '%</span>' : '') + '</div><div class="row wrap">' + (own ? '<a class="btn nav" href="#/saya">' + ic('check', 'sm') + 'Sudah dimiliki — Buka</a>' : pend ? '<a class="btn soft" href="#/saya/riwayat">' + ic('clock', 'sm') + 'Menunggu persetujuan admin</a>' : '<a class="btn pri" href="#/beli/' + esc(p.id) + '">' + ic('cart') + 'Beli Sekarang</a><a class="btn out" href="#/redeem?p=' + esc(p.id) + '">' + ic('key') + 'Punya Kode Akses</a>') + '</div></div></div></div></div></section>';
    }
  });

  /* ---------- REDEEM (publik) ---------- */
  route(/^\/redeem$/, {
    layout: 'pub', title: 'Redeem Kode Akses',
    render(m, q) {
      if (S.session) { return '<div class="wrap-c sec center"><div class="sk" style="height:120px"></div></div>'; }
      const p = (N.pubData().products || []).find(x => x.id === q.get('p'));
      return '<div class="authw"><div class="auth card"><div class="center"><div class="stepn o" style="margin:0 auto 12px;width:52px;height:52px;border-radius:14px">' + ic('key', 'lg') + '</div><h1 class="h2" style="font-size:24px">Redeem Kode Akses</h1><p class="muted small mt" style="margin-top:6px">Masukkan kode yang Anda terima setelah membeli di Lynk.id' + (p ? ' untuk <b>' + esc(p.judul) + '</b>' : '') + '. 1 kode = 1 produk, sekali pakai.</p></div><form data-form="quick-redeem" class="mt"><div class="fg"><label class="fl" for="rd-k">Kode Akses</label><input class="in mono" id="rd-k" name="kode" placeholder="NK-XXXX-XXXX" autocomplete="off" autocapitalize="characters"></div><button class="btn pri block">' + ic('zap', 'sm') + 'Lanjut — Masuk & Klaim</button></form><p class="tiny muted center mt">Anda perlu akun member (gratis). Akses ditautkan ke akun Anda.</p></div></div>';
    },
    mount(root, m, q) { if (S.session) go('/saya/klaim', true); }
  });

  /* ---------- AUTH ---------- */
  function afterAuth(data) {
    N.applySession(data); const code = SS.get('nk.code'), next = SS.get('nk.next'); SS.del('nk.next');
    if (code && data.role !== 'superadmin') return go('/saya/klaim', true);
    if (next && next !== '/masuk' && next !== '/daftar') return go(next, true);
    go(data.role === 'superadmin' ? '/admin' : '/saya', true);
  }
  const eye = '<button type="button" class="btn ghost sm" data-act="pw-toggle" style="position:absolute;right:4px;top:4px;min-height:40px" aria-label="Tampilkan sandi">' + ic('eye', 'sm') + '</button>';
  ACT['pw-toggle'] = el => { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; };
  function authShell(title, sub, body, foot, google) {
    return '<div class="authw"><div class="auth card"><div class="center"><img src="' + esc(N.setting('logo_url') || 'assets/logo-icon.png') + '" alt="" width="56" height="56" style="margin:0 auto 10px;border-radius:14px"><h1 class="h2" style="font-size:24px">' + title + '</h1><p class="muted small" style="margin-top:4px">' + sub + '</p></div><div class="mt">' + body + '</div>' + (google && (setting('google_client_id') || (w.NK_CONFIG || {}).GOOGLE_CLIENT_ID) ? '<div class="divider">atau</div><div id="g-btn"></div>' : '') + '<p class="small center muted mt">' + foot + '</p></div></div>';
  }
  const gMount = () => N.mountGoogle(N.$('#g-btn'), async cred => { const r = await api('auth.google', { credential: cred }); if (!r.success) return toast(r.message, 'err'); afterAuth(r.data); });
  route(/^\/masuk$/, {
    layout: 'pub', title: 'Masuk',
    render() { if (S.session) return ''; return authShell('Masuk ke Area Member', 'Akses produk, kelas, dan riwayat pesanan Anda.', '<form data-form="login" novalidate><div class="fg"><label class="fl" for="l-e">Email</label><input class="in" id="l-e" name="email" type="email" autocomplete="username" required placeholder="nama@gmail.com"></div><div class="fg" style="position:relative"><label class="fl" for="l-p">Kata sandi</label><input class="in" id="l-p" name="password" type="password" autocomplete="current-password" required placeholder="Kata sandi Anda">' + eye + '</div><div class="err-t hide" id="a-err"></div><button class="btn pri block mt" type="submit">Masuk</button><p class="small center" style="margin-top:12px"><a href="#/lupa" style="color:var(--navy);font-weight:700">Lupa kata sandi?</a></p></form>', 'Belum punya akun? <a href="#/daftar" style="color:var(--navy);font-weight:700">Daftar gratis</a>', true); },
    mount() { if (S.session) return go(S.session.role === 'superadmin' ? '/admin' : '/saya', true); gMount(); }
  });
  route(/^\/daftar$/, {
    layout: 'pub', title: 'Daftar',
    render() { if (S.session) return ''; return authShell('Buat Akun Member', 'Gratis. Dibutuhkan untuk membeli dan mengakses produk.', '<form data-form="register" novalidate><div class="fg"><label class="fl" for="g-n">Nama lengkap</label><input class="in" id="g-n" name="nama" autocomplete="name" required maxlength="80"></div><div class="fg"><label class="fl" for="g-e">Email (Gmail)</label><input class="in" id="g-e" name="email" type="email" autocomplete="email" required placeholder="nama@gmail.com"><p class="hint">Kode & link akses dikirim ke email ini.</p></div><div class="fg"><label class="fl" for="g-w">Nomor WhatsApp <span class="muted" style="font-weight:500">(opsional)</span></label><input class="in" id="g-w" name="wa" inputmode="tel" autocomplete="tel" placeholder="081234567890"></div><div class="fg" style="position:relative"><label class="fl" for="g-p">Kata sandi</label><input class="in" id="g-p" name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Minimal 8 karakter">' + eye + '</div><div class="err-t hide" id="a-err"></div><button class="btn pri block mt" type="submit">Daftar & Masuk</button></form>', 'Sudah punya akun? <a href="#/masuk" style="color:var(--navy);font-weight:700">Masuk</a>', true); },
    mount() { if (S.session) return go('/saya', true); gMount(); }
  });
  const FG = { step: 1, email: '' };
  route(/^\/lupa$/, {
    layout: 'pub', title: 'Lupa kata sandi',
    render() { return FG.step === 1 ? authShell('Lupa Kata Sandi', 'Kami kirim kode 6 digit ke email Anda.', '<form data-form="forgot" novalidate><div class="fg"><label class="fl" for="f-e">Email terdaftar</label><input class="in" id="f-e" name="email" type="email" required value="' + esc(FG.email) + '" placeholder="nama@gmail.com"></div><div class="err-t hide" id="a-err"></div><button class="btn pri block" type="submit">Kirim Kode</button></form>', '<a href="#/masuk" style="color:var(--navy);font-weight:700">Kembali ke Masuk</a>') : authShell('Atur Ulang Kata Sandi', 'Kode dikirim ke <b>' + esc(FG.email) + '</b>. Berlaku 15 menit.', '<form data-form="reset" novalidate><div class="fg"><label class="fl" for="f-k">Kode 6 digit</label><input class="in mono" id="f-k" name="kode" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></div><div class="fg" style="position:relative"><label class="fl" for="f-p">Kata sandi baru</label><input class="in" id="f-p" name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="Minimal 8 karakter">' + eye + '</div><div class="err-t hide" id="a-err"></div><button class="btn pri block" type="submit">Simpan Kata Sandi</button></form>', '<a href="#/lupa" data-act="fg-back" style="color:var(--navy);font-weight:700">Kirim ulang kode</a>');
    }
  });
  ACT['fg-back'] = () => { FG.step = 1; N.renderRoute(true); };
  const showErr = (m) => { const e = N.$('#a-err'); if (e) { e.textContent = m; e.classList.remove('hide'); } };
  FORM.login = async f => { const d = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); N.$('#a-err').classList.add('hide'); if (!d.email || !d.password) return showErr('Isi email dan kata sandi.'); N.busy(b, true); const r = await api('auth.login', d); N.busy(b, false); if (!r.success) return showErr(r.message); afterAuth(r.data); };
  FORM.register = async f => { const d = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); N.$('#a-err').classList.add('hide'); if (d.password.length < 8) return showErr('Kata sandi minimal 8 karakter.'); N.busy(b, true); const r = await api('auth.register', d); N.busy(b, false); if (!r.success) return showErr(r.message); toast(r.message || 'Akun dibuat', 'ok'); afterAuth(r.data); };
  FORM.forgot = async f => { const d = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); N.$('#a-err').classList.add('hide'); N.busy(b, true); const r = await api('auth.forgot', d); N.busy(b, false); if (!r.success) return showErr(r.message); FG.email = d.email.trim().toLowerCase(); FG.step = 2; toast(r.message, 'ok', 5000); N.renderRoute(true); };
  FORM.reset = async f => { const d = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); d.email = FG.email; N.$('#a-err').classList.add('hide'); N.busy(b, true); const r = await api('auth.reset', d); N.busy(b, false); if (!r.success) return showErr(r.message); FG.step = 1; toast(r.message, 'ok'); go('/masuk'); };

  /* ---------- CHECKOUT ---------- */
  const CO = { id: '', step: 1, metode: 'transfer', file: null, done: null, busy: false };
  function stepper(s) { return '<div class="stp">' + ['Rincian', 'Pembayaran', 'Bukti'].map((t, i) => '<div class="' + (s === i + 1 ? 'on' : s > i + 1 ? 'dn' : '') + '">' + (i + 1) + '. ' + t + '</div>').join('') + '</div>'; }
  route(/^\/beli\/([\w-]+)$/, {
    layout: 'pub', title: 'Pembelian', auth: 'member',
    render(m) {
      const P = N.usePub(); if (CO.id !== m[1]) { CO.id = m[1]; CO.step = 1; CO.metode = 'transfer'; CO.file = null; CO.done = null; }
      const p = (P.products || []).find(x => x.id === m[1]);
      if (!p) return '<div class="wrap-c sec center">' + (N.hasEntry('pub', 'pub') ? '<h2 class="h2">Produk tidak ditemukan</h2><a class="btn pri mt" href="#/katalog">Ke Katalog</a>' : '<div class="sk" style="height:260px"></div>') + '</div>';
      const me = S.session, own = owned(p.id), pend = pending(p.id), rek = N.jsonSetting('rekening'), qris = safeUrl(setting('qris_url')), ext = safeUrl(p.link_bayar);
      const summary = '<div class="card" style="position:sticky;top:76px"><h3 style="font-size:16px">Ringkasan Pesanan</h3><div class="row mt" style="margin-top:12px;align-items:flex-start"><div style="width:84px;flex:none">' + coverHTML(p, p.tipe === 'kelas' ? 'Kelas' : 'Digital').replace('class="chip"', 'class="chip hide"') + '</div><div><b>' + esc(p.judul) + '</b><div class="tiny muted">' + (p.tipe === 'kelas' ? 'Kelas Video' : 'Produk Digital') + '</div></div></div><div style="margin-top:12px"><div class="sumrow"><span>Harga</span><span>' + rp(p.harga) + '</span></div>' + (Number(p.harga_coret) > Number(p.harga) ? '<div class="sumrow"><span>Diskon</span><span style="color:var(--ok)">− ' + rp(p.harga_coret - p.harga) + '</span></div>' : '') + '<div class="sumrow tot"><span>Total Bayar</span><span>' + rp(p.harga) + '</span></div></div><p class="tiny muted">Kode & link akses dikirim ke <b>' + esc(me.email) + '</b> setelah pembayaran disetujui.</p></div>';
      let main;
      if (CO.done) main = '<div class="card center" style="padding:32px"><div class="stepn" style="margin:0 auto 14px;width:60px;height:60px;border-radius:50%;background:var(--ok)">' + ic('check', 'lg') + '</div><h2 class="h2" style="font-size:22px">Bukti pembayaran terkirim</h2><p class="muted mt">Nomor pesanan <b class="mono">' + esc(CO.done.kode_order) + '</b>. Admin akan memverifikasi, lalu akses terbuka otomatis dan kode dikirim ke Gmail Anda.</p><div class="row wrap mt" style="justify-content:center"><a class="btn pri" href="#/saya/riwayat">Lihat Riwayat Pesanan</a><a class="btn soft" href="#/katalog">Lanjut Belanja</a></div></div>';
      else if (own) main = '<div class="card center"><h3>Anda sudah memiliki produk ini</h3><a class="btn nav mt" href="#/saya">Buka di Area Member</a></div>';
      else if (pend) main = '<div class="card center"><div class="alert info" style="text-align:left">' + ic('clock') + '<span>Pesanan produk ini sedang menunggu persetujuan admin. Anda akan menerima email saat disetujui.</span></div><a class="btn soft mt" href="#/saya/riwayat">Lihat Riwayat</a></div>';
      else if (CO.step === 1) main = '<div class="card">' + stepper(1) + '<h3>Rincian Pesanan</h3><p class="muted small mt" style="margin-top:6px">' + esc(p.deskripsi) + '</p><dl class="kv mt"><dt>Produk</dt><dd><b>' + esc(p.judul) + '</b></dd><dt>Akun pembeli</dt><dd>' + esc(me.nama) + ' · ' + esc(me.email) + '</dd><dt>Pengiriman</dt><dd>Kode & link akses lewat Gmail</dd></dl><button class="btn pri block mt2" data-act="co-next" style="margin-top:22px">Lanjut ke Pembayaran ' + ic('arrow', 'sm') + '</button>' + (own ? '' : '<p class="small center muted" style="margin-top:12px">Sudah punya kode dari Lynk.id? <a href="#/saya/klaim" style="color:var(--navy);font-weight:700">Redeem di sini</a></p>') + '</div>';
      else if (CO.step === 2) main = '<div class="card">' + stepper(2) + '<h3>Pembayaran</h3><div class="seg mt" style="margin-top:12px">' + '<button class="' + (CO.metode === 'transfer' ? 'on' : '') + '" data-act="co-metode" data-v="transfer">Transfer Bank</button>' + (qris ? '<button class="' + (CO.metode === 'qris' ? 'on' : '') + '" data-act="co-metode" data-v="qris">QRIS</button>' : '') + '</div>' +
        (CO.metode === 'qris' && qris ? '<div class="mt center"><div class="qris"><img src="' + esc(qris) + '" alt="QRIS"></div><p class="small muted mt">Scan dengan e-wallet / m-banking. Nominal: <b>' + rp(p.harga) + '</b></p></div>' : '<div class="col mt" style="margin-top:14px">' + (rek.length ? rek.map(r => '<div class="rek"><div><div class="tiny muted">' + esc(r.bank) + ' · a.n. ' + esc(r.nama) + '</div><b>' + esc(r.no) + '</b></div><button class="btn soft xs" data-act="copy" data-v="' + esc(r.no) + '">' + ic('copy', 'sm') + 'Salin</button></div>').join('') : '<div class="alert">' + ic('alert') + '<span>Rekening belum diatur admin. Hubungi admin via WhatsApp.</span></div>') + '</div>') +
        '<div class="alert info mt" style="margin-top:14px">' + ic('info') + '<span>' + esc(setting('info_bayar')) + '</span></div>' + (ext ? '<a class="btn out block mt" style="margin-top:14px" href="' + esc(ext) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + 'Bayar lewat link pembayaran luar</a><p class="tiny muted center" style="margin-top:6px">Setelah membayar di link luar, Anda akan menerima kode akses dan bisa menukarnya di menu Redeem.</p>' : '') + '<div class="row mt2" style="margin-top:20px"><button class="btn ghost" data-act="co-prev">' + ic('back', 'sm') + 'Kembali</button><button class="btn pri grow" data-act="co-next">Saya Sudah Membayar — Unggah Bukti</button></div></div>';
      else main = '<div class="card">' + stepper(3) + '<h3>Unggah Bukti Pembayaran</h3><p class="small muted mt" style="margin-top:6px">Foto struk transfer / tangkapan layar QRIS. Format JPG, PNG, WEBP, atau PDF (maks ±3 MB). Foto otomatis diperkecil.</p><label class="drop mt" id="drop" style="display:block;margin-top:14px">' + (CO.file ? (CO.file.preview ? '<img src="' + CO.file.preview + '" alt="Pratinjau bukti">' : '<div class="stepn" style="margin:0 auto 8px">' + ic('file') + '</div>') + '<div class="small bold">' + esc(CO.file.name) + '</div><div class="tiny muted">Ketuk untuk mengganti</div>' : '<div style="color:var(--navy)">' + ic('upload', 'lg') + '</div><b>Pilih atau seret berkas bukti</b><div class="tiny muted">Ketuk untuk membuka galeri / kamera</div>') + '<input type="file" id="co-file" data-change="co-file" accept="image/*,application/pdf" style="display:none"></label><div class="err-t hide" id="co-err"></div><div class="row mt2" style="margin-top:20px"><button class="btn ghost" data-act="co-prev">' + ic('back', 'sm') + 'Kembali</button><button class="btn pri grow" data-act="co-send" ' + (CO.file ? '' : 'disabled') + '>' + ic('send', 'sm') + 'Kirim Bukti Pembayaran</button></div></div>';
      return '<section class="sec tight"><div class="wrap-c"><a class="btn ghost sm" href="#/produk/' + esc(p.id) + '">' + ic('back', 'sm') + 'Kembali ke produk</a><div class="cx" style="margin-top:10px"><div>' + main + '</div>' + summary + '</div></div></section>';
    },
    mount() {
      const d = N.$('#drop'); if (!d) return;
      ['dragover', 'dragenter'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove('over'); }));
      d.addEventListener('drop', e => { if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); });
    }
  });
  async function pickFile(file) { try { CO.file = await N.readFile(file, 1600, 0.82); N.renderRoute(true); } catch (e) { toast(e.message, 'err'); } }
  INPUT['co-file'] = el => { if (el.files[0]) pickFile(el.files[0]); };
  ACT['co-next'] = () => { CO.step = Math.min(3, CO.step + 1); N.renderRoute(false); };
  ACT['co-prev'] = () => { CO.step = Math.max(1, CO.step - 1); N.renderRoute(false); };
  ACT['co-metode'] = el => { CO.metode = el.getAttribute('data-v'); N.renderRoute(true); };
  ACT['co-send'] = async el => {
    if (!CO.file || CO.busy) return; CO.busy = true; N.busy(el, true);
    const r = await api('order.create', { productId: CO.id, metode: CO.metode, bukti: { name: CO.file.name, mime: CO.file.mime, data: CO.file.data } });
    CO.busy = false; N.busy(el, false);
    if (!r.success) { const e = N.$('#co-err'); if (e) { e.textContent = r.message; e.classList.remove('hide'); } return toast(r.message, 'err'); }
    N.sset('u', 'boot', r.data.boot); CO.done = r.data.order; CO.file = null; toast(r.message, 'ok'); N.renderRoute(false);
  };

  w.NKP = { pcard, coverHTML, owned, pending, afterAuth, SS };
})(window);
