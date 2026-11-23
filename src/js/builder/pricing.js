// Pricing (SPEC §8.3). Pure. The browser, the build script and the Worker all use this module,
// so the price a visitor sees is the price the server charges.
//
// quote(state, config) → { lines: [{ id, label, amount }], total, deposit, priced }
// All amounts are whole US dollars. A null amount means "not priced": the total becomes null.

const labelFor = (config, group, id) => ((config.options?.[group] || []).find((o) => o.id === id) || {}).line || id;

// An option price is a flat number or an object keyed by size id; null (or a missing size) is unpriced.
export function optionPrice(config, group, id, sizeId) {
  const table = config.pricing[group];
  if (!table || !Object.prototype.hasOwnProperty.call(table, id)) return null;
  const v = table[id];
  if (v !== null && typeof v === 'object') return Object.prototype.hasOwnProperty.call(v, sizeId) ? v[sizeId] : null;
  return v;
}

export function quote(state, config) {
  const P = config.pricing;
  const size = P.sizes.find((s) => s.id === state.size);
  if (!size) throw new Error(`Unknown size ${state.size}`);
  const lines = [];
  const sign = state.sides === 2 ? size.double : size.single;
  lines.push({ id: 'sign', label: 'Sign', amount: sign ?? null });

  const add = (group, id) => {
    const amount = optionPrice(config, group, id, size.id);
    if (amount === 0) return;
    lines.push({ id: group, label: labelFor(config, group, id), amount });
  };
  add('shape', state.shape);
  add('base', state.base);
  if (state.base !== 'posts') add('pillars', state.pillars);
  add('lettering', state.lettering);
  if (state.install) {
    const amount = size.install ?? null;
    if (amount !== 0) lines.push({ id: 'install', label: 'Installation', amount });
  }

  const priced = lines.every((l) => Number.isInteger(l.amount));
  if (!priced) return { lines, total: null, deposit: null, priced: false };
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  const deposit = Math.round((total * P.deposit_percent) / 100);
  return { lines, total, deposit, priced: true };
}

// The price difference a choice makes against the current state, for the option rows.
export function delta(state, config, change) {
  const a = quote(state, config), b = quote({ ...state, ...change }, config);
  if (!a.priced || !b.priced) return null;
  return b.total - a.total;
}

export const money = (amount) => '$' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
