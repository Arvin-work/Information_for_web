import assert from 'node:assert/strict';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const published = 'src/content/posts/verification-published.md';
const draft = 'src/content/posts/verification-draft.md';
const marker = 'VERIFICATION_ARTICLE_983156';
const hidden = 'VERIFICATION_DRAFT_983156';
const path = '/posts/computer/verification-published.html';
const build = () => {
  const result = spawnSync(
    process.execPath,
    ['node_modules/astro/bin/astro.mjs', 'build'],
    { stdio: 'inherit' },
  );
  if (result.status !== 0)
    throw new Error('Content verification build failed.');
};
const created = [];
try {
  await writeFile(
    published,
    `---\ntitle: ${marker}\ndate: 2026-10-25\ncategory: computer\nsummary: Temporary publication verification.\ndraft: false\npath: ${path}\nterminalId: verification-published\n---\n\nTemporary article body.\n`,
    { flag: 'wx' },
  );
  created.push(published);
  await writeFile(
    draft,
    `---\ntitle: ${hidden}\ndraft: true\npath: /posts/computer/verification-draft.html\n---\n\nThis must never be public.\n`,
    { flag: 'wx' },
  );
  created.push(draft);
  build();
  for (const output of [
    'index.html',
    'posts/index.html',
    'posts/computer/index.html',
    'assets/content-index.mjs',
  ]) {
    const text = await readFile(`dist/${output}`, 'utf8');
    assert.ok(
      text.includes(marker),
      `Published article missing from ${output}`,
    );
    assert.ok(!text.includes(hidden), `Draft leaked into ${output}`);
  }
  assert.match(await readFile(`dist${path}`, 'utf8'), /Temporary article body/);
  await assert.rejects(
    readFile('dist/posts/computer/verification-draft.html'),
    { code: 'ENOENT' },
  );
  console.log(
    'New published article propagates to all indexes; draft remains private.',
  );
} finally {
  for (const file of created) await unlink(file);
  build();
}
