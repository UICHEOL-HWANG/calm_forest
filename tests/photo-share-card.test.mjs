import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/game-ui/photos.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('function frameActionShot('), src.indexOf('\n}\n', src.indexOf('function frameActionShot(')));

test('share card keeps the imported t so the title and dex line are translated, not thrown', () => {
  assert.match(src, /^import \{ t \} from '\.\.\/i18n\.js';/m);
  assert.doesNotMatch(body, /\b(const|let|var)\s+t\b/);
  assert.match(body, /c\.fillText\(t\('🌿 고요한 숲'\)/);
  assert.match(body, /c\.fillText\(t\(`\$\{wIco\}/);
});
