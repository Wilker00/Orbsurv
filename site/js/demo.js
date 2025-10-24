document.addEventListener('DOMContentLoaded', function() {
            // Theme Toggle
            const body = document.body;
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

            function applyTheme(theme, toggleEl) {
                body.classList.toggle('dark-mode', theme === 'dark');
                if (toggleEl) {
                    toggleEl.checked = theme === 'dark';
                }
            }

            function bindThemeToggle(toggleEl) {
                if (!toggleEl || toggleEl.dataset.orbsurvThemeBound === 'true') {
                    return;
                }
                applyTheme(currentTheme, toggleEl);
                toggleEl.addEventListener('change', () => {
                    currentTheme = toggleEl.checked ? 'dark' : 'light';
                    localStorage.setItem('theme', currentTheme);
                    applyTheme(currentTheme, toggleEl);
                });
                toggleEl.dataset.orbsurvThemeBound = 'true';
            }

            const initialToggle = document.getElementById('theme-toggle');
            if (initialToggle) {
                bindThemeToggle(initialToggle);
            } else {
                document.addEventListener('orbsurv:partials-loaded', () => {
                    bindThemeToggle(document.getElementById('theme-toggle'));
                }, { once: true });
            }

            applyTheme(currentTheme, initialToggle);

            // Animation Logic
            const mount = document.getElementById('mount-assembly');
            const camera = document.getElementById('camera');
            const toggleCameraBtn = document.getElementById('toggle-camera-btn');
            const demoBtn = document.getElementById('demo-btn');
            const autoBtn = document.getElementById('auto-btn');
            const resetBtn = document.getElementById('reset-btn');
            const modeDisplay = document.getElementById('mode-display');
            const tabs = document.querySelectorAll('.tab');
            
            if (!mount || !toggleCameraBtn || !demoBtn || !autoBtn || !resetBtn || !modeDisplay) {
                console.warn('Demo page is missing required interactive elements.');
                return;
            }

            let isAutoMode = false;
            let autoModeInterval = null;

            function resetAnimationState() {
                mount.style.animation = 'none';
                void mount.offsetWidth;
            }

            function startSlidingAnimation() {
                resetAnimationState();
                mount.style.animation = 'slide 8s ease-in-out';
            }

            function stopAndResetPosition() {
                resetAnimationState();
                mount.style.left = '10px'; 
            }

            toggleCameraBtn.addEventListener('click', function() {
                const isShowing = mount.classList.toggle('show-camera');
                this.textContent = isShowing ? 'Show Mount Only' : 'Show Camera + Mount';
            });

            demoBtn.addEventListener('click', function() {
                if (isAutoMode) {
                    isAutoMode = false;
                    autoBtn.setAttribute('aria-pressed', 'false');
                    clearInterval(autoModeInterval);
                }
                startSlidingAnimation();
                modeDisplay.textContent = 'Manual Demo';
            });

            autoBtn.addEventListener('click', function() {
                isAutoMode = !isAutoMode;
                this.setAttribute('aria-pressed', isAutoMode.toString());
                
                if (isAutoMode) {
                    modeDisplay.textContent = 'Auto Patrol';
                    startSlidingAnimation();
                    autoModeInterval = setInterval(startSlidingAnimation, 10000); // 8s anim + 2s pause
                } else {
                    modeDisplay.textContent = 'Idle';
                    clearInterval(autoModeInterval);
                    stopAndResetPosition();
                }
            });

            resetBtn.addEventListener('click', function() {
                isAutoMode = false;
                autoBtn.setAttribute('aria-pressed', 'false');
                if (autoModeInterval) {
                    clearInterval(autoModeInterval);
                }
                stopAndResetPosition();
                modeDisplay.textContent = 'Idle';
            });
            
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                    this.classList.add('active');
                    const tabType = this.dataset.tab;
                    const contentPane = document.getElementById(`${tabType}-content`);
                    if (contentPane) {
                        contentPane.classList.add('active');
                    }

                    if (camera) { // Defensive check to prevent the error
                        let isVoiceActive = camera.classList.contains('voice-active');
                        camera.className = 'camera';
                        if (tabType === 'voice') {
                            camera.classList.toggle('voice-active', !isVoiceActive);
                        } else {
                            if(isVoiceActive) camera.classList.add('voice-active');
                            camera.classList.add(`${tabType}-active`);
                        }
                    }
                });
            });

            // Scroll animations
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
        });
