// 🧪 game.js 를 텍스트로 검사하는 테스트용 — "game.js 원문"을 돌려준다.
//    2026-09-24 분리 1단계에서 앞 구간의 데이터 표를 js/data/*.js 로 원문 그대로 옮겼다.
//    그 선언들은 옮기기 전엔 game.js 에 `const X = …` 로 있었으므로, data 파일의 줄머리 `export ` 만 벗겨
//    game.js 뒤에 이어 붙이면 테스트가 보던 텍스트(선언 원문)가 그대로 나온다.
//    ⚠️ 테스트의 단언은 이 도우미 때문에 바꾸지 않는다 — 읽는 대상만 넓힌다.
import { readFileSync, readdirSync } from 'node:fs';

const JS = new URL('../../js/', import.meta.url);

//    2026-09-25 분리 2단계부터는 js/spaces/*.js(구역별 모듈)도 같은 식으로 잇는다.
//    ⚠️ spaces 의 `$w.x = …`(game.js 에 남은 let 에 쓰기)는 원문의 `x = …` 로 되돌린다.
const readDir = (sub, fix = (t) => t) => {
  const dir = new URL(sub, JS);
  try {
    return readdirSync(dir).filter(f => f.endsWith('.js')).sort()
      .map(f => fix(readFileSync(new URL(f, dir), 'utf8').replace(/^(\s*)export /gm, '$1')));
  } catch { return []; }   // 디렉터리가 아직 없다
};
export function gameSource() {
  const game = readFileSync(new URL('game.js', JS), 'utf8');
  return [game, ...readDir('data/'), ...readDir('spaces/', t => t.replace(/\$w\.(?=[A-Za-z_$])/g, ''))].join('\n');
}
