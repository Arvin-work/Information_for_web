// 网页外壳与视频共享整片主题，条目不再单独切换日夜。
export function getPalette(data) {
  const mode = data.theme || 'light';
  const base =
    mode === 'dark'
      ? {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          muted: '#9d9d9d',
          accent: '#f18b62',
          surface: '#252526',
          line: '#3c3c3c',
          onAccent: '#19201b',
        }
      : {
          background: data.background,
          foreground: data.ink,
          muted: data.muted,
          accent: data.accent,
          surface: '#fffdf9',
          line: '#deded4',
          onAccent: '#272e29',
        };
  return { ...base, ...data.themes?.[mode] };
}
