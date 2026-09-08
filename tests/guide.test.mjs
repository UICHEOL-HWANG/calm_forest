import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const IMG_DIR = new URL('guide/img/', ROOT);

// Task 2 에서 fragment 가 참조할 이미지 — 여기 없는 파일은 배포되지 않는다
export const GUIDE_IMAGES = [
  '00_title.jpg', '01_charselect.jpg', '02_intro_b.jpg', '14_help.jpg',
  '03_village_start.jpg', '30_mobile_coach.jpg', '12_bag.jpg', '10_bench.jpg', '04_coach.jpg',
  '05_chop.jpg', '05_chop_fall.jpg', '05b_merchant.jpg',
  '06_farm_till.jpg', '06_farm_water.jpg', '06_farm_mature.jpg', '06_farm_harvest.jpg',
  '20_farmfield_plot.jpg', '09_shop_buy.jpg', '09_market.jpg',
  '07_build2.jpg', '07_house_done.jpg', '07_decor.jpg', '29_house6.jpg',
  '08_fish_bite.jpg', '08_fish_catch2.jpg', '11_npc.jpg', '11_owl.jpg',
  '21_mine_dig.jpg', '17_carve_orders.jpg', '16_kitchen_mg.jpg', '17_carve_mid.jpg',
  '22_cafe_serve.jpg', '18_coop_modal.jpg', '19_forest_pick.jpg', '24_glade.jpg',
  '26_sea_fight.jpg', '27_river_run2.jpg', '28_mist_wave2.jpg',
  '23_night.jpg', '25_rain.jpg', '13_dex.jpg', '15_story.jpg', '14_menu.jpg',
];

test('guide/img 에 필요한 이미지가 전부 있다', () => {
  assert.ok(existsSync(IMG_DIR), 'guide/img/ 가 없다');
  for (const name of GUIDE_IMAGES) assert.ok(existsSync(new URL(name, IMG_DIR)), `${name} 없음`);
});

test('이미지 장당 160KB 이하 · 총량 3MB 이하', () => {
  let total = 0;
  for (const name of readdirSync(IMG_DIR)) {
    const size = statSync(new URL(name, IMG_DIR)).size;
    total += size;
    assert.ok(size <= 160 * 1024, `${name} 가 ${Math.round(size / 1024)}KB — 160KB 초과`);
  }
  assert.ok(total <= 3 * 1024 * 1024, `총량 ${Math.round(total / 1024)}KB — 3MB 초과`);
});
