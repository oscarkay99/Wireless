export function initMobileMenu() {
  const menuBtn    = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuClose  = document.getElementById('mobile-menu-close');

  function openMenu() {
    mobileMenu.style.display       = 'flex';
    mobileMenu.style.flexDirection = 'column';
    document.body.style.overflow   = 'hidden';
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.className = 'text-2xl ph ph-x';
        icon.style.color = '#fff';
      }
      menuBtn.style.color = '#fff';
    }
  }

  function closeMenu() {
    mobileMenu.style.display     = 'none';
    document.body.style.overflow = '';
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.className = 'text-2xl ph ph-list';
        icon.style.color = '#fff';
      }
      menuBtn.style.color = '#fff';
    }
  }

  if (menuBtn)    menuBtn.addEventListener('click', () => mobileMenu.style.display === 'flex' ? closeMenu() : openMenu());
  if (menuClose)  menuClose.addEventListener('click', closeMenu);
  if (mobileMenu) mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
}
