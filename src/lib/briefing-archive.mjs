/** @param {...string} parts */
export function briefingArchivePath(...parts) {
  return (
    '/branches/block-1/ai-daily/' + (parts.length ? parts.join('/') + '/' : '')
  );
}

/** @param {string} date */
export function briefingPagePath(date) {
  return '/information/ai-daily/' + date.replaceAll('-', '/') + '/';
}

/** Years and months grow forward down the tree; days grow left to right.
 * Never invent missing calendar days.
 * @param {{ date: string, href: string, summary: string }[]} issues
 */
export function groupBriefings(issues) {
  const ordered = [...issues].sort((a, b) => a.date.localeCompare(b.date));
  const years = [
    ...new Set(ordered.map((issue) => issue.date.slice(0, 4))),
  ].sort();
  return years.map((year) => {
    const entries = ordered.filter((issue) =>
      issue.date.startsWith(year + '-'),
    );
    const months = [
      ...new Set(entries.map((issue) => issue.date.slice(5, 7))),
    ].sort();
    return {
      year,
      href: briefingArchivePath(year),
      count: entries.length,
      months: months.map((month) => ({
        month,
        href: briefingArchivePath(year, month),
        issues: entries.filter((issue) => issue.date.slice(5, 7) === month),
      })),
    };
  });
}
