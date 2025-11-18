// Investor Page Interactive Features

document.addEventListener('DOMContentLoaded', function() {
    // Animated counter for market slide
    function animateCounter(id, target, duration = 2000) {
        const el = document.getElementById(id);
        if (!el) return;
        
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
        }, { threshold: 0.5 });
        
        observer.observe(el);
    }
    
    animateCounter("market-counter", 60000000000);

    // Competitor Card Expansion
    const competitorCards = document.querySelectorAll('.competitor-card');
    competitorCards.forEach(card => {
        const expandBtn = card.querySelector('.competitor-expand-btn');
        const details = card.querySelector('.competitor-details');
        
        if (expandBtn && details) {
            expandBtn.addEventListener('click', function() {
                const isExpanded = expandBtn.getAttribute('aria-expanded') === 'true';
                expandBtn.setAttribute('aria-expanded', !isExpanded);
                
                if (isExpanded) {
                    details.style.display = 'none';
                } else {
                    details.style.display = 'block';
                }
            });
        }
    });

    // Competitor Filter Buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    const competitorCardsAll = document.querySelectorAll('.competitor-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            
            competitorCardsAll.forEach(card => {
                if (filter === 'all') {
                    card.classList.remove('hidden');
                } else {
                    const categories = card.getAttribute('data-category').split(' ');
                    if (categories.includes(filter)) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                }
            });
        });
    });

    // Advantage Card Expansion
    const advantageCards = document.querySelectorAll('.advantage-card');
    advantageCards.forEach(card => {
        const expandBtn = card.querySelector('.advantage-expand-btn');
        const details = card.querySelector('.advantage-details');
        
        if (expandBtn && details) {
            expandBtn.addEventListener('click', function() {
                const isExpanded = expandBtn.getAttribute('aria-expanded') === 'true';
                expandBtn.setAttribute('aria-expanded', !isExpanded);
                
                if (isExpanded) {
                    details.style.display = 'none';
                } else {
                    details.style.display = 'block';
                }
            });
        }
    });

    // Scroll animations for sections
    const sections = document.querySelectorAll('.section');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Animate market share bars on scroll
    function animateMarketShareBars() {
        const marketShareBars = document.querySelectorAll('.market-share-fill');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const width = bar.style.width;
                    bar.style.width = '0%';
                    setTimeout(() => {
                        bar.style.width = width;
                    }, 100);
                    observer.unobserve(bar);
                }
            });
        }, { threshold: 0.5 });

        marketShareBars.forEach(bar => observer.observe(bar));
    }

    animateMarketShareBars();

    // Animate revenue numbers
    function animateRevenueNumbers() {
        const revenueCells = document.querySelectorAll('.revenue-cell');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const cell = entry.target;
                    const text = cell.textContent;
                    const number = parseFloat(text.replace(/[^0-9.]/g, ''));
                    const unit = text.includes('B') ? 'B' : text.includes('M') ? 'M' : '';
                    
                    if (!isNaN(number)) {
                        let current = 0;
                        const increment = number / 30;
                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= number) {
                                current = number;
                                clearInterval(timer);
                            }
                            cell.textContent = '$' + current.toFixed(unit === 'B' ? 1 : 0) + unit;
                        }, 30);
                    }
                    observer.unobserve(cell);
                }
            });
        }, { threshold: 0.5 });

        revenueCells.forEach(cell => observer.observe(cell));
    }

    animateRevenueNumbers();
});



