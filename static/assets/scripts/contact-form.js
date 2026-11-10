// Kapcsolati form – POST /api/contact (azon a Workeren) → Zoho Mail (hello@armands.site) → armand@bozsik.eu
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('site-contact-form');
  if (!form) return;
  const status = document.getElementById('site-cf-status');
  const labels = form.dataset;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };
    if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      status.textContent = labels.invalid || 'Please fill in all fields.';
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const tsDiv = form.querySelector('.cf-turnstile');
    if (tsDiv && window.turnstile) {
      data['cf-turnstile-response'] = await new Promise((resolve) => {
        const t = setTimeout(() => resolve(''), 10000);
        try {
          window.turnstile.execute(tsDiv, { callback: (tok) => { clearTimeout(t); resolve(tok); } });
        } catch (e) { clearTimeout(t); resolve(''); }
      });
    }
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        status.textContent = labels.success || 'Message sent – thank you!';
        form.reset();
      } else if (response.status === 503) {
        status.textContent = labels.notconfigured || 'The form is not configured yet.';
      } else {
        status.textContent = labels.error || 'Sending failed. Please try again.';
      }
    } catch {
      status.textContent = labels.error || 'Sending failed. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
});
