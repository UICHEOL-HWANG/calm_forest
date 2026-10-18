import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const git = (args) => execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

export function gitDate(files) {
  try {
    if (git(['rev-parse', '--is-shallow-repository']) !== 'false') return null;
    const out = git(['log', '-1', '--format=%cs', '--', ...files]);
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}
