export const SPOT = Object.freeze({
  rod: Object.freeze({ in: 2.2, out: 3.4 }),
  hammer: Object.freeze({ in: 2.8, out: 3.6 }),
  axe: Object.freeze({ in: 2.6, out: 3.2 }),
});
export const SPOT_REASON = Object.freeze({ rod: 'lake', hammer: 'house', axe: 'tree' });
export const IDLE = Object.freeze({ on: false, tool: null, prevPage: null, prevTool: null });

const DIST_KEY = { rod: 'lake', hammer: 'house', axe: 'tree' };

export function spotWant(d) {
  for (const tool of ['rod', 'hammer', 'axe']) if ((d[DIST_KEY[tool]] ?? Infinity) < SPOT[tool].in) return tool;
  return null;
}

export function spotKeep(tool, d) {
  return !!DIST_KEY[tool] && (d[DIST_KEY[tool]] ?? Infinity) < SPOT[tool].out;
}

export function spotToolStep(state, { eligible, page, tool, want, keep }) {
  if (!state.on) {
    if (!eligible || !want || page === 'none') return { act: null, state };
    if (tool === want) return { act: null, state: { on: true, tool: want, prevPage: null, prevTool: null } };
    return { act: 'grab', state: { on: true, tool: want, prevPage: page, prevTool: tool } };
  }
  if (page === 'none') return { act: null, state: IDLE };
  if (eligible && keep) return { act: null, state };
  if (tool !== state.tool || !state.prevTool) return { act: null, state: IDLE };
  return { act: 'restore', state: IDLE, restore: { page: state.prevPage, tool: state.prevTool } };
}
