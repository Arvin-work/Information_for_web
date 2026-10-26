const { test } = require('node:test');
const assert = require('node:assert/strict');
const helpers = () => import('../public/assets/journey-motion.mjs');
test('growth stays bounded before and after a branch and is reversible', async () => {
  const { growthProgress } = await helpers();
  assert.equal(growthProgress(50, 100, 300), 0);
  assert.equal(growthProgress(200, 100, 300), 0.5);
  assert.equal(growthProgress(400, 100, 300), 1);
  assert.equal(growthProgress(120, 100, 300), 0.1);
  assert.equal(growthProgress(300, 300, 300), 1);
});
test('node presence reveals in scroll order, without jumping from zero to one', async () => {
  const { nodePresence } = await helpers();
  assert.equal(nodePresence(0, 200), 0);
  assert.equal(nodePresence(200, 200), 0.5);
  assert.equal(nodePresence(400, 200), 1);
  const values = [100, 150, 200, 250, 300].map((y) => nodePresence(y, 200));
  assert.ok(values.every((v, i) => i === 0 || v >= values[i - 1]));
});

test('child rails curve smoothly then continue vertically on either side', async () => {
  const { sideBranchPath } = await helpers();
  assert.equal(
    sideBranchPath({ x: 100, y: 100 }, [
      { x: 160, y: 200 },
      { x: 160, y: 400 },
    ]),
    'M100 100C100 130 160 130 160 160V400',
  );
  assert.equal(
    sideBranchPath({ x: 100, y: 100 }, [
      { x: 40, y: 200 },
      { x: 40, y: 400 },
    ]),
    'M100 100C100 130 40 130 40 160V400',
  );
  assert.equal(sideBranchPath({ x: 100, y: 100 }, []), '');
});
test('child rail departure stays below the parent copy without overshooting the first leaf', async () => {
  const { sideBranchPath } = await helpers();
  const path = sideBranchPath(
    { x: 100, y: 100 },
    [
      { x: 170, y: 240 },
      { x: 170, y: 400 },
    ],
    180,
  );
  assert.equal(path, 'M100 100V180C100 198 170 198 170 216V400');
});

test('calendar sibling edges start at the month and finish independently on the same row', async () => {
  const { siblingBranchPath } = await helpers();
  const month = { x: 80, y: 200 };
  const leaves = [
    { x: 240, y: 360 },
    { x: 560, y: 360 },
  ];
  const paths = leaves.map((leaf) => siblingBranchPath(month, leaf, 292));
  assert.notEqual(paths[0], paths[1]);
  for (const [index, path] of paths.entries()) {
    // One move, one bend, and a vertical arrival: never a rail joining two dates.
    assert.match(path, /^M80 200V292C/);
    assert.equal((path.match(/M/g) ?? []).length, 1);
    assert.equal((path.match(/C/g) ?? []).length, 1);
    assert.ok(path.endsWith(`${leaves[index].x} 346V360`));
  }
});

test('wrapped calendar rows turn in their own empty gap with vertical curve tangents', async () => {
  const { siblingBranchPath } = await helpers();
  const source = { x: 80, y: 200 };
  // A later row must bypass the previous row's copy along the month gutter.
  const leaf = { x: 560, y: 620 };
  const path = siblingBranchPath(source, leaf, 552);
  const numbers = path.match(/\d+(?:\.\d+)?/g).map(Number);
  const [
    startX,
    startY,
    forkY,
    control1X,
    control1Y,
    control2X,
    control2Y,
    endX,
    bendEndY,
    endY,
  ] = numbers;
  assert.deepEqual([startX, startY], [source.x, source.y]);
  assert.equal(control1X, source.x);
  assert.equal(control2X, leaf.x);
  assert.equal(endX, leaf.x);
  assert.equal(endY, leaf.y);
  assert.ok(forkY >= 552);
  assert.ok(forkY <= control1Y && control1Y <= control2Y);
  assert.ok(control2Y <= bendEndY && bendEndY <= leaf.y);
});

test('a wrapped date bypasses earlier cards through the gap between columns', async () => {
  const { siblingBranchPath } = await helpers();
  const source = { x: 230, y: 200 };
  const via = { x: 330, y: 346, departureY: 292 };
  const path = siblingBranchPath(source, { x: 180, y: 620 }, 552, via);
  const [firstBend, secondBend] = path
    .split('C')
    .slice(1)
    .map((part) => part.match(/\d+(?:\.\d+)?/g).map(Number));
  assert.equal(firstBend[4], 330);
  assert.equal(secondBend[0], 330);
  assert.match(path, /330 332V346V552C330 /);
  assert.ok(path.endsWith('180 606V620'));
});
