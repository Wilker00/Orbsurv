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

            // Initialize 3D model viewer
            const stlCanvas = document.getElementById('stl-viewer-canvas');
            if (stlCanvas) {
                const modelPath = stlCanvas.getAttribute('data-stl-path');
                if (modelPath) {
                    // Use the ensureThreeBundle function from global.js
                    if (typeof window.ensureThreeBundle === 'function') {
                        window.ensureThreeBundle()
                            .then((THREE) => {
                                if (!THREE || !THREE.OrbitControls || !THREE.STLLoader) {
                                    throw new Error('Three.js components not available');
                                }

                                const scene = new THREE.Scene();
                                scene.background = new THREE.Color(0xf5f5f5);
                                
                                const camera = new THREE.PerspectiveCamera(
                                    75,
                                    stlCanvas.clientWidth / stlCanvas.clientHeight,
                                    0.1,
                                    1000
                                );
                                camera.position.set(0, 0, 200);

                                const renderer = new THREE.WebGLRenderer({ antialias: true });
                                renderer.setSize(stlCanvas.clientWidth, stlCanvas.clientHeight);
                                stlCanvas.appendChild(renderer.domElement);

                                const controls = new THREE.OrbitControls(camera, renderer.domElement);
                                controls.enableDamping = true;
                                controls.dampingFactor = 0.05;

                                // Lighting
                                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                                scene.add(ambientLight);
                                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                                directionalLight.position.set(50, 50, 50);
                                scene.add(directionalLight);

                                const loader = new THREE.STLLoader();
                                const statusEl = stlCanvas.querySelector('.model-loading-status');
                                
                                loader.load(
                                    modelPath,
                                    (geometry) => {
                                        const material = new THREE.MeshStandardMaterial({
                                            color: 0x35383d,
                                            metalness: 0.3,
                                            roughness: 0.7,
                                        });
                                        const mesh = new THREE.Mesh(geometry, material);

                                        geometry.computeBoundingBox();
                                        const box = geometry.boundingBox;
                                        const center = box.getCenter(new THREE.Vector3());
                                        const size = box.getSize(new THREE.Vector3());
                                        const maxDim = Math.max(size.x, size.y, size.z);
                                        const scale = 150 / maxDim;

                                        mesh.position.sub(center.multiplyScalar(scale));
                                        mesh.scale.set(scale, scale, scale);

                                        scene.add(mesh);
                                        if (statusEl) {
                                            statusEl.remove();
                                        }
                                    },
                                    (xhr) => {
                                        if (statusEl) {
                                            const percent = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : Math.round(xhr.loaded);
                                            statusEl.textContent = `Loading 3D model... ${percent}%`;
                                        }
                                    },
                                    (error) => {
                                        console.error('Error loading STL model:', error);
                                        if (statusEl) {
                                            statusEl.textContent = 'Error: Could not load 3D model.';
                                        }
                                    }
                                );

                                function animate() {
                                    requestAnimationFrame(animate);
                                    controls.update();
                                    renderer.render(scene, camera);
                                }
                                animate();

                                window.addEventListener('resize', () => {
                                    camera.aspect = stlCanvas.clientWidth / stlCanvas.clientHeight;
                                    camera.updateProjectionMatrix();
                                    renderer.setSize(stlCanvas.clientWidth, stlCanvas.clientHeight);
                                });
                            })
                            .catch((error) => {
                                console.error('3D viewer initialization failed:', error);
                                const statusEl = stlCanvas.querySelector('.model-loading-status');
                                if (statusEl) {
                                    statusEl.textContent = 'Error: Could not initialize 3D viewer.';
                                }
                            });
                    } else {
                        console.warn('ensureThreeBundle function not available');
                    }
                }
            }
        });


