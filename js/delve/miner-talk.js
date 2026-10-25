import { hideTalk, onTalkTap, showTalk, talkShown } from '../mirror/talk-box.js';
import { t, getLang } from '../i18n.js';

let queue = [], done = null;

const nextHint = () => {
  const en = getLang() === 'en', touch = document.body.classList.contains('is-touch');
  return touch ? (en ? '▶ Tap' : '▶ 탭') : (en ? '▶ Space · click' : '▶ Space · 클릭');
};

function showHead() {
  showTalk({ face: '👷', color: '#f3d27a', name: t('광부 아저씨'), line: queue[0], next: nextHint() });
}

export function playMinerLines(lines, onDone = null) {
  queue = lines.map(t);
  done = onDone;
  if (!queue.length) return finish();
  onTalkTap(advanceMinerTalk);
  showHead();
}

function finish() {
  hideTalk();
  queue = [];
  const fn = done; done = null;
  fn?.();
}

export function advanceMinerTalk() {
  if (!queue.length) return;
  queue = queue.slice(1);
  if (queue.length) showHead(); else finish();
}

export const minerTalkOpen = () => queue.length > 0 && talkShown();

export function closeMinerTalk() {
  if (!queue.length) return;
  queue = [];
  done = null;
  hideTalk();
}
