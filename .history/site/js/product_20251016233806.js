// --- 1. Fix: THREE.js CDN Dependencies (Must be global, sequential, non-module) ---
const cdnUrls = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js'
];

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(); 
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

async function loadAllDependencies(statusDiv) {
    if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined' && typeof THREE.STLLoader !== 'undefined') {
        return Promise.resolve();
    }

    try {
        for (const url of cdnUrls) {
            statusDiv.textContent = `Loading 3D library: ${url.split('/').pop()}...`;
            await loadScript(url);
        }
        
        if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined' || typeof THREE.STLLoader === 'undefined') {
            throw new Error("THREE.js components failed to initialize after loading.");
        }
        
        statusDiv.textContent = 'Dependencies loaded. Initializing viewer...';
        return Promise.resolve();

    } catch (error) {
        statusDiv.textContent = `Error loading 3D viewer: ${error.message}.`;
        return Promise.reject(error);
    }
}

// --- 2. Application Logic ---

function initProduct() {
    const themeToggle = document.getElementById('theme-toggle');
    const heroVideo = document.getElementById('hero-video');
    const heroVideoSource = document.getElementById('hero-video-source');
    const variantPills = document.querySelectorAll('.variant-pill');
    const LIGHTBOX_OVERLAY = document.getElementById('lightbox-overlay');
    const LIGHTBOX_CONTENT = document.getElementById('lightbox-content');
    const LIGHTBOX_CLOSE = document.getElementById('lightbox-close');
    const yearSpan = document.querySelector('[data-year]');

    if (yearSpan) { yearSpan.textContent = new Date().getFullYear(); }

    // Variant Data (kept local)
    const variantData = {
        white: { video: 'placeholders/variant-white.mp4', poster: 'placeholders/variant-white.jpg' },
        black: { video: 'placeholders/variant-black.mp4', poster: 'placeholders/variant-black.jpg' },
        darkgray: { video: 'placeholders/variant-darkgray.mp4', poster: 'placeholders/variant-darkgray.jpg' }
    };
    // Preload posters (simple)
    Object.keys(variantData).forEach(key => { new Image().src = variantData[key].poster; });

    // --- 2.2 Theme (Dark/Light Mode) Switcher ---
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('orbsurv-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('orbsurv-theme', 'light');
        }
        if (themeToggle) themeToggle.checked = isDark;
        
        // Update STL model color on theme change
        if (typeof THREE !== 'undefined' && window.mesh) {
            updateSTLColor();
        }
    }

    function updateSTLColor() {
        // Get the computed accent color
        const accentColorCSS = getComputedStyle(document.body).getPropertyValue('--accent-color').trim();
        const threeColor = new THREE.Color();
        
        try {
            threeColor.set(accentColorCSS);
        } catch (e) {
            // Fallback in case CSS variable is a complex gradient or invalid color for THREE.js
            threeColor.set(document.body.classList.contains('dark-mode') ? 0xffffff : 0x0d6efd);
        }
        window.mesh.material.color.set(threeColor);
    }

    const savedTheme = localStorage.getItem('orbsurv-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    if (savedTheme === 'dark') {
        applyTheme(true);
    } else if (savedTheme === 'light') {
        applyTheme(false);
    } else {
        applyTheme(prefersDark.matches);
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            applyTheme(e.target.checked);
        });
    }

    // --- 2.3 Animate on Scroll (IntersectionObserver) ---
    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.style.getPropertyValue('--delay') || '0', 10);
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });

    // --- 2.4 Color Variant Switcher Logic ---
    function switchVariant(variant) {
        const data = variantData[variant];
        
        if (heroVideo && heroVideoSource && data) {
            heroVideo.setAttribute('poster', data.poster);
            heroVideoSource.setAttribute('src', data.video);
            heroVideo.load();
            heroVideo.play();
        }

        variantPills.forEach(pill => {
            const isSelected = pill.dataset.variant === variant;
            pill.setAttribute('aria-checked', isSelected);
            if (isSelected) {
                pill.tabIndex = 0; // Make selected element focusable
            } else {
                pill.tabIndex = -1; // Make unselected elements unfocusable
            }
        });
    }
    
    // Set initial variant state and tab index
    let initialVariant = document.querySelector('.variant-pill[aria-checked="true"]');
    if (initialVariant) {
        switchVariant(initialVariant.dataset.variant);
    }

    variantPills.forEach((pill, index) => {
        pill.addEventListener('click', (e) => switchVariant(e.target.dataset.variant));
        
        // Keyboard navigation for radiogroup
        pill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchVariant(e.target.dataset.variant);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const len = variantPills.length;
                let nextIndex = index;

                if (e.key === 'ArrowRight') {
                    nextIndex = (index + 1) % len;
                } else if (e.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + len) % len;
                }

                const nextPill = variantPills[nextIndex];
                switchVariant(nextPill.dataset.variant);
                nextPill.focus();
            }
        });
    });


    // --- 2.5 Improved Media Gallery Lightbox ---
    document.querySelectorAll('.media-tile').forEach(tile => {
        // Click handler
        tile.addEventListener('click', () => openLightbox(tile));
        
        // Keyboard handler (Enter/Space)
        tile.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(tile);
            }
        });
    });

    function openLightbox(tile) {
        const type = tile.dataset.mediaType;
        const src = (type === 'video') ? tile.querySelector('source').getAttribute('src') : tile.dataset.mediaSrc;
        
        LIGHTBOX_CONTENT.innerHTML = ''; 

        if (type === 'image') {
            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Media Gallery Image';
            LIGHTBOX_CONTENT.appendChild(img);
        } else if (type === 'video') {
            const video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            video.loop = true;
            video.muted = false;
            video.playsInline = true;
            LIGHTBOX_CONTENT.appendChild(video);
        }

        LIGHTBOX_OVERLAY.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    // Lightbox closing logic
    function closeLightbox() {
        LIGHTBOX_OVERLAY.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
        
        const videoElement = LIGHTBOX_CONTENT.querySelector('video');
        if (videoElement) {
            videoElement.pause();
            videoElement.currentTime = 0;
        }
        LIGHTBOX_CONTENT.innerHTML = ''; // Clear content
    }

    LIGHTBOX_CLOSE.addEventListener('click', closeLightbox);
    
    // Close lightbox when clicking on overlay (outside content)
    LIGHTBOX_OVERLAY.addEventListener('click', (e) => {
        if (e.target === LIGHTBOX_OVERLAY) {
            closeLightbox();
        }
    });
    
    // Close lightbox with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && LIGHTBOX_OVERLAY.style.display === 'flex') {
            closeLightbox();
        }
    });

    // --- 2.6 Waitlist Form Submission ---
    const waitlistForm = document.getElementById('waitlist-form');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const emailInput = form.querySelector('#email');
            const submitButton = form.querySelector('button[type="submit"]');
            const messageTarget = document.getElementById(form.dataset.messageTarget);
            
            if (!messageTarget || !submitButton || !emailInput.value) return;

            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting...';
            messageTarget.className = 'form-status';
            messageTarget.style.color = 'var(--ink)';

            try {
                // --- MOCKED API CALL STRUCTURE ---
                
                // Simulate network call
                const response = await new Promise(resolve => {
                    setTimeout(() => {
                        // 90% chance of success
                        if (Math.random() > 0.1) {
                            resolve({ ok: true, status: 200, json: () => ({ status: 'success' }) });
                        } else {
                            resolve({ ok: false, status: 500, json: () => ({ error: 'Server temporarily unavailable.' }) });
                        }
                    }, 1500); // 1.5s delay
                });

                // Simulate real fetch handling
                if (!response.ok) {
                    const errorBody = await response.json();
                    throw new Error(errorBody.error || `HTTP error! Status: ${response.status}`);
                }

                // Success
                messageTarget.textContent = form.dataset.successMessage || 'Success! Your request has been logged.';
                messageTarget.style.color = '#28a745'; // Green
                submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Confirmed';
                submitButton.disabled = true; 
                emailInput.value = ''; // Clear input on success

            } catch (error) {
                // Error
                messageTarget.textContent = error.message;
                messageTarget.style.color = '#dc3545'; // Red
                submitButton.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Request invite';
                submitButton.disabled = false;
            } 
            
            // Clear message after 5 seconds
            setTimeout(() => {
                messageTarget.textContent = '';
            }, 5000);
        });
    }

    // --- 2.7 STL Viewer Setup ---
    function setupSTLViewer() {
        const mediaSection = document.getElementById('media');
        const viewerShell = document.querySelector('[data-role="stl-viewer"]');
        const canvasContainer = document.getElementById('stl-canvas');
        const statusDiv = document.getElementById('stl-status');
        const fallbackImage = document.getElementById('stlFallback');
        const fallbackMessage = document.getElementById('stlFallbackMessage');

        if (!mediaSection || !viewerShell || !canvasContainer) return;

        const modelPath = viewerShell.dataset.src;

        const showFallback = (message) => {
            if (statusDiv) {
                statusDiv.textContent = '';
                statusDiv.classList.add('is-hidden');
            }
            canvasContainer.classList.add('is-hidden');
            if (fallbackImage) {
                fallbackImage.classList.remove('is-hidden');
            }
            if (fallbackMessage) {
                fallbackMessage.textContent = message;
                fallbackMessage.classList.remove('is-hidden');
            }
        };

        const loadViewer = async () => {
            if (viewerShell.dataset.loaded === 'true') return;
            viewerShell.dataset.loaded = 'true';

            if (window.location.protocol === 'file:') {
                showFallback('3D viewer disabled in local file mode. Run through a local server.');
                return;
            }

            if (!modelPath) {
                showFallback('3D model path missing.');
                return;
            }

            canvasContainer.classList.remove('is-hidden');
            if (fallbackImage) fallbackImage.classList.add('is-hidden');
            if (fallbackMessage) fallbackMessage.classList.add('is-hidden');
            if (statusDiv) {
                statusDiv.textContent = 'Loading 3D viewer...';
                statusDiv.classList.remove('is-hidden');
            }

            try {
                await loadAllDependencies(statusDiv || { textContent: '' });
                window.initViewer(canvasContainer, modelPath, statusDiv, fallbackImage, fallbackMessage, showFallback);
            } catch (error) {
                console.error('STL viewer setup failed', error);
                showFallback('We could not load the 3D model right now. Static render displayed.');
            }
        };

        const observer = new IntersectionObserver(([entry], observer) => {
            if (entry.isIntersecting) {
                loadViewer();
                observer.disconnect();
            }
        }, { threshold: 0.4 });

        observer.observe(mediaSection);
    }

    // Global init function exposed to access THREE objects
    window.initViewer = function(canvasContainer, modelPath, statusDiv, fallbackImage, fallbackMessage, onFailure) {
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;

        // 1. Scene Setup
        const scene = new THREE.Scene();
        // Set background color based on theme
        scene.background = new THREE.Color(getComputedStyle(document.body).getPropertyValue('--card-bg').trim());

        // 2. Camera Setup
        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);

        // 3. Renderer Setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        canvasContainer.appendChild(renderer.domElement);

        let isActive = true;

        const fail = (message, error) => {
            if (error) console.error('STL load failed', error);
            isActive = false;
            if (renderer && renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.remove();
            }
            if (renderer && typeof renderer.dispose === 'function') {
                renderer.dispose();
            }
            if (typeof onFailure === 'function') {
                onFailure(message);
                return;
            }
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.classList.remove('is-hidden');
            }
            canvasContainer.classList.add('is-hidden');
            if (fallbackImage) fallbackImage.classList.remove('is-hidden');
            if (fallbackMessage) {
                fallbackMessage.textContent = message;
                fallbackMessage.classList.remove('is-hidden');
            }
        };

        // 4. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5).normalize();
        scene.add(directionalLight);
        
        window.mesh = null; 

        // 5. Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 50;
        controls.maxDistance = 200;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

        // 6. Load STL Model
        const loader = new THREE.STLLoader();
        loader.load(modelPath, function (geometry) {
            
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);
            
            const size = geometry.boundingBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const cameraDistance = maxDim * 2.5;
            
            camera.position.set(cameraDistance, cameraDistance/4, cameraDistance);
            camera.near = cameraDistance / 100;
            camera.far = cameraDistance * 10;
            camera.updateProjectionMatrix();

            // Get mesh color based on current theme's accent color
            const accentColorCSS = getComputedStyle(document.body).getPropertyValue('--accent-color').trim();
            const threeColor = new THREE.Color();
            try { threeColor.set(accentColorCSS); } catch (e) { threeColor.set(0x0d6efd); }
            
            const material = new THREE.MeshPhongMaterial({ 
                color: threeColor, 
                specular: 0x444444, 
                shininess: 200 
            });

            window.mesh = new THREE.Mesh(geometry, material);
            scene.add(window.mesh);
            
            controls.target.copy(window.mesh.position);
            controls.update();

            if (statusDiv) {
                statusDiv.textContent = '';
                statusDiv.classList.add('is-hidden');
            }
            if (fallbackImage) fallbackImage.classList.add('is-hidden');
            if (fallbackMessage) fallbackMessage.classList.add('is-hidden');

        }, (xhr) => {
            // Progress
        }, (error) => {
            fail('We could not load the 3D model right now. Static render displayed.', error);
        });

        // 7. Animation Loop
        function animate() {
            if (!isActive) return;
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // 8. Handle Window Resize
        function onWindowResize() {
            const newWidth = canvasContainer.clientWidth;
            const newHeight = canvasContainer.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
        window.addEventListener('resize', onWindowResize);
    }

    // Start the STL setup when the DOM is ready
    setupSTLViewer(); 
}

async function loadPartials() {
    const hosts = Array.from(document.querySelectorAll('[data-include]'));
    if (!hosts.length) {
        return;
    }

    await Promise.all(hosts.map(async (host) => {
        const path = host.getAttribute('data-include');
        if (!path) {
            return;
        }

        try {
            const response = await fetch(path, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`Failed to load ${path}`);
            }
            host.innerHTML = await response.text();
        } catch (error) {
            console.warn('Partial load failed:', path, error);
        }
    }));
}
document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
    initProduct();
});

