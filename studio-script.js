// studio-script.js - Minimal animations and UX for Black Gold Studio

document.addEventListener('DOMContentLoaded', () => {
  // Animate sections on scroll
  const animatedEls = document.querySelectorAll('section, .service-card, .cta-btn, .newsletter-form, .instagram-widget');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  animatedEls.forEach(el => observer.observe(el));

  // Newsletter form UX
  const form = document.querySelector('.newsletter-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      input.value = '';
      input.placeholder = 'Thank you for subscribing!';
      setTimeout(() => {
        input.placeholder = 'Your email address';
      }, 2500);
    });
  }
});
