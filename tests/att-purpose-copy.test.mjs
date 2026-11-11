import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const EN = "Used to see which ad brought you here and to show ads that fit you better. The game works the same if you don't allow it.";
const KO = '광고를 보고 오셨는지 확인하고, 내게 맞는 광고를 보여 주는 데 써요. 허용하지 않아도 게임은 똑같이 즐길 수 있어요.';

test('the iOS tracking prompt names both Tenjin attribution and AdMob ads', () => {
  assert.ok(read('ios/App/App/Info.plist').includes(`<string>${EN}</string>`));
  assert.ok(read('ios/App/App/en.lproj/InfoPlist.strings').includes(`"NSUserTrackingUsageDescription" = "${EN}";`));
  assert.ok(read('ios/App/App/ko.lproj/InfoPlist.strings').includes(`"NSUserTrackingUsageDescription" = "${KO}";`));
});
