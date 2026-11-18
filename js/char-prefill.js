export function createPrefill({ make }) {
  let current = '';
  let dirty = false;
  return {
    seed(animalId) {
      if (dirty) return null;
      current = make(animalId);
      return current;
    },
    reroll(animalId) {
      dirty = false;
      current = make(animalId);
      return current;
    },
    edited(value) { if (value !== current) dirty = true; },
    touched: () => dirty,
    isDefault: (value) => !dirty && value === current,
  };
}
