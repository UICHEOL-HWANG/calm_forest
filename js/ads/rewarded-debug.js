import { showRewarded, rewardedAvailable } from './rewarded.js';

const box = document.createElement('div');
box.id = 'ads-debug';
box.style.cssText = 'position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483647;'
  + 'display:flex;flex-direction:column;gap:6px;max-width:70vw;font:12px/1.4 ui-monospace,monospace;';

const button = document.createElement('button');
button.type = 'button';
button.textContent = 'AD TEST';
button.style.cssText = 'padding:10px 14px;border:0;border-radius:10px;background:#d9480f;color:#fff;font-weight:700;';

const out = document.createElement('pre');
out.id = 'ads-debug-out';
out.style.cssText = 'margin:0;padding:8px;border-radius:8px;background:rgba(0,0,0,.75);color:#9ef01a;white-space:pre-wrap;word-break:break-all;';
out.textContent = `available=${rewardedAvailable}`;

const history = [];
button.addEventListener('click', async () => {
  button.disabled = true;
  out.textContent = 'loading…';
  const r = await showRewarded('debug');
  history.unshift(JSON.stringify(r));
  out.textContent = history.slice(0, 4).join('\n');
  button.disabled = false;
});

box.append(button, out);
document.body.append(box);
