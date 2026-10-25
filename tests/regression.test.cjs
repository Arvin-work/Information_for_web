const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync('public/selection/script.js', 'utf8');
test('week-aware conflicts allow disjoint weeks and days', () => {
  const start = source.indexOf('function courseKey'),
    end = source.indexOf('function esc');
  const c = vm.createContext({});
  vm.runInContext('let selected=new Map();' + source.slice(start, end), c);
  const a = { weekday: 1, start_period: 1, end_period: 2, weeks: [1, 3, 5] };
  assert.equal(c.slotsConflict(a, { ...a, weeks: [2, 4] }), false);
  assert.equal(c.slotsConflict(a, { ...a, weeks: [3] }), true);
  assert.equal(c.slotsConflict(a, { ...a, weekday: 2 }), false);
  assert.equal(
    c.slotsConflict(a, { ...a, start_period: 3, end_period: 4 }),
    false,
  );
});
test('real course catalog retains usable schedules', () => {
  const data = JSON.parse(fs.readFileSync('public/data/courses.json'));
  assert.ok(data.length > 100);
  for (const c of data.filter((c) => c.slots?.length))
    for (const s of c.slots) {
      assert.ok(s.weekday >= 1 && s.weekday <= 7);
      assert.ok(Array.isArray(s.weeks));
      assert.ok(Array.isArray(s.periods));
    }
});
test('local plan storage restores keys, tolerates malformed and blocked storage', () => {
  let stored = '';
  const c = {
    window: {},
    localStorage: { getItem: () => stored, setItem: (_, v) => (stored = v) },
  };
  vm.runInNewContext(fs.readFileSync('public/selection/storage.js', 'utf8'), c);
  const store = c.window.AltforkPlan;
  assert.equal(store.save(['a__1', 'b__2']), true);
  assert.deepEqual(Array.from(store.load()), ['a__1', 'b__2']);
  stored = '{bad';
  assert.equal(store.load().length, 0);
  c.localStorage.setItem = () => {
    throw Error();
  };
  assert.equal(store.save([]), false);
});
test('publication excludes source and internal local links resolve', () => {
  for (const f of [
    'worker',
    'scripts',
    'work',
    'package.json',
    '.git',
    'WEB-DEV-GUIDE.md',
  ])
    assert.equal(fs.existsSync(path.join('dist', f)), false);
  function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) scan(f);
      else if (f.endsWith('.html')) {
        for (const m of fs
          .readFileSync(f, 'utf8')
          .matchAll(/(?:href|src)="([^"]+)"/g)) {
          const url = m[1];
          if (!url.startsWith('/') || url.startsWith('//')) continue;
          let target = path.join('dist', url.split('#')[0]);
          if (fs.existsSync(target) && fs.statSync(target).isDirectory())
            target = path.join(target, 'index.html');
          assert.ok(fs.existsSync(target), `${f}: ${url}`);
        }
      }
    }
  }
  scan('dist');
});
