(() => {
  let preference = null;
  try {
    preference = localStorage.getItem('altfork.theme');
  } catch {}
  const theme =
    preference === 'light' || preference === 'dark'
      ? preference
      : matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = theme;
})();
