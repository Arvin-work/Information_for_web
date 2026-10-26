import { renderFrame, getDuration } from './renderer.mjs';
import { normalizeProps } from './model.mjs';
import { loadLocalFont, localFontFamily } from './fonts.mjs';

let activeRoot = null;
let releasePlayer = () => {};

async function initializeBriefing() {
  const root = document.querySelector('[data-briefing-player]');
  if (!root || root === activeRoot) return;
  releasePlayer();
  activeRoot = root;
  const controller = new AbortController();
  const { signal } = controller;
  let animationId = 0;
  let themeObserver;
  releasePlayer = () => {
    controller.abort();
    cancelAnimationFrame(animationId);
    themeObserver?.disconnect();
    activeRoot = null;
  };
  const $ = (selector) => root.querySelector(selector);
  try {
    const canvas = $('[data-canvas]');
    const context = canvas.getContext('2d');
    if (!context) throw Error('当前浏览器无法播放动画，可以阅读下方文字内容。');
    const data = normalizeProps(
      JSON.parse($('[data-briefing-data]').textContent),
    );
    await loadLocalFont(
      data,
      new URL('/' + (data.fontFile || ''), location.origin),
    );
    if (signal.aborted) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const query = new URLSearchParams(location.search);
    const total = getDuration(data);
    let time = Math.min(total, Math.max(0, Number(query.get('t')) || 0));
    let playing = query.get('paused') !== '1' && !motion.matches;
    let last = performance.now();
    let active = -9;
    const formatTime = (value) =>
      `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
    const chapters = [
      { name: '片头', start: 0 },
      ...data.items.map((item, index) => ({
        name: `${String(index + 1).padStart(2, '0')} ${item.shortName || item.name.split('：')[0]}`,
        start: data.introSeconds + index * data.itemSeconds,
      })),
    ];
    const buttons = chapters.map((chapter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = chapter.name;
      button.addEventListener(
        'click',
        () => {
          time = Math.min(total, chapter.start + 1.8);
          draw();
        },
        { signal },
      );
      return button;
    });
    $('[data-chapters]').replaceChildren(...buttons);

    function draw() {
      const { index } = renderFrame(
        context,
        time,
        data,
        data.fontFile ? { fontFamily: localFontFamily } : {},
      );
      if (index !== active) {
        active = index;
        buttons.forEach((button, i) => {
          button.classList.toggle('active', i === index + 1);
          button.setAttribute(
            'aria-current',
            i === index + 1 ? 'step' : 'false',
          );
        });
        const sources = $('[data-sources]');
        sources.replaceChildren();
        const item = data.items[index];
        if (item) {
          const note = document.createElement('span');
          note.textContent = item.note + '　';
          sources.append(note);
          for (const [label, href] of item.sources) {
            const link = document.createElement('a');
            link.textContent = label + ' ↗';
            link.href = href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            sources.append(link);
          }
        }
      }
      $('[data-time]').textContent =
        formatTime(time) + ' / ' + formatTime(total);
      $('[data-seek]').value = String(time);
      $('[data-play]').textContent = playing
        ? '暂停 Ⅱ'
        : time >= total
          ? '重播 ↺'
          : '播放 ▶';
    }
    function frame(now) {
      animationId = 0;
      if (signal.aborted || !playing || document.hidden) return;
      time = Math.min(total, time + Math.min((now - last) / 1000, 0.1));
      last = now;
      if (time >= total) playing = false;
      draw();
      if (playing) animationId = requestAnimationFrame(frame);
    }
    function resumeFrames() {
      cancelAnimationFrame(animationId);
      animationId = 0;
      last = performance.now();
      if (playing && !document.hidden)
        animationId = requestAnimationFrame(frame);
    }
    function setPlaying(next) {
      if (next && time >= total) time = 0;
      playing = next;
      draw();
      resumeFrames();
    }
    $('[data-play]').addEventListener('click', () => setPlaying(!playing), {
      signal,
    });
    $('[data-replay]').addEventListener(
      'click',
      () => {
        time = 0;
        setPlaying(true);
      },
      { signal },
    );
    $('[data-seek]').addEventListener(
      'input',
      (event) => {
        time = Math.max(0, Math.min(total, Number(event.target.value)));
        draw();
      },
      { signal },
    );
    $('[data-full]').addEventListener(
      'click',
      () => {
        if (document.fullscreenElement)
          document.exitFullscreen?.().catch(() => {});
        else canvas.requestFullscreen?.().catch(() => {});
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.target.closest(
            'button,a,input,select,textarea,[contenteditable]',
          )
        )
          return;
        if (event.code === 'Space') {
          event.preventDefault();
          setPlaying(!playing);
        }
        if (event.code === 'ArrowRight' || event.code === 'ArrowLeft') {
          event.preventDefault();
          time = Math.max(
            0,
            Math.min(total, time + (event.code === 'ArrowRight' ? 5 : -5)),
          );
          draw();
        }
      },
      { signal },
    );
    document.addEventListener('visibilitychange', resumeFrames, { signal });
    motion.addEventListener(
      'change',
      () => {
        if (motion.matches) setPlaying(false);
      },
      { signal },
    );
    const updateTheme = () => {
      data.theme =
        document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      draw();
    };
    themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    updateTheme();
    resumeFrames();
  } catch (error) {
    if (signal.aborted) return;
    const message = $('[data-player-error]');
    message.hidden = false;
    message.textContent =
      error instanceof Error
        ? error.message
        : '动画暂时不可用，请阅读下方文字内容。';
  }
}

document.addEventListener('astro:before-swap', () => releasePlayer());
document.addEventListener('astro:page-load', initializeBriefing);
initializeBriefing();
