# Task 6 report
- Added saleTagOf(item) to js/shop/sale-window.js (label '🎃 할로윈 한정', until '~11/2' separate).
- cafe.js drawCosMenu: import saleTagOf; premium_row_view now carries sale param; tag (small.sale-tag with two spans: label translated, date untranslated) appended to row's first span when it.sale && mode !== 'owned'.
- index.html: `.sh-row .sale-tag` rule next to .sh-row styles.
- TDD: RED = `node --test tests/halloween-sale-window.test.mjs tests/premium-shop-wiring.test.mjs` -> fail 2; GREEN: npm test 1810 pass / 0 fail.
- No existing tests edited (only appended).
- Concern: tag lives inside the nowrap/ellipsis span (per brief); mobile 390px wrap to be eyeballed in Task 13.
