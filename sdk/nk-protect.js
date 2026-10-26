#!/usr/bin/env node
/* nk-protect.js — menyegel template web dengan lisensi Nabire Kreatif
 *
 * Pakai:  node nk-protect.js <folder-template> --sdk <nk-license.js-dari-admin> [--obfuscate] [--no-seal]
 *
 *  1. Menyisipkan <script src="nk-license.js"> paling atas <head> di setiap .html (idempoten).
 *  2. Menambah <noscript> hak cipta + komentar hak cipta.
 *  3. Menghitung SEGEL (SHA-256) semua berkas JS/CSS lokal + skrip inline tiap halaman.
 *  4. Menulis <folder>/nk-license.js = baris konfigurasi (window.NKL + segel + hash diri) + badan SDK.
 *  5. (opsional) --obfuscate: kaburkan badan SDK dengan javascript-obfuscator (npx) sebelum dihash.
 *
 * Jalankan ulang setiap kali template diedit oleh PENJUAL (segel harus dihitung ulang).
 * Hanya Node.js bawaan (>=16). Tidak mengubah berkas selain .html dan nk-license.js.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process'), os = require('os');

const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : ''; };
const dir = args.find(a => !a.startsWith('--') && a !== opt('--sdk'));
const sdkFile = opt('--sdk');
if (!dir || !sdkFile) { console.error('Pemakaian: node nk-protect.js <folder-template> --sdk <nk-license.js> [--obfuscate] [--no-seal]'); process.exit(1); }
const ROOT = path.resolve(dir);
if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) { console.error('Folder template tidak ditemukan: ' + ROOT); process.exit(1); }

const sha = t => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const norm = s => String(s).replace(/^\uFEFF/, '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();

/* ---- 1. baca SDK dari admin: baris 1 = konfigurasi ---- */
const sdkRaw = fs.readFileSync(path.resolve(sdkFile), 'utf8');
const m = sdkRaw.match(/^window\.NKL=(\{.*\});?[ \t]*\r?\n/);
if (!m) { console.error('Berkas SDK harus berasal dari Admin → Lisensi Template → "Unduh nk-license.js" (baris pertama memuat window.NKL={...}).'); process.exit(1); }
const cfg = JSON.parse(m[1]); let body = sdkRaw.slice(m[0].length);
if (!cfg.api || !cfg.pub || !cfg.pid) { console.error('Konfigurasi pada nk-license.js tidak lengkap (api/pub/pid). Unduh ulang dari admin setelah kunci dibuat.'); process.exit(1); }
if (/^file:/.test(cfg.beli || '')) console.warn('! PERINGATAN: "beli" masih berupa alamat file:// — buka admin lewat situs online lalu unduh ulang agar link beli benar.');

/* ---- 2. temukan halaman HTML ---- */
function walk(d, out) { for (const f of fs.readdirSync(d)) { if (f === 'node_modules' || f.startsWith('.')) continue; const p = path.join(d, f), s = fs.statSync(p); if (s.isDirectory()) walk(p, out); else out.push(p); } return out; }
const files = walk(ROOT, []), htmls = files.filter(f => /\.html?$/i.test(f));
if (!htmls.length) { console.error('Tidak ada berkas .html di folder.'); process.exit(1); }

const isLocal = u => u && !/^([a-z][a-z0-9+.\-]*:|\/\/|#|data:)/i.test(u);
const cleanUrl = u => u.split('#')[0].split('?')[0];
const unent = s => s.replace(/&amp;/g, '&');
const attr = (tag, name) => { const r = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return r ? unent(r[1] != null ? r[1] : r[2] != null ? r[2] : r[3]) : null; };

const NOSCRIPT = '<noscript><div style="position:fixed;left:0;right:0;bottom:0;background:#0b1220;color:#fff;text-align:center;padding:10px;font:13px system-ui">\u00A9 Nabire Kreatif \u2014 Template ini memerlukan JavaScript &amp; lisensi. <a style="color:#F28500" href="https://nabirekreatif.com">nabirekreatif.com</a></div></noscript>';
const seal = { f: [], i: {} }, sealFiles = new Map();

for (const hf of htmls) {
  let html = fs.readFileSync(hf, 'utf8'); const relDir = path.relative(path.dirname(hf), ROOT).split(path.sep).join('/'), pre = relDir ? relDir + '/' : '';
  /* sisipkan SDK paling atas <head> */
  const tag = '<script src="' + pre + 'nk-license.js"></script>';
  if (!/nk-license\.js/.test(html)) {
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, x => x + '\n  <!-- \u00A9 Nabire Kreatif \u2014 template berlisensi. Dilarang mengubah/menghapus pelindung lisensi. -->\n  ' + tag);
    else html = tag + '\n' + html;
  }
  if (!/Template ini memerlukan JavaScript/.test(html)) html = html.replace(/<\/body>/i, NOSCRIPT + '\n</body>');
  fs.writeFileSync(hf, html);
  /* kumpulkan segel */
  const o = { s: [], c: [], i: [] };
  for (const mm of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const t = (attr('<x ' + mm[1], 'type') || '').toLowerCase(); if (t && !/javascript|module/.test(t)) continue;
    const src = attr('<x ' + mm[1], 'src');
    if (src != null) { o.s.push(src); if (isLocal(src) && !/(^|\/)nk-license\.js$/.test(cleanUrl(src))) sealFiles.set(path.resolve(path.dirname(hf), cleanUrl(src)), 1); }
    else o.i.push(norm(mm[2]));
  }
  for (const mm of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel\s*=\s*["']?[^"'>]*stylesheet/i.test(mm[0])) continue; const href = attr(mm[0], 'href'); if (href == null) continue;
    o.c.push(href); if (isLocal(href)) sealFiles.set(path.resolve(path.dirname(hf), cleanUrl(href)), 1);
  }
  seal.i[path.relative(ROOT, hf).split(path.sep).join('/')] = sha(JSON.stringify(o));
}
for (const f of sealFiles.keys()) {
  if (!fs.existsSync(f)) { console.warn('! Berkas direferensikan tapi tidak ada: ' + path.relative(ROOT, f)); continue; }
  seal.f.push({ u: path.relative(ROOT, f).split(path.sep).join('/'), h: sha(norm(fs.readFileSync(f, 'utf8'))) });
}

/* ---- 3. kaburkan badan SDK (opsional) ---- */
if (flag('--obfuscate')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nkp-')), inp = path.join(tmp, 'in.js'), out = path.join(tmp, 'out.js'); fs.writeFileSync(inp, body);
  const r = cp.spawnSync('npx', ['--yes', 'javascript-obfuscator@4', inp, '--output', out, '--compact', 'true', '--string-array', 'true', '--string-array-encoding', 'base64', '--string-array-threshold', '1', '--rename-globals', 'false', '--identifier-names-generator', 'hexadecimal', '--control-flow-flattening', 'true', '--control-flow-flattening-threshold', '0.5', '--dead-code-injection', 'false', '--self-defending', 'false', '--unicode-escape-sequence', 'false'], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(out)) {
    /* cadangan: minify + mangle nama variabel dengan esbuild (tersedia lokal atau lewat npx) */
    let done = false;
    try { const eb = require('esbuild'); fs.writeFileSync(out, eb.transformSync(body, { minify: true, target: 'es2018', legalComments: 'none' }).code); done = true; } catch (e) { }
    if (!done) { const r2 = cp.spawnSync('npx', ['--yes', 'esbuild@0.21', inp, '--minify', '--target=es2018', '--legal-comments=none', '--outfile=' + out], { encoding: 'utf8' }); done = r2.status === 0 && fs.existsSync(out); }
    if (!done) { console.error('Obfuscate/minify gagal (butuh koneksi npm untuk javascript-obfuscator atau esbuild):\n' + (r.stderr || r.stdout)); process.exit(1); }
    console.log('! javascript-obfuscator tidak tersedia \u2192 memakai minify esbuild (lapis pengaman lebih ringan).');
  }
  body = fs.readFileSync(out, 'utf8').replace(/^\s+/, ''); console.log('\u2713 SDK dikaburkan.');
}

/* ---- 4. tulis nk-license.js final ---- */
cfg.self = sha(norm(body)); cfg.v = 4;
if (flag('--no-seal')) delete cfg.seal; else cfg.seal = seal;
fs.writeFileSync(path.join(ROOT, 'nk-license.js'), 'window.NKL=' + JSON.stringify(cfg) + ';\n' + body);

console.log('\u2713 Template disegel: ' + ROOT);
console.log('  Halaman HTML  : ' + htmls.map(h => path.relative(ROOT, h)).join(', '));
console.log('  Berkas disegel: ' + (seal.f.length ? seal.f.map(x => x.u).join(', ') : '(tidak ada JS/CSS lokal)'));
console.log('  Hash SDK      : ' + cfg.self.slice(0, 16) + '\u2026');
console.log('  Produk (pid)  : ' + cfg.pid + ' \u00B7 domain pemilik: ' + (cfg.owner || []).join(', '));
console.log('\nCatatan: jangan minify/ubah berkas setelah disegel; jalankan ulang alat ini bila Anda (penjual) mengedit template.');
