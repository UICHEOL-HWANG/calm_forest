const inDocument = (id) => !!document.getElementById(id);
export function installEach(steps, report, has = inDocument) {
  const out = {};
  const skip = (name, msg) => { out[name] = null; report(name, new Error(msg)); };
  for (const [name, run, needs = [], after = []] of steps) {
    const missing = needs.filter((id) => !has(id));
    if (missing.length) { skip(name, `missing #${missing.join(', #')}`); continue; }
    const down = after.filter((dep) => !out[dep]);
    if (down.length) { skip(name, `needs ${down.join(', ')}`); continue; }
    try { out[name] = run(out); } catch (e) { out[name] = null; report(name, e); }
  }
  return out;
}
