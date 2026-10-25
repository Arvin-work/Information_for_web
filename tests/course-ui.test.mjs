import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const catalog = JSON.parse(readFileSync('public/data/courses.json', 'utf8'));
const source = readFileSync('public/selection/script.js', 'utf8');
const storageSource = readFileSync('public/selection/storage.js', 'utf8');

async function openPlanner(saved = new Map()) {
  const { document } = parseHTML(
    readFileSync('dist/selection/index.html', 'utf8'),
  );
  // linkedom does not implement the mutable value of a select element.
  for (const select of document.querySelectorAll('select')) {
    let selected;
    Object.defineProperty(select, 'value', {
      get: () => selected ?? select.querySelector('option')?.value ?? '',
      set: (value) => {
        selected = String(value);
      },
    });
  }
  let download;
  const requests = [];
  const context = vm.createContext({
    document,
    window: {},
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
    },
    fetch: async (path) => {
      requests.push(path);
      return { json: async () => catalog };
    },
    setTimeout: () => 0,
    Blob,
    URL: {
      createObjectURL: (blob) => {
        download = blob;
        return 'blob:course-export';
      },
      revokeObjectURL: () => {},
    },
  });
  vm.runInContext(storageSource, context);
  vm.runInContext(source, context);
  await new Promise(setImmediate);
  assert.ok(
    Number(document.getElementById('courseCount').textContent) > 100,
    document.getElementById('toast').textContent,
  );
  return { document, context, saved, requests, getDownload: () => download };
}

test('course interface searches, rejects conflicts, exports and restores the saved plan without API calls', async () => {
  const planner = await openPlanner();
  const { document, context } = planner;
  const course = vm.runInContext(
    'courses.find((course) => course.slots.some((slot) => slot.weeks.includes(1)))',
    context,
  );
  const input = document.getElementById('searchInput');
  input.value = course.course_code;
  input.oninput();
  assert.ok(Number(document.getElementById('courseCount').textContent) > 0);
  assert.ok(
    [...document.querySelectorAll('#courseList .course-code')].every((entry) =>
      entry.textContent.startsWith(course.course_code),
    ),
  );

  context.testCourse = course;
  vm.runInContext('addCourse(testCourse)', context);
  assert.equal(vm.runInContext('selected.size', context), 1);
  assert.match(
    document.getElementById('selectedList').textContent,
    new RegExp(course.course_code),
  );
  assert.ok(document.querySelector('#timetable .course-cell'));
  assert.ok(planner.saved.has('altfork.plan.v1'));

  const conflicting = vm.runInContext(
    'courses.find((course) => courseKey(course) !== courseKey(testCourse) && hasConflict(course))',
    context,
  );
  assert.ok(
    conflicting,
    'real catalog must contain a conflicting course for this check',
  );
  context.conflictingCourse = conflicting;
  vm.runInContext('addCourse(conflictingCourse)', context);
  assert.equal(vm.runInContext('selected.size', context), 1);
  assert.match(document.getElementById('toast').textContent, /时间冲突/);

  document.getElementById('exportBtn').onclick();
  assert.match(await planner.getDownload().text(), /课程代码/);
  assert.ok((await planner.getDownload().text()).includes(course.course_code));
  const restored = await openPlanner(planner.saved);
  assert.equal(vm.runInContext('selected.size', restored.context), 1);
  assert.match(
    restored.document.getElementById('selectedList').textContent,
    new RegExp(course.course_code),
  );
  assert.deepEqual(planner.requests, ['../data/courses.json']);
  assert.deepEqual(restored.requests, ['../data/courses.json']);
});
