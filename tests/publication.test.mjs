import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { contentTree } from '../dist/assets/content-index.mjs';

const html = (name) => readFileSync(`dist/${name}`, 'utf8');

test('legacy article addresses and account pages remain complete static HTML', () => {
  for (const path of [
    'posts/computer/wsl2_NV_GPU_problem_solve.html',
    'posts/acticle/wsl2_NV_GPU_problem_solve.html',
  ]) {
    const { document } = parseHTML(html(path));
    assert.ok(document.querySelector('.article-content h2'));
    assert.match(
      document.querySelector('link[rel="canonical"]').href,
      /www\.altfork\.com\/posts\/computer\/wsl2_NV_GPU_problem_solve.html$/,
    );
    assert.ok(document.querySelector('.article-content pre code'));
  }
  assert.match(html('login/register.html'), /id="registerForm"/);
  assert.match(html('login/index.html'), /id="loginForm"/);
});

test('drafts are absent from all public HTML and content index', () => {
  const drafts = readdirSync('src/content/posts').filter(
    (name) =>
      name.endsWith('.md') &&
      /draft: true/.test(readFileSync(`src/content/posts/${name}`, 'utf8')),
  );
  const publicText = [
    'index.html',
    'posts/index.html',
    'posts/computer/index.html',
    'assets/content-index.mjs',
  ]
    .map(html)
    .join('\n');
  for (const draft of drafts) {
    const title = readFileSync(`src/content/posts/${draft}`, 'utf8').match(
      /^title: (.+)$/m,
    )?.[1];
    assert.ok(title);
    assert.ok(!publicText.includes(title), `${draft} must not be published`);
  }
  for (const path of [
    'src',
    'scripts',
    'worker',
    'LICENSE',
    'README.md',
    'package.json',
    'wrangler.jsonc',
    'data/2026秋全校课表.xlsx',
  ]) {
    assert.equal(
      existsSync(`dist/${path}`),
      false,
      `${path} must not be public`,
    );
  }
});

test('static pages include no account scripts and terminal index matches homepage links', () => {
  for (const path of [
    'index.html',
    'posts/index.html',
    'selection/index.html',
  ]) {
    const { document } = parseHTML(html(path));
    const scripts = [...document.querySelectorAll('script[src]')].map(
      (script) => script.getAttribute('src'),
    );
    assert.ok(!scripts.includes('/assets/auth.js'));
    assert.ok(!scripts.includes('/assets/register.js'));
  }
  const { document } = parseHTML(html('index.html'));
  for (const entry of Object.values(contentTree).filter(
    (entry) => entry.href,
  )) {
    assert.ok(
      [...document.querySelectorAll('a[href]')].some(
        (link) => link.getAttribute('href') === entry.href,
      ),
    );
  }
});

test('Cloudflare directory routes map to real index files without a server script', () => {
  const rules = html('_redirects').trim().split('\n');
  for (const route of [
    '/',
    '/login/',
    '/selection/',
    '/posts/',
    '/posts/computer/',
    '/posts/space/',
  ]) {
    const target = route + 'index.html';
    assert.ok(rules.includes(`${route} ${target} 200`));
    assert.ok(existsSync(`dist${target}`));
  }
  assert.ok(!rules.some((rule) => rule.startsWith('/api/')));
  const config = readFileSync('wrangler.jsonc', 'utf8');
  assert.ok(!config.includes('"main"'));
});
