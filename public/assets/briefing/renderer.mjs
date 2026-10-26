// 纯 Canvas 渲染内核：不读取 DOM，不启动计时器；同一数据与时间始终得到同一画面。
import {
  getScene,
  getDuration,
  getOverviewPages,
  getGraphicDuration,
} from './timeline.mjs';
import { getPalette } from './theme.mjs';
import { contentMotion, opacityContext, smootherstep } from './motion.mjs';
import { wrapLines } from './text.mjs';
export const VIDEO = Object.freeze({ width: 1920, height: 1080, fps: 30 });
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => 1 - Math.pow(1 - clamp(v), 3);
export function renderFrame(c, time, data, options = {}) {
  const scene = getScene(data, time),
    { index, u } = scene,
    item = data.items[index],
    half = getGraphicDuration(data);
  const palette = getPalette(data),
    dark = data.theme === 'dark',
    bg = palette.background,
    fg = palette.foreground,
    muted = palette.muted,
    acc = palette.accent,
    surface = palette.surface,
    onAccent = palette.onAccent;
  const fontFamily = options.fontFamily || data.fontFamily;
  c.save();
  try {
    c.fillStyle = bg;
    c.fillRect(0, 0, 1920, 1080);
    const txt = (s, x, y, size = 32, col = fg, w = 500) => {
      c.fillStyle = col;
      c.font = `${w} ${size}px ${fontFamily}`;
      c.fillText(s, x, y);
    };
    const line = (x, y, X, Y, col = fg, w = 2) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(X, Y);
      c.stroke();
    };
    const box = (x, y, w, h, col, r = 0) => {
      c.fillStyle = col;
      c.beginPath();
      c.roundRect(x, y, w, h, r);
      c.fill();
    };
    const dot = (x, y, r, col, stroke = false) => {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.lineWidth = 2;
      c[stroke ? 'strokeStyle' : 'fillStyle'] = col;
      stroke ? c.stroke() : c.fill();
    };
    const wrap = (
      s,
      x,
      y,
      width,
      size = 32,
      col = fg,
      w = 500,
      leading = 1.5,
    ) => {
      c.font = `${w} ${size}px ${fontFamily}`;
      const rows = wrapLines(s, width, (text) => c.measureText(text).width);
      rows.forEach((row, i) =>
        txt(row, x, y + i * size * leading, size, col, w),
      );
      return y + Math.max(0, rows.length - 1) * size * leading;
    };
    const reveal = (delay, fn) => {
      let p = ease((u - delay) / 0.85);
      c.save();
      c.globalAlpha = p;
      c.translate(0, 45 * (1 - p));
      fn();
      c.restore();
    };
    c.globalAlpha = 0.045;
    for (let x = 80; x < 1920; x += 80) line(x, 130, x, 940, fg, 1);
    c.globalAlpha = 1;
    txt(data.title, 82, 84, 33, fg, 800);
    txt(data.dispatchLabel || 'MODEL DISPATCH IN MOTION', 260, 82, 20, muted);
    txt(
      data.date + ' / ' + (data.categoryLabel || '模型动态'),
      1510,
      82,
      22,
      fg,
    );
    line(80, 120, 1840, 120, fg, 1);
    txt(
      index < 0
        ? '序 / INTRO'
        : index >= data.items.length
          ? '终 / OUTRO'
          : `${String(index + 1).padStart(2, '0')} / ${String(data.items.length).padStart(2, '0')}`,
      82,
      1006,
      24,
      fg,
    );
    line(80, 950, 1840, 950, palette.line, 1);
    c.font = `600 27px ${fontFamily}`;
    const site = data.siteUrl || 'altfork.dev',
      siteX = 1840 - c.measureText(site).width;
    c.font = `500 18px ${fontFamily}`;
    txt(
      'ALTFORK / MODEL DISPATCH',
      1840 - c.measureText('ALTFORK / MODEL DISPATCH').width,
      980,
      18,
      muted,
    );
    txt(site, siteX, 1006, 27, fg, 600);
    line(siteX - 40, 994, siteX - 16, 994, acc, 3);
    // 页眉页脚固定，只有内容区执行非线性淡入淡出与轻微位移。
    const motion = contentMotion(scene, data);
    c.save();
    c = opacityContext(c, motion.opacity);
    c.globalAlpha = 1;
    c.translate(motion.x, 0);
    if (index < 0) {
      reveal(0, () => txt(data.introLabel || 'AI 模型动态', 90, 310, 68));
      reveal(0.25, () => txt(data.title, 82, 520, 195, fg, 800));
      reveal(0.65, () => wrap(data.subtitle, 92, 642, 830, 40));
      reveal(0.9, () => {
        box(92, 730, 350, 64, acc, 8);
        txt(
          `${data.items.length} 条动态，逐条看。`,
          125,
          772,
          28,
          onAccent,
          600,
        );
      });
      // 片头右侧直接展示本期内容，替代太阳与轨道装饰；长列表按组轮播。
      const pages = getOverviewPages(data),
        pageLength = scene.duration / pages.length,
        page = Math.min(pages.length - 1, Math.floor(u / pageLength)),
        pageTime = u - page * pageLength,
        overview = pages[page];
      const overviewContext = c;
      c.save();
      c = opacityContext(
        c,
        smootherstep(pageTime / 0.3) *
          smootherstep((pageLength - pageTime) / 0.3),
      );
      c.globalAlpha = 1;
      txt(
        overview.title +
          ' / ' +
          String(page + 1).padStart(2, '0') +
          ' OF ' +
          String(pages.length).padStart(2, '0'),
        1050,
        249,
        25,
        muted,
        600,
      );
      line(1050, 280, 1820, 280, palette.line, 1);
      overview.entries.forEach(({ item: news, index: newsIndex }, j) =>
        reveal(0.12 + j * 0.12, () => {
          const y = 340 + j * 142;
          txt(String(newsIndex + 1).padStart(2, '0'), 1050, y, 24, acc, 600);
          const title = news.summary || news.name.split('：')[0];
          c.font = `600 36px ${fontFamily}`;
          const size = Math.min(36, (660 / c.measureText(title).width) * 36);
          txt(title, 1120, y, size, fg, 600);
          wrap(
            news.summaryNote || news.head.join(''),
            1120,
            y + 48,
            670,
            25,
            muted,
          );
          line(1050, y + 83, 1820, y + 83, palette.line, 1);
        }),
      );
      c.restore();
      c = overviewContext;
    } else if (index >= data.items.length) {
      reveal(0, () => txt('AI / MODEL BRIEFING', 90, 244, 27, acc));
      reveal(0.15, () =>
        txt(
          (data.outroTitle || ['本期模型动态', '汇总完毕。'])[0],
          85,
          426,
          126,
          fg,
          700,
        ),
      );
      reveal(0.55, () =>
        txt(
          (data.outroTitle || ['本期模型动态', '汇总完毕。'])[1],
          85,
          592,
          126,
          fg,
          700,
        ),
      );
      reveal(1.1, () =>
        wrap(
          data.outroBlurb || '完整资料与来源链接见网站。',
          92,
          737,
          1400,
          36,
        ),
      );
      reveal(1.5, () => {
        box(92, 815, 540, 66, acc, 33);
        txt(
          data.siteUrl || '今日 AI · 我们下期见 ↗',
          130,
          858,
          30,
          onAccent,
          600,
        );
      });
    } else {
      const second = u >= half,
        beat = second ? u - half : u;
      const appear = (delay, fn) => {
        let p = ease((beat - delay) / 0.85);
        c.save();
        c.globalAlpha = p;
        c.translate(0, 45 * (1 - p));
        fn();
        c.restore();
      };
      reveal(0, () =>
        txt(
          `${String(index + 1).padStart(2, '0')} / ${item.vendor}`,
          90,
          245,
          25,
          dark ? acc : muted,
        ),
      );
      item.head.forEach((s, i) =>
        reveal(0.1 + i * 0.25, () =>
          txt(s, 85, 392 + i * 138, s.length > 8 ? 91 : 110, fg, 700),
        ),
      );
      reveal(0.8, () => wrap(item.blurb, 90, 650, 860, 34));
      reveal(1.1, () => wrap(item.note, 90, 790, 850, 25, muted));
      reveal(1.3, () => {
        let x = 90;
        for (const tag of item.tags) {
          c.font = `500 23px ${fontFamily}`;
          const w = c.measureText(tag).width + 44;
          box(x, 855, w, 53, acc, 27);
          txt(tag, x + 22, 890, 23, onAccent, 600);
          x += w + 14;
        }
      });
      const contentContext = c;
      c.save();
      c = opacityContext(c, motion.detailOpacity);
      c.globalAlpha = 1;
      if (second) {
        item.details.forEach(([label, body], j) =>
          appear(0.15 + j * 0.3, () => {
            const y = 270 + j * 207;
            box(1050, y, 710, 174, surface, 12);
            txt(
              `0${j + 1}  ${label}`,
              1080,
              y + 44,
              27,
              dark ? acc : onAccent,
              650,
            );
            wrap(body, 1080, y + 94, 650, 26, fg, 500, 1.45);
          }),
        );
      } else if (item.kind === 'decision') {
        // 流动的输入进入决策核心，分流至三类有界答案。
        const p = ease(beat / 0.9);
        c.save();
        c.globalAlpha = p;
        for (let j = 0; j < 3; j++) {
          const y = 300 + j * 145;
          line(1110, 500, 1480, y, muted, 2);
          box(1480, y - 35, 270, 70, acc, 35);
          txt(['分类', '路由', '打分'][j], 1555, y + 12, 30, onAccent, 650);
          const q = (beat * 0.45 + j / 3) % 1;
          dot(1110 + 370 * q, 500 + (y - 500) * q, 8, acc);
        }
        dot(1110, 500, 66, fg);
        txt('Luna', 1070, 510, 28, bg, 650);
        c.restore();
        reveal(0.6, () => txt(item.visual.value, 1080, 790, 118, acc, 750));
        reveal(0.9, () => txt(item.visual.caption, 1390, 790, 25, fg));
      } else if (item.kind === 'craft') {
        // 线框随时间生长成抽象山景；不使用外网素材。
        const p = ease((beat - 0.5) / 1.6);
        box(1070, 270, 660, 420, surface, 18);
        c.save();
        c.beginPath();
        c.rect(1095, 295, 610 * p, 370);
        c.clip();
        dot(1570, 385, 51, acc);
        c.fillStyle = '#74796d';
        c.beginPath();
        c.moveTo(1095, 665);
        c.lineTo(1335, 370);
        c.lineTo(1600, 665);
        c.fill();
        c.fillStyle = acc;
        c.beginPath();
        c.moveTo(1320, 665);
        c.lineTo(1540, 455);
        c.lineTo(1705, 665);
        c.fill();
        c.restore();
        c.globalAlpha = 1 - p * 0.65;
        for (let j = 1; j < 3; j++) {
          line(1095 + j * 203, 295, 1095 + j * 203, 665, fg, 1);
          line(1095, 295 + j * 123, 1705, 295 + j * 123, fg, 1);
        }
        c.globalAlpha = 1;
        reveal(0.5, () =>
          txt('01  构图规划   →   02  渲染', 1080, 760, 30, fg),
        );
        reveal(1, () => txt(item.visual.caption, 1080, 830, 34, acc, 650));
      } else if (item.kind === 'dna') {
        // 两条正弦曲线组成 DNA 示意，连接横档随时间缓慢转动。
        for (let j = 0; j < 22; j++) {
          const y = 265 + j * 18,
            a = j * 0.36 + beat * 0.65,
            x1 = 1405 + 180 * Math.sin(a),
            x2 = 1405 - 180 * Math.sin(a);
          line(x1, y, x2, y, muted, 3);
          dot(x1, y, 7, acc);
          dot(x2, y, 7, fg);
        }
        reveal(0.5, () => txt(item.visual.value, 1090, 820, 120, acc, 750));
        reveal(0.9, () => txt(item.visual.caption, 1095, 887, 27, fg));
      } else if (item.kind === 'bench') {
        if (item.visual.rowLabels)
          txt(item.visual.rowLabels.join('   →   '), 1070, 230, 23, muted);
        item.visual.rows.forEach(([label, before, after], j) => {
          const p = ease((beat - 0.3 - j * 0.2) / 1.2),
            y = 300 + j * 175;
          box(1050, y - 40, 710, 145, surface, 12);
          txt(label, 1080, y, 25, muted);
          txt(before, 1080, y + 70, 52, fg, 650);
          line(1290, y + 50, 1360, y + 50, acc, 3);
          line(1345, y + 40, 1360, y + 50, acc, 3);
          line(1345, y + 60, 1360, y + 50, acc, 3);
          c.save();
          c.globalAlpha = p;
          txt(after, 1400, y + 70, 64, acc, 750);
          c.restore();
        });
        reveal(1, () =>
          wrap(
            item.visual.status || item.visual.caption,
            1070,
            880,
            690,
            26,
            fg,
          ),
        );
      } else if (item.kind === 'cloud') {
        const cx = 1410,
          cy = 530;
        for (let i = 0; i < 3; i++) {
          let a = -Math.PI / 2 + (i * Math.PI * 2) / 3,
            x = cx + 280 * Math.cos(a),
            y = cy + 200 * Math.sin(a);
          line(cx, cy, x, y, fg, 2);
          let p = (Math.sin(beat * 1.5 + i) + 1) / 2;
          dot(cx + (x - cx) * p, cy + (y - cy) * p, 7, acc);
          box(x - 120, y - 38, 240, 76, i === 0 ? acc : surface, 38);
          txt(
            item.visual.nodes[i],
            x - 94,
            y + 10,
            27,
            i === 0 ? onAccent : fg,
            600,
          );
        }
        dot(cx, cy, 92, fg);
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        txt(item.visual.center, cx, cy, 31, bg, 650);
        c.restore();
        reveal(1.1, () => txt(item.visual.caption, 1120, 839, 29, fg));
      } else if (item.kind === 'flint') {
        box(1050, 245, 710, 580, surface, 18);
        dot(1090, 283, 7, acc);
        dot(1117, 283, 7, '#b8c794');
        dot(1144, 283, 7, '#70756b');
        line(1050, 318, 1760, 318, '#51594c', 1);
        reveal(0.4, () => txt(item.visual.heading, 1090, 385, 27, muted));
        reveal(0.7, () => {
          txt(item.visual.value, 1080, 575, 168, acc, 750);
          txt(item.visual.unit, 1515, 570, 47, fg);
        });
        reveal(1, () => txt(item.visual.caption, 1095, 660, 28, fg));
        for (let j = 0; j < 16; j++)
          box(
            1095 + j * 39,
            730,
            23,
            18 + Math.sin(beat * 2 + j * 0.5) * 10,
            acc,
            4,
          );
      } else if (item.kind === 'duet') {
        reveal(0.5, () => {
          box(1050, 280, 625, 130, surface, 18);
          txt(item.visual.messages[0], 1085, 360, 34, fg);
        });
        reveal(1.3, () => {
          box(1150, 470, 620, 130, acc, 18);
          txt(item.visual.messages[1], 1185, 550, 34, onAccent);
        });
        reveal(1.6, () => txt(item.visual.caption, 1120, 735, 29, muted));
      } else if (item.kind === 'train') {
        reveal(0.4, () => txt(item.visual.value, 1080, 570, 250, acc, 750));
        reveal(0.7, () => txt(item.visual.unit, 1530, 560, 65, fg));
        reveal(1, () => txt(item.visual.caption, 1090, 670, 36, fg));
        for (let j = 0; j < 15; j++) {
          let p = ease((beat - 1 - j * 0.13) / 0.5);
          box(1090 + j * 44, 750, 30, 42, p > 0.1 ? acc : '#414a36', 4);
        }
      } else if (item.kind === 'labs') {
        reveal(0.5, () => {
          box(1050, 300, 340, 440, surface, 12);
          txt(item.visual.cards[0][0], 1075, 365, 28, fg);
          txt(item.visual.cards[0][1], 1070, 570, 120, fg, 750);
        });
        reveal(0.85, () => {
          box(1415, 380, 340, 360, acc, 12);
          txt(item.visual.cards[1][0], 1440, 445, 27, onAccent);
          txt(item.visual.cards[1][1], 1440, 620, 120, onAccent, 750);
        });
        reveal(1.2, () => txt(item.visual.caption, 1055, 825, 29, fg));
      } else if (item.kind === 'rumor') {
        c.save();
        c.translate(1400, 525);
        c.rotate(Math.sin(beat * 0.6) * 0.04);
        c.strokeStyle = fg;
        c.lineWidth = 2;
        c.strokeRect(-280, -230, 560, 460);
        c.restore();
        reveal(0.5, () => txt(item.visual.value, 1265, 660, 360, acc, 750));
        reveal(1, () => txt(item.visual.caption, 1100, 835, 30, fg));
      } else {
        reveal(0.4, () => txt(item.visual.value, 1080, 565, 160, acc, 750));
        reveal(0.9, () => txt(item.visual.caption, 1090, 690, 42, fg));
      }

      c.restore();
      c = contentContext;
    }
    c.restore();
  } finally {
    c.restore();
  }
  return scene;
}
export { getDuration };
