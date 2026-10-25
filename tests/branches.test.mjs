import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

test('branch directories contain static published content and preserve parent navigation', () => {
  for (const route of [
    'block-1',
    'block-2',
    'notes',
    'tools',
    'notes/computer',
    'notes/space',
  ]) {
    const html = readFileSync(`dist/branches/${route}/index.html`, 'utf8');
    const { document } = parseHTML(html);
    assert.ok(document.querySelector('#journey[data-directory]'));
    assert.ok(document.querySelector('#gitGraph'));
    assert.ok(document.querySelector('.branch-breadcrumb a[href]'));
    assert.ok(
      document.querySelector('[name="astro-view-transitions-enabled"]'),
    );
    assert.ok(!document.querySelector('script[src="/assets/auth.js"]'));
  }
  const articles = readFileSync(
    'dist/branches/notes/computer/index.html',
    'utf8',
  );
  assert.ok(
    articles.includes('/posts/computer/wsl2_NV_GPU_problem_solve.html'),
  );
  const tools = readFileSync('dist/branches/tools/index.html', 'utf8');
  assert.ok(tools.includes('href="/selection/"'));
  const empty = readFileSync('dist/branches/block-1/index.html', 'utf8');
  assert.equal(
    parseHTML(empty)
      .document.querySelector('.directory-count')
      .textContent.replace(/\s+/g, ' ')
      .trim(),
    '0 个已发布内容',
  );
  const sourceDraft = readFileSync(
    'src/content/posts/Python_env_managers.md',
    'utf8',
  ).match(/^title: (.+)$/m)[1];
  assert.ok(!articles.includes(sourceDraft));
});

test('first branch activation expands, second enters; collapse and return do not duplicate handlers', () => {
  const { document, window: domWindow } = parseHTML(
    readFileSync('dist/index.html', 'utf8'),
  );
  document.querySelector('#terminal').remove();
  let connected = 0;
  let disconnected = 0;
  let frameId = 0;
  const canceled = [];
  class Observer {
    observe() {
      connected++;
    }
    disconnect() {
      disconnected++;
    }
  }
  const context = vm.createContext({
    document,
    window: Object.assign(new EventTarget(), { ResizeObserver: Observer }),
    matchMedia: () => Object.assign(new EventTarget(), { matches: true }),
    ResizeObserver: Observer,
    MutationObserver: Observer,
    AbortController,
    performance,
    requestAnimationFrame: () => ++frameId,
    cancelAnimationFrame: (id) => canceled.push(id),
    heroMedia: { image: null },
  });
  const source = readFileSync('public/assets/explorer.js', 'utf8').replace(
    /^import[\s\S]*?;\s*/gm,
    '',
  );
  vm.runInContext(source, context);
  assert.equal(connected, 2);
  const branch = document.querySelector('#block-1');
  const summary = branch.querySelector('summary');
  summary.focus = () => {};
  branch.open = false;
  let entries = 0;
  branch
    .querySelector('[data-branch-enter]')
    .addEventListener('click', (event) => {
      event.preventDefault();
      entries++;
    });
  const activate = () => {
    const event = new domWindow.Event('click', {
      bubbles: true,
      cancelable: true,
    });
    summary.dispatchEvent(event);
    if (!event.defaultPrevented) branch.open = !branch.open;
    return event;
  };
  activate();
  assert.equal(branch.open, true);
  assert.equal(entries, 0);
  assert.equal(activate().defaultPrevented, true);
  assert.equal(entries, 1);
  document.dispatchEvent(new domWindow.Event('astro:page-load'));
  activate();
  assert.equal(
    entries,
    2,
    'same DOM must not bind the navigation handler twice',
  );
  assert.equal(connected, 2);
  branch.querySelector('[data-branch-collapse]').click();
  assert.equal(branch.open, false);
  document.dispatchEvent(new domWindow.Event('astro:before-swap'));
  assert.equal(disconnected, 2);
  assert.ok(canceled.includes(frameId));
  document
    .querySelector('#journey')
    .replaceWith(document.querySelector('#journey').cloneNode(true));
  document.dispatchEvent(new domWindow.Event('astro:page-load'));
  assert.equal(connected, 4);
});
