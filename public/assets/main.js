(() => {
  if (window.AltforkSiteInitialized) return;
  window.AltforkSiteInitialized = true;
  function initializeSite() {
    window.AltforkSiteCleanup?.();
    const controller = new AbortController();
    const { signal } = controller;
    let observer;
    window.AltforkSiteCleanup = () => {
      controller.abort();
      observer?.disconnect();
    };
    const media = matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    function update(theme) {
      root.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#1e1e1e' : '#f7f5ef');
      buttons.forEach((button) => {
        const dark = theme === 'dark';
        button.setAttribute('aria-pressed', String(dark));
        button.setAttribute(
          'aria-label',
          dark ? '切换浅色模式' : '切换暗色模式',
        );
        button.title = dark ? '切换浅色模式' : '切换暗色模式';
        button.querySelector('span').textContent = dark ? '☀' : '☾';
      });
    }
    update(root.dataset.theme || (media.matches ? 'dark' : 'light'));
    buttons.forEach((button) =>
      button.addEventListener(
        'click',
        () => {
          const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
          try {
            localStorage.setItem('altfork.theme', theme);
          } catch {}
          update(theme);
        },
        { signal },
      ),
    );
    media.addEventListener(
      'change',
      (event) => {
        let preference;
        try {
          preference = localStorage.getItem('altfork.theme');
        } catch {}
        if (preference !== 'dark' && preference !== 'light')
          update(event.matches ? 'dark' : 'light');
      },
      { signal },
    );
    window.addEventListener(
      'storage',
      (event) => {
        if (event.key === 'altfork.theme')
          update(
            event.newValue === 'dark' || event.newValue === 'light'
              ? event.newValue
              : media.matches
                ? 'dark'
                : 'light',
          );
      },
      { signal },
    );
    if (
      'IntersectionObserver' in window &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-visible');
              e.target.classList.remove('is-waiting');
              observer.unobserve(e.target);
            }
          }),
        { threshold: 0.08 },
      );
      document.querySelectorAll('.reveal').forEach((el) => {
        el.classList.add('is-waiting');
        observer.observe(el);
      });
    }
  }
  document.addEventListener('astro:page-load', initializeSite);
  document.addEventListener('astro:before-swap', (event) => {
    const theme = document.documentElement.dataset.theme;
    if (event.newDocument && (theme === 'dark' || theme === 'light')) {
      // ClientRouter replaces the root attributes. Carry the active theme into
      // the incoming document before it is painted, including when storage fails.
      event.newDocument.documentElement.dataset.theme = theme;
      event.newDocument
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#1e1e1e' : '#f7f5ef');
    }
    window.AltforkSiteCleanup?.();
  });
  initializeSite();
})();
