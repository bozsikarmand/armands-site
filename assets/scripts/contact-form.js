// Kapcsolati form – armands.site → armands.cv/api/contact (Resend → armand@bozsik.eu)
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
