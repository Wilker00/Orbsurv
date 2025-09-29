// Form message handler to avoid `alert()`
      function handleFormSubmit(event, form, message) {
        event.preventDefault();
        const messageBoxId = form.id.replace('-form', '-message');
        const messageBox = document.getElementById(messageBoxId);
        if (messageBox) {
          messageBox.textContent = message;
          messageBox.classList.add('is-visible');
          setTimeout(() => {
            messageBox.classList.remove('is-visible');
          }, 3000);
        }
        form.reset();
      }

      // Intersection Observer for slide animations
      document.addEventListener('DOMContentLoaded', function() {
        const slides = document.querySelectorAll('.slide');
        const io = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.2 });
        slides.forEach(s => io.observe(s));
      });

      // Animated counter for market slide
      function animateCounter(id, target, duration = 2000) {
        const el = document.getElementById(id);
        let start = 0, startTime = null;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          el.textContent = '$' + Math.floor(progress * target).toLocaleString() + '+';
          if (progress < 1) {
            requestAnimationFrame(step);
          }
        }
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              requestAnimationFrame(step);
              observer.unobserve(entry.target);
            }
          });
        });
        observer.observe(el);
      }
      
      animateCounter("market-counter", 60000000000);

// Theme toggle: persist + sync checkbox
      (function () {
        const root = document.body;
        const checkbox = document.getElementById('theme-toggle');
        const saved = localStorage.getItem('orbsurv-theme'); // 'dark' | 'light' | null
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.className = 'sr-only'; // Assuming .sr-only class is available
        document.body.appendChild(liveRegion);

        if (saved === 'dark') root.classList.add('dark-mode');
        if (checkbox) checkbox.checked = root.classList.contains('dark-mode');
    
        checkbox?.addEventListener('change', () => {
          const isDarkMode = checkbox.checked;
          root.classList.toggle('dark-mode', isDarkMode);
          localStorage.setItem('orbsurv-theme', isDarkMode ? 'dark' : 'light');
          // Announce the change to screen readers
          liveRegion.textContent = `Theme changed to ${isDarkMode ? 'dark' : 'light'} mode.`;
        });
      })();
