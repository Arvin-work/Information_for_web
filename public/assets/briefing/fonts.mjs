// 字体仅从项目内加载；复用同一字体文件才能保证跨机器排版一致。
const loading = new Map();
export async function loadLocalFont(props, url) {
  if (!props.fontFile) return;
  const key = String(url);
  if (!loading.has(key))
    loading.set(
      key,
      (async () => {
        const face = new FontFace(
          'BriefingLocal',
          `url(${JSON.stringify(key)})`,
        );
        await face.load();
        document.fonts.add(face);
      })(),
    );
  await loading.get(key);
}
export const localFontFamily = '"BriefingLocal",sans-serif';
