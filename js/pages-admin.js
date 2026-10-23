/* Panel Admin (bagian 1): dasbor, persetujuan, kode akses, katalog/CRUD, member, jasa, beranda, statistik, backup, sistem */
(function (w) {
  'use strict';
  const N = w.NK, { esc, rp, ic, ACT, FORM, INPUT, route, go, toast, api, use, safeUrl, S, clone } = N;
  const ADM = { layout: 'adm', auth: 'admin' };
  const adm = (def) => Object.assign({}, ADM, def);

  /* ---------- helper tampilan ---------- */
  const rpShort = n => { n = Number(n) || 0; if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M'; if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(2).replace('.', ',').replace(/,?0+$/, '') + ' jt'; return rp(n); };
  const head = (eyebrow, title, sub, right) => '<div class="ph row between wrap" style="align-items:flex-end;gap:14px"><div><div class="eyebrow">' + (eyebrow ? '<span class="dot"></span>' + esc(eyebrow) : '') + '</div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right ? '<div class="row wrap">' + right + '</div>' : '') + '</div>';
  const skelBox = (h) => '<div class="card"><div class="sk" style="height:' + (h || 120) + 'px"></div></div>';
  const skelRows = n => '<div class="col">' + Array.from({ length: n || 4 }, () => '<div class="sk" style="height:54px"></div>').join('') + '</div>';
  const empty = (icon, text, extra) => '<div class="empty">' + ic(icon) + '<p>' + text + '</p>' + (extra || '') + '</div>';
  const orderPill = s => s === 'Disetujui' ? '<span class="pill ok">Disetujui</span>' : s === 'Ditolak' ? '<span class="pill err">Ditolak</span>' : '<span class="pill warn">Menunggu</span>';
  const switchH = (on, attrs) => '<label class="sw"><input type="checkbox" ' + (on ? 'checked' : '') + ' ' + attrs + '><i></i></label>';
  const kpi = (label, icon, value, sub, cls, subCls) => '<div class="card kpi ' + (cls || '') + '"><div class="l"><span>' + label + '</span><i>' + ic(icon, 'sm') + '</i></div><div class="v">' + value + '</div><div class="s ' + (subCls || '') + '">' + sub + '</div></div>';
  const mailto = (to, sub) => 'mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(sub || '');
  const refreshPublic = () => { N.stale('pub', 'pub'); N.revalidate('pub', 'pub', {}); };
  const snap = keys => keys.map(k => { const e = N.sget('u', k); return [k, e ? clone(e.v) : undefined]; });
  const restore = s => s.forEach(x => { if (x[1] !== undefined) { N.sset('u', x[0], x[1]); N.emit('u' + x[0]); } });
  const ST = { orderTab: 'Menunggu', codeProd: '', codeStatus: '', memQ: '', memS: '', jasaTab: '', statDays: 14 };
  const GEN = { data: null };
  const products = () => use('c:Products', { ttl: 60000 }) || [];

  /* ---------- Dasbor ---------- */
  function apRow(o) {
    return '<div class="ap"><div class="th" data-act="adm-bukti" data-id="' + esc(o.id) + '" title="Lihat bukti" role="button">' + ic(o.ada_bukti ? 'image' : 'file', 'lg') + '<small>' + esc(o.metode) + '</small></div><div class="inf"><div class="row wrap" style="gap:8px"><b>' + esc(o.nama) + '</b><span class="pill mono">' + esc(o.kode_order) + '</span><span class="tiny mono muted">' + N.tm(o.tgl_pesan) + ' WIT · ' + N.ago(o.tgl_pesan) + '</span></div><div class="small">' + esc(o.judul_produk) + '</div><div class="small mono muted"><b style="color:var(--navy)">' + rp(o.total) + '</b> · ' + esc(o.email) + '</div></div><div class="acts"><button class="btn danger sm" data-act="ap-reject" data-id="' + esc(o.id) + '">' + ic('x', 'sm') + 'Tolak</button><button class="btn pri sm" data-act="ap-approve" data-id="' + esc(o.id) + '">' + ic('check', 'sm') + 'Setujui & Kirim Gmail</button></div></div>';
  }
  function genCard() {
    const prods = products().filter(p => p.aktif !== 'TIDAK'), g = GEN.data;
    return '<div class="card"><div class="card-h"><div class="ico">' + ic('key') + '</div><div><h3>Generator Kode Akses</h3><div class="tiny mono muted">EKSPOR KE LYNK.ID</div></div></div><p class="small muted">Buat batch kode acak (1 kode = 1 produk, sekali pakai) untuk dijual lewat Lynk.id atau platform lain.</p><form data-form="gen" class="mt" style="margin-top:14px"><div class="fg"><label class="fl" for="g-p">Target Produk / Kelas</label><select class="in" id="g-p" name="productId" required>' + (prods.length ? prods.map(p => '<option value="' + esc(p.id) + '">' + (p.tipe === 'kelas' ? 'Kelas: ' : 'Produk: ') + esc(p.judul) + '</option>').join('') : '<option value="">(Belum ada produk)</option>') + '</select></div><div class="grid2"><div class="fg"><label class="fl" for="g-j">Jumlah</label><select class="in" id="g-j" name="jumlah">' + [5, 10, 25, 50, 100, 200].map(n => '<option ' + (n === 10 ? 'selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="fg"><label class="fl" for="g-x">Prefix</label><input class="in mono" id="g-x" name="prefix" value="NK" maxlength="8"></div></div><button class="btn nav block" type="submit" ' + (prods.length ? '' : 'disabled') + '>' + ic('zap', 'sm') + 'Generate Batch Baru</button></form>' +
      (g ? '<div class="mt" style="margin-top:16px;background:var(--bg2);border-radius:12px;padding:12px"><div class="row between wrap"><span class="small bold">Batch: <span class="mono">' + esc(g.batch) + '</span> (' + g.kode.length + ' kode)</span><span class="pill ok">Tersedia</span></div><div class="small muted ell">' + esc(g.produk) + '</div><div class="col mt" style="margin-top:8px;max-height:200px;overflow:auto;gap:6px">' + g.kode.slice(0, 50).map(k => '<div class="code" style="padding:7px 10px;font-size:13px"><span>' + esc(k) + '</span><button data-act="copy" data-v="' + esc(k) + '" aria-label="Salin">' + ic('copy', 'sm') + '</button></div>').join('') + (g.kode.length > 50 ? '<div class="tiny muted center">+' + (g.kode.length - 50) + ' lainnya — ekspor CSV</div>' : '') + '</div><div class="row mt" style="margin-top:10px"><button class="btn soft sm grow" data-act="gen-csv">' + ic('download', 'sm') + 'Ekspor CSV</button><button class="btn soft sm grow" data-act="gen-copy">' + ic('copy', 'sm') + 'Salin Semua</button></div></div>' : '') + '</div>';
  }
  function barsChart(daily) {
    const max = Math.max.apply(null, daily.map(d => d.rp).concat([1]));
    return '<div class="bars">' + daily.map(d => '<div class="b" title="' + esc(d.d) + ': ' + rp(d.rp) + ' (' + d.n + ' pesanan)"><i style="height:' + Math.max(2, Math.round(d.rp / max * 100)) + '%"></i><span>' + d.d.slice(8) + '</span></div>').join('') + '</div>';
  }
  route(/^\/admin$/, adm({
    title: 'Dasbor Admin',
    render() {
      const a = use('adm', { ttl: 20000 }) || N.admData(); use('c:Products', { ttl: 60000 });
      if (!a) return head('', 'Dasbor Kendali Admin', '') + '<div class="g5">' + skelBox(110).repeat(5) + '</div><div class="mt">' + skelBox(240) + '</div>';
      const k = a.kpi, st = a.status || {}, up = k.rp_naik;
      const strip = '<div class="card flat row wrap" style="gap:18px;padding:12px 16px"><div><div class="tiny mono muted">SHEETS SYNC</div><b class="small" style="color:var(--ok)">● Terhubung</b></div><div><div class="tiny mono muted">GMAIL KUOTA</div><b class="small mono">' + (st.gmail_sisa == null ? '-' : st.gmail_sisa + ' tersisa') + '</b></div><div><div class="tiny mono muted">DRIVE BUKTI</div><b class="small mono">' + (st.drive_pakai ? (st.drive_pakai / 1073741824).toFixed(2) + ' GB' : '-') + '</b></div><div><div class="tiny mono muted">WHATSAPP</div><b class="small" style="color:' + (st.wa_aktif ? 'var(--ok)' : 'var(--mute)') + '">' + (st.wa_aktif ? '● Aktif' : '○ Nonaktif') + '</b></div></div>';
      const pend = a.pending || [], reqs = a.requests || [], bks = a.backups || [];
      return head('GAS Production v' + esc(st.versi || ''), 'Dasbor Kendali Admin', 'Otorisasi transaksi, manajemen kode akses, dan penugasan proyek UMKM.', strip) +
        '<div class="g5"><div title="' + rp(k.rp_bulan) + '">' + kpi('Pendapatan bulan ini', 'wallet', rpShort(k.rp_bulan), up == null ? 'belum ada pembanding' : (up >= 0 ? '▲ +' : '▼ ') + up + '% vs bulan lalu', '', up == null ? '' : up >= 0 ? 'up' : 'dn') + '</div>' + kpi('Menunggu konfirmasi', 'clock', k.menunggu + '<small>transfer masuk</small>', k.menunggu ? '● Butuh verifikasi' : 'Semua sudah diproses', 'o') + kpi('Pesanan jasa masuk', 'mega', k.jasa_baru + '<small>prospek baru</small>', 'dari formulir beranda') + kpi('Total member', 'users', k.member, '+' + k.member_baru + ' minggu ini', '', 'up') + kpi('Produk & kelas rilis', 'box', k.produk + '<small>aktif</small>', k.terjual + ' unit terjual') + '</div>' +
        '<div class="card mt" style="margin-top:16px"><div class="card-h"><div class="ico">' + ic('chart') + '</div><div><h3>Penjualan 14 Hari Terakhir</h3><p>Nilai pesanan yang disetujui per hari.</p></div><div class="tail"><span class="pill">' + rp(a.daily.reduce((s, d) => s + d.rp, 0)) + '</span></div></div>' + barsChart(a.daily) + '</div>' +
        '<div class="dgrid mt" style="margin-top:16px"><div class="card"><div class="card-h"><div class="ico">' + ic('shield') + '</div><div><h3>Pusat Persetujuan Pembayaran</h3><p>Verifikasi bukti transfer. Persetujuan otomatis membuka akses & mengirim kode lewat Gmail.</p></div><div class="tail row"><span class="pill or">' + pend.length + ' antrean</span><button class="btn ghost sm" data-act="reload" aria-label="Muat ulang">' + ic('refresh', 'sm') + '</button></div></div><div class="col" id="ap-list">' + (pend.length ? pend.map(apRow).join('') : empty('check', 'Tidak ada pembayaran yang menunggu. 🎉')) + '</div>' + (pend.length ? '<a class="btn soft sm mt" style="margin-top:12px" href="#/admin/persetujuan">Buka Pusat Persetujuan ' + ic('arrow', 'sm') + '</a>' : '') + '</div>' + genCard() + '</div>' +
        '<div class="dgrid mt" style="margin-top:16px"><div class="card"><div class="card-h"><div class="ico">' + ic('contact') + '</div><div><h3>Prospek Pesanan Jasa Masuk</h3><p>Permintaan pembuatan website / aplikasi dari formulir beranda.</p></div><a class="tail btn soft sm" href="#/admin/jasa">Semua</a></div>' + (reqs.length ? '<div class="tw"><table class="t"><thead><tr><th>Klien</th><th>Layanan</th><th>Kontak</th><th>Status</th><th></th></tr></thead><tbody>' + reqs.slice(0, 6).map(r => reqRow(r, true)).join('') + '</tbody></table></div>' : empty('mega', 'Belum ada pesanan jasa.')) + '</div><div class="card"><div class="card-h"><div class="ico">' + ic('cloud') + '</div><div><h3>Cadangan Data</h3><p>Backup otomatis tiap 23:30 WIT ke folder Drive.</p></div></div>' + (bks.length ? bks.map(b => '<div class="row between" style="background:var(--tint);border-radius:10px;padding:10px 12px;margin-bottom:8px"><div class="ell"><b class="small mono">' + esc(b.nama) + '</b><div class="tiny muted">' + N.ago(b.tanggal) + ' · ' + (b.ukuran ? (b.ukuran / 1048576).toFixed(1) + ' MB' : '-') + '</div></div><span class="pill">' + esc(b.ket) + '</span></div>').join('') : '<p class="small muted">Belum ada cadangan.</p>') + '<button class="btn soft block mt" style="margin-top:10px" data-act="backup-run">' + ic('cloud', 'sm') + 'Backup Manual Sekarang</button><a class="btn ghost block sm" href="#/admin/backup">Kelola backup</a></div></div>';
    }
  }));

  function reqRow(r, mini) {
    const wa = N.waLink(r.wa, 'Halo ' + r.nama + ', kami dari ' + N.appName() + ' menindaklanjuti permintaan ' + r.layanan + '.');
    return '<tr><td><b>' + esc(r.nama) + '</b><div class="sub">' + esc(N.dt(r.tgl)) + '</div></td><td>' + esc(r.layanan) + '</td><td><span class="pill">' + esc(r.preferensi) + '</span><div class="sub mono">' + esc(r.wa) + '</div></td><td>' + (mini ? '<span class="pill ' + (r.status === 'Selesai' ? 'ok' : r.status === 'Baru Masuk' ? 'or' : '') + '">' + esc(r.status) + '</span>' : '') + '</td><td class="right" style="white-space:nowrap"><a class="btn wa xs" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ic('chat', 'sm') + 'WA</a> ' + (r.email ? '<a class="btn soft xs" href="' + esc(mailto(r.email, 'Tindak lanjut ' + r.layanan)) + '">' + ic('mail', 'sm') + '</a>' : '') + '</td></tr>';
  }

  FORM.gen = async f => {
    const d = Object.fromEntries(new FormData(f).entries()), b = f.querySelector('button[type=submit]'); N.busy(b, true);
    const r = await api('code.generate', { productId: d.productId, jumlah: Number(d.jumlah), prefix: d.prefix }); N.busy(b, false);
    if (!r.success) return toast(r.message, 'err');
    GEN.data = r.data; toast(r.message, 'ok'); N.stale('u', 'codes'); N.revalidate('u', 'codes', {}); N.softRender();
  };
  ACT['gen-csv'] = () => { const g = GEN.data; if (!g) return; N.download('kode-akses-' + g.batch + '.csv', 'kode,produk,status\n' + g.kode.map(k => [k, g.produk, 'tersedia'].map(N.csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); };
  ACT['gen-copy'] = () => { if (GEN.data) N.copy(GEN.data.kode.join('\n'), GEN.data.kode.length + ' kode disalin'); };
  ACT['backup-run'] = async el => { N.busy(el, true); const r = await api('backup.run', {}); N.busy(el, false); if (!r.success) return toast(r.message, 'err'); toast(r.message, 'ok'); N.stale('u', 'adm'); N.revalidate('u', 'adm', {}); N.stale('u', 'backups'); N.revalidate('u', 'backups', {}); };

  /* ---------- Persetujuan ---------- */
  const BUKTI = new Map();
  function findOrder(id) { const e = N.sget('u', 'orders'), a = N.admData(); return (e && e.v.find(o => o.id === id)) || (a && (a.pending || []).find(o => o.id === id)) || null; }
  route(/^\/admin\/persetujuan$/, adm({
    title: 'Pusat Persetujuan',
    render() {
      const all = use('orders', { ttl: 20000 }), a = N.admData(); let list = all || (a ? a.pending : null);
      const cnt = s => (all || []).filter(o => o.status === s).length;
      const tabs = '<div class="tabs adm-tabs">' + ['Menunggu', 'Disetujui', 'Ditolak', 'Semua'].map(t => '<button class="tab ' + (ST.orderTab === t ? 'on' : '') + '" data-act="ord-tab" data-v="' + t + '">' + t + (all ? ' <em>' + (t === 'Semua' ? all.length : cnt(t)) + '</em>' : '') + '</button>').join('') + '</div>';
      if (!list) return head('Verifikasi pembayaran', 'Pusat Persetujuan', 'Cek bukti transfer lalu setujui untuk membuka akses pembeli.') + tabs + skelRows(4);
      if (ST.orderTab !== 'Semua') list = list.filter(o => o.status === ST.orderTab);
      return head('Verifikasi pembayaran', 'Pusat Persetujuan', 'Cek bukti transfer lalu setujui untuk membuka akses pembeli. Kode akses & link dikirim otomatis ke Gmail.', '<button class="btn soft sm" data-act="reload">' + ic('refresh', 'sm') + 'Muat ulang</button>') + tabs +
        '<div class="card"><div class="col">' + (list.length ? list.map(o => o.status === 'Menunggu' ? apRow(o) : '<div class="ap"><div class="th" data-act="adm-bukti" data-id="' + esc(o.id) + '" role="button">' + ic('image', 'lg') + '<small>' + esc(o.metode) + '</small></div><div class="inf"><div class="row wrap" style="gap:8px"><b>' + esc(o.nama) + '</b><span class="pill mono">' + esc(o.kode_order) + '</span>' + orderPill(o.status) + '</div><div class="small">' + esc(o.judul_produk) + '</div><div class="small mono muted"><b style="color:var(--navy)">' + rp(o.total) + '</b> · ' + esc(o.email) + ' · ' + N.dtm(o.tgl_pesan) + '</div>' + (o.kode_akses ? '<div class="tiny mono" style="color:var(--navy)">Kode: ' + esc(o.kode_akses) + '</div>' : '') + (o.status === 'Ditolak' && o.catatan ? '<div class="tiny err-t">Alasan: ' + esc(o.catatan) + '</div>' : '') + '</div></div>').join('') : empty('check', 'Tidak ada pesanan pada status ini.')) + '</div></div>';
    }
  }));
  ACT['ord-tab'] = el => { ST.orderTab = el.getAttribute('data-v'); N.softRender(); };
  ACT['adm-bukti'] = async el => {
    const id = el.getAttribute('data-id'), o = findOrder(id);
    const show = d => N.modal({ title: 'Bukti — ' + (o ? o.kode_order : ''), cls: 'wide', body: (o ? '<div class="row between wrap" style="margin-bottom:12px"><div><b>' + esc(o.nama) + '</b> · ' + esc(o.judul_produk) + '<div class="small mono muted">' + rp(o.total) + ' · ' + esc(o.metode) + ' · ' + N.dtm(o.tgl_pesan) + '</div></div>' + orderPill(o.status) + '</div>' : '') + (d.besar ? '<p>Berkas besar. <a href="' + esc(d.url) + '" target="_blank" rel="noopener">Buka di Google Drive</a></p>' : /pdf/.test(d.mime) ? '<iframe class="pdfv" src="data:' + esc(d.mime) + ';base64,' + d.data + '"></iframe>' : '<img src="data:' + esc(d.mime) + ';base64,' + d.data + '" alt="Bukti transfer" style="margin:0 auto;max-height:68vh;border-radius:8px">'), foot: o && o.status === 'Menunggu' ? '<button class="btn danger" data-act="ap-reject" data-id="' + esc(id) + '">Tolak</button><button class="btn pri" data-act="ap-approve" data-id="' + esc(id) + '">' + ic('check', 'sm') + 'Setujui & Kirim Gmail</button>' : '<button class="btn ghost" data-act="modal-close">Tutup</button>' });
    if (BUKTI.has(id)) return show(BUKTI.get(id));
    N.busy(el, true); const r = await api('order.bukti', { id: id }); N.busy(el, false);
    if (!r.success) return toast(r.message, 'err');
    BUKTI.set(id, r.data); if (BUKTI.size > 8) BUKTI.delete(BUKTI.keys().next().value); show(r.data);
  };
  ACT['ap-approve'] = async el => {
    const id = el.getAttribute('data-id'), o = findOrder(id); if (!o) return toast('Data belum dimuat, coba lagi.', 'err');
    N.closeModal(true);
    if (!await N.confirmBox('Setujui pembayaran <b>' + esc(o.nama) + '</b> sebesar <b>' + rp(o.total) + '</b> untuk <b>' + esc(o.judul_produk) + '</b>? Akses langsung terbuka dan kode dikirim ke ' + esc(o.email) + '.', { title: 'Setujui pembayaran', ok: 'Setujui & Kirim' })) return;
    const sn = snap(['orders', 'adm']);
    N.patchData('u', 'orders', l => { const x = l.find(y => y.id === id); if (x) { x.status = 'Disetujui'; x.tgl_proses = new Date().toISOString(); } });
    N.patchData('u', 'adm', a => { a.pending = a.pending.filter(y => y.id !== id); a.kpi.menunggu = Math.max(0, a.kpi.menunggu - 1); a.kpi.terjual++; a.kpi.rp_bulan += Number(o.total) || 0; const d = a.daily[a.daily.length - 1]; if (d) { d.n++; d.rp += Number(o.total) || 0; } });
    toast('Disetujui — mengirim kode ke ' + o.email, 'ok');
    const r = await api('order.approve', { id: id });
    if (!r.success) { restore(sn); return toast(r.message, 'err', 6000); }
    N.patchData('u', 'orders', l => { const x = l.find(y => y.id === id); if (x) x.kode_akses = r.data.kode; });
    ['codes', 'members'].forEach(k => N.stale('u', k)); N.stale('u', 'adm'); N.revalidate('u', 'adm', {});
  };
  ACT['ap-reject'] = async el => {
    const id = el.getAttribute('data-id'), o = findOrder(id); if (!o) return;
    N.modal({ title: 'Tolak pembayaran', body: '<form id="rej" data-form="reject"><p class="small muted">Pembeli <b>' + esc(o.nama) + '</b> · ' + rp(o.total) + '. Alasan akan dikirim ke pembeli.</p><div class="fg mt" style="margin-top:12px"><label class="fl" for="rj-a">Alasan penolakan *</label><textarea class="in" id="rj-a" name="alasan" required minlength="3" placeholder="Contoh: Nominal transfer tidak sesuai / bukti buram"></textarea></div><input type="hidden" name="id" value="' + esc(id) + '"></form>', foot: '<button class="btn ghost" data-act="modal-close">Batal</button><button class="btn danger" type="submit" form="rej">Tolak & Beri Tahu</button>' });
  };
  FORM.reject = async f => {
    const d = Object.fromEntries(new FormData(f).entries()); if (String(d.alasan).trim().length < 3) return toast('Tulis alasan penolakan.', 'err');
    N.closeModal(true); const sn = snap(['orders', 'adm']);
    N.patchData('u', 'orders', l => { const x = l.find(y => y.id === d.id); if (x) { x.status = 'Ditolak'; x.catatan = d.alasan; } });
    N.patchData('u', 'adm', a => { a.pending = a.pending.filter(y => y.id !== d.id); a.kpi.menunggu = Math.max(0, a.kpi.menunggu - 1); });
    const r = await api('order.reject', { id: d.id, alasan: d.alasan });
    if (!r.success) { restore(sn); return toast(r.message, 'err'); } toast(r.message, 'ok'); N.stale('u', 'adm'); N.revalidate('u', 'adm', {});
  };

  /* ---------- Kode akses ---------- */
  route(/^\/admin\/kode$/, adm({
    title: 'Kode Akses',
    render() {
      const c = use('codes', { ttl: 30000 }), prods = products();
      const rows = c ? c.rows.filter(r => (!ST.codeProd || r.id_produk === ST.codeProd) && (!ST.codeStatus || r.status === ST.codeStatus)) : [];
      return head('Lynk.id & promo', 'Kode Akses', 'Buat kode sekali pakai untuk dijual di Lynk.id atau dibagikan manual.') + '<div class="dgrid" style="grid-template-columns:1fr"><div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start">' + genCard() + '<div class="card"><div class="card-h"><div class="ico">' + ic('chart') + '</div><div><h3>Ringkasan Kode</h3></div></div>' + (c ? '<div class="row wrap"><span class="pill ok">Tersedia: ' + (c.stat.tersedia || 0) + '</span><span class="pill">Terpakai: ' + (c.stat.terpakai || 0) + '</span><span class="pill">Total: ' + c.total + '</span></div><p class="small muted mt" style="margin-top:12px">Kode dibuat otomatis juga saat pembayaran disetujui (status langsung terpakai oleh pembeli). Kode manual hanya bisa dipakai sekali oleh satu akun.</p>' : skelRows(2)) + '</div></div></div>' +
        '<div class="card mt" style="margin-top:16px"><div class="fbar"><select class="in" data-change="code-prod"><option value="">Semua produk</option>' + prods.map(p => '<option value="' + esc(p.id) + '" ' + (ST.codeProd === p.id ? 'selected' : '') + '>' + esc(p.judul) + '</option>').join('') + '</select><select class="in" data-change="code-status"><option value="">Semua status</option><option ' + (ST.codeStatus === 'tersedia' ? 'selected' : '') + ' value="tersedia">Tersedia</option><option ' + (ST.codeStatus === 'terpakai' ? 'selected' : '') + ' value="terpakai">Terpakai</option></select><button class="btn soft sm" data-act="codes-csv">' + ic('download', 'sm') + 'Ekspor CSV (' + rows.length + ')</button></div>' + (c ? (rows.length ? '<div class="tw"><table class="t"><thead><tr><th>Kode</th><th>Produk</th><th>Status</th><th>Dipakai oleh</th><th>Batch</th><th></th></tr></thead><tbody>' + rows.slice(0, 200).map(r => '<tr><td class="mono bold">' + esc(r.kode) + '</td><td>' + esc(r.produk) + '</td><td>' + (r.status === 'tersedia' ? '<span class="pill ok">Tersedia</span>' : '<span class="pill">Terpakai</span>') + '</td><td class="small">' + esc(r.dipakai_oleh || '-') + (r.tgl_pakai ? '<div class="sub">' + N.dt(r.tgl_pakai) + '</div>' : '') + '</td><td class="small mono">' + esc(r.batch) + '</td><td class="right" style="white-space:nowrap"><button class="btn soft xs" data-act="copy" data-v="' + esc(r.kode) + '">' + ic('copy', 'sm') + '</button>' + (r.status === 'tersedia' ? ' <button class="btn danger xs" data-act="code-void" data-k="' + esc(r.kode) + '">' + ic('trash', 'sm') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' + (rows.length > 200 ? '<p class="tiny muted center mt">Menampilkan 200 pertama — gunakan filter / ekspor CSV.</p>' : '') : empty('key', 'Belum ada kode.')) : skelRows(5)) + '</div>';
    }
  }));
  INPUT['code-prod'] = el => { ST.codeProd = el.value; N.softRender(); };
  INPUT['code-status'] = el => { ST.codeStatus = el.value; N.softRender(); };
  ACT['codes-csv'] = () => { const c = N.sget('u', 'codes'); if (!c) return; const rows = c.v.rows.filter(r => (!ST.codeProd || r.id_produk === ST.codeProd) && (!ST.codeStatus || r.status === ST.codeStatus)); N.download('kode-akses.csv', 'kode,produk,status,dipakai_oleh,batch\n' + rows.map(r => [r.kode, r.produk, r.status, r.dipakai_oleh, r.batch].map(N.csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); };
  ACT['code-void'] = async el => {
    const k = el.getAttribute('data-k'); if (!await N.confirmBox('Hapus kode <b class="mono">' + esc(k) + '</b>? Kode tidak bisa dipakai lagi.', { danger: true, ok: 'Hapus' })) return;
    const sn = snap(['codes']); N.patchData('u', 'codes', c => { c.rows = c.rows.filter(r => r.kode !== k); c.total--; c.stat.tersedia--; });
    const r = await api('code.void', { kode: k }); if (!r.success) { restore(sn); toast(r.message, 'err'); } else toast(r.message, 'ok');
  };

  /* ---------- CRUD konten generik ---------- */
  const SPEC = {
    Products: { label: 'Produk', f: [['tipe', 'Jenis', 'select', [['digital', 'Produk Digital'], ['kelas', 'Kelas Online']]], ['judul', 'Judul *', 'text'], ['deskripsi', 'Deskripsi', 'area'], ['label', 'Label singkat', 'text', null, 'Contoh: Siap pakai tanpa software berbayar'], ['harga', 'Harga (Rp) *', 'num'], ['harga_coret', 'Harga coret (Rp)', 'num', null, 'Opsional, untuk tampilan diskon'], ['cover_url', 'Foto sampul', 'img', null, 'Unggah foto langsung dari HP/komputer. Rasio 16:9 paling rapi.'], ['link_bayar', 'Link pembayaran luar (opsional)', 'url', null, 'Contoh link Lynk.id — tombol bayar eksternal'], ['link_unduh', 'Link produk (hanya terlihat pemilik)', 'url', null, 'Digital: link Drive/unduhan. Kelas: tidak perlu — video diisi di menu Pelajaran'], ['tipe_file', 'Cara menampilkan', 'select', [['link', 'Buka / unduh lewat link'], ['pdf', 'PDF — baca langsung di web'], ['linkbio', 'Link Bio — member mengedit halamannya sendiri'], ['template', 'Template Web — berlisensi per domain (kode akses)']]], ['maks_domain', 'Batas domain per lisensi', 'num', null, 'Khusus Template Web: berapa domain yang boleh memakai satu kode. Kosong = bawaan dari menu Lisensi. Isi link unduh Google Drive pada “Link produk” di atas.'], ['badge', 'Lencana', 'text', null, 'Contoh: Terlaris, Hemat 50%'], ['urutan', 'Urutan tampil', 'num'], ['aktif', 'Tampil di katalog', 'yn']] },
    Lessons: { label: 'Pelajaran', f: [['judul', 'Judul pelajaran *', 'text'], ['link_youtube', 'Link YouTube *', 'url', null, 'Tempel link video YouTube (boleh Unlisted)'], ['durasi', 'Durasi', 'text', null, 'Contoh: 14:20'], ['urutan', 'Urutan', 'num'], ['deskripsi', 'Deskripsi', 'area'], ['aktif', 'Aktif', 'yn']] },
    Demos: { label: 'Karya Demo', f: [['judul', 'Judul *', 'text'], ['kategori', 'Kategori / klien', 'text', null, 'Contoh: Aplikasi Web · Klien: Kopi Moanemani'], ['deskripsi', 'Deskripsi', 'area'], ['link_demo', 'Link demo (web)', 'url', null, 'Alamat website / aplikasi demo, akan dibuka di tab baru'], ['cover_url', 'Foto sampul', 'img', null, 'Tangkapan layar demo. Rasio 16:9 paling rapi.'], ['badge', 'Lencana', 'text', null, 'Contoh: Live Demo'], ['urutan', 'Urutan', 'num'], ['aktif', 'Tampil', 'yn']] },
    Services: { label: 'Layanan', f: [['nama', 'Nama layanan *', 'text'], ['kategori', 'Kategori', 'select', [['Website', 'Website'], ['Aplikasi', 'Aplikasi (kartu lebar)']]], ['deskripsi', 'Deskripsi', 'area'], ['harga_mulai', 'Harga mulai (Rp)', 'num'], ['fitur', 'Fitur unggulan', 'area', null, 'Pisahkan dengan tanda | — contoh: Desain mobile-first|Tombol WhatsApp'], ['urutan', 'Urutan', 'num'], ['aktif', 'Tampil', 'yn']] },
    Testimonials: { label: 'Testimoni', f: [['nama', 'Nama *', 'text'], ['jabatan', 'Jabatan / usaha', 'text'], ['isi', 'Isi testimoni *', 'area'], ['rating', 'Bintang (1-5)', 'num'], ['foto_url', 'Foto', 'img', null, 'Foto wajah / logo usaha pemberi testimoni (opsional).'], ['tampil', 'Tampil di beranda', 'yn']] }
  };
  function fieldH(f, v) {
    const k = f[0], l = f[1], t = f[2], id = 'cf-' + k, val = v == null ? '' : v, hint = f[4] ? '<div class="hint">' + esc(f[4]) + '</div>' : '';
    let inp;
    if (t === 'area') inp = '<textarea class="in" id="' + id + '" name="' + k + '">' + esc(val) + '</textarea>';
    else if (t === 'select') inp = '<select class="in" id="' + id + '" name="' + k + '">' + f[3].map(o => '<option value="' + esc(o[0]) + '" ' + (String(val) === o[0] ? 'selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    else if (t === 'yn') inp = '<select class="in" id="' + id + '" name="' + k + '"><option value="YA" ' + (val !== 'TIDAK' ? 'selected' : '') + '>Ya</option><option value="TIDAK" ' + (val === 'TIDAK' ? 'selected' : '') + '>Tidak</option></select>';
    else if (t === 'img') inp = N.imgField({ name: k, value: val, kind: k === 'foto_url' ? 'foto' : 'sampul', max: k === 'foto_url' ? 600 : 1400 });
    else if (t === 'num') inp = '<input class="in" id="' + id + '" name="' + k + '" inputmode="numeric" value="' + esc(val) + '">';
    else inp = '<input class="in" id="' + id + '" name="' + k + '" ' + (t === 'url' ? 'inputmode="url" autocapitalize="off" spellcheck="false" ' : '') + 'value="' + esc(val) + '">';
    return '<div class="fg"><label class="fl" for="' + id + '">' + esc(l) + '</label>' + inp + hint + '</div>';
  }
  const CRUD = { sheet: '', id: '', after: null, back: null };
  function openForm(sheet, id, preset, back) {
    const spec = SPEC[sheet], list = N.sget('u', 'c:' + sheet), row = id && list ? list.v.find(r => r.id === id) : null, v = row || Object.assign({ aktif: 'YA', tampil: 'YA', urutan: (list ? list.v.length : 0) + 1, rating: 5, tipe: 'digital', tipe_file: 'link', kategori: sheet === 'Services' ? 'Website' : '' }, preset || {});
    Object.assign(CRUD, { sheet: sheet, id: id || '', back: back || null });
    N.modal({ title: (id ? 'Ubah ' : 'Tambah ') + spec.label, cls: 'wide', onClose: () => { if (CRUD.back) { const b = CRUD.back; CRUD.back = null; b(); } }, body: '<form id="crud" data-form="crud" novalidate><div class="grid2">' + spec.f.map(f => (f[2] === 'area' || f[0] === 'judul' || f[0] === 'nama' || f[0] === 'link_unduh' || f[0] === 'link_bayar' || f[0] === 'cover_url' || f[0] === 'foto_url' || f[0] === 'link_youtube') ? '</div>' + fieldH(f, v[f[0]]) + '<div class="grid2">' : fieldH(f, v[f[0]])).join('') + '</div></form>', foot: '<button class="btn ghost" data-act="modal-close">Batal</button><button class="btn pri" type="submit" form="crud">' + ic('check', 'sm') + 'Simpan</button>' });
  }
  FORM.crud = async f => {
    const d = Object.fromEntries(new FormData(f).entries()), sheet = CRUD.sheet, id = CRUD.id, back = CRUD.back; CRUD.back = null;
    const need = { Products: 'judul', Lessons: 'judul', Demos: 'judul', Services: 'nama', Testimonials: 'nama' }[sheet];
    if (!String(d[need] || '').trim()) { CRUD.back = back; return toast('Kolom bertanda * wajib diisi.', 'err'); }
    if (sheet === 'Testimonials') { d.rating = Math.max(1, Math.min(5, Number(d.rating) || 5)); }
    ['link_bayar', 'link_unduh', 'link_demo', 'link_youtube'].forEach(k => { if (d[k] && !/^https?:\/\//i.test(d[k]) && !(k === 'link_youtube' && /^[\w-]{11}$/.test(d[k]))) d[k] = 'https://' + d[k]; });
    if (sheet === 'Lessons') d.id_produk = (id && (N.sget('u', 'c:Lessons').v.find(r => r.id === id) || {}).id_produk) || LES.cid;
    N.closeModal(true); await saveContent(sheet, id, d); if (back) back();
  };
  async function saveContent(sheet, id, data) {
    const key = 'c:' + sheet, sn = snap([key]), tmp = 'tmp-' + N.uid();
    N.patchData('u', key, l => { if (id) { const x = l.find(r => r.id === id); if (x) Object.assign(x, data); } else l.push(Object.assign({ id: tmp }, data)); });
    const r = await api('content.save', { sheet: sheet, row: Object.assign({}, data, id ? { id: id } : {}) });
    if (!r.success) { restore(sn); toast(r.message, 'err', 6000); return r; }
    N.sset('u', key, r.data); N.emit('u' + key); toast(r.message || 'Tersimpan', 'ok'); refreshPublic(); if (sheet === 'Products') N.stale('u', 'adm'); return r;
  }
  ACT['crud-new'] = el => openForm(el.getAttribute('data-s'), '', null);
  ACT['crud-edit'] = el => openForm(el.getAttribute('data-s'), el.getAttribute('data-id'), null);
  ACT['crud-del'] = async el => {
    const sheet = el.getAttribute('data-s'), id = el.getAttribute('data-id'), back = el.getAttribute('data-back');
    if (!await N.confirmBox('Hapus data ini? Tindakan tidak bisa dibatalkan.' + (sheet === 'Products' ? ' (Produk yang sudah punya riwayat hanya dinonaktifkan.)' : ''), { danger: true, ok: 'Hapus' })) { if (back) openLessons(LES.cid); return; }
    const key = 'c:' + sheet, sn = snap([key]); N.patchData('u', key, l => { const i = l.findIndex(r => r.id === id); if (i > -1) l.splice(i, 1); });
    const r = await api('content.delete', { sheet: sheet, id: id });
    if (!r.success) { restore(sn); return toast(r.message, 'err'); } N.sset('u', key, r.data); N.emit('u' + key); toast(r.message, 'ok'); refreshPublic();
    if (r.message && /dinonaktifkan/.test(r.message)) { N.stale('u', key.slice(0)); }
    if (sheet === 'Lessons' && back) openLessons(LES.cid);
  };
  INPUT['adm-toggle'] = async el => {
    const sheet = el.getAttribute('data-s'), id = el.getAttribute('data-id'), f = el.getAttribute('data-f'), val = el.checked ? 'YA' : 'TIDAK', key = 'c:' + sheet, sn = snap([key]);
    N.patchData('u', key, l => { const x = l.find(r => r.id === id); if (x) x[f] = val; });
    const r = await api('content.save', { sheet: sheet, row: { id: id, [f]: val } });
    if (!r.success) { restore(sn); toast(r.message, 'err'); } else { N.sset('u', key, r.data); refreshPublic(); }
  };

  /* ---- Produk & Kelas ---- */
  function prodPage(tab) {
    return adm({
      title: 'Produk & Kelas',
      render() {
        const list = use('c:Products', { ttl: 60000 }), les = use('c:Lessons', { ttl: 60000 });
        const tabs = '<div class="tabs adm-tabs"><a class="tab ' + (!tab ? 'on' : '') + '" href="#/admin/produk">Semua' + (list ? ' <em>' + list.length + '</em>' : '') + '</a><a class="tab ' + (tab === 'digital' ? 'on' : '') + '" href="#/admin/produk/digital">Produk Digital' + (list ? ' <em>' + list.filter(p => p.tipe === 'digital').length + '</em>' : '') + '</a><a class="tab ' + (tab === 'kelas' ? 'on' : '') + '" href="#/admin/produk/kelas">Kelas Online' + (list ? ' <em>' + list.filter(p => p.tipe === 'kelas').length + '</em>' : '') + '</a></div>';
        const rows = list ? list.filter(p => !tab || p.tipe === tab).sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0)) : null;
        return head('Katalog', 'Produk Digital & Kelas', 'Atur harga, link unduhan/pembayaran, dan video pelajaran. Perubahan langsung tampil di katalog publik.', '<button class="btn pri" data-act="crud-new" data-s="Products">' + ic('plus', 'sm') + 'Tambah Produk / Kelas</button>') + tabs + '<div class="card">' + (!rows ? skelRows(5) : rows.length ? '<div class="tw"><table class="t"><thead><tr><th>Produk</th><th>Jenis</th><th>Harga</th><th>Link</th><th>Tampil</th><th></th></tr></thead><tbody>' + rows.map(p => { const nl = (les || []).filter(l => l.id_produk === p.id).length; return '<tr><td><div class="row"><div class="cover" style="width:64px;aspect-ratio:16/10;border-radius:8px;flex:none;font-size:0">' + (safeUrl(p.cover_url) ? '<img src="' + esc(safeUrl(p.cover_url)) + '" alt="" loading="lazy">' : ic(p.tipe === 'kelas' ? 'video' : 'box', 'sm')) + '</div><div style="min-width:0"><b>' + esc(p.judul) + '</b><div class="sub ell" style="max-width:260px">' + esc(p.label || p.deskripsi) + '</div></div></div></td><td><span class="pill ' + (p.tipe === 'kelas' ? 'or' : '') + '">' + (p.tipe === 'kelas' ? 'Kelas' : 'Digital') + '</span></td><td><b>' + rp(p.harga) + '</b>' + (Number(p.harga_coret) ? '<div class="sub"><s>' + rp(p.harga_coret) + '</s></div>' : '') + '</td><td class="small">' + (p.tipe === 'kelas' ? '<button class="btn soft xs" data-act="les-open" data-id="' + esc(p.id) + '">' + ic('video', 'sm') + nl + ' pelajaran</button>' : (p.link_unduh ? '<span class="pill ok">' + ic('check', 'sm') + (p.tipe_file === 'pdf' ? 'PDF' : 'Link') + '</span>' : '<span class="pill warn">Link kosong</span>')) + (p.link_bayar ? ' <span class="pill">Bayar luar</span>' : '') + '</td><td>' + switchH(p.aktif !== 'TIDAK', 'data-change="adm-toggle" data-s="Products" data-id="' + esc(p.id) + '" data-f="aktif"') + '</td><td class="right" style="white-space:nowrap"><button class="btn soft xs" data-act="crud-edit" data-s="Products" data-id="' + esc(p.id) + '">' + ic('edit', 'sm') + 'Ubah</button> <button class="btn danger xs" data-act="crud-del" data-s="Products" data-id="' + esc(p.id) + '" aria-label="Hapus">' + ic('trash', 'sm') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : empty('box', 'Belum ada produk.', '<button class="btn pri mt" data-act="crud-new" data-s="Products">Tambah produk pertama</button>')) + '</div>';
      }
    });
  }
  route(/^\/admin\/produk$/, prodPage('')); route(/^\/admin\/produk\/digital$/, prodPage('digital')); route(/^\/admin\/produk\/kelas$/, prodPage('kelas'));
  const LES = { cid: '' };
  function lessonsBody(cid) {
    const les = (N.sget('u', 'c:Lessons') || { v: [] }).v.filter(l => l.id_produk === cid).sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));
    return les.length ? '<div class="col">' + les.map(l => '<div class="ap"><span class="stepn">' + (l.urutan || '-') + '</span><div class="inf"><b>' + esc(l.judul) + '</b><div class="tiny muted mono">' + esc(l.durasi || '-') + ' · ' + (N.ytEmbed(l.link_youtube) ? 'YouTube ✓' : '<span class="err-t">link tidak valid</span>') + '</div></div><div class="row">' + switchH(l.aktif !== 'TIDAK', 'data-change="adm-toggle" data-s="Lessons" data-id="' + esc(l.id) + '" data-f="aktif"') + '<button class="btn soft xs" data-act="les-edit" data-id="' + esc(l.id) + '">' + ic('edit', 'sm') + '</button><button class="btn danger xs" data-act="crud-del" data-s="Lessons" data-id="' + esc(l.id) + '" data-back="1">' + ic('trash', 'sm') + '</button></div></div>').join('') + '</div>' : empty('video', 'Belum ada pelajaran. Tambahkan video YouTube pertama.');
  }
  function openLessons(cid) {
    LES.cid = cid; const p = (N.sget('u', 'c:Products') || { v: [] }).v.find(x => x.id === cid);
    N.modal({ title: 'Pelajaran — ' + (p ? p.judul : ''), cls: 'wide', body: '<div id="les-body">' + lessonsBody(cid) + '</div>', foot: '<button class="btn ghost" data-act="modal-close">Selesai</button><button class="btn pri" data-act="les-add">' + ic('plus', 'sm') + 'Tambah Pelajaran</button>' });
  }
  ACT['les-open'] = el => openLessons(el.getAttribute('data-id'));
  ACT['les-add'] = () => { const cid = LES.cid, n = (N.sget('u', 'c:Lessons') || { v: [] }).v.filter(l => l.id_produk === cid).length + 1; openForm('Lessons', '', { id_produk: cid, urutan: n }, () => openLessons(cid)); };
  ACT['les-edit'] = el => { const cid = LES.cid; openForm('Lessons', el.getAttribute('data-id'), null, () => openLessons(cid)); };
  N.onData(id => { if (id === 'uc:Lessons' || id === 'uc:Products') { const b = N.$('#les-body'); if (b) b.innerHTML = lessonsBody(LES.cid); } });

  /* ---- Galeri, Layanan, Testimoni ---- */
  function listPage(sheet, o) {
    return adm({
      title: o.title,
      render() {
        const list = use('c:' + sheet, { ttl: 60000 });
        return head(o.eyebrow, o.title, o.sub, '<button class="btn pri" data-act="crud-new" data-s="' + sheet + '">' + ic('plus', 'sm') + 'Tambah ' + SPEC[sheet].label + '</button>') + '<div class="card">' + (!list ? skelRows(4) : list.length ? '<div class="tw"><table class="t"><thead><tr>' + o.cols.map(c => '<th>' + c[0] + '</th>').join('') + '<th>' + o.tog[1] + '</th><th></th></tr></thead><tbody>' + list.slice().sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0)).map(r => '<tr>' + o.cols.map(c => '<td>' + c[1](r) + '</td>').join('') + '<td>' + switchH(r[o.tog[0]] !== 'TIDAK', 'data-change="adm-toggle" data-s="' + sheet + '" data-id="' + esc(r.id) + '" data-f="' + o.tog[0] + '"') + '</td><td class="right" style="white-space:nowrap"><button class="btn soft xs" data-act="crud-edit" data-s="' + sheet + '" data-id="' + esc(r.id) + '">' + ic('edit', 'sm') + 'Ubah</button> <button class="btn danger xs" data-act="crud-del" data-s="' + sheet + '" data-id="' + esc(r.id) + '" aria-label="Hapus">' + ic('trash', 'sm') + '</button></td></tr>').join('') + '</tbody></table></div>' : empty(o.icon, 'Belum ada data.', '<button class="btn pri mt" data-act="crud-new" data-s="' + sheet + '">Tambah sekarang</button>')) + '</div>';
      }
    });
  }
  route(/^\/admin\/galeri$/, listPage('Demos', { title: 'Galeri Karya Demo', eyebrow: 'Etalase', icon: 'image', sub: 'Sematkan link website / aplikasi demo (kasir POS, toko online, dll). Pengunjung membukanya lewat tombol Lihat Demo.', tog: ['aktif', 'Tampil'], cols: [['Karya', r => '<div class="row"><div class="cover" style="width:64px;aspect-ratio:16/10;border-radius:8px;flex:none">' + (safeUrl(r.cover_url) ? '<img src="' + esc(safeUrl(r.cover_url)) + '" alt="" loading="lazy">' : ic('globe', 'sm')) + '</div><div><b>' + esc(r.judul) + '</b><div class="sub">' + esc(r.kategori) + '</div></div></div>'], ['Link demo', r => r.link_demo ? '<a class="small" style="color:var(--navy)" href="' + esc(safeUrl(r.link_demo)) + '" target="_blank" rel="noopener">' + esc(String(r.link_demo).replace(/^https?:\/\//, '').slice(0, 36)) + ' ' + ic('ext', 'sm') + '</a>' : '<span class="pill warn">Kosong</span>'], ['Lencana', r => r.badge ? '<span class="pill or">' + esc(r.badge) + '</span>' : '-'], ['Urut', r => esc(r.urutan)]] }));
  route(/^\/admin\/layanan$/, listPage('Services', { title: 'Layanan Jasa', eyebrow: 'Etalase', icon: 'tag', sub: 'Kartu layanan di beranda (Landing Page, Toko Online, Company Profile, Undangan, Aplikasi Web).', tog: ['aktif', 'Tampil'], cols: [['Layanan', r => '<b>' + esc(r.nama) + '</b><div class="sub ell" style="max-width:300px">' + esc(r.deskripsi) + '</div>'], ['Kategori', r => '<span class="pill ' + (r.kategori === 'Aplikasi' ? 'or' : '') + '">' + esc(r.kategori) + '</span>'], ['Mulai dari', r => '<b>' + rp(r.harga_mulai) + '</b>'], ['Urut', r => esc(r.urutan)]] }));
  route(/^\/admin\/testimoni$/, listPage('Testimonials', { title: 'Testimoni Klien', eyebrow: 'Bukti sosial', icon: 'star', sub: 'Kutipan pelanggan yang tampil di beranda.', tog: ['tampil', 'Tampil'], cols: [['Nama', r => '<b>' + esc(r.nama) + '</b><div class="sub">' + esc(r.jabatan) + '</div>'], ['Testimoni', r => '<div class="small ell" style="max-width:340px">' + esc(r.isi) + '</div>'], ['Bintang', r => '<span class="stars">' + '★'.repeat(Number(r.rating) || 5) + '</span>']] }));

  /* ---------- Member ---------- */
  function memFiltered(list) { const q = ST.memQ.trim().toLowerCase(); return list.filter(m => (!q || (m.nama + ' ' + m.email + ' ' + m.wa).toLowerCase().indexOf(q) > -1) && (!ST.memS || m.status === ST.memS)); }
  function memRows(list) {
    const a = memFiltered(list);
    return a.length ? a.map(m => '<tr><td><b>' + esc(m.nama) + '</b><div class="sub">' + esc(m.email) + '</div></td><td class="small mono">' + (m.wa ? '<a href="' + esc(N.waLink(m.wa)) + '" target="_blank" rel="noopener" style="color:var(--ok)">' + esc(m.wa) + '</a>' : '-') + '</td><td><span class="pill">' + esc(m.metode) + '</span></td><td class="center"><button class="btn soft xs" data-act="mem-prod" data-e="' + esc(m.email) + '" data-n="' + esc(m.nama) + '">' + m.produk + ' produk</button></td><td class="center">' + m.pesanan + '</td><td class="small">' + N.dt(m.tgl_daftar) + '<div class="sub">' + (m.login_terakhir ? 'Login ' + N.ago(m.login_terakhir) : 'Belum login') + '</div></td><td>' + switchH(m.status !== 'blokir', 'data-change="mem-status" data-id="' + esc(m.id) + '"') + '</td></tr>').join('') : '<tr><td colspan="7">' + empty('users', 'Tidak ada member yang cocok.') + '</td></tr>';
  }
  route(/^\/admin\/member$/, adm({
    title: 'Daftar Member',
    render() {
      const list = use('members', { ttl: 30000 });
      return head('Pelanggan', 'Daftar Member', 'Pembeli produk digital, siswa kelas, dan pelanggan jasa yang punya akun.', '<button class="btn soft sm" data-act="mem-csv">' + ic('download', 'sm') + 'Ekspor CSV</button>') + '<div class="card"><div class="fbar"><div class="searchbox">' + ic('search', 'sm') + '<input class="in" data-input="mem-q" placeholder="Cari nama, email, WA" value="' + esc(ST.memQ) + '" aria-label="Cari member"></div><select class="in" data-change="mem-s"><option value="">Semua status</option><option value="aktif" ' + (ST.memS === 'aktif' ? 'selected' : '') + '>Aktif</option><option value="blokir" ' + (ST.memS === 'blokir' ? 'selected' : '') + '>Dinonaktifkan</option></select>' + (list ? '<span class="pill">' + list.length + ' member</span>' : '') + '</div>' + (list ? '<div class="tw"><table class="t"><thead><tr><th>Member</th><th>WhatsApp</th><th>Daftar via</th><th>Produk</th><th>Pesanan</th><th>Terdaftar</th><th>Aktif</th></tr></thead><tbody id="mem-body">' + memRows(list) + '</tbody></table></div>' : skelRows(5)) + '</div>';
    }
  }));
  INPUT['mem-q'] = N.debounce(el => { ST.memQ = el.value; const l = N.sget('u', 'members'), b = N.$('#mem-body'); if (l && b) b.innerHTML = memRows(l.v); }, 120);
  INPUT['mem-s'] = el => { ST.memS = el.value; N.softRender(); };
  INPUT['mem-status'] = async el => {
    const id = el.getAttribute('data-id'), st = el.checked ? 'aktif' : 'blokir', sn = snap(['members']);
    N.patchData('u', 'members', l => { const x = l.find(m => m.id === id); if (x) x.status = st; });
    const r = await api('member.status', { id: id, status: st }); if (!r.success) { restore(sn); toast(r.message, 'err'); } else toast(r.message, 'ok');
  };
  ACT['mem-prod'] = async el => {
    const e = el.getAttribute('data-e'); N.busy(el, true); const r = await api('member.products', { email: e }); N.busy(el, false); if (!r.success) return toast(r.message, 'err');
    N.modal({ title: 'Akses — ' + el.getAttribute('data-n'), body: r.data.length ? '<div class="col">' + r.data.map(x => '<div class="row between card flat" style="padding:10px 14px"><b>' + esc(x.produk) + '</b><span class="small muted">' + esc(x.sumber) + ' · ' + N.dt(x.tgl_akses) + '</span></div>').join('') + '</div>' : empty('box', 'Belum punya akses produk.') });
  };
  ACT['mem-csv'] = () => { const l = N.sget('u', 'members'); if (!l) return; N.download('member.csv', 'nama,email,wa,metode,produk,pesanan,tgl_daftar,status\n' + memFiltered(l.v).map(m => [m.nama, m.email, m.wa, m.metode, m.produk, m.pesanan, m.tgl_daftar, m.status].map(N.csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8'); };

  /* ---------- Pesanan jasa ---------- */
  const JASA_ST = ['Baru Masuk', 'Dihubungi', 'Menunggu DP', 'Berjalan', 'Selesai', 'Batal'];
  route(/^\/admin\/jasa$/, adm({
    title: 'Pesanan Jasa',
    render() {
      const list = use('reqs', { ttl: 30000 }), cnt = s => (list || []).filter(r => r.status === s).length;
      const rows = list ? list.filter(r => !ST.jasaTab || r.status === ST.jasaTab) : null;
      return head('CRM prospek', 'Pesanan Jasa Website & Aplikasi', 'Permintaan dari formulir beranda. Hubungi lewat WhatsApp atau Gmail, lalu perbarui status.') + '<div class="tabs adm-tabs"><button class="tab ' + (!ST.jasaTab ? 'on' : '') + '" data-act="jasa-tab" data-v="">Semua' + (list ? ' <em>' + list.length + '</em>' : '') + '</button>' + JASA_ST.map(s => '<button class="tab ' + (ST.jasaTab === s ? 'on' : '') + '" data-act="jasa-tab" data-v="' + s + '">' + s + (list ? ' <em>' + cnt(s) + '</em>' : '') + '</button>').join('') + '</div><div class="card">' + (!rows ? skelRows(4) : rows.length ? '<div class="tw"><table class="t"><thead><tr><th>Klien</th><th>Layanan & kebutuhan</th><th>Kontak</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(r => { const wa = N.waLink(r.wa, 'Halo ' + r.nama + ', kami dari ' + N.appName() + ' menindaklanjuti permintaan ' + r.layanan + '.'); return '<tr><td><b>' + esc(r.nama) + '</b><div class="sub">' + N.dtm(r.tgl) + '</div></td><td><b class="small">' + esc(r.layanan) + '</b><div class="sub" style="max-width:280px;white-space:normal">' + esc(String(r.deskripsi).slice(0, 120)) + '</div></td><td class="small"><span class="pill">' + esc(r.preferensi) + '</span><div class="mono sub">' + esc(r.wa) + '</div><div class="sub">' + esc(r.email) + '</div></td><td><select class="in" style="min-height:38px;width:auto" data-change="jasa-status" data-id="' + esc(r.id) + '">' + JASA_ST.map(s => '<option ' + (s === r.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select></td><td class="right" style="white-space:nowrap"><a class="btn wa xs" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ic('chat', 'sm') + 'WA</a> ' + (r.email ? '<a class="btn soft xs" href="' + esc(mailto(r.email, 'Tindak lanjut ' + r.layanan)) + '">' + ic('mail', 'sm') + 'Gmail</a>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : empty('mega', 'Belum ada pesanan jasa pada status ini.')) + '</div>';
    }
  }));
  ACT['jasa-tab'] = el => { ST.jasaTab = el.getAttribute('data-v'); N.softRender(); };
  INPUT['jasa-status'] = async el => {
    const id = el.getAttribute('data-id'), st = el.value, sn = snap(['reqs', 'adm']);
    N.patchData('u', 'reqs', l => { const x = l.find(r => r.id === id); if (x) x.status = st; });
    N.patchData('u', 'adm', a => { a.kpi.jasa_baru = (N.sget('u', 'reqs').v || []).filter(r => r.status === 'Baru Masuk').length; });
    const r = await api('request.status', { id: id, status: st }); if (!r.success) { restore(sn); toast(r.message, 'err'); } else toast('Status diperbarui', 'ok');
  };

  /* ---------- Pengaturan beranda ---------- */
  const BS = { init: false, f: {}, stat: [], rek: [], bagian: [] };
  const SECTIONS = [['layanan', 'Layanan Unggulan'], ['demo', 'Galeri Karya Demo'], ['katalog', 'Katalog Produk & Kelas'], ['testimoni', 'Testimoni'], ['pesan', 'Formulir Pesan Jasa']];
  const SET_KEYS = ['nama_app', 'tagline', 'hero_badge', 'hero_judul', 'hero_judul_aksen', 'hero_sub', 'wa_admin', 'wa_tampil', 'email_admin', 'email_publik', 'alamat', 'footer_deskripsi', 'logo_url', 'qris_url', 'info_bayar', 'google_client_id', 'app_url'];
  function bsInit(s) {
    BS.f = {}; SET_KEYS.forEach(k => BS.f[k] = s[k] || '');
    try { BS.stat = JSON.parse(s.hero_stat || '[]'); } catch (e) { BS.stat = []; } try { BS.rek = JSON.parse(s.rekening || '[]'); } catch (e) { BS.rek = []; }
    const on = String(s.beranda_bagian || '').split(',').map(x => x.trim()).filter(Boolean); BS.bagian = on.map(k => ({ k: k, on: true })).concat(SECTIONS.filter(x => on.indexOf(x[0]) < 0).map(x => ({ k: x[0], on: false }))); BS.init = true;
  }
  const inp = (k, l, o) => '<div class="fg"><label class="fl" for="s-' + k + '">' + l + '</label>' + (o && o.area ? '<textarea class="in" id="s-' + k + '" data-input="bs-f" data-k="' + k + '">' + esc(BS.f[k]) + '</textarea>' : '<input class="in ' + (o && o.mono ? 'mono' : '') + '" id="s-' + k + '" data-input="bs-f" data-k="' + k + '" value="' + esc(BS.f[k]) + '" ' + (o && o.ph ? 'placeholder="' + esc(o.ph) + '"' : '') + '>') + (o && o.hint ? '<div class="hint">' + o.hint + '</div>' : '') + '</div>';
  const imgSet_ = (k, l, hint, max) => '<div class="fg"><label class="fl">' + l + '</label>' + N.imgField({ value: BS.f[k], kind: k === 'qris_url' ? 'qris' : 'logo', max: max, hint: hint, attrs: 'data-input="bs-f" data-k="' + k + '"' }) + '</div>';
  route(/^\/admin\/beranda$/, adm({
    title: 'Pengaturan Beranda', enter() { BS.init = false; },
    render() {
      const s = use('settings', { ttl: 30000 }); if (!s) return head('Tampilan', 'Pengaturan Halaman Depan', '') + skelBox(300);
      if (!BS.init) bsInit(s);
      const nm = { 'sec': 1 };
      return head('Tampilan & pembayaran', 'Pengaturan Halaman Depan', 'Ubah teks hero, urutan bagian, kontak, rekening, dan QRIS. Tersimpan ke Google Sheets dan langsung tampil di beranda.', '<a class="btn soft sm" href="#/" target="_blank">' + ic('eye', 'sm') + 'Lihat Beranda</a><button class="btn pri" data-act="bs-save">' + ic('check', 'sm') + 'Simpan Semua</button>') +
        '<div class="col" style="gap:16px"><div class="card"><h3>Identitas & Hero</h3><div class="grid2 mt" style="margin-top:14px">' + inp('nama_app', 'Nama portal') + inp('tagline', 'Tagline') + inp('hero_badge', 'Lencana hero') + imgSet_('logo_url', 'Logo', 'Kosongkan untuk logo bawaan. PNG/JPG persegi paling rapi.', 500) + inp('hero_judul', 'Judul hero (biru)') + inp('hero_judul_aksen', 'Kata aksen (oranye)') + '</div>' + inp('hero_sub', 'Sub judul hero', { area: 1 }) + '<label class="fl">Statistik hero</label><div class="col" id="bs-stat">' + BS.stat.map((x, i) => '<div class="row"><input class="in" style="max-width:130px" placeholder="35+" value="' + esc(x.n) + '" data-input="bs-stat" data-i="' + i + '" data-f="n"><input class="in" placeholder="Keterangan" value="' + esc(x.l) + '" data-input="bs-stat" data-i="' + i + '" data-f="l"><button class="btn danger xs" data-act="bs-del" data-t="stat" data-i="' + i + '">' + ic('x', 'sm') + '</button></div>').join('') + '</div><button class="btn soft xs mt" style="margin-top:8px" data-act="bs-add" data-t="stat">' + ic('plus', 'sm') + 'Tambah statistik</button></div>' +
        '<div class="card"><h3>Urutan Bagian Beranda</h3><p class="small muted">Aktifkan/nonaktifkan dan atur urutan bagian di bawah hero.</p><div class="col mt" style="margin-top:12px">' + BS.bagian.map((b, i) => '<div class="row card flat" style="padding:8px 12px">' + switchH(b.on, 'data-change="bs-on" data-i="' + i + '"') + '<b class="grow">' + esc((SECTIONS.find(x => x[0] === b.k) || [0, b.k])[1]) + '</b><button class="btn ghost xs" data-act="bs-move" data-i="' + i + '" data-d="-1" ' + (i === 0 ? 'disabled' : '') + '>▲</button><button class="btn ghost xs" data-act="bs-move" data-i="' + i + '" data-d="1" ' + (i === BS.bagian.length - 1 ? 'disabled' : '') + '>▼</button></div>').join('') + '</div></div>' +
        '<div class="card"><h3>Kontak & Footer</h3><div class="grid2 mt" style="margin-top:14px">' + inp('wa_admin', 'WhatsApp admin (format 62…)', { mono: 1, ph: '6281234567890', hint: 'Dipakai tombol WhatsApp & notifikasi.' }) + inp('wa_tampil', 'Tampilan nomor di footer', { ph: '+62 812-3456-7890' }) + inp('email_publik', 'Email kontak (tampil di footer)') + inp('email_admin', 'Email penerima notifikasi admin', { hint: 'Kosong = email pemilik script.' }) + '</div>' + inp('alamat', 'Alamat') + inp('footer_deskripsi', 'Deskripsi footer', { area: 1 }) + '</div>' +
        '<div class="card"><h3>Pembayaran</h3><label class="fl mt" style="margin-top:12px">Rekening bank</label><div class="col" id="bs-rek">' + BS.rek.map((x, i) => '<div class="row wrap"><input class="in" style="max-width:110px" placeholder="BCA" value="' + esc(x.bank) + '" data-input="bs-rek" data-i="' + i + '" data-f="bank"><input class="in mono" style="max-width:200px" placeholder="No. rekening" value="' + esc(x.no) + '" data-input="bs-rek" data-i="' + i + '" data-f="no"><input class="in" placeholder="Atas nama" value="' + esc(x.nama) + '" data-input="bs-rek" data-i="' + i + '" data-f="nama"><button class="btn danger xs" data-act="bs-del" data-t="rek" data-i="' + i + '">' + ic('x', 'sm') + '</button></div>').join('') + '</div><button class="btn soft xs" style="margin:8px 0 14px" data-act="bs-add" data-t="rek">' + ic('plus', 'sm') + 'Tambah rekening</button>' + imgSet_('qris_url', 'Gambar QRIS', 'Unggah gambar QRIS dari galeri HP. Kosong = opsi QRIS disembunyikan.', 1200) + inp('info_bayar', 'Teks info pembayaran', { area: 1 }) + '</div>' +
        '<div class="card"><h3>Login Google & URL Aplikasi</h3><div class="grid2 mt" style="margin-top:14px">' + inp('google_client_id', 'Google OAuth Client ID', { mono: 1, hint: 'Kosong = tombol “Masuk dengan Google” disembunyikan. Lihat panduan.' }) + inp('app_url', 'URL aplikasi (GitHub Pages)', { hint: 'Dipakai pada link di email/WA. Terisi otomatis saat admin login.' }) + '</div></div><button class="btn pri block" data-act="bs-save">' + ic('check', 'sm') + 'Simpan Semua Pengaturan</button></div>';
    }
  }));
  INPUT['bs-f'] = el => { BS.f[el.getAttribute('data-k')] = el.value; };
  INPUT['bs-stat'] = el => { BS.stat[+el.getAttribute('data-i')][el.getAttribute('data-f')] = el.value; };
  INPUT['bs-rek'] = el => { BS.rek[+el.getAttribute('data-i')][el.getAttribute('data-f')] = el.value; };
  INPUT['bs-on'] = el => { BS.bagian[+el.getAttribute('data-i')].on = el.checked; };
  ACT['bs-add'] = el => { const t = el.getAttribute('data-t'); (t === 'stat' ? BS.stat : BS.rek).push(t === 'stat' ? { n: '', l: '' } : { bank: '', no: '', nama: '' }); N.softRender(); };
  ACT['bs-del'] = el => { (el.getAttribute('data-t') === 'stat' ? BS.stat : BS.rek).splice(+el.getAttribute('data-i'), 1); N.softRender(); };
  ACT['bs-move'] = el => { const i = +el.getAttribute('data-i'), d = +el.getAttribute('data-d'), a = BS.bagian; if (i + d < 0 || i + d >= a.length) return; const t = a[i]; a[i] = a[i + d]; a[i + d] = t; N.softRender(); };
  ACT['bs-save'] = async el => {
    const patch = Object.assign({}, BS.f); patch.hero_stat = JSON.stringify(BS.stat.filter(x => x.n || x.l)); patch.rekening = JSON.stringify(BS.rek.filter(x => x.no)); patch.beranda_bagian = BS.bagian.filter(b => b.on).map(b => b.k).join(',');
    if (!patch.nama_app.trim()) return toast('Nama portal wajib diisi.', 'err');
    const sn = snap(['settings']), pubSnap = N.sget('pub', 'pub') ? clone(N.sget('pub', 'pub').v) : null;
    N.patchData('u', 'settings', s => Object.assign(s, patch, { hero_stat: patch.hero_stat, rekening: patch.rekening, beranda_bagian: patch.beranda_bagian }));
    if (pubSnap) { const e = N.sget('pub', 'pub'); Object.keys(patch).forEach(k => { if (k in e.v.settings) e.v.settings[k] = patch[k]; }); e.h = N.hash(e.v); N.sset('pub', 'pub', e.v); }
    N.busy(el, true); const r = await api('settings.save', { settings: patch }); N.busy(el, false);
    if (!r.success) { restore(sn); if (pubSnap) N.sset('pub', 'pub', pubSnap); return toast(r.message, 'err', 6000); }
    toast(r.message, 'ok'); N.chromeUpdate(); refreshPublic();
  };

  /* ---------- Statistik ---------- */
  route(/^\/admin\/statistik$/, adm({
    title: 'Statistik Web',
    render() {
      const d = use('stats:' + ST.statDays, { ttl: 60000 }) || (N.sget('u', 'stats:14') || {}).v;
      const seg = '<div class="seg">' + [7, 14, 30, 90].map(n => '<button class="' + (ST.statDays === n ? 'on' : '') + '" data-act="stat-days" data-v="' + n + '">' + n + ' hari</button>').join('') + '</div>';
      if (!d) return head('Trafik', 'Statistik Website', '', seg) + '<div class="g4">' + skelBox(90).repeat(4) + '</div>' + skelBox(200);
      const max = Math.max.apply(null, d.daily.map(x => x.views).concat([1])), tot = (d.perangkat.HP || 0) + (d.perangkat.Desktop || 0) || 1;
      return head('Trafik', 'Statistik Website', 'Jumlah kunjungan dan halaman populer. Kunjungan admin tidak dihitung.', seg) + '<div class="g4">' + kpi('Total kunjungan', 'globe', d.total_views, d.days + ' hari terakhir') + kpi('Pengunjung unik', 'users', d.total_uniq, 'berdasarkan sesi') + kpi('Hari ini', 'clock', d.hari_ini.views, d.hari_ini.uniq + ' unik') + kpi('Dari HP', 'phone', Math.round((d.perangkat.HP || 0) / tot * 100) + '%', (d.perangkat.HP || 0) + ' kunjungan') + '</div><div class="card mt" style="margin-top:16px"><h3>Kunjungan per Hari</h3><div class="bars mt" style="margin-top:12px">' + d.daily.map(x => '<div class="b n" title="' + esc(x.d) + ': ' + x.views + ' kunjungan, ' + x.uniq + ' unik"><i style="height:' + Math.max(2, Math.round(x.views / max * 100)) + '%"></i><span>' + (d.days <= 31 ? x.d.slice(8) : '') + '</span></div>').join('') + '</div></div><div class="card mt" style="margin-top:16px"><h3>Halaman Terpopuler</h3>' + (d.top.length ? '<div class="col mt" style="margin-top:12px">' + d.top.map(t => '<div class="row"><span class="mono small grow ell">' + esc(t.halaman) + '</span><div class="prog" style="width:38%"><i style="width:' + Math.round(t.n / d.top[0].n * 100) + '%"></i></div><b class="small" style="width:44px;text-align:right">' + t.n + '</b></div>').join('') + '</div>' : empty('chart', 'Belum ada data kunjungan. Data masuk tiap beberapa menit.')) + '</div>';
    }
  }));
  ACT['stat-days'] = el => { ST.statDays = +el.getAttribute('data-v'); N.softRender(); };

  /* ---------- Backup ---------- */
  route(/^\/admin\/backup$/, adm({
    title: 'Backup Data',
    render() {
      const l = use('backups', { ttl: 30000 }), sys = use('sys', { ttl: 120000 });
      return head('Keamanan data', 'Cadangan Data', 'Salinan seluruh database Google Sheets disimpan di folder Drive Anda. Otomatis tiap malam 23:30 WIT; 14 salinan terakhir disimpan.', '<button class="btn pri" data-act="backup-run">' + ic('cloud', 'sm') + 'Backup Sekarang</button>' + (sys ? '<a class="btn soft sm" href="' + esc(sys.root_url) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + 'Folder Drive</a>' : '')) + '<div class="card">' + (!l ? skelRows(4) : l.length ? '<div class="tw"><table class="t"><thead><tr><th>Nama</th><th>Waktu</th><th>Ukuran</th><th>Jenis</th><th></th></tr></thead><tbody>' + l.map(b => '<tr><td class="mono bold">' + esc(b.nama) + '</td><td>' + N.dtm(b.tanggal) + '</td><td>' + (b.ukuran ? (b.ukuran / 1048576).toFixed(2) + ' MB' : '-') + '</td><td><span class="pill">' + esc(b.ket) + '</span></td><td class="right"><a class="btn soft xs" href="' + esc(b.url) + '" target="_blank" rel="noopener">' + ic('ext', 'sm') + 'Buka</a></td></tr>').join('') + '</tbody></table></div>' : empty('cloud', 'Belum ada cadangan. Klik Backup Sekarang.')) + '</div><div class="alert info mt" style="margin-top:16px">' + ic('info') + '<span>Untuk memulihkan: buka salinan backup di Google Sheets, lalu di editor Apps Script ganti Script Property <b>SPREADSHEET_ID</b> dengan ID salinan tersebut (lihat PANDUAN-INSTALASI.md).</span></div>';
    }
  }));

  /* ---------- Sistem ---------- */
  route(/^\/admin\/sistem$/, adm({
    title: 'Backend GAS & Basis Data',
    render() {
      const s = use('sys', { ttl: 30000 }), logs = use('logs', { ttl: 30000 });
      const TR = ['prosesAntrianNotif', 'flushVisits', 'backupHarian'];
      return head('Infrastruktur', 'Backend GAS & Basis Data', 'Status koneksi, perbaikan struktur database, dan pengelolaan data contoh.', '<button class="btn soft sm" data-act="sys-repair">' + ic('refresh', 'sm') + 'Periksa & Perbaiki Struktur</button>') +
        (!s ? skelBox(220) : '<div class="g4">' + kpi('Versi backend', 'server', 'v' + esc(s.versi), 'Google Apps Script') + kpi('Kuota Gmail', 'mail', s.gmail_sisa == null ? '-' : s.gmail_sisa, 'email tersisa hari ini') + kpi('WhatsApp (Fonnte)', 'chat', s.fonnte ? 'Token ✓' : 'Belum', s.fonnte ? 'tersimpan di Script Properties' : 'opsional') + kpi('Login Google', 'user', s.google_client_id ? 'Aktif' : 'Nonaktif', s.google_client_id ? 'Client ID terisi' : 'isi di Pengaturan Beranda') + '</div><div class="dgrid mt" style="margin-top:16px;grid-template-columns:1fr 1fr"><div class="card"><h3>Basis Data (Google Sheets)</h3><div class="row mt" style="margin:10px 0"><a class="btn soft sm" href="' + esc(s.spreadsheet_url) + '" target="_blank" rel="noopener">' + ic('db', 'sm') + 'Buka Spreadsheet</a><a class="btn soft sm" href="' + esc(s.root_url) + '" target="_blank" rel="noopener">' + ic('cloud', 'sm') + 'Folder Drive</a></div><div class="tw"><table class="t" style="min-width:0"><tbody>' + Object.keys(s.sheets).map(k => '<tr><td class="mono small">' + esc(k) + '</td><td class="right"><b>' + (s.sheets[k] < 0 ? '<span class="err-t">hilang</span>' : s.sheets[k]) + '</b> baris</td></tr>').join('') + '</tbody></table></div></div><div class="col" style="gap:16px"><div class="card"><h3>Pemicu Otomatis (Trigger)</h3><div class="col mt" style="margin-top:10px;gap:8px">' + TR.map(t => '<div class="row between"><span class="mono small">' + t + '</span>' + (s.trigger[t] ? '<span class="pill ok">Aktif</span>' : '<span class="pill err">Belum</span>') + '</div>').join('') + '</div>' + (TR.every(t => s.trigger[t]) ? '' : '<p class="small err-t mt">Ada trigger belum terpasang — klik “Periksa & Perbaiki Struktur”.</p>') + '</div><div class="card"><h3>Data Contoh (Dummy)</h3><p class="small muted mt" style="margin-top:8px">Terdeteksi <b>' + s.dummy + '</b> data contoh (produk & akun berawalan DMY). Hapus semuanya sebelum go-live.</p><div class="col mt" style="margin-top:12px;gap:8px"><button class="btn soft" data-act="dummy-reset">' + ic('refresh', 'sm') + 'Reset Data Contoh (hapus lalu isi ulang)</button><button class="btn danger" data-act="dummy-clear">' + ic('trash', 'sm') + 'Hapus Semua Data Contoh</button></div></div><div class="card"><h3>Pemeliharaan</h3><div class="col mt" style="margin-top:10px;gap:8px"><button class="btn soft" data-act="sys-cache">' + ic('zap', 'sm') + 'Bersihkan Cache Server</button></div></div></div></div><div class="card mt" style="margin-top:16px"><div class="card-h"><div class="ico">' + ic('lock') + '</div><div><h3>Reset Kata Sandi Superadmin (lewat backend)</h3><p>Demi keamanan, reset sandi hanya bisa dilakukan dari editor Apps Script — tidak tersedia lewat web.</p></div></div><ol class="small" style="padding-left:20px;line-height:26px"><li>Buka <b>script.google.com</b> → proyek backend Nabire Kreatif.</li><li>Di pilihan fungsi, pilih <b class="mono">resetPasswordSuperadmin</b> lalu klik <b>Jalankan</b>.</li><li>Buka <b>Log Eksekusi</b>: sandi baru acak tampil di sana (atau isi Script Property <span class="mono">SUPERADMIN_NEW_PASSWORD</span> sebelum menjalankan untuk memakai sandi pilihan Anda).</li><li>Masuk dengan email superadmin dan sandi baru, lalu ganti di menu Profil.</li></ol></div>') +
        '<div class="card mt" style="margin-top:16px"><div class="card-h"><div class="ico">' + ic('file') + '</div><div><h3>Log Aktivitas</h3><p>200 catatan terakhir (persetujuan, perubahan konten, error lambat).</p></div></div>' + (logs ? '<div class="tw" style="max-height:340px;overflow:auto"><table class="t"><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' + logs.slice(0, 80).map(l => '<tr><td class="small mono" style="white-space:nowrap">' + N.dtm(l.waktu) + '</td><td class="small">' + esc(l.aktor) + '</td><td><span class="pill mono">' + esc(l.aksi) + '</span></td><td class="small">' + esc(l.detail) + '</td></tr>').join('') + '</tbody></table></div>' : skelRows(3)) + '</div>';
    }
  }));
  ACT['sys-repair'] = async el => { N.busy(el, true); const r = await api('system.repair', {}); N.busy(el, false); if (!r.success) return toast(r.message, 'err'); N.sset('u', 'sys', r.data); N.emit('usys'); toast(r.message, 'ok'); };
  ACT['sys-cache'] = async el => { N.busy(el, true); const r = await api('system.clearCache', {}); N.busy(el, false); toast(r.success ? r.message : r.message, r.success ? 'ok' : 'err'); };
  async function dummy(el, act, msg, danger) {
    if (!await N.confirmBox(msg, { danger: danger, ok: 'Ya, lanjutkan' })) return; N.busy(el, true);
    const r = await api(act, {}); N.busy(el, false); if (!r.success) return toast(r.message, 'err');
    N.sset('u', 'sys', r.data); ['orders', 'members', 'reqs', 'codes', 'adm', 'c:Products', 'c:Lessons', 'c:Demos', 'c:Testimonials', 'c:Services', 'crmstats'].forEach(k => N.stale('u', k)); N.stale('pub', 'pub'); N.revalidate('pub', 'pub', {}); N.revalidate('u', 'adm', {}); N.emit('usys'); toast(r.message, 'ok');
  }
  ACT['dummy-reset'] = el => dummy(el, 'system.dummyReset', 'Reset data contoh: semua data DMY dihapus lalu diisi ulang. Data asli Anda <b>tidak</b> tersentuh.');
  ACT['dummy-clear'] = el => dummy(el, 'system.dummyClear', 'Hapus <b>semua</b> data contoh (produk, akun, pesanan, kode berawalan DMY). Data asli tetap aman. Lanjutkan?', true);

  /* ---------- Menu (mobile) ---------- */
  route(/^\/admin\/menu$/, adm({
    title: 'Menu Admin',
    render() {
      const groups = [['Ringkasan', [['/admin', 'Dasbor', 'grid'], ['/admin/statistik', 'Statistik Web', 'chart']]], ['Transaksi', [['/admin/persetujuan', 'Persetujuan', 'shield'], ['/admin/kode', 'Kode Akses', 'key'], ['/admin/jasa', 'Pesanan Jasa', 'mega']]], ['Katalog', [['/admin/produk', 'Produk & Kelas', 'box'], ['/admin/galeri', 'Galeri Demo', 'image'], ['/admin/linkbio', 'Link Bio', 'link'], ['/admin/lisensi', 'Lisensi Template', 'shield'], ['/admin/layanan', 'Layanan Jasa', 'tag'], ['/admin/testimoni', 'Testimoni', 'star']]], ['Pelanggan', [['/admin/member', 'Daftar Member', 'users'], ['/admin/crm', 'CRM Pelanggan', 'contact'], ['/admin/wa', 'WhatsApp & Notifikasi', 'chat']]], ['Sistem', [['/admin/beranda', 'Pengaturan Beranda', 'sliders'], ['/admin/backup', 'Backup Data', 'cloud'], ['/admin/migrasi', 'Migrasi Data', 'upload'], ['/admin/sistem', 'Backend & Database', 'db']]]];
      return head('', 'Menu Admin', '') + groups.map(g => '<div class="eyebrow mt" style="margin:18px 0 8px;color:var(--mute)">' + g[0] + '</div><div class="g4" style="grid-template-columns:repeat(2,1fr)">' + g[1].map(x => '<a class="card hov row" href="#' + x[0] + '" style="padding:14px"><span class="kpi" style="padding:0"><span class="l"><i>' + ic(x[2], 'sm') + '</i></span></span><b class="small">' + x[1] + '</b></a>').join('') + '</div>').join('') + '<div class="row mt2" style="margin-top:22px"><a class="btn soft grow" href="#/saya">Lihat sebagai Member</a><button class="btn danger grow" data-act="logout">Keluar</button></div>';
    }
  }));

  w.NKA = { openForm, head, skelBox, skelRows, empty, kpi, switchH, snap, restore, ST, adm, refreshPublic, rpShort, mailto, orderPill };
})(window);
