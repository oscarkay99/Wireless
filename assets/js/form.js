import { createRepairBooking } from './auth.js';

export function initDeviceToggle() {
  const deviceInput = document.querySelector('input[name="device"]');
  const deviceButtons = Array.from(document.querySelectorAll('#device-buttons button'));

  deviceButtons.forEach(button => {
    button.addEventListener('click', () => {
      const wasActive = button.classList.contains('bg-primary-500');
      deviceButtons.forEach(candidate => {
        candidate.classList.remove('bg-primary-500', 'text-background-50', 'border-primary-500');
        candidate.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });

      if (!wasActive) {
        button.classList.add('bg-primary-500', 'text-background-50', 'border-primary-500');
        button.classList.remove('bg-background-50', 'text-foreground-700', 'border-background-300');
        if (deviceInput) deviceInput.value = button.textContent.trim();
      } else if (deviceInput) {
        deviceInput.value = '';
      }
    });
  });
}

export function initIssueToggle() {
  const issueInput = document.querySelector('input[name="issue_type"]');
  const issueButtons = Array.from(document.querySelectorAll('#issue-buttons button'));

  issueButtons.forEach(button => {
    button.addEventListener('click', () => {
      const wasActive = button.classList.contains('bg-secondary-600');
      issueButtons.forEach(candidate => {
        candidate.classList.remove('bg-secondary-600', 'text-background-50', 'border-secondary-600');
        candidate.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });

      if (!wasActive) {
        button.classList.add('bg-secondary-600', 'text-background-50', 'border-secondary-600');
        button.classList.remove('bg-background-50', 'text-foreground-700', 'border-background-300');
        if (issueInput) issueInput.value = button.textContent.trim();
      } else if (issueInput) {
        issueInput.value = '';
      }
    });
  });
}

function clearButtonState(buttons, activeClasses) {
  buttons.forEach(button => {
    button.classList.remove(...activeClasses);
    button.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
  });
}

function showInlineMessage(target, message, tone = 'success') {
  if (!target) return;
  const tones = {
    success: {
      border: 'rgba(16,185,129,0.18)',
      bg: 'rgba(16,185,129,0.08)',
      text: '#047857',
    },
    error: {
      border: 'rgba(220,38,38,0.18)',
      bg: 'rgba(220,38,38,0.08)',
      text: '#b91c1c',
    },
  };
  const style = tones[tone] || tones.success;
  target.style.display = 'block';
  target.style.border = `1px solid ${style.border}`;
  target.style.background = style.bg;
  target.style.color = style.text;
  target.innerHTML = message;
}

export function initBookingForm() {
  const form = document.getElementById('wireless-book-form');
  const submitButton = document.getElementById('submit-btn');
  const deviceInput = document.querySelector('input[name="device"]');
  const issueInput = document.querySelector('input[name="issue_type"]');
  const deviceButtons = Array.from(document.querySelectorAll('#device-buttons button'));
  const issueButtons = Array.from(document.querySelectorAll('#issue-buttons button'));

  if (!form || !submitButton) return;

  let inlineMessage = document.getElementById('booking-message');
  if (!inlineMessage) {
    inlineMessage = document.createElement('div');
    inlineMessage.id = 'booking-message';
    inlineMessage.style.display = 'none';
    inlineMessage.style.padding = '0.85rem 1rem';
    inlineMessage.style.borderRadius = '14px';
    inlineMessage.style.fontSize = '0.86rem';
    inlineMessage.style.lineHeight = '1.55';
    form.prepend(inlineMessage);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    inlineMessage.style.display = 'none';

    const payload = {
      device: form.querySelector('input[name="device"]')?.value || '',
      issueType: form.querySelector('input[name="issue_type"]')?.value || '',
      customerName: form.querySelector('input[name="customer_name"]')?.value || '',
      customerPhone: form.querySelector('input[name="customer_phone"]')?.value || '',
      customerEmail: form.querySelector('input[name="customer_email"]')?.value || '',
      preferredDate: form.querySelector('input[name="preferred_date"]')?.value || '',
      message: form.querySelector('textarea[name="message"]')?.value || '',
    };

    submitButton.disabled = true;
    submitButton.innerHTML = 'Booking…';

    const result = await createRepairBooking(payload);
    if (result.error) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Schedule My Repair <i class="ph ph-arrow-right"></i>';
      showInlineMessage(inlineMessage, result.error, 'error');
      return;
    }

    submitButton.innerHTML = 'Repair Booked!';
    showInlineMessage(
      inlineMessage,
      `Your repair booking <strong>${result.repair.id}</strong> is confirmed. Diagnosis will only start after the <strong>GHS 200</strong> fee is paid at check-in. You can now track this job from <a href="./my-repairs.html" style="color:inherit;text-decoration:underline;font-weight:700;">My Repairs</a>.`,
      'success',
    );

    form.reset();
    clearButtonState(deviceButtons, ['bg-primary-500', 'text-background-50', 'border-primary-500']);
    clearButtonState(issueButtons, ['bg-secondary-600', 'text-background-50', 'border-secondary-600']);
    if (deviceInput) deviceInput.value = '';
    if (issueInput) issueInput.value = '';

    setTimeout(() => {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Schedule My Repair <i class="ph ph-arrow-right"></i>';
      window.location.href = './my-repairs.html';
    }, 1400);
  });
}
