document.addEventListener('DOMContentLoaded', () => {
    const variantPills = document.querySelectorAll('.variant-pill');
    const LIGHTBOX_OVERLAY = document.getElementById('lightbox-overlay');
    const LIGHTBOX_CONTENT = document.getElementById('lightbox-content');
    const LIGHTBOX_CLOSE = document.getElementById('lightbox-close');

    // --- 1. Color Variant Switcher Logic ---
    function switchVariant(variant) {
        // This function can be expanded to change images or other content
        // For now, it just handles the button state.
        variantPills.forEach(pill => {
            const isSelected = pill.dataset.variant === variant;
            pill.setAttribute('aria-checked', isSelected);
            pill.tabIndex = isSelected ? 0 : -1;
        });
    }

    let initialVariant = document.querySelector('.variant-pill[aria-checked="true"]');
    if (initialVariant) {
        switchVariant(initialVariant.dataset.variant);
    }

    variantPills.forEach((pill, index) => {
        pill.addEventListener('click', (e) => switchVariant(e.target.dataset.variant));
        pill.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchVariant(e.target.dataset.variant);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const len = variantPills.length;
                let nextIndex = (e.key === 'ArrowRight') ? (index + 1) % len : (index - 1 + len) % len;
                const nextPill = variantPills[nextIndex];
                switchVariant(nextPill.dataset.variant);
                nextPill.focus();
            }
        });
    });

    // --- 2. Media Gallery Lightbox ---
    document.querySelectorAll('.media-tile').forEach(tile => {
        tile.addEventListener('click', () => openLightbox(tile));
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
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        LIGHTBOX_OVERLAY.style.display = 'none';
        document.body.style.overflow = '';
        const videoElement = LIGHTBOX_CONTENT.querySelector('video');
        if (videoElement) {
            videoElement.pause();
            videoElement.currentTime = 0;
        }
        LIGHTBOX_CONTENT.innerHTML = '';
    }

    LIGHTBOX_CLOSE.addEventListener('click', closeLightbox);
    LIGHTBOX_OVERLAY.addEventListener('click', (e) => {
        if (e.target === LIGHTBOX_OVERLAY) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && LIGHTBOX_OVERLAY.style.display === 'flex') closeLightbox();
    });

    // --- 3. Waitlist Form Submission (using shared logic from global.js if available) ---
    // This assumes a similar form handler might be in global.js, or you can use this standalone.
    const waitlistForm = document.getElementById('waitlist-form');
    if (waitlistForm && !window.waitlistFormHandled) { // Check for a flag to avoid double-binding
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
                const apiBase = window.ORBSURV_API_BASE || 'http://127.0.0.1:8000';
                const response = await fetch(`${apiBase}/api/waitlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailInput.value }),
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || `HTTP error! Status: ${response.status}`);

                messageTarget.textContent = form.dataset.successMessage || 'Success!';
                messageTarget.style.color = 'var(--accent-color)';
                submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Confirmed';
                emailInput.value = '';

            } catch (error) {
                console.error('Form submission error:', error);
                messageTarget.textContent = error.message;
                messageTarget.style.color = '#dc3545';
                submitButton.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Request invite';
                submitButton.disabled = false;
            } finally {
                setTimeout(() => { messageTarget.textContent = ''; }, 5000);
            }
        });
        window.waitlistFormHandled = true;
    }

    // --- 4. STL Viewer Setup ---
    function setupSTLViewer() {
        const viewerShell = document.querySelector('[data-role="stl-viewer"]');
        if (!viewerShell) return;

        const canvasContainer = document.getElementById('stl-canvas');
        const statusDiv = document.getElementById('stl-status');
        const fallbackImage = document.getElementById('stlFallback');
        const fallbackMessage = document.getElementById('stlFallbackMessage');
        const modelPath = viewerShell.dataset.src;

        const showFallback = (message) => {
            if (statusDiv) statusDiv.classList.add('is-hidden');
            if (canvasContainer) canvasContainer.classList.add('is-hidden');
            if (fallbackImage) fallbackImage.classList.remove('is-hidden');
            if (fallbackMessage) {
                fallbackMessage.textContent = message;
                fallbackMessage.classList.remove('is-hidden');
            }
        };

        if (!modelPath) {
            showFallback('3D model path not specified.');
            return;
        }

        if (typeof THREE === 'undefined' || typeof THREE.STLLoader === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
            showFallback('3D viewer libraries are not available.');
            console.error("THREE.js or its addons (STLLoader, OrbitControls) are not loaded. Make sure they are included before this script.");
            return;
        }

        if (statusDiv) statusDiv.textContent = 'Initializing 3D viewer...';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(getComputedStyle(document.body).getPropertyValue('--card-bg').trim());

        const camera = new THREE.PerspectiveCamera(35, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        canvasContainer.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.enablePan = false;
        controls.minDistance = 50;
        controls.maxDistance = 250;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 20, 15);
        scene.add(directionalLight);

        const loader = new THREE.STLLoader();
        loader.load(modelPath, (geometry) => {
            geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            geometry.boundingBox.getCenter(center);
            geometry.translate(-center.x, -center.y, -center.z);

            const size = geometry.boundingBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 120 / maxDim;

            camera.position.z = maxDim * 3;
            controls.target.copy(center);

            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(getComputedStyle(document.body).getPropertyValue('--accent-color').trim()),
                specular: 0x222222,
                shininess: 100
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(scale, scale, scale);
            scene.add(mesh);
            window.stlMesh = mesh; // Expose for theme changes

            if (statusDiv) statusDiv.classList.add('is-hidden');

        }, undefined, (error) => {
            console.error('STL loading error:', error);
            showFallback('Could not load 3D model.');
        });

        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        });
    }

    // Lazy-load the STL viewer
    const stlObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setupSTLViewer();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const stlViewerElement = document.querySelector('[data-role="stl-viewer"]');
    if (stlViewerElement) {
        stlObserver.observe(stlViewerElement);
    }
});