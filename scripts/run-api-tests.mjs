// Runs the optional Python API test suite (services/api). Cross-platform (Windows/macOS/Linux).
// Creates services/api/.venv on first run (needs Python 3.11+ and access to PyPI).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = resolve(root, 'services/api');
const win = process.platform === 'win32';
const venvPy = resolve(api, '.venv', win ? 'Scripts/python.exe' : 'bin/python');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: api, ...opts });
  if (r.error) throw r.error;
  return r.status ?? 1;
}

if (!existsSync(venvPy)) {
  const py = win ? 'python' : 'python3';
  console.log(`Creating virtual environment with ${py} …`);
  if (run(py, ['-m', 'venv', '.venv']) !== 0) process.exit(1);
  if (run(venvPy, ['-m', 'pip', 'install', '-q', '-r', 'requirements-dev.txt']) !== 0)
    process.exit(1);
}
process.exit(run(venvPy, ['-m', 'pytest', '-q', ...process.argv.slice(2)]));
