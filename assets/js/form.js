export function initDeviceToggle() {
  const deviceInput = document.querySelector('input[name="device"]');
  const deviceBtns  = Array.from(document.querySelectorAll('#device-buttons button'));

  deviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('bg-primary-500');
      deviceBtns.forEach(b => {
        b.classList.remove('bg-primary-500', 'text-background-50', 'border-primary-500');
        b.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });
      if (!wasActive) {
        btn.classList.add('bg-primary-500', 'text-background-50', 'border-primary-500');
        btn.classList.remove('bg-background-50', 'text-foreground-700', 'border-background-300');
        if (deviceInput) deviceInput.value = btn.textContent.trim();
      } else if (deviceInput) {
        deviceInput.value = '';
      }
    });
  });
}

export function initIssueToggle() {
  const issueInput = document.querySelector('input[name="issue_type"]');
  const issueBtns  = Array.from(document.querySelectorAll('#issue-buttons button'));

  issueBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('bg-secondary-600');
      issueBtns.forEach(b => {
        b.classList.remove('bg-secondary-600', 'text-background-50', 'border-secondary-600');
        b.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });
      if (!wasActive) {
        btn.classList.add('bg-secondary-600', 'text-background-50', 'border-secondary-600');
        btn.classList.remove('bg-background-50', 'text-foreground-700', 'border-background-300');
        if (issueInput) issueInput.value = btn.textContent.trim();
      } else if (issueInput) {
        issueInput.value = '';
      }
    });
  });
}

export function initBookingForm() {
  const form        = document.getElementById('wireless-book-form');
  const submitBtn   = document.getElementById('submit-btn');
  const deviceInput = document.querySelector('input[name="device"]');
  const issueInput  = document.querySelector('input[name="issue_type"]');
  const deviceBtns  = Array.from(document.querySelectorAll('#device-buttons button'));
  const issueBtns   = Array.from(document.querySelectorAll('#issue-buttons button'));

  if (!form || !submitBtn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = 'Booking&hellip;';

    setTimeout(() => {
      submitBtn.innerHTML = '<i class="ri-check-line"></i> Repair Booked!';
      form.reset();

      deviceBtns.forEach(b => {
        b.classList.remove('bg-primary-500', 'text-background-50', 'border-primary-500');
        b.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });
      issueBtns.forEach(b => {
        b.classList.remove('bg-secondary-600', 'text-background-50', 'border-secondary-600');
        b.classList.add('bg-background-50', 'text-foreground-700', 'border-background-300');
      });
      if (deviceInput) deviceInput.value = '';
      if (issueInput)  issueInput.value  = '';

      setTimeout(() => {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = 'Schedule Your Repair <i class="ri-arrow-right-line"></i>';
      }, 3000);
    }, 1000);
  });
}
