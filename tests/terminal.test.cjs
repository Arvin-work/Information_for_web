const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = () => import('../dist/assets/terminal-core.mjs');
test('ls lists directory content with real navigation targets', async () => {
  const { runCommand } = await core();
  assert.deepEqual(
    runCommand('ls').items.map((x) => x.name),
    ['block-1', 'block-2', 'notes', 'tools'],
  );
  assert.equal(
    runCommand('ls', '/notes').items[0].href,
    '/posts/computer/wsl2_NV_GPU_problem_solve.html',
  );
  assert.equal(runCommand('ls', '/tools').items[0].href, '/selection/');
});
test('cd handles relative, absolute, parent and Chinese paths', async () => {
  const { runCommand } = await core();
  assert.equal(runCommand('cd 手记').cwd, '/notes');
  assert.equal(runCommand('cd ../tools', '/notes').cwd, '/tools');
  assert.equal(runCommand('cd ../../..', '/notes').cwd, '/');
  assert.equal(runCommand('cd /block-1', '/notes').anchor, 'block-1');
  assert.equal(runCommand('pwd', '/tools').lines[0], '/tools');
});
test('open returns only catalogued local files; invalid input has no execution', async () => {
  const { runCommand } = await core();
  assert.equal(
    runCommand('open wsl2-cuda', '/notes').items[0].href,
    '/posts/computer/wsl2_NV_GPU_problem_solve.html',
  );
  for (const cmd of [
    'open https://evil.example',
    'cd unknown',
    'rm -rf /',
    '<script>alert(1)</script>',
  ]) {
    const r = runCommand(cmd);
    assert.equal(r.cwd, '/');
    assert.equal(r.items.length, 0);
    assert.ok(r.lines.length);
  }
});
test('empty placeholders, clear, help and completion behave predictably', async () => {
  const { runCommand, completions } = await core();
  assert.equal(runCommand('ls', '/block-2').items.length, 0);
  assert.equal(runCommand('clear').clear, true);
  assert.ok(runCommand('help').lines.length > 3);
  assert.deepEqual(completions('cd no', '/'), ['cd notes']);
  assert.deepEqual(completions('open w', '/notes'), ['open wsl2-cuda']);
  const { complete } = await core();
  assert.equal(complete('cd no', '/').value, 'cd notes');
  assert.equal(complete('cd bl', '/').value, 'cd block-');
  assert.equal(complete('cd bo', '/').value, 'cd bo');
  assert.deepEqual(complete('cd block-', '/').matches, [
    'cd block-1',
    'cd block-2',
  ]);
});
