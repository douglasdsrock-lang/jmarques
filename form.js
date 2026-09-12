document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('diagnosticForm');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById('formStatus');
  const startedAt = document.getElementById('startedAt');
  const dialog = document.getElementById('formSuccessDialog');
  const dialogName = document.getElementById('formSuccessName');
  const closeDialog = dialog?.querySelector('.form-success-close');

  const localHosts = new Set(['localhost', '127.0.0.1']);
  const endpoint = form.dataset.endpoint || (
    localHosts.has(window.location.hostname)
      ? 'http://127.0.0.1:8787/api/diagnostico'
      : '/api/diagnostico'
  );

  const resetStartTime = () => {
    if (startedAt) startedAt.value = String(Date.now());
  };

  const setLoading = (loading) => {
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.setAttribute('aria-busy', String(loading));
  };

  const setStatus = (message = '', type = '') => {
    status.textContent = message;
    status.className = `form-status${type ? ` is-${type}` : ''}`;
  };

  const showSuccess = (name) => {
    if (dialogName) dialogName.textContent = name.trim().split(/\s+/)[0] || 'Obrigado';

    if (typeof dialog?.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog?.setAttribute('open', '');
    }
  };

  closeDialog?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus();

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Não foi possível enviar agora. Tente novamente em alguns instantes.');
      }

      const submittedName = data.nome;
      form.reset();
      resetStartTime();
      showSuccess(submittedName);
    } catch (error) {
      setStatus(
        error.message || 'Não foi possível enviar agora. Tente novamente em alguns instantes.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  });

  resetStartTime();
});
