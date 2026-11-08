// `npm run verify` — runs every free, local verification job and writes an honest summary.
//
// Status values: PASS, FAIL, NOT_RUN (with reason), BLOCKED_EXTERNAL (needs something this
// machine does not have). A step is never reported as PASS unless it actually ran and passed.
//
// Usage:
//   npm run verify              # everything that is free and local
//   npm run verify -- --full    # also `npm ci` from the lockfile and the iOS JS bundle export
//   npm run verify -- --quick   # skip e2e and A001 (for fast local iterations)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const FULL = args.has('--full');
const QUICK = args.has('--quick');
const win = process.platform === 'win32';
const npx = win ? 'npx.cmd' : 'npx';
const npm = win ? 'npm.cmd' : 'npm';
const results = [];

function sh(cmd, argv, opts = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, argv, {
    cwd: root,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', CI: '1' },
    maxBuffer: 64 * 1024 * 1024,
    shell: win,
    ...opts,
  });
  return {
    code: r.error ? 127 : (r.status ?? 1),
    // eslint-disable-next-line no-control-regex
    out: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? String(r.error) : ''}`.replace(
      /\x1b\[[0-9;]*m/g,
      '',
    ),
    ms: Date.now() - t0,
  };
}

function step(name, fn) {
  process.stdout.write(`▶ ${name} … `);
  let res;
  try {
    res = fn();
  } catch (e) {
    res = { status: 'FAIL', detail: String(e) };
  }
  results.push({ name, ...res });
  console.log(`${res.status}${res.detail ? ` — ${res.detail}` : ''}`);
  if (res.status === 'FAIL' && res.log) console.log(res.log.split('\n').slice(-40).join('\n'));
}

const tail = (s, n = 6) =>
  s
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .slice(-n)
    .join(' | ');
const cmdStep = (cmd, argv, summarise = (o) => tail(o, 2), opts) => {
  const r = sh(cmd, argv, opts);
  return {
    status: r.code === 0 ? 'PASS' : 'FAIL',
    detail: `${r.code === 0 ? summarise(r.out) : tail(r.out, 3)} (${(r.ms / 1000).toFixed(1)}s)`,
    log: r.code === 0 ? undefined : r.out,
  };
};

// 1. Dependencies -------------------------------------------------------------
if (FULL)
  step('npm ci (clean install from lockfile)', () =>
    cmdStep(npm, ['ci', '--no-audit', '--no-fund']),
  );
else
  step('Lockfile consistency (npm ls)', () =>
    cmdStep(npm, ['ls', '--depth=0'], () => 'installed tree matches package-lock.json'),
  );
step('Dependency audit (production deps, high+)', () => {
  const r = sh(npm, ['audit', '--omit=dev', '--audit-level=high']);
  if (/ENOTFOUND|EAI_AGAIN|network|ECONNREFUSED|403/i.test(r.out) && r.code !== 0)
    return { status: 'NOT_RUN', detail: 'registry not reachable' };
  return { status: r.code === 0 ? 'PASS' : 'FAIL', detail: tail(r.out, 1), log: r.out };
});

// 2. Static checks -------------------------------------------------------------
step('Format (prettier --check)', () =>
  cmdStep(npx, ['prettier', '--check', '.'], (o) => tail(o, 1)),
);
step('Lint (eslint)', () => cmdStep(npx, ['eslint', '.'], () => 'no problems'));
step('TypeScript (core, content, web)', () =>
  cmdStep(npm, ['run', 'typecheck'], () => 'no type errors'),
);

// 3. Unit tests ----------------------------------------------------------------
step('Unit tests (core, content, storage, backup, scheduler, scorer)', () =>
  cmdStep(npx, ['vitest', 'run'], (o) => (o.match(/Tests\s+[^\n]+/g) ?? ['?']).pop().trim()),
);

// 4. API tests -----------------------------------------------------------------
step('API tests (services/api, fake providers, no network)', () => {
  const r = sh('node', ['scripts/run-api-tests.mjs']);
  if (r.code !== 0 && /No module named|not found|venv/i.test(r.out) && !/failed/.test(r.out))
    return { status: 'NOT_RUN', detail: 'Python environment unavailable', log: r.out };
  return { status: r.code === 0 ? 'PASS' : 'FAIL', detail: tail(r.out, 1), log: r.out };
});

// 5. A001 harness ----------------------------------------------------------------
if (QUICK)
  results.push({ name: 'A001 harness + candidate scorer', status: 'NOT_RUN', detail: '--quick' });
else
  step('A001 harness integrity + candidate 5×100 runs', () => {
    const r = sh('node', ['scripts/run-a001.mjs']);
    if (r.code !== 0) return { status: 'FAIL', detail: 'harness did not run', log: r.out };
    const rep = JSON.parse(
      readFileSync(join(root, 'tests/a001/results/A001_CANDIDATE_REPORT.json'), 'utf-8'),
    );
    const hold = JSON.parse(
      readFileSync(join(root, 'tests/a001/results/HOLDOUT_CANDIDATE_REPORT.json'), 'utf-8'),
    );
    results.push({
      name: '  ↳ Candidate scorer production gate (A001)',
      status: rep.gate === 'PASS' ? 'PASS' : 'FAIL (expected, recorded)',
      detail: `label+action ${rep.exact_label_action_rate}, safety failures ${rep.safety_failures.length}; holdout gate ${hold.gate}. Scorer stays DISABLED; scheduler stays shadow-only.`,
      informational: true,
    });
    return {
      status: 'PASS',
      detail: 'original unit tests, integrity, oracle, baseline and 5-run evaluations executed',
    };
  });

// 6. Build ----------------------------------------------------------------------
step('PWA production build', () => cmdStep(npm, ['run', 'build'], () => 'apps/web/dist built'));
step('PWA build contents', () => {
  const dist = join(root, 'apps/web/dist');
  const need = [
    'index.html',
    'sw.js',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png',
    'build-info.json',
  ];
  const missing = need.filter((f) => !existsSync(join(dist, f)));
  if (missing.length) return { status: 'FAIL', detail: `missing ${missing.join(', ')}` };
  const info = JSON.parse(readFileSync(join(dist, 'build-info.json'), 'utf-8'));
  const js = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
  const bytes = js.reduce((n, f) => n + statSync(join(dist, 'assets', f)).size, 0);
  return {
    status: 'PASS',
    detail: `precache ${info.precacheCount} files, cache ${info.cacheVersion}, JS ${(bytes / 1024).toFixed(0)} KB`,
  };
});

// 7. End-to-end, PWA offline, accessibility -----------------------------------------
if (QUICK)
  results.push({ name: 'Playwright e2e + PWA + axe', status: 'NOT_RUN', detail: '--quick' });
else
  step('Playwright e2e + PWA offline + axe (Chromium 375×667, 390×844)', () => {
    const r = sh(npx, ['playwright', 'test', '--trace', 'off', '--reporter', 'line']);
    const m = r.out.match(/(\d+) passed/);
    const f = r.out.match(/(\d+) failed/);
    const s = r.out.match(/(\d+) skipped/);
    return {
      status: r.code === 0 ? 'PASS' : 'FAIL',
      detail: `${m ? m[1] : 0} passed${f ? `, ${f[1]} failed` : ''}${s ? `, ${s[1]} skipped (screenshots)` : ''}`,
      log: r.code === 0 ? undefined : r.out,
    };
  });
const pwb = process.env.PLAYWRIGHT_BROWSERS_PATH;
const webkit = pwb && existsSync(pwb) && readdirSync(pwb).some((d) => d.startsWith('webkit'));
results.push({
  name: 'Playwright WebKit (Safari engine) project',
  status: webkit ? 'RAN (see e2e line above)' : 'NOT_RUN',
  detail: webkit
    ? 'webkit project included'
    : 'no Playwright WebKit build on this machine; run `npx playwright install webkit` then `npm run e2e` where permitted. WebKit ≠ iOS Safari.',
  informational: true,
});

// 8. Native app checks ----------------------------------------------------------
const mobile = join(root, 'apps/mobile');
if (!existsSync(join(mobile, 'node_modules')))
  results.push({
    name: 'Expo app checks',
    status: 'NOT_RUN',
    detail: 'run `npm ci` in apps/mobile first',
  });
else {
  step('Expo app TypeScript', () =>
    cmdStep(npx, ['tsc', '--noEmit'], () => 'no type errors', { cwd: mobile }),
  );
  step('Expo config evaluates (expo config --type public)', () =>
    cmdStep(npx, ['expo', 'config', '--type', 'public'], () => 'config OK', { cwd: mobile }),
  );
  if (
    existsSync(join(mobile, 'jest.config.js')) ||
    /"jest"/.test(readFileSync(join(mobile, 'package.json'), 'utf-8'))
  )
    step('Expo app unit tests (jest)', () =>
      cmdStep(npm, ['test', '--silent'], (o) => tail(o, 2), { cwd: mobile }),
    );
  if (FULL)
    step('Expo iOS JS bundle (expo export --platform ios)', () =>
      cmdStep(
        npx,
        ['expo', 'export', '--platform', 'ios', '--output-dir', 'dist-ios'],
        (o) => tail(o, 1),
        { cwd: mobile },
      ),
    );
}
results.push({
  name: 'EAS iOS build / signing / TestFlight',
  status: 'BLOCKED_EXTERNAL',
  detail: 'IOS_SIGNING_BLOCKED_EXTERNAL: needs Expo account + Apple Developer membership',
  informational: true,
});
results.push({
  name: 'Physical iPhone test',
  status: 'BLOCKED_EXTERNAL',
  detail: 'PHYSICAL_IPHONE_NOT_TESTED: see docs/IPHONE-INSTALL-AND-TEST.md',
  informational: true,
});

// 9. Secrets and packaging hygiene --------------------------------------------------
step('No secrets, recordings or databases in tracked files', () => {
  const r = sh('git', ['ls-files', '-z']);
  const files = r.out.split('\0').filter(Boolean);
  const banned = files.filter((f) =>
    /\.(db|sqlite3?|m4a|wav|caf|mp3|p8|p12|mobileprovision|keystore|jks)$|(^|\/)\.env$/i.test(f),
  );
  const patterns = [
    /sk-[A-Za-z0-9]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /ghp_[A-Za-z0-9]{30,}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
    /AIza[0-9A-Za-z_-]{35}/,
  ];
  const hits = [];
  for (const f of files) {
    if (f.startsWith('spec-source/') || /\.(png|jpg|zip|ico)$/i.test(f)) continue;
    let text;
    try {
      text = readFileSync(join(root, f), 'utf-8');
    } catch {
      continue;
    }
    if (patterns.some((p) => p.test(text))) hits.push(f);
  }
  const bad = [...banned, ...hits];
  return bad.length
    ? { status: 'FAIL', detail: bad.join(', ') }
    : { status: 'PASS', detail: `${files.length} tracked files scanned` };
});
step('Built PWA makes no third-party requests and contains no keys', () => {
  const dist = join(root, 'apps/web/dist');
  const files = [];
  const walk = (d) =>
    readdirSync(d).forEach((n) =>
      statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : files.push(join(d, n)),
    );
  walk(dist);
  const offenders = [];
  for (const f of files.filter((x) => /\.(js|html|css|webmanifest)$/.test(x))) {
    const t = readFileSync(f, 'utf-8');
    const urls = (t.match(/https?:\/\/[^\s"'`)]+/g) ?? []).filter(
      (u) =>
        // Constants, not requests: SVG/XML namespaces, React error-doc links, zod's JSON-Schema ids and URL templates.
        !/^https?:\/\/(www\.w3\.org|reactjs\.org|react\.dev|example\.com|json-schema\.org)|^http:\/\/\[\$\{/.test(
          u,
        ),
    );
    if (urls.length)
      offenders.push(`${relative(root, f)}: ${[...new Set(urls)].slice(0, 3).join(' ')}`);
    if (/sk-[A-Za-z0-9]{20,}|api[_-]?key\s*[:=]\s*["'][A-Za-z0-9]/i.test(t))
      offenders.push(`${relative(root, f)}: key-like string`);
  }
  return offenders.length
    ? { status: 'FAIL', detail: offenders.join('; ') }
    : { status: 'PASS', detail: `${files.length} built files scanned` };
});

// Summary ---------------------------------------------------------------------
const failed = results.filter((r) => r.status === 'FAIL');
const commit = sh('git', ['rev-parse', '--short', 'HEAD']).out.trim();
const lines = [
  `# Verification summary`,
  ``,
  `- Command: \`npm run verify${FULL ? ' -- --full' : QUICK ? ' -- --quick' : ''}\``,
  `- When: ${new Date().toISOString()}`,
  `- Commit: ${commit} (working tree may contain uncommitted changes when run locally)`,
  `- Machine: ${process.platform} ${process.arch}, Node ${process.version}`,
  ``,
  `| Step | Status | Detail |`,
  `|---|---|---|`,
  ...results.map(
    (r) => `| ${r.name} | ${r.status} | ${String(r.detail ?? '').replace(/\|/g, '/')} |`,
  ),
  ``,
  failed.length
    ? `**${failed.length} step(s) FAILED.**`
    : `**All executed verification steps passed.** Informational rows record known, external or expected states.`,
];
mkdirSync(join(root, 'docs/evidence'), { recursive: true });
writeFileSync(join(root, 'docs/evidence/verify-latest.md'), lines.join('\n') + '\n');
console.log('\n' + lines.join('\n'));
process.exit(failed.length ? 1 : 0);
