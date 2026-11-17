export const PLATE_R = 0.2;
export const PLATE_RIM = Object.freeze({ perfect: 0xd4a017, great: 0x9aa7b5, good: 0xd6d1c6, plain: 0xd6d1c6 });

const PLATE = 0xd6d1c6;
const FOOD = [0xc98a4b, 0x8fae5d, 0xd0a85e, 0xb5694a, 0x7fa37a, 0xc7a27c];
const RIM_H = 0.02, PLATE_H = 0.02, FOOD_H = 0.1;

export function plateParts(slot, dish, i) {
  const at = (kind, y, w, h, color, shape = 'cyl') => ({ kind, shape, x: slot.x, y: slot.y + y, z: slot.z, w, h, d: w, w2: w, color });
  return [
    at('rim', RIM_H / 2, PLATE_R * 2, RIM_H, PLATE_RIM[dish.tier] ?? PLATE_RIM.plain),
    at('plate', RIM_H + PLATE_H / 2, PLATE_R * 2 - 0.1, PLATE_H, PLATE),
    at('food', RIM_H + PLATE_H + FOOD_H / 2, PLATE_R * 2 - 0.18, FOOD_H, FOOD[i % FOOD.length], 'ball'),
  ];
}
