const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const boot = fs.readFileSync('public/assets/theme-init.js', 'utf8');
function initial(saved, dark, blocked = false) {
  const dataset = {};
  vm.runInNewContext(boot, {
    document: { documentElement: { dataset } },
    localStorage: {
      getItem() {
        if (blocked) throw Error('blocked');
        return saved;
      },
    },
    matchMedia: () => ({ matches: dark }),
  });
  return dataset.theme;
}
test('theme follows system until visitor explicitly chooses', () => {
  assert.equal(initial(null, true), 'dark');
  assert.equal(initial(null, false), 'light');
  assert.equal(initial('light', true), 'light');
  assert.equal(initial('dark', false), 'dark');
});
test('invalid or unavailable preference storage falls back to system', () => {
  assert.equal(initial('invalid', true), 'dark');
  assert.equal(initial(null, false, true), 'light');
});
