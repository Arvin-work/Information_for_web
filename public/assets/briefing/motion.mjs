import { getGraphicDuration } from './timeline.mjs';
// 五次缓动在两端速度、加速度均为零，随机访问和离线导出使用同一结果。
export const smootherstep = (value) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export function contentMotion(scene, data) {
  const incoming = scene.index < 0 ? 1 : smootherstep(scene.u / 0.65);
  const outgoing =
    scene.index >= data.items.length
      ? 1
      : smootherstep((scene.duration - scene.u) / 0.65);
  const half = getGraphicDuration(data);
  const detail =
    scene.index >= 0 && scene.index < data.items.length
      ? smootherstep(Math.abs(scene.u - half) / 0.5)
      : 1;
  return {
    opacity: incoming * outgoing,
    detailOpacity: detail,
    x: (1 - incoming) * 26 - (1 - outgoing) * 20,
  };
}
// 兼容浏览器和 Node：所有局部透明度乘以同一个分镜包络，不依赖 DOM 或上一帧。
export function opacityContext(context, opacity) {
  return new Proxy(context, {
    get(target, key) {
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      target[key] = key === 'globalAlpha' ? value * opacity : value;
      return true;
    },
  });
}
