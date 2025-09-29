document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('form[data-endpoint]').forEach(function(form) {
                form.addEventListener('submit', function(event) {
                    handleFormSubmit(event, form);
                });
            });
            // Theme Toggle
            const toggle = document.getElementById('theme-toggle');
            const body = document.body;
            function applyTheme(theme) {
                if (theme === 'dark') {
                    body.classList.add('dark-mode');
                    toggle.checked = true;
                } else {
                    body.classList.remove('dark-mode');
                    toggle.checked = false;
                }
            }
            toggle.addEventListener('change', () => {
                const theme = toggle.checked ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                applyTheme(theme);
            });
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light'));

            // Scroll animations
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1
            });
            document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
        });

// Hero image gallery logic
      const gallery = document.querySelector('.hero-gallery');
      const images = document.querySelectorAll('.gallery-img');

      if (gallery) {
        images.forEach(img => {
          img.addEventListener('click', (e) => {
            const clickedImg = e.target;
            const isActive = clickedImg.classList.contains('is-active');
            
            images.forEach(image => {
              image.classList.remove('is-active', 'is-inactive');
            });

            if (!isActive) {
              clickedImg.classList.add('is-active');
              images.forEach(image => {
                if (image !== clickedImg) {
                  image.classList.add('is-inactive');
                }
              });
            }
          });
        });

        gallery.addEventListener('mouseleave', () => {
          images.forEach(image => {
            image.classList.remove('is-active', 'is-inactive');
          });
        });
      }

      // Copy for each hotspot key
      const FEATURE_CONTENT = {
        rail: {
          title: "Rail movement",
          copy: "Panoramic coverage along walls and cornersâ€”no fixed blind spots.",
          bullets: [
            "Modular straight + corner segments",
            "Quiet drive with soft start/stop",
            "Auto map + return-to-dock"
          ]
        },
        carriage: {
          title: "Smart tracking",
          copy: "Carriage repositions to the best vantage point when events occur.",
          bullets: [
            "Event-led repositioning",
            "Collision + edge safeguards",
            "Health checks + watchdog"
          ]
        },
        coverage: {
          title: "Continuous coverage",
          copy: "One unit adapts to cover where 2â€“3 fixed cams would.",
          bullets: [
            "Hallways, L-shapes, long rooms",
            "No manual panning needed",
            "Fewer devices, fewer gaps"
          ]
        },
        ai: {
          title: "AI events",
          copy: "On-device detection filters noiseâ€”alerts only when it matters.",
          bullets: [
            "Person / vehicle / pet / heat",
            "False-alert reduction",
            "Local-first, privacy controls"
          ]
        }
      };
      
      const panelTitle = document.getElementById("panel-title");
      const panelCopy  = document.getElementById("panel-copy");
      const panelBullets = document.getElementById("panel-bullets");
      
      function setPanel(key) {
        const data = FEATURE_CONTENT[key];
        if (!data) return;
        panelTitle.textContent = data.title;
        panelCopy.textContent = data.copy;
        panelBullets.innerHTML = data.bullets.map(b => `<li>${b}</li>`).join("");
      }
      
      // Attach hover/focus/tap events
      document.querySelectorAll(".hotspot").forEach(btn => {
        const key = btn.getAttribute("data-feature");
        btn.addEventListener("mouseenter", () => setPanel(key));
        btn.addEventListener("focus", () => setPanel(key));
        btn.addEventListener("click", () => setPanel(key)); // mobile tap
      });
