import { runCommand, complete } from './terminal-core.mjs';
import { heroMedia } from './site-content.mjs';
import {
  clamp,
  growthProgress,
  nodePresence,
  sideBranchPath,
} from './journey-motion.mjs';

let activeJourney = null;
let releaseExplorer = () => {};

function initializeExplorer() {
  const current = document.getElementById('journey');
  if (!current || current === activeJourney) return;
  releaseExplorer();
  activeJourney = current;
  const controller = new AbortController();
  const { signal } = controller;
  const disposers = [];
  releaseExplorer = () => {
    controller.abort();
    for (const dispose of disposers) dispose();
    activeJourney = null;
  };
  if (heroMedia.image && document.getElementById('heroImage')) {
    const image = document.getElementById('heroImage');
    image.src = heroMedia.image;
    image.alt = heroMedia.alt;
    image.style.objectPosition = heroMedia.position;
    const frame = document.getElementById('heroMedia');
    frame.hidden = false;
    frame.classList.add('has-photograph');
  }

  const journey = document.getElementById('journey');
  const graph = document.getElementById('gitGraph');
  graph.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  const explorer = document.querySelector('.node-canvas');
  const hero = document.getElementById('top');
  const directory = journey.hasAttribute('data-directory');
  const branches = [...document.querySelectorAll('.node-group')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const svgNS = 'http://www.w3.org/2000/svg';
  let geometry = [],
    mainPath,
    mainLength = 0,
    rootPoint,
    nodePositions = [];
  let graphFrame = 0,
    motionFrame = 0,
    drawing = false,
    pendingDraw = false;
  const enteredAt = performance.now();
  let enterComplete = motion.matches || directory;
  let cachedTop = 0;

  function drawGraph() {
    // Layout changes before the next frame. Drawing immediately keeps the viewBox
    // in sync; a deferred draw letterboxes the old strokes and they jump.
    if (drawing) {
      pendingDraw = true;
      return;
    }
    drawing = true;
    pendingDraw = false;
    cancelAnimationFrame(graphFrame);
    graphFrame = 0;
    const bounds = journey.getBoundingClientRect();
    const canvasBounds = explorer.getBoundingClientRect();
    const point = (element) => {
      const r = element.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - bounds.left,
        y: r.top + r.height / 2 - bounds.top,
      };
    };
    rootPoint = point(journey.querySelector('.origin-ring'));
    const mobile = matchMedia('(max-width: 540px)').matches;
    const mainX =
      canvasBounds.left - bounds.left + (mobile ? 12 : canvasBounds.width / 2);
    const heroEnd = hero.getBoundingClientRect().bottom - bounds.top;
    const endY = bounds.height - 25;
    const curveStart = Math.max(rootPoint.y, heroEnd - 200);
    const mainD = `M${rootPoint.x} ${rootPoint.y}V${curveStart}C${rootPoint.x} ${heroEnd - 90} ${mainX} ${heroEnd - 90} ${mainX} ${heroEnd + 36}V${endY}`;
    const mainNodes = [];
    const branchNodes = [];
    geometry = [];
    nodePositions = [];
    function line(target, d, color, startY, endY, width = 2) {
      const base = document.createElementNS(svgNS, 'path');
      for (const [key, value] of Object.entries({
        d,
        fill: 'none',
        stroke: color,
        'stroke-width': width,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }))
        base.setAttribute(key, String(value));
      base.classList.add('journey-track');
      target.push(base);
      const active = base.cloneNode();
      active.classList.remove('journey-track');
      active.classList.add('journey-growth');
      target.push(active);
      geometry.push({ active, startY, endY });
      return active;
    }
    mainPath = line(mainNodes, mainD, 'var(--orange)', rootPoint.y, endY, 4);
    // Rebuild branch geometry only on layout changes; scroll reuses path lengths.
    graph.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    graph.replaceChildren(...mainNodes);
    mainLength = mainPath.getTotalLength();
    function sourceAtY(y) {
      let low = 0,
        high = mainLength;
      for (let i = 0; i < 15; i++) {
        const middle = (low + high) / 2;
        if (mainPath.getPointAtLength(middle).y < y) low = middle;
        else high = middle;
      }
      return mainPath.getPointAtLength((low + high) / 2);
    }
    for (const [index, branch] of branches.entries()) {
      const node = point(branch.querySelector('.category-dot'));
      const color = getComputedStyle(branch).getPropertyValue('--branch-color');
      const forkY =
        index < 2 && !directory
          ? Math.max(rootPoint.y + 90, heroEnd - 420 + index * 130)
          : Math.max(rootPoint.y + 70, node.y - 180);
      const source = sourceAtY(forkY);
      const turnHeight = Math.min(200, (node.y - source.y) * 0.65);
      line(
        branchNodes,
        `M${source.x} ${source.y}C${source.x} ${source.y + turnHeight / 2} ${node.x} ${source.y + turnHeight / 2} ${node.x} ${source.y + turnHeight}V${node.y}`,
        color,
        source.y,
        node.y,
        index < 2 ? 3.5 : 2.5,
      );
      nodePositions.push({ branch, y: node.y });
      const leaves = branch.open
        ? [...branch.querySelectorAll('.leaf-dot')]
        : [];
      if (leaves.length) {
        const points = leaves.map(point);
        const departureY =
          branch.querySelector('summary').getBoundingClientRect().bottom -
          bounds.top +
          12;
        line(
          branchNodes,
          sideBranchPath(node, points, departureY),
          color,
          node.y,
          points.at(-1).y,
          1.7,
        );
      }
    }
    const head = document.createElementNS(svgNS, 'circle');
    head.id = 'growthHead';
    head.setAttribute('r', '4.5');
    head.setAttribute('fill', 'var(--orange)');
    graph.replaceChildren(...branchNodes, ...mainNodes, head);
    for (const item of geometry) {
      item.length = item.active.getTotalLength();
      item.active.style.strokeDasharray = String(item.length);
    }
    cachedTop = journey.getBoundingClientRect().top + scrollY;
    journey.classList.add('motion-ready');
    cancelAnimationFrame(motionFrame);
    updateMotion();
    drawing = false;
    if (pendingDraw) drawGraph();
  }
  function updateMotion(time = performance.now()) {
    motionFrame = 0;
    if (!rootPoint) return;
    const reduced = motion.matches;
    let frontY = innerHeight * 0.78 + scrollY - cachedTop;
    if (!enterComplete) {
      const t = clamp((time - enteredAt) / 1050);
      frontY = rootPoint.y + (frontY - rootPoint.y) * (1 - Math.pow(1 - t, 3));
      if (t >= 1) enterComplete = true;
    }
    for (const item of geometry) {
      const progress = reduced
        ? 1
        : growthProgress(frontY, item.startY, item.endY);
      item.active.style.strokeDashoffset = String(item.length * (1 - progress));
    }
    for (const { branch, y } of nodePositions) {
      const forced = branch.open || branch.contains(document.activeElement);
      const presence = reduced || forced ? 1 : nodePresence(frontY, y);
      branch.style.setProperty('--node-presence', String(presence));
      branch.style.setProperty('--node-rise', `${(1 - presence) * 26}px`);
    }
    const heroProgress =
      reduced || directory
        ? 0
        : clamp(
            (scrollY - cachedTop) / Math.max(200, hero.offsetHeight * 0.65),
          );
    hero.style.setProperty('--intro-fade', String(1 - heroProgress * 0.9));
    hero.style.setProperty('--intro-drift', `${-heroProgress * 38}px`);
    const head = document.getElementById('growthHead');
    const mainProgress = growthProgress(
      frontY,
      rootPoint.y,
      journey.offsetHeight - 25,
    );
    const current = mainPath.getPointAtLength(mainLength * mainProgress);
    head.setAttribute('cx', String(current.x));
    head.setAttribute('cy', String(current.y));
    head.style.opacity =
      reduced || mainProgress >= 1 || mainProgress <= 0 ? '0' : '1';
    if (!enterComplete && !reduced)
      motionFrame = requestAnimationFrame(updateMotion);
  }
  function scheduleMotion() {
    if (!motionFrame) motionFrame = requestAnimationFrame(updateMotion);
  }
  function scheduleGraph() {
    cancelAnimationFrame(graphFrame);
    graphFrame = requestAnimationFrame(drawGraph);
  }
  branches.forEach((branch) => {
    const summary = branch.querySelector('summary');
    summary.addEventListener('click', (event) => {
      const entry = branch.querySelector('[data-branch-enter]');
      if (!branch.open || !entry) return;
      event.preventDefault();
      entry.click();
    });
    branch
      .querySelector('[data-branch-collapse]')
      ?.addEventListener('click', () => {
        branch.open = false;
        summary.focus({ preventScroll: true });
      });
    branch.addEventListener('toggle', drawGraph);
    branch.addEventListener('focusin', scheduleMotion);
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(drawGraph);
    observer.observe(journey);
    disposers.push(() => observer.disconnect());
  }
  window.addEventListener('resize', scheduleGraph, { signal });
  window.addEventListener('scroll', scheduleMotion, { passive: true, signal });
  window.addEventListener('pageshow', scheduleGraph, { signal });
  motion.addEventListener(
    'change',
    () => {
      enterComplete = true;
      scheduleMotion();
    },
    { signal },
  );
  const themeObserver = new MutationObserver(scheduleGraph);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  disposers.push(() => themeObserver.disconnect());
  document.fonts?.ready.then(() => {
    if (!signal.aborted) scheduleGraph();
  });
  disposers.push(() => {
    cancelAnimationFrame(graphFrame);
    cancelAnimationFrame(motionFrame);
  });
  scheduleGraph();

  if (document.getElementById('terminalForm')) {
    // Local shell-session greeting; future authenticated identity belongs to Rust.
    const now = new Date();
    let previous = null;
    try {
      previous = localStorage.getItem('altfork.shell.previous');
      localStorage.setItem('altfork.shell.previous', now.toISOString());
    } catch {}
    const previousDate = previous ? new Date(previous) : now;
    const date = Number.isNaN(previousDate.getTime()) ? now : previousDate;
    const stamp = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai',
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(date)
      .replaceAll(',', '');
    document.getElementById('lastLogin').textContent =
      `Last login: ${stamp} on web/guest`;

    const form = document.getElementById('terminalForm');
    const input = document.getElementById('terminalInput');
    const output = document.getElementById('terminalOutput');
    const screen = document.getElementById('terminalScreen');
    let cwd = '/',
      history = [],
      historyIndex = 0,
      draft = '';
    function revealBranch(id) {
      const branch = document.getElementById(id);
      if (branch?.matches('.node-group')) {
        branch.open = true;
        scheduleGraph();
      }
    }
    function execute(command) {
      if (!command.trim()) return;
      const result = runCommand(command, cwd);
      if (result.clear) output.replaceChildren();
      else {
        const entry = document.createElement('div');
        entry.className = 'terminal-entry';
        const echo = document.createElement('p');
        echo.className = 'terminal-command';
        const prompt = document.createElement('span');
        prompt.className = 'terminal-prompt';
        prompt.textContent = `guest@altfork ${cwd === '/' ? '~' : '~' + cwd} %`;
        const commandText = document.createElement('span');
        commandText.className = 'terminal-command-value';
        commandText.textContent = command;
        echo.append(prompt, document.createTextNode(' '), commandText);
        entry.append(echo);
        for (const text of result.lines) {
          const line = document.createElement('p');
          line.className = 'terminal-output';
          line.textContent = text;
          entry.append(line);
        }
        if (result.items.length) {
          const list = document.createElement('div');
          list.className = 'terminal-list';
          for (const item of result.items) {
            const link = document.createElement(item.href ? 'a' : 'button');
            link.className = 'terminal-item' + (item.href ? ' file' : '');
            link.textContent = item.children
              ? `${item.name}/`
              : `${item.name} ↗`;
            link.title = item.label;
            if (item.href) link.href = item.href;
            else {
              link.type = 'button';
              link.addEventListener('click', () => {
                execute('cd ' + item.path);
                execute('ls');
              });
            }
            list.append(link);
          }
          entry.append(list);
        }
        output.append(entry);
        // Keep the terminal bounded over long browsing sessions.
        while (output.children.length > 40) output.firstElementChild.remove();
      }
      cwd = result.cwd;
      document.getElementById('terminalPath').textContent =
        cwd === '/' ? '~' : '~' + cwd;
      document.getElementById('terminalPromptPath').textContent =
        cwd === '/' ? '~' : '~' + cwd;
      if (result.anchor) revealBranch(result.anchor);
      history.push(command);
      history = history.slice(-100);
      historyIndex = history.length;
      draft = '';
      input.value = '';
      screen.scrollTop = screen.scrollHeight;
      requestAnimationFrame(() =>
        input.scrollIntoView({ block: 'nearest', behavior: 'instant' }),
      );
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      execute(input.value);
    });
    screen.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.target.closest('a,button')) return;
      event.preventDefault();
      input.focus({ preventScroll: true });
    });
    document.querySelectorAll('[data-command]').forEach((button) =>
      button.addEventListener('click', () => {
        execute(button.dataset.command);
        input.focus({ preventScroll: true });
      }),
    );
    document.getElementById('clearTerminal').addEventListener('click', () => {
      output.replaceChildren();
      input.focus({ preventScroll: true });
    });
    input.addEventListener('keydown', (event) => {
      if (event.isComposing) return;
      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        output.replaceChildren();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex === history.length) draft = input.value;
        if (historyIndex > 0) input.value = history[--historyIndex];
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex < history.length) historyIndex++;
        input.value =
          historyIndex === history.length ? draft : history[historyIndex];
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey || !input.value.trim()) return;
        const next = complete(input.value, cwd);
        if (next.value !== input.value) {
          input.value = next.value;
          return;
        }
        if (next.matches.length < 2) return;
        const entry = document.createElement('div');
        entry.className = 'terminal-entry';
        const line = document.createElement('p');
        line.className = 'terminal-output';
        line.textContent = next.matches
          .map((match) => match.split(/\s+/).at(-1))
          .join('  ');
        entry.append(line);
        output.append(entry);
        screen.scrollTop = screen.scrollHeight;
      }
    });
    // Directory links can also be addressed directly in the URL.
    function revealHash() {
      const id = decodeURIComponent(location.hash.slice(1));
      revealBranch(id);
    }
    window.addEventListener('hashchange', revealHash, { signal });
    revealHash();
  }
}

document.addEventListener('astro:before-swap', () => releaseExplorer());
document.addEventListener('astro:page-load', initializeExplorer);
initializeExplorer();
