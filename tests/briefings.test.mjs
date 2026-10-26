import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import {
  groupBriefings,
  briefingPagePath,
} from '../src/lib/briefing-archive.mjs';
import { normalizeProps } from '../public/assets/briefing/model.mjs';
import {
  getDuration,
  getGraphicDuration,
  getOverviewPages,
} from '../public/assets/briefing/timeline.mjs';
import { renderFrame } from '../public/assets/briefing/renderer.mjs';
import { contentTree } from '../dist/assets/content-index.mjs';

const documentAt = (path) =>
  parseHTML(readFileSync(`dist${path}index.html`, 'utf8')).document;

test('years grow down the calendar tree and sibling dates grow from small to large', () => {
  const dates = [
    '2025-12-31',
    '2026-01-02',
    '2026-10-22',
    '2026-01-01',
    '2026-10-23',
    '2027-01-01',
  ];
  const archive = groupBriefings(
    dates.map((date) => ({
      date,
      href: briefingPagePath(date),
      summary: date,
    })),
  );
  assert.deepEqual(
    archive.map((year) => year.year),
    ['2025', '2026', '2027'],
  );
  assert.deepEqual(
    archive[1].months.map((month) => month.month),
    ['01', '10'],
  );
  assert.deepEqual(
    archive[1].months[1].issues.map((issue) => issue.date),
    ['2026-10-22', '2026-10-23'],
  );
  assert.equal(archive[1].count, 4);
  assert.equal(
    archive[1].months[0].href,
    '/branches/block-1/ai-daily/2026/01/',
  );
  assert.equal(
    archive[0].months[0].issues[0].href,
    '/information/ai-daily/2025/12/31/',
  );
  assert.deepEqual(groupBriefings([]), []);
});

test('information, AI channel, year and month lead to the real dated static briefings', () => {
  const home = documentAt('/');
  assert.match(
    home.querySelector('#block-1 .category-title').textContent,
    /信息/,
  );
  const stages = [
    ['/branches/block-1/', '/branches/block-1/ai-daily/'],
    ['/branches/block-1/ai-daily/', '/information/ai-daily/2026/10/23/'],
    ['/branches/block-1/ai-daily/2026/', '/information/ai-daily/2026/10/23/'],
    [
      '/branches/block-1/ai-daily/2026/10/',
      '/information/ai-daily/2026/10/23/',
    ],
  ];
  for (const [path, next] of stages) {
    const document = documentAt(path);
    assert.ok(document.querySelector('#gitGraph'));
    assert.ok(
      document.querySelector(`a[href="${next}"]`),
      `${path} must reach ${next}`,
    );
    assert.ok(
      document.querySelector('[name="astro-view-transitions-enabled"]'),
    );
    assert.ok(!document.querySelector('script[src="/assets/auth.js"]'));
  }
  assert.equal(contentTree['/block-1'].label, '信息');
  const tree = documentAt('/branches/block-1/ai-daily/');
  assert.ok(
    tree.querySelector(
      '.archive-year[data-year="2026"] .archive-month[data-month="10"] .archive-days a[href="/information/ai-daily/2026/10/23/"]',
    ),
  );
  assert.ok(!tree.querySelector('[data-branch-enter]'));
  assert.ok(!tree.querySelector('.main-tail'));
  assert.ok(!tree.querySelector('[data-archive-tree] a[href^="/branches/"]'));
  assert.deepEqual(contentTree['/block-1/ai-daily/2026/10'].children, [
    '22',
    '23',
    '26',
  ]);
  assert.deepEqual(
    [...tree.querySelectorAll('.archive-days time')].map((time) =>
      time.getAttribute('datetime'),
    ),
    ['2026-10-22', '2026-10-23', '2026-10-26'],
  );
  assert.equal(
    contentTree['/block-1/ai-daily/2026/10/22'].href,
    '/information/ai-daily/2026/10/22/',
  );
});

test('each issue retains the original animation data and all stories and sources as static HTML', () => {
  for (const file of readdirSync('src/content/briefings')) {
    const source = JSON.parse(
      readFileSync(`src/content/briefings/${file}`, 'utf8'),
    );
    if (source.draft !== false) continue;
    const data = normalizeProps(source);
    const document = documentAt(briefingPagePath(data.date));
    const payload = JSON.parse(
      document.querySelector('[data-briefing-data]').textContent,
    );
    assert.deepEqual(payload, data);
    assert.equal(
      document.querySelectorAll('.briefing-story').length,
      data.items.length,
    );
    assert.equal(
      document.querySelector('[data-canvas]').getAttribute('width'),
      '1920',
    );
    assert.equal(
      document.querySelector('[data-seek]').getAttribute('max'),
      String(getDuration(data)),
    );
    assert.ok(
      document.querySelector(
        `a[href="/branches/block-1/ai-daily/${data.date.slice(0, 4)}/${data.date.slice(5, 7)}/"]`,
      ),
    );
    for (const item of data.items) {
      assert.ok(
        document
          .querySelector('.briefing-transcript')
          .textContent.includes(item.name),
      );
      for (const [, href] of item.sources)
        assert.ok(
          document.querySelector(`.briefing-story-sources a[href="${href}"]`),
        );
    }
    for (const group of data.monitoring ?? []) {
      const monitoring = document.querySelector('.briefing-monitoring');
      assert.ok(monitoring.textContent.includes(group.title));
      for (const line of group.lines)
        assert.ok(monitoring.textContent.includes(line));
    }
    if (data.sections) {
      assert.deepEqual(
        [...document.querySelectorAll('.briefing-section-title')].map(
          (heading) => heading.textContent.trim(),
        ),
        data.sections.map((section) => section.title),
      );
    }
    // The pure renderer must cover both beats and the outro for every imported issue.
    for (const time of [
      0,
      ...getOverviewPages(data).map(
        (_, index, pages) => (data.introSeconds * (index + 0.5)) / pages.length,
      ),
      ...data.items.flatMap((_, index) => [
        data.introSeconds + index * data.itemSeconds + 2,
        data.introSeconds +
          index * data.itemSeconds +
          getGraphicDuration(data) +
          2,
      ]),
      getDuration(data) - 1,
    ]) {
      let depth = 0;
      const context = new Proxy(
        {},
        {
          get(target, key) {
            if (key === 'measureText')
              return (value) => ({ width: String(value).length * 20 });
            if (key in target) return target[key];
            return () => {
              if (key === 'save') depth++;
              if (key === 'restore') depth--;
            };
          },
          set(target, key, value) {
            target[key] = value;
            return true;
          },
        },
      );
      for (const theme of ['light', 'dark']) {
        renderFrame(context, time, { ...data, theme });
        assert.equal(depth, 0, `Canvas state must balance in ${theme} mode`);
      }
      assert.equal(
        depth,
        0,
        `Canvas state must balance at ${data.date} ${time}s`,
      );
    }
  }
});

test('October 26 keeps all nine items, section pages, 9+6 second beats and neighbouring issues', () => {
  const data = normalizeProps(
    JSON.parse(readFileSync('src/content/briefings/2026-10-26.json', 'utf8')),
  );
  assert.equal(data.items.length, 9);
  assert.deepEqual(
    data.sections.map((section) => section.count),
    [5, 4],
  );
  assert.equal(getGraphicDuration(data), 9);
  assert.equal(data.detailSeconds, 6);
  assert.equal(getDuration(data), 153);
  const pages = getOverviewPages(data);
  assert.deepEqual(
    pages.map((page) => page.entries.length),
    [3, 2, 4],
  );
  assert.deepEqual(
    pages.flatMap((page) => page.entries.map(({ index }) => index)),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  const current = documentAt(briefingPagePath('2026-10-26'));
  assert.ok(
    current.querySelector(
      '.briefing-issue-nav a[href="/information/ai-daily/2026/10/23/"]',
    ),
  );
  const previous = documentAt(briefingPagePath('2026-10-23'));
  assert.ok(
    previous.querySelector(
      '.briefing-issue-nav a[href="/information/ai-daily/2026/10/26/"]',
    ),
  );
});
