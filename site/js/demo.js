document.addEventListener('DOMContentLoaded', function() {
            // Theme Toggle
            const toggle = document.getElementById('theme-toggle');
            const body = document.body;
            function applyTheme(theme) {
                if (theme === 'dark') { body.classList.add('dark-mode'); toggle.checked = true; } 
                else { body.classList.remove('dark-mode'); toggle.checked = false; }
            }
            toggle.addEventListener('change', () => {
                const theme = toggle.checked ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                applyTheme(theme);
            });
            const savedTheme = localStorage.getItem('theme');
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light'));

            // Animation Logic
            const mount = document.getElementById('mount-assembly');
            const camera = document.getElementById('camera');
            const toggleCameraBtn = document.getElementById('toggle-camera-btn');
            const demoBtn = document.getElementById('demo-btn');
            const autoBtn = document.getElementById('auto-btn');
            const resetBtn = document.getElementById('reset-btn');
            const modeDisplay = document.getElementById('mode-display');
            const tabs = document.querySelectorAll('.tab');
            
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
