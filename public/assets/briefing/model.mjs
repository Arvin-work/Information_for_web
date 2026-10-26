// 浏览器、Remotion 和 Node 导出共用的 JSON 校验；这里不依赖浏览器 API。
const kinds = new Set([
  'cloud',
  'flint',
  'duet',
  'train',
  'labs',
  'rumor',
  'fable',
  'decision',
  'craft',
  'dna',
  'bench',
]);
const text = (value, name, max = 120) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw Error(`${name} 需要 1–${max} 个字符`);
};
export function normalizeProps(input) {
  const d = structuredClone(input);
  if (!d || typeof d !== 'object') throw Error('简报必须是 JSON 对象');
  d.outroTitle ??= ['本期模型动态', '汇总完毕。'];
  d.outroBlurb ??= '完整资料与来源链接见网站。';
  if (!Array.isArray(d.outroTitle) || d.outroTitle.length !== 2)
    throw Error('outroTitle 需要两行标题');
  d.outroTitle.forEach((line) => text(line, 'outroTitle', 8));
  text(d.outroBlurb, 'outroBlurb', 50);
  d.theme ??= 'light';
  d.siteUrl ??= 'altfork.dev';
  if (!['light', 'dark'].includes(d.theme))
    throw Error('theme 需要 light 或 dark');
  text(d.siteUrl, 'siteUrl', 60);
  if (d.themes) {
    for (const mode of Object.keys(d.themes)) {
      if (!['light', 'dark'].includes(mode))
        throw Error('themes 只支持 light / dark');
      for (const [key, color] of Object.entries(d.themes[mode])) {
        if (
          ![
            'background',
            'foreground',
            'muted',
            'accent',
            'surface',
            'line',
            'onAccent',
          ].includes(key) ||
          typeof color !== 'string' ||
          !/^#[\da-f]{6}$/i.test(color)
        )
          throw Error('主题颜色需要有效的 #RRGGBB');
      }
    }
  }
  d.fps ??= 30;
  d.introSeconds ??= 4;
  d.outroSeconds ??= 6;
  d.fontFamily ??= '"PingFang SC","Microsoft YaHei",sans-serif';
  for (const key of ['title', 'subtitle', 'date', 'fontFamily'])
    text(d[key], key);
  for (const key of ['accent', 'background', 'ink', 'muted']) {
    if (typeof d[key] !== 'string' || !/^#[\da-f]{6}$/i.test(d[key]))
      throw Error(`${key} 需要 #RRGGBB 格式颜色`);
  }
  if (d.fps !== 30) throw Error('当前模板固定 30fps');
  for (const key of ['introSeconds', 'outroSeconds', 'itemSeconds']) {
    if (!Number.isInteger(d[key]) || d[key] < 2 || d[key] > 60)
      throw Error(`${key} 需要 2–60 的整数秒数`);
  }
  if (
    d.detailSeconds !== undefined &&
    (!Number.isInteger(d.detailSeconds) ||
      d.detailSeconds < 3 ||
      d.detailSeconds > d.itemSeconds - 3)
  )
    throw Error('detailSeconds 需要整数秒数，且图形和详情都至少 3 秒');
  if (d.itemSeconds < 12)
    throw Error('每条新闻至少 12 秒，保证两拍都有阅读时间');
  if (
    d.fontFile &&
    (typeof d.fontFile !== 'string' ||
      d.fontFile.includes('..') ||
      /[:\\]/.test(d.fontFile) ||
      d.fontFile.startsWith('/'))
  )
    throw Error('fontFile 必须是 public 下的相对字体路径');
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 20)
    throw Error('items 需要 1–20 条新闻');
  for (const [key, max] of [
    ['pageTitle', 30],
    ['description', 100],
    ['introLabel', 12],
    ['dispatchLabel', 35],
    ['categoryLabel', 8],
  ])
    if (d[key] !== undefined) text(d[key], key, max);
  if (d.sections !== undefined) {
    if (!Array.isArray(d.sections) || !d.sections.length)
      throw Error('sections 需要非空数组');
    const ids = new Set();
    for (const section of d.sections) {
      text(section.id, '栏目 id', 30);
      text(section.title, '栏目标题', 30);
      if (ids.has(section.id)) throw Error('栏目 id 重复');
      ids.add(section.id);
      const count = d.items.filter(
        (item) => item.section === section.id,
      ).length;
      if (!count || (section.count !== undefined && section.count !== count))
        throw Error('栏目条目数不一致');
    }
    for (const item of d.items)
      if (!ids.has(item.section)) throw Error('新闻缺少有效栏目');
  }
  if (d.monitoring !== undefined) {
    if (!Array.isArray(d.monitoring) || d.monitoring.length > 10)
      throw Error('monitoring 最多 10 组');
    for (const group of d.monitoring) {
      text(group.title, '监测说明标题', 60);
      if (
        !Array.isArray(group.lines) ||
        !group.lines.length ||
        group.lines.length > 10
      )
        throw Error('监测说明需要 1–10 行');
      group.lines.forEach((line) => text(line, '监测说明', 400));
    }
  }
  d.items.forEach((item, i) => {
    const label = `第 ${i + 1} 条`;
    if (item.shortName !== undefined)
      text(item.shortName, `${label} 章节短名`, 30);
    if (item.summary !== undefined) text(item.summary, `${label} 片头提要`, 40);
    if (item.summaryNote !== undefined)
      text(item.summaryNote, `${label} 提要说明`, 45);
    for (const key of ['name', 'vendor', 'blurb', 'note'])
      text(item[key], `${label} ${key}`, key === 'blurb' ? 85 : 100);
    if (!kinds.has(item.kind)) throw Error(`${label} kind 无效`);
    if (
      !Array.isArray(item.head) ||
      item.head.length < 1 ||
      item.head.length > 2
    )
      throw Error(`${label} head 需要 1–2 行`);
    item.head.forEach((s) => text(s, `${label} 标题行`, 10));
    if (!Array.isArray(item.tags) || item.tags.length > 4)
      throw Error(`${label} tags 最多 4 个`);
    item.tags.forEach((s) => text(s, `${label} 标签`, 24));
    if (!Array.isArray(item.details) || item.details.length > 3)
      throw Error(`${label} details 最多 3 组`);
    item.details.forEach((pair) => {
      if (!Array.isArray(pair) || pair.length !== 2)
        throw Error(`${label} details 需要 [标题,说明]`);
      text(pair[0], `${label} 细节标题`, 20);
      text(pair[1], `${label} 细节说明`, 90);
    });
    if (!Array.isArray(item.sources)) throw Error(`${label} sources 需要数组`);
    item.sources.forEach((pair) => {
      if (!Array.isArray(pair) || pair.length !== 2)
        throw Error(`${label} sources 需要 [名称,链接]`);
      text(pair[0], `${label} 来源名称`);
      if (typeof pair[1] !== 'string' || !/^https:\/\//.test(pair[1]))
        throw Error(`${label} 来源链接需要 HTTPS`);
    });
    const v = item.visual;
    if (!v || typeof v !== 'object')
      throw Error(`${label} 缺少 visual 图形文案`);
    text(v.caption, `${label} visual.caption`);
    if (item.kind === 'bench') {
      if (v.status !== undefined) text(v.status, `${label} 指标说明`, 90);
      if (v.rowLabels !== undefined) {
        if (!Array.isArray(v.rowLabels) || v.rowLabels.length !== 2)
          throw Error('指标对照名需要两项');
        v.rowLabels.forEach((s) => text(s, '指标对照名', 30));
      }
      if (!Array.isArray(v.rows) || v.rows.length !== 3)
        throw Error(`${label} visual.rows 需要 3 组`);
      v.rows.forEach((row) => {
        if (!Array.isArray(row) || row.length !== 3)
          throw Error(`${label} 指标需要 [名称,旧值,新值]`);
        row.forEach((s) => text(s, `${label} 指标文字`, 30));
      });
    }
    if (item.kind === 'cloud') {
      if (!Array.isArray(v.nodes) || v.nodes.length !== 3)
        throw Error(`${label} visual.nodes 需要 3 项`);
      v.nodes.forEach((s) => text(s, `${label} 云厂商`, 24));
      text(v.center, `${label} 中心文案`, 24);
    } else if (item.kind === 'duet') {
      if (!Array.isArray(v.messages) || v.messages.length !== 2)
        throw Error(`${label} visual.messages 需要 2 项`);
      v.messages.forEach((s) => text(s, `${label} 对话`, 22));
    } else if (item.kind === 'labs') {
      if (!Array.isArray(v.cards) || v.cards.length !== 2)
        throw Error(`${label} visual.cards 需要 2 项`);
      v.cards.forEach((pair) => {
        if (!Array.isArray(pair) || pair.length !== 2)
          throw Error(`${label} visual.cards 需要 [名称,数字]`);
        text(pair[0], `${label} 卡片标题`, 24);
        text(pair[1], `${label} 数字`, 6);
      });
    } else {
      text(v.value, `${label} visual.value`, 12);
      if (['flint', 'train'].includes(item.kind))
        text(v.unit, `${label} 单位`, 12);
      if (item.kind === 'flint') text(v.heading, `${label} 终端标题`, 45);
    }
    item.dark = item.dark === true;
  });
  return d;
}
