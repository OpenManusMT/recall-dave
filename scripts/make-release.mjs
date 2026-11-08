// `npm run release` — builds the PWA and packages a distributable ZIP with checksums.
//   release/recall-pwa-<version>.zip   the static site (upload to any HTTPS static host)
//   release/SHA256SUMS.txt             checksums of the ZIP and of every file inside it
//   release/RELEASE-MANIFEST.json      what was packaged, from which commit
// Optional: `npm run release -- --source` also writes release/recall-source-<version>.zip (git archive of HEAD).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: win, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const version = JSON.parse(readFileSync(join(root, 'apps/web/package.json'), 'utf-8')).version;
const commit = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf-8',
}).stdout.trim();

run(win ? 'npm.cmd' : 'npm', ['run', 'build']);

const dist = join(root, 'apps/web/dist');
const files = [];
const walk = (d) =>
  readdirSync(d).forEach((n) =>
    statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : files.push(join(d, n)),
  );
walk(dist);
files.sort();

// Minimal deterministic ZIP writer (stored entries, fixed timestamp) — no external tools needed.
function crc32(buf) {
  let c;
  const table = (crc32.t ??= Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 8; // 2026-11-08, fixed for reproducibility
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf-8');
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(0, 8);
    h.writeUInt16LE(DOS_TIME, 10);
    h.writeUInt16LE(DOS_DATE, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nameBuf.length, 26);
    h.writeUInt16LE(0, 28);
    local.push(h, nameBuf, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(DOS_TIME, 12);
    c.writeUInt16LE(DOS_DATE, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nameBuf.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

const entries = files.map((f) => ({
  name: `recall-pwa/${relative(dist, f).split('\\').join('/')}`,
  data: readFileSync(f),
}));
const forbidden = entries.filter((e) => /\.(map|db|sqlite|env|m4a|wav)$/i.test(e.name));
if (forbidden.length) {
  console.error(
    'Refusing to package:',
    forbidden.map((e) => e.name),
  );
  process.exit(1);
}
const out = join(root, 'release');
mkdirSync(out, { recursive: true });
const zipName = `recall-pwa-${version}.zip`;
const zipBuf = zip(entries);
writeFileSync(join(out, zipName), zipBuf);

const sums = [`${sha(zipBuf)}  ${zipName}`, ...entries.map((e) => `${sha(e.data)}  ${e.name}`)];
if (process.argv.includes('--source')) {
  const srcName = `recall-source-${version}.zip`;
  run('git', ['archive', '--format=zip', '-o', join(out, srcName), 'HEAD']);
  sums.unshift(`${sha(readFileSync(join(out, srcName)))}  ${srcName}`);
}
writeFileSync(join(out, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
writeFileSync(
  join(out, 'RELEASE-MANIFEST.json'),
  JSON.stringify(
    {
      app: 'Recall',
      version,
      builtFromCommit: commit,
      note: 'builtFromCommit is the commit checked out when the ZIP was made; rebuild from it to reproduce.',
      zip: zipName,
      zipSha256: sha(zipBuf),
      files: entries.length,
      bytes: zipBuf.length,
      deploy:
        'Upload the contents of recall-pwa/ to any static HTTPS host. See docs/DEPLOYMENT.md.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `\nWrote release/${zipName} (${(zipBuf.length / 1024).toFixed(0)} KB, ${entries.length} files)`,
);
console.log(`SHA-256 ${sha(zipBuf)}`);
