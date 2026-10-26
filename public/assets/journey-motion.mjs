export const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export function growthProgress(front, start, end) {
  return end <= start
    ? front >= end
      ? 1
      : 0
    : clamp((front - start) / (end - start));
}
export function nodePresence(front, y) {
  return clamp((front - y + 65) / 130);
}

/** A side branch curves away from its parent, then follows its own vertical rail. */
export function sideBranchPath(source, leaves, departureY = source.y) {
  if (!leaves.length) return '';
  const first = leaves[0];
  const last = leaves.at(-1);
  const forkY = Math.max(source.y, Math.min(departureY, first.y));
  const available = Math.max(0, first.y - forkY);
  const rise = Math.min(Math.abs(first.x - source.x), available * 0.6);
  const trunk = forkY > source.y ? `V${forkY}` : '';
  const middleY = forkY + rise / 2;
  return `M${source.x} ${source.y}${trunk}C${source.x} ${middleY} ${first.x} ${middleY} ${first.x} ${forkY + rise}V${last.y}`;
}

/** Each sibling gets its own curved edge; later rows fork in the gap above them. */
export function siblingBranchPath(source, leaf, departureY, via) {
  const stem = via ?? source;
  const prefix = via
    ? siblingBranchPath(source, via, via.departureY)
    : `M${source.x} ${source.y}`;
  const forkY = Math.max(stem.y, Math.min(departureY, leaf.y));
  const bendEnd = Math.max(forkY, leaf.y - 14);
  const middleY = (forkY + bendEnd) / 2;
  return `${prefix}V${forkY}C${stem.x} ${middleY} ${leaf.x} ${middleY} ${leaf.x} ${bendEnd}V${leaf.y}`;
}
