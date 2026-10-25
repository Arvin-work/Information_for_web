(() => {
  const form = document.getElementById('registerForm');
  const status = document.getElementById('authStatus');
  const submit = document.getElementById('submitRegister');
  const email = form.elements.namedItem('email');
  const username = form.elements.namedItem('username');
  const password = form.elements.namedItem('password');
  const toggle = document.getElementById('togglePassword');
  let pending = false;
  let created = false;

  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? '隐藏密码' : '显示密码';
    toggle.setAttribute('aria-pressed', String(show));
  });

  password.addEventListener('input', () => password.setCustomValidity(''));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || created) return;

    email.value = email.value.trim();
    username.value = username.value.trim();
    const length = Array.from(password.value).length;
    password.setCustomValidity(
      length >= 12 && length <= 128 ? '' : '密码需要包含 12～128 个字符。',
    );
    if (!form.reportValidity()) return;

    pending = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.classList.remove('error', 'success');
    status.textContent = '正在创建账号…';

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.value,
          username: username.value,
          password: password.value,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('注册服务暂时不可用，请稍后重试。');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || '注册失败，请稍后重试。');
      }
      if (response.status !== 201) {
        throw new Error('注册服务返回异常，请稍后重试。');
      }

      created = true;
      status.classList.add('success');
      status.textContent = '账号已创建，请通过下方链接前往登录。';
      submit.textContent = '账号已创建 ✓';
    } catch (error) {
      status.classList.add('error');
      status.textContent =
        error.name === 'TimeoutError'
          ? '请求超时，暂时无法确认账号是否创建，请勿连续提交。'
          : error.message || '暂时无法连接，请稍后重试。';
    } finally {
      password.value = '';
      password.type = 'password';
      toggle.textContent = '显示密码';
      toggle.setAttribute('aria-pressed', 'false');
      pending = false;
      submit.disabled = created;
      form.removeAttribute('aria-busy');
    }
  });
})();
