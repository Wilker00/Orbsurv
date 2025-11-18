// Reveal on scroll
    const io = new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}})},{threshold:0.12});
    document.querySelectorAll('.animate-on-scroll').forEach(el=>io.observe(el));

    // Theme toggle (preserve preference)
    const toggle=document.getElementById('theme-toggle');
    const applyTheme=(dark)=>document.body.classList.toggle('dark-mode',dark);
    const saved=localStorage.getItem('orbsurv-theme');
    const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved? saved==='dark': prefersDark);
    if(toggle){toggle.checked=document.body.classList.contains('dark-mode');
      toggle.addEventListener('change',()=>{const next=toggle.checked;applyTheme(next);localStorage.setItem('orbsurv-theme',next?'dark':'light');});}

    // Mock request actions (replace with real endpoints later)
    function mockAction(message){
      const toast = document.getElementById('toast');
      toast.style.display='block';
      toast.innerHTML = `<strong>Request received.</strong><br><span style="color:var(--mute)">${message}</span>`;
      toast.classList.add('is-visible');
      window.scrollTo({ top: toast.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    }


