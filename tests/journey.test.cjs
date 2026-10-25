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
