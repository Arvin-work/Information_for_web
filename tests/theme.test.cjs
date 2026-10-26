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

test('client navigation preserves the selected theme before paint and keeps new controls in sync', () => {
  for (const blocked of [false, true]) {
    let saved = 'dark';
    const page = () => {
      const button = Object.assign(new EventTarget(), {
        attributes: {},
        label: {},
        setAttribute(key, value) {
          this.attributes[key] = value;
        },
        querySelector() {
          return this.label;
        },
      });
      const meta = {
        setAttribute(key, value) {
          this[key] = value;
        },
      };
      return {
        documentElement: { dataset: {} },
        button,
        meta,
        querySelector: () => meta,
      };
    };
    let active = page();
    active.documentElement.dataset.theme = 'dark';
    const document = Object.assign(new EventTarget(), {
      querySelector: () => active.meta,
      querySelectorAll: () => [active.button],
    });
    Object.defineProperty(document, 'documentElement', {
      get: () => active.documentElement,
    });
    const context = vm.createContext({
      document,
      window: new EventTarget(),
      AbortController,
      matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
      localStorage: {
        getItem() {
          if (blocked) throw Error('blocked');
          return saved;
        },
        setItem(_key, value) {
          if (blocked) throw Error('blocked');
          saved = value;
        },
      },
    });
    vm.runInContext(fs.readFileSync('public/assets/main.js', 'utf8'), context);
    const navigate = (expected) => {
      const next = page();
      const oldButton = active.button;
      const event = new Event('astro:before-swap');
      event.newDocument = next;
      document.dispatchEvent(event);
      assert.equal(
        next.documentElement.dataset.theme,
        expected,
        'theme must exist before the new document is displayed',
      );
      assert.equal(
        next.meta.content,
        expected === 'dark' ? '#1e1e1e' : '#f7f5ef',
      );
      active = next;
      document.dispatchEvent(new Event('astro:page-load'));
      assert.equal(
        active.button.attributes['aria-pressed'],
        String(expected === 'dark'),
      );
      oldButton.dispatchEvent(new Event('click'));
      assert.equal(
        active.documentElement.dataset.theme,
        expected,
        'old controls must be disconnected',
      );
    };
    // Home -> archive -> briefing, even when the system preference is light.
    navigate('dark');
    navigate('dark');
    active.button.dispatchEvent(new Event('click'));
    assert.equal(active.documentElement.dataset.theme, 'light');
    navigate('light');
    // Reinitializing on page-load must not bind two toggle handlers.
    document.dispatchEvent(new Event('astro:page-load'));
    active.button.dispatchEvent(new Event('click'));
    assert.equal(active.documentElement.dataset.theme, 'dark');
    navigate('dark');
  }
});
