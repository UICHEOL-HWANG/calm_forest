import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const THREE_URL = pathToFileURL(path.join(ROOT, 'vendor/three/three.module.js')).href;

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: THREE_URL, shortCircuit: true };
  return next(specifier, context);
}
