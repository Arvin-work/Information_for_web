// 秒与帧使用同一条时间轴，支持任意顺序渲染，避免导出时依赖上一个画面。
export function getDuration(data) {
  return (
    data.introSeconds + data.items.length * data.itemSeconds + data.outroSeconds
  );
}
export function getScene(data, time) {
  const total = getDuration(data);
  const t = Math.max(0, Math.min(total, Number.isFinite(time) ? time : 0));
  const outroStart = total - data.outroSeconds;
  const index =
    t < data.introSeconds
      ? -1
      : t >= outroStart
        ? data.items.length
        : Math.floor((t - data.introSeconds) / data.itemSeconds);
  const start =
    index < 0
      ? 0
      : index >= data.items.length
        ? outroStart
        : data.introSeconds + index * data.itemSeconds;
  const duration =
    index < 0
      ? data.introSeconds
      : index >= data.items.length
        ? data.outroSeconds
        : data.itemSeconds;
  return { index, t, total, start, duration, u: t - start };
}
export function getDurationInFrames(data) {
  return Math.round(getDuration(data) * data.fps);
}
// 片头提要按栏目分页；五条内容分成三条与两条，避免单页只剩一条。
export function getOverviewPages(data) {
  const groups = data.sections?.length
    ? data.sections.map((section) => ({
        title: section.title,
        entries: data.items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.section === section.id),
      }))
    : [
        {
          title: '本期要点',
          entries: data.items.map((item, index) => ({ item, index })),
        },
      ];
  const pages = [];
  for (const group of groups) {
    if (!group.entries.length) continue;
    const count = Math.ceil(group.entries.length / 4),
      size = Math.ceil(group.entries.length / count);
    for (let i = 0; i < group.entries.length; i += size)
      pages.push({
        title: group.title,
        entries: group.entries.slice(i, i + size),
      });
  }
  return pages;
}

// 未配置时保留历史版的等分节奏；配置后可只缩短详情，不改变前段图形时长。
export function getGraphicDuration(data) {
  return data.itemSeconds - (data.detailSeconds ?? data.itemSeconds / 2);
}
