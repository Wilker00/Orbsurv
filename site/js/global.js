﻿import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // --- 1. Mobile Navigation Toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navRight = document.querySelector('.nav-right');
  if (navToggle && navRight) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navRight.classList.toggle('active');
    });
  }

  // --- 2. Theme (Dark/Light Mode) Switcher ---
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  function applyTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (themeToggle) themeToggle.checked = isDark;
  }

  if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
      applyTheme(e.target.checked);
    });
  }
  
  // Apply initial theme based on system preference
  applyTheme(prefersDark.matches);
  prefersDark.addEventListener('change', (e) => applyTheme(e.matches));

  // --- 3. Animate on Scroll ---
  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
  });

  // --- 4. Hybrid Storage View Toggle ---
  const viewToggle = document.querySelector('.view-toggle');
  if (viewToggle) {
    const customerOnlyCard = document.querySelector('.mini-card.customer-only');
    const itOnlyCard = document.querySelector('.mini-card.it-only');

    viewToggle.addEventListener('click', (e) => {
      if (!e.target.matches('button')) return;

      const view = e.target.dataset.view;
      
      // Update buttons
      viewToggle.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-selected', 'false');
      });
      e.target.classList.add('is-active');
      e.target.setAttribute('aria-selected', 'true');

      // Toggle cards
      if (customerOnlyCard && itOnlyCard) {
        const isITView = view === 'it';
        customerOnlyCard.classList.toggle('hidden', isITView);
        itOnlyCard.classList.toggle('hidden', !isITView);
      }
    });
  }

  // --- 5. Waitlist Form Submission ---
  const waitlistForm = document.getElementById('waitlist-form');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const emailInput = form.querySelector('#email');
      const submitButton = form.querySelector('button[type="submit"]');
      const messageTarget = document.getElementById(form.dataset.messageTarget);
      
      if (!messageTarget || !submitButton) return;

      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Requesting...';
      messageTarget.className = 'form-message'; // Reset classes

      try {
        const apiBase = window.ORBSURV_API_BASE || 'http://127.0.0.1:8000';
        const response = await fetch(`${apiBase}${form.dataset.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `HTTP error! Status: ${response.status}`);
        }

        // Success
        messageTarget.textContent = form.dataset.successMessage || 'Success!';
        messageTarget.classList.add('success', 'show');
        emailInput.value = '';
        submitButton.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
        // Keep it disabled on success to prevent re-submission

      } catch (error) {
        // Error
        console.error('Form submission error:', error);
        messageTarget.textContent = error.message || 'Something went wrong. Please try again.';
        messageTarget.classList.add('error', 'show');
        submitButton.innerHTML = '<i class="fa-solid fa-envelope-open-text"></i> Request invite';
        submitButton.disabled = false;
      } finally {
        setTimeout(() => {
            messageTarget.classList.remove('show');
        }, 5000);
      }
    });
  }

  // --- 6. Footer Year ---
  const yearSpan = document.querySelector('[data-year]');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // --- 7. 3D Model (STL) Viewer ---
  const stlSlide = document.querySelector('.stl-slide');
  if (stlSlide) {
    const canvas = stlSlide.querySelector('.stl-canvas');
    const modelPath = stlSlide.dataset.stl;
 
    if (canvas && modelPath) {
       // 1. Scene Setup
       const scene = new THREE.Scene();
       scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim());
 
       const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
       camera.position.z = 150;
 
       const renderer = new THREE.WebGLRenderer({ antialias: true });
       renderer.setSize(canvas.clientWidth, canvas.clientHeight);
       renderer.setPixelRatio(window.devicePixelRatio);
       canvas.appendChild(renderer.domElement);
 
       // 2. Lighting
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
       scene.add(ambientLight);
       const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
       directionalLight.position.set(50, 50, 100);
       scene.add(directionalLight);
 
       // 3. Controls
       const controls = new OrbitControls(camera, renderer.domElement);
       controls.enableDamping = true;
       controls.dampingFactor = 0.05;
       controls.autoRotate = true;
       controls.autoRotateSpeed = 1.0;
 
       // 4. Model Loading
       const loader = new STLLoader();
       loader.load(
         modelPath,
         function (geometry) {
           const material = new THREE.MeshStandardMaterial({
             color: 0xaaaaaa,
             metalness: 0.25,
             roughness: 0.75,
           });
           const mesh = new THREE.Mesh(geometry, material);
 
           // Center and scale the model
           geometry.computeBoundingBox();
           const box = geometry.boundingBox;
           const center = box.getCenter(new THREE.Vector3());
           const size = box.getSize(new THREE.Vector3());
           const maxDim = Math.max(size.x, size.y, size.z);
           const scale = 100 / maxDim;
 
           mesh.position.sub(center.multiplyScalar(scale));
           mesh.scale.set(scale, scale, scale);
           
           scene.add(mesh);
         },
         (xhr) => { // Progress callback
           canvas.innerHTML = `<p>Loading 3D model... ${Math.round(xhr.loaded / xhr.total * 100)}%</p>`;
         },
         (error) => { // Error callback
           console.error('An error happened while loading the STL model:', error);
           canvas.innerHTML = `<p>Error: Could not load 3D model.</p>`;
         }
       );
 
       // 5. Animation Loop
       function animate() {
         requestAnimationFrame(animate);
         controls.update(); // Required for damping and auto-rotation
         renderer.render(scene, camera);
       }
       animate();
 
       // 6. Responsive Resizing
       window.addEventListener('resize', () => {
         camera.aspect = canvas.clientWidth / canvas.clientHeight;
         camera.updateProjectionMatrix();
         renderer.setSize(canvas.clientWidth, canvas.clientHeight);
       });
    }
  }
});