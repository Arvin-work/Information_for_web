const WEEKDAYS = [
  { id: 1, name: '周一' },
  { id: 2, name: '周二' },
  { id: 3, name: '周三' },
  { id: 4, name: '周四' },
  { id: 5, name: '周五' },
  { id: 6, name: '周六' },
  { id: 7, name: '周日' },
];
const PERIODS = Array.from({ length: 14 }, (_, i) => i + 1);
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

let courses = [];
let selected = new Map(); // key -> course
let totalWeeks = 17;
let currentWeek = 1;
let detailCourse = null;
let modalReturnFocus = null;

const courseListEl = document.getElementById('courseList');
const selectedListEl = document.getElementById('selectedList');
const searchInput = document.getElementById('searchInput');
const timetableEl = document.getElementById('timetable');
const toastEl = document.getElementById('toast');
const weekSelect = document.getElementById('weekSelect');
const prevWeekBtn = document.getElementById('prevWeekBtn');
const nextWeekBtn = document.getElementById('nextWeekBtn');
const todayWeekBtn = document.getElementById('todayWeekBtn');
const courseCountEl = document.getElementById('courseCount');
const summaryEl = document.getElementById('summary');
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

function loadCourses() {
  fetch('../data/courses.json')
    .then((r) => r.json())
    .then((data) => {
      courses = data.filter((c) => c.slots && c.slots.length > 0);
      let maxW = 17;
      data.forEach(
        (c) =>
          c.slots &&
          c.slots.forEach(
            (s) =>
              s.weeks &&
              s.weeks.forEach((w) => {
                if (w > maxW) maxW = w;
              }),
          ),
      );
      totalWeeks = maxW;
      buildWeekSelect();
      buildExamMethods();
      applyCurrentWeek();
      for (const key of window.AltforkPlan.load()) {
        const c = courses.find((c) => courseKey(c) === key);
        if (c && !hasConflict(c)) selected.set(key, c);
      }
      renderCourseList();
      renderSelected();
      renderTimetable();
    })
    .catch(() => showToast('加载课程失败', true));
}

function buildWeekSelect() {
  weekSelect.innerHTML = '';
  for (let w = 1; w <= totalWeeks; w++) {
    const o = document.createElement('option');
    o.value = w;
    o.textContent = `第${w}周`;
    weekSelect.appendChild(o);
  }
  weekSelect.value = currentWeek;
}

function buildExamMethods() {
  const filterExam = document.getElementById('filterExam');
  const set = new Set(courses.map((c) => c.exam_method).filter(Boolean));
  filterExam.innerHTML = '<option value="">全部</option>';
  [...set]
    .sort((a, b) => a.localeCompare(b, 'zh'))
    .forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m;
      filterExam.appendChild(o);
    });
}

function applyCurrentWeek() {
  weekSelect.value = currentWeek;
}

function courseKey(c) {
  return `${c.course_code}__${c.course_seq}`;
}

function weeklyOccupancy(list, week) {
  const cells = new Map(),
    days = new Set();
  for (const course of list)
    for (const slot of course.slots || []) {
      if (!slot.weeks.includes(week) || slot.weekday < 1 || slot.weekday > 7)
        continue;
      for (const period of slot.periods) {
        if (period < 1 || period > 14) continue;
        const key = slot.weekday + ':' + period;
        if (!cells.has(key)) cells.set(key, new Set());
        cells.get(key).add(course.course_name);
        days.add(slot.weekday);
      }
    }
  return { cells, periods: cells.size, days: days.size };
}

// Check if two slots overlap in time AND share at least one common week
function slotsConflict(s1, s2) {
  if (s1.weekday !== s2.weekday) return false;
  const periodOverlap = !(
    s1.end_period < s2.start_period || s1.start_period > s2.end_period
  );
  if (!periodOverlap) return false;
  const commonWeeks = s1.weeks.filter((w) => s2.weeks.includes(w));
  return commonWeeks.length > 0;
}

function hasConflict(newCourse) {
  for (const exist of selected.values()) {
    for (const s1 of newCourse.slots) {
      for (const s2 of exist.slots) {
        if (slotsConflict(s1, s2)) {
          return { conflictWith: exist, slot1: s1, slot2: s2 };
        }
      }
    }
  }
  return null;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFilters() {
  return {
    grading: document.getElementById('filterGrading').value,
    attr: document.getElementById('filterAttr').value,
    exam: document.getElementById('filterExam').value,
    creditMin: parseFloat(document.getElementById('creditMin').value || 'NaN'),
    creditMax: parseFloat(document.getElementById('creditMax').value || 'NaN'),
  };
}

function filteredCourses() {
  const q = searchInput.value.trim().toLowerCase();
  const f = getFilters();
  return courses.filter((c) => {
    if (
      q &&
      !(
        c.course_name +
        ' ' +
        c.course_code +
        ' ' +
        c.teacher_name +
        ' ' +
        c.department
      )
        .toLowerCase()
        .includes(q)
    )
      return false;
    if (f.grading && (c.grading || '') !== f.grading) return false;
    if (f.attr && (c.select_attr || '') !== f.attr) return false;
    if (f.exam && (c.exam_method || '') !== f.exam) return false;
    if (!isNaN(f.creditMin) && (c.credit ?? 0) < f.creditMin) return false;
    if (!isNaN(f.creditMax) && (c.credit ?? 999) > f.creditMax) return false;
    return true;
  });
}

function renderCourseList() {
  const filtered = filteredCourses();
  courseCountEl.textContent = filtered.length;
  courseListEl.innerHTML = '';
  if (!filtered.length) {
    courseListEl.innerHTML =
      '<p class="empty-hint">没有找到符合条件的课程，试试其他关键词或重置筛选。</p>';
    return;
  }
  filtered.forEach((c) => {
    const key = courseKey(c);
    const item = document.createElement('div');
    item.className = 'course-item';
    const badges = [];
    badges.push(
      `<span class="badge g-${esc(c.grading || '')}">${esc(c.grading || '未知')}</span>`,
    );
    badges.push(`<span class="badge attr">${esc(c.select_attr || '')}</span>`);
    item.innerHTML = `
      <div class="course-info">
        <div class="course-code">${esc(c.course_code)}-${esc(c.course_seq)}</div>
        <div class="course-name">${esc(c.course_name)} <span class="badges">${badges.join('')}</span></div>
        <div class="course-meta">${esc(c.teacher_name)} | ${esc(c.department)} | 学分 ${esc(c.credit)} | ${esc(c.exam_method || '未知')}</div>
      </div>
      <div class="course-actions">
        <button class="detail" data-key="${key}">详情</button>
        <button data-key="${key}">选课</button>
      </div>
    `;
    item.querySelector('.detail').onclick = () => openDetail(c);
    item.querySelector('button:not(.detail)').onclick = () => addCourse(c);
    courseListEl.appendChild(item);
  });
}

function openDetail(c) {
  modalReturnFocus = document.activeElement;
  detailCourse = c;
  const slotsHtml = c.slots
    .map(
      (s) => `
    <div class="slot-row">
      <div class="slot-main">${DAY_NAMES[s.weekday] || s.weekday} ${esc(s.section_str)}</div>
      <div class="slot-sub">${esc(s.week_range)}（第${s.weeks.join('、')}周）</div>
      <div class="slot-sub">${esc(s.room_type || '')} ${esc(s.room || '')}</div>
    </div>`,
    )
    .join('');
  modalBody.innerHTML = `
    <div class="detail-head">
      <div class="detail-code">${esc(c.course_code)}-${esc(c.course_seq)}</div>
      <div class="detail-name">${esc(c.course_name)}</div>
      <div class="detail-meta">
        <div><label>开课院系</label>${esc(c.department)}</div>
        <div><label>教师</label>${esc(c.teacher_name)}（${esc(c.teacher_title || '-')}）</div>
        <div><label>学分</label>${esc(c.credit)}</div>
        <div><label>总学时</label>${esc(c.total_hours)}</div>
        <div><label>选课属性</label>${esc(c.select_attr)}</div>
        <div><label>考核方式</label>${esc(c.grading || '未知')}</div>
        <div><label>考试方式</label>${esc(c.exam_method || '未知')}</div>
        <div><label>课程性质</label>${esc(c.course_nature || '-')}</div>
        <div><label>容量</label>${esc(c.capacity ?? '-')} / 已选 ${esc(c.enrolled ?? '-')}</div>
      </div>
    </div>
    <div class="detail-slots-title">上课安排（${c.slots.length}个时段）</div>
    <div class="detail-slots">${slotsHtml}</div>
    <div class="detail-actions">
      <button id="modalAddBtn">选课</button>
      <button id="modalCloseBtn2">关闭</button>
    </div>
  `;
  modalBody.querySelector('#modalAddBtn').onclick = () => {
    addCourse(c);
    closeModal();
  };
  modalBody.querySelector('#modalCloseBtn2').onclick = closeModal;
  modalOverlay.classList.remove('hidden');
  modalCloseBtn.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  detailCourse = null;
  modalReturnFocus?.focus();
}

function addCourse(c) {
  const key = courseKey(c);
  if (selected.has(key)) {
    showToast('已在已选列表', true);
    return;
  }
  if (c.slots.length === 0) {
    showToast('该课程无课时安排', true);
    return;
  }
  const conflict = hasConflict(c);
  if (conflict) {
    const other = conflict.conflictWith;
    const s1 = conflict.slot1,
      s2 = conflict.slot2;
    const common = s1.weeks.filter((w) => s2.weeks.includes(w));
    const commonStr = common.length
      ? `（第${common.slice(0, 5).join('、')}${common.length > 5 ? '...' : ''}周）`
      : '';
    showToast(
      `时间冲突：与 ${other.course_code}-${other.course_seq} ${other.course_name} 在周${s2.weekday} 第${s2.start_period}-${s2.end_period}节冲突${commonStr}`,
      true,
    );
    return;
  }
  selected.set(key, c);
  renderSelected();
  renderTimetable();
  showToast('选课成功');
}

function removeCourse(key) {
  selected.delete(key);
  renderSelected();
  renderTimetable();
}

function sumCredits() {
  let total = 0,
    hours = 0;
  for (const c of selected.values()) {
    total += c.credit ?? 0;
    hours += c.total_hours ?? 0;
  }
  return { total, hours };
}

function renderSelected() {
  if (!window.AltforkPlan.save([...selected.keys()]))
    showToast('本机存储不可用，请及时导出课表。', true);
  selectedListEl.innerHTML = '';
  const s = sumCredits();
  summaryEl.innerHTML = `<b>${selected.size}</b>门 · <b>${s.total}</b>学分 · <b>${s.hours}</b>总学时`;
  if (selected.size === 0) {
    selectedListEl.innerHTML = '<div class="empty-hint">暂无已选课程</div>';
    return;
  }
  for (const [k, c] of selected) {
    const item = document.createElement('div');
    item.className = 'course-item';
    const slotsInfo = c.slots
      .map(
        (s) =>
          `${DAY_NAMES[s.weekday] || '周' + s.weekday} ${s.section_str} (${s.week_range})`,
      )
      .join('；');
    const badges = [];
    badges.push(
      `<span class="badge g-${esc(c.grading || '')}">${esc(c.grading || '未知')}</span>`,
    );
    badges.push(`<span class="badge attr">${esc(c.select_attr || '')}</span>`);
    item.innerHTML = `
      <div class="course-info">
        <div class="course-code">${esc(c.course_code)}-${esc(c.course_seq)}</div>
        <div class="course-name">${esc(c.course_name)} <span class="badges">${badges.join('')}</span></div>
        <div class="course-meta">${esc(c.teacher_name)} | 学分 ${esc(c.credit)} | ${esc(c.exam_method || '未知')}</div>
        <div class="course-meta">${esc(slotsInfo)}</div>
      </div>
      <div class="course-actions">
        <button class="detail" data-key="${k}">详情</button>
        <button class="remove" data-key="${k}">移除</button>
      </div>
    `;
    item.querySelector('.detail').onclick = () => openDetail(c);
    item.querySelector('.remove').onclick = () => removeCourse(k);
    selectedListEl.appendChild(item);
  }
}

function renderWeeklyLoad() {
  const list = [...selected.values()],
    load = weeklyOccupancy(list, currentWeek);
  const miniLabel = document.getElementById('miniWeekLabel');
  const miniPrev = document.getElementById('miniPrevWeek');
  const miniNext = document.getElementById('miniNextWeek');
  const grid = document.getElementById('weeklyOccupancy');
  if (!miniLabel || !grid) return;
  miniLabel.textContent = `第 ${currentWeek} 周`;
  miniPrev.disabled = currentWeek <= 1;
  miniNext.disabled = currentWeek >= totalWeeks;
  let html = `<table class="mini-timetable"><caption class="visually-hidden">第${currentWeek}周课程占用，每行代表一个节次</caption><thead><tr><th>节</th>`;
  for (const day of WEEKDAYS)
    html += `<th scope="col">${esc(day.name.replace('周', ''))}</th>`;
  html += '</tr></thead><tbody>';
  for (const period of PERIODS) {
    html += `<tr><th scope="row">${period}</th>`;
    for (const day of WEEKDAYS) {
      const names = load.cells.get(day.id + ':' + period);
      const label = names ? [...names].join('、') : '空闲';
      html += `<td class="${names ? 'occupied' : ''}" title="${esc(day.name + '第' + period + '节：' + label)}"><span class="visually-hidden">${esc(label)}</span></td>`;
    }
    html += '</tr>';
  }
  grid.innerHTML = html + '</tbody></table>';
  document.getElementById('occupancySummary').textContent =
    `本周 ${load.periods} 节次 · ${load.days} 天有课`;
  const weekLoads = Array.from(
    { length: totalWeeks },
    (_, i) => weeklyOccupancy(list, i + 1).periods,
  );
  const peak = Math.max(1, ...weekLoads);
  let bars = '';
  for (let week = 1; week <= totalWeeks; week++) {
    const count = weekLoads[week - 1];
    const current = week === currentWeek;
    bars += `<button type="button" data-week="${week}" class="${current ? 'current' : ''}" aria-label="第${week}周，${count}节次" ${current ? 'aria-current="true"' : ''} title="第${week}周 · ${count}节次"><i style="height:${count ? Math.max(3, (count / peak) * 32) : 2}px"></i><span>${week}</span></button>`;
  }
  document.getElementById('semesterLoad').innerHTML = bars;
  document.querySelectorAll('#semesterLoad button').forEach(
    (button) =>
      (button.onclick = () => {
        currentWeek = Number(button.dataset.week);
        applyCurrentWeek();
        renderTimetable();
      }),
  );
}

function renderTimetable() {
  renderWeeklyLoad();
  let html = `<div class="tt-week-label">第${currentWeek}周</div>`;
  html += '<table><thead><tr><th>节次\\周</th>';
  WEEKDAYS.forEach((d) => (html += `<th>${d.name}</th>`));
  html += '</tr></thead><tbody>';
  PERIODS.forEach((p) => {
    html += `<tr><th>${p}节</th>`;
    WEEKDAYS.forEach((d) => {
      const cellCourses = [];
      for (const c of selected.values()) {
        for (const s of c.slots) {
          if (
            s.weekday === d.id &&
            s.periods.includes(p) &&
            s.weeks.includes(currentWeek)
          ) {
            cellCourses.push({ c, s });
            break;
          }
        }
      }
      html += '<td>';
      if (cellCourses.length === 0) {
        html += '<div class="tt-empty">–</div>';
      }
      cellCourses.forEach(({ c, s }) => {
        html += `<div class="course-cell"><div class="cname">${esc(c.course_code)}-${esc(c.course_seq)}</div><div>${esc(c.course_name)}</div><div class="cmeta">${esc(c.teacher_name)} ${esc(s.room || '')}</div><div class="cmeta">${esc(s.week_range)} · ${esc(s.room_type || '')}</div></div>`;
      });
      html += '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  timetableEl.innerHTML = html;
}

function exportSchedule() {
  if (selected.size === 0) {
    showToast('暂无课程可导出', true);
    return;
  }
  const rows = [
    [
      '课程代码',
      '课序号',
      '课程名称',
      '教师',
      '开课院系',
      '学分',
      '学时',
      '选课属性',
      '考核方式',
      '考试方式',
      '星期',
      '节次',
      '教室',
      '周次分布',
      '具体周次',
    ],
  ];
  for (const c of selected.values()) {
    for (const s of c.slots) {
      rows.push([
        c.course_code,
        c.course_seq,
        c.course_name,
        c.teacher_name,
        c.department,
        c.credit,
        c.total_hours,
        c.select_attr,
        c.grading,
        c.exam_method,
        WEEKDAYS.find((d) => d.id === s.weekday)?.name || s.weekday,
        s.section_str,
        s.room,
        s.week_range,
        s.weeks.join('、'),
      ]);
    }
  }
  const csv = rows
    .map((r) =>
      r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'selected_courses.csv';
  a.click();
  URL.revokeObjectURL(url);
}

searchInput.oninput = renderCourseList;
document.getElementById('exportBtn').onclick = exportSchedule;
document.getElementById('clearBtn').onclick = () => {
  selected.clear();
  renderSelected();
  renderTimetable();
  showToast('已清空');
};
document.getElementById('clearFilterBtn').onclick = () => {
  searchInput.value = '';
  document.getElementById('filterGrading').value = '';
  document.getElementById('filterAttr').value = '';
  document.getElementById('filterExam').value = '';
  document.getElementById('creditMin').value = '';
  document.getElementById('creditMax').value = '';
  renderCourseList();
};
['filterGrading', 'filterAttr', 'filterExam', 'creditMin', 'creditMax'].forEach(
  (id) => {
    document.getElementById(id).addEventListener('change', renderCourseList);
  },
);

weekSelect.onchange = () => {
  currentWeek = parseInt(weekSelect.value, 10);
  renderTimetable();
};
prevWeekBtn.onclick = () => {
  if (currentWeek > 1) {
    currentWeek--;
    applyCurrentWeek();
    renderTimetable();
  }
};
nextWeekBtn.onclick = () => {
  if (currentWeek < totalWeeks) {
    currentWeek++;
    applyCurrentWeek();
    renderTimetable();
  }
};
todayWeekBtn.textContent = '第 1 周';
todayWeekBtn.onclick = () => {
  currentWeek = 1;
  applyCurrentWeek();
  renderTimetable();
};
document.getElementById('miniPrevWeek').onclick = () => prevWeekBtn.click();
document.getElementById('miniNextWeek').onclick = () => nextWeekBtn.click();
modalCloseBtn.onclick = closeModal;
modalOverlay.onclick = (e) => {
  if (e.target === modalOverlay) closeModal();
};

loadCourses();

document.addEventListener('keydown', (e) => {
  if (modalOverlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Tab') {
    const nodes = [
      ...modalOverlay.querySelectorAll('button,a,input,select,[tabindex="0"]'),
    ];
    const first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
