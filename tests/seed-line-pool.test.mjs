import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleTable, parseArgs } from '../tools/seed-line-pool.mjs';

test('sampleTable 은 칸마다 줄을 표로 만들고 버린 이유를 센다', () => {
  const md = sampleTable([
    { cell: { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, lines: ['더 없소?', '마지막이오!'], dropped: { digit: 1 }, failure: null },
    { cell: { kind: 'auction', key: 'moonswing', slot: 'intro', lang: 'en' }, lines: [], dropped: {}, failure: 'parse' },
  ]);
  assert.match(md, /\| _any \| last \| ko \| 더 없소\? \|/);
  assert.match(md, /\| _any \| last \| ko \| 마지막이오! \|/);
  assert.match(md, /digit 1/);
  assert.match(md, /moonswing \| intro \| en \| \(실패: parse\)/);
});

test('parseArgs 는 --sample 이 없으면 sample null, 기본 kind auction', () => {
  assert.deepEqual(parseArgs([]), { kind: 'auction', sample: null });
  assert.deepEqual(parseArgs(['--sample', '10']), { kind: 'auction', sample: 10 });
});

test('parseArgs 는 잘못된 --sample 과 --kind 를 던진다', () => {
  assert.throws(() => parseArgs(['--sample']), /--sample/);
  assert.throws(() => parseArgs(['--sample', 'abc']), /--sample/);
  assert.throws(() => parseArgs(['--sample', '0']), /--sample/);
  assert.throws(() => parseArgs(['--sample', '--kind', 'auction']), /--sample/);
  assert.throws(() => parseArgs(['--kind', 'nope']), /--kind/);
});

test('parseArgs 는 = 형태, 오타, 반복, 범위 밖 값을 모두 던진다', () => {
  for (const argv of [['--sample=abc'], ['--sample=10'], ['--kind=auction'], ['--sampel', '10'], ['--sample', '10', '--sample', '5'], ['--sample', '12345'], ['--dry-run'], ['--kind']]) {
    assert.throws(() => parseArgs(argv), /--/, argv.join(' '));
  }
  assert.deepEqual(parseArgs(['--kind', 'auction', '--sample', '10']), { kind: 'auction', sample: 10 });
});
