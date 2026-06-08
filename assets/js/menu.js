export function initMobileMenu() {
  const menuBtn    = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuClose  = document.getElementById('mobile-menu-close');

  function openMenu() {
    mobileMenu.style.display       = 'flex';
    mobileMenu.style.flexDirection = 'column';
    document.body.style.overflow   = 'hidden';
    menuBtn.querySelector('i').className = 'text-2xl ri-close-line';
  }

  function closeMenu() {
    mobileMenu.style.display     = 'none';
    document.body.style.overflow = '';
    if (menuBtn) menuBtn.querySelector('i').className = 'text-2xl ri-menu-line';
  }

  if (menuBtn)    menuBtn.addEventListener('click', () => mobileMenu.style.display === 'flex' ? closeMenu() : openMenu());
  if (menuClose)  menuClose.addEventListener('click', closeMenu);
  if (mobileMenu) mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
}
