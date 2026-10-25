(() => {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('authStatus');
  const submit = document.getElementById('submitLogin');
  const email = form.elements.namedItem('email');
  const password = form.elements.namedItem('password');
  const toggle = document.getElementById('togglePassword');
  const panel = document.getElementById('accountPanel');
  const accountName = document.getElementById('accountName');
  const accountEmail = document.getElementById('accountEmail');
  const logout = document.getElementById('logoutButton');
  const retry = document.getElementById('retrySession');
  const registerNote = document.getElementById('registerNote');
  let pending = false;

  function setPending(value) {
    pending = value;
    submit.disabled = value;
    logout.disabled = value;
    retry.disabled = value;
    panel.setAttribute('aria-busy', String(value));
    form.setAttribute('aria-busy', String(value));
  }

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }

  function resetPassword() {
    password.value = '';
    password.type = 'password';
    toggle.textContent = '显示密码';
    toggle.setAttribute('aria-pressed', 'false');
  }

  function showUser(user) {
    const signedIn = Boolean(user);
    form.hidden = signedIn;
    panel.hidden = !signedIn;
    registerNote.hidden = signedIn;
    accountName.textContent = user?.displayName || '';
    accountEmail.textContent = user?.email || '';
    resetPassword();
  }

  async function readUser(response) {
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('账号服务暂时不可用，请稍后重试。');
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '账号请求失败，请稍后重试。');
    }
    if (
      response.status !== 200 ||
      typeof data.user?.id !== 'string' ||
      !data.user.id ||
      typeof data.user.email !== 'string' ||
      typeof data.user.displayName !== 'string'
    ) {
      throw new Error('账号服务返回异常，请稍后重试。');
    }
    return data.user;
  }

  async function checkSession() {
    if (pending) return;
    setPending(true);
    retry.hidden = true;
    setStatus('正在确认登录状态…');
    try {
      const response = await fetch('/api/v1/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 401) {
        showUser(null);
        setStatus('使用邮箱和密码登录，或先创建账号。');
      } else {
        showUser(await readUser(response));
        setStatus('你已登录，可在这里管理当前会话。');
      }
    } catch (error) {
      // A network failure does not prove the session has been revoked.
      setStatus('暂时无法确认登录状态，请检查连接后重试。', true);
      retry.hidden = false;
    } finally {
      setPending(false);
    }
  }

  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? '隐藏密码' : '显示密码';
    toggle.setAttribute('aria-pressed', String(show));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || form.hidden) return;
    email.value = email.value.trim();
    if (!form.reportValidity()) return;

    setPending(true);
    retry.hidden = true;
    setStatus('正在登录…');
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value, password: password.value }),
        signal: AbortSignal.timeout(20000),
      });
      showUser(await readUser(response));
      setStatus('登录成功。');
    } catch (error) {
      setStatus(
        error.name === 'TimeoutError'
          ? '请求超时，登录结果尚未确认，请重新检查登录状态。'
          : error.message || '暂时无法连接，请稍后重试。',
        true,
      );
      retry.hidden = false;
    } finally {
      resetPassword();
      setPending(false);
    }
  });

  logout.addEventListener('click', async () => {
    if (pending) return;
    setPending(true);
    retry.hidden = true;
    setStatus('正在退出登录…');
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(12000),
      });
      // A 204 response has no JSON body.
      if (response.status !== 204) {
        throw new Error('退出失败，暂时无法确认会话是否已撤销。');
      }
      showUser(null);
      setStatus('已退出登录。');
    } catch (error) {
      setStatus('暂时无法确认退出结果，请重新检查登录状态或重试退出。', true);
      retry.hidden = false;
    } finally {
      setPending(false);
    }
  });

  retry.addEventListener('click', checkSession);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) checkSession();
  });
  checkSession();
})();
