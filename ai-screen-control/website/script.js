// Download card toggle
document.querySelectorAll('.os-card .btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const detailsId = btn.getAttribute('href');
    const details = document.querySelector(detailsId);

    if (details) {
      const isVisible = details.style.display === 'block';

      // Hide all other details
      document.querySelectorAll('.download-details').forEach(d => {
        d.style.display = 'none';
      });

      // Toggle current
      details.style.display = isVisible ? 'none' : 'block';
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
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// Mobile menu toggle (if needed in future)
console.log('AI Screen Control website loaded');
