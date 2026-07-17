// Download card toggle with smooth animation
document.querySelectorAll('.os-card .btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const detailsId = btn.getAttribute('href');
    const details = document.querySelector(detailsId);

    if (details) {
      const isVisible = details.style.display === 'block';

      // Hide all other details with animation
      document.querySelectorAll('.download-details').forEach(d => {
        d.style.opacity = '0';
        setTimeout(() => {
          d.style.display = 'none';
          d.style.opacity = '1';
        }, 300);
      });

      // Toggle current with animation
      if (isVisible) {
        details.style.opacity = '0';
        setTimeout(() => {
          details.style.display = 'none';
          details.style.opacity = '1';
        }, 300);
      } else {
        details.style.display = 'block';
        setTimeout(() => {
          details.style.opacity = '1';
        }, 10);
      }
    }
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#' && !href.includes('download-')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});

// Add scroll animation for elements
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe feature cards and other elements
document.querySelectorAll('.feature-card, .os-card, .doc-card, .step').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'all 0.6s ease';
  observer.observe(el);
});

// Log that site is loaded
console.log('✅ AI Screen Control website loaded and ready!');
