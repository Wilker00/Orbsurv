document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('.product-page');
    if (!page) {
        return;
    }

    // Tabs and keyboard support
    const tabContainer = page.querySelector('[data-tabs]');
    if (tabContainer) {
        const tabs = Array.from(tabContainer.querySelectorAll('[role="tab"]'));
        const panels = Array.from(tabContainer.querySelectorAll('[role="tabpanel"]'));

        function activateTab(targetId) {
            tabs.forEach((tab) => {
                const isActive = tab.dataset.tab === targetId;
                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', String(isActive));
                tab.setAttribute('tabindex', isActive ? '0' : '-1');
            });
            panels.forEach((panel) => {
                const isActive = panel.id === `panel-${targetId}`;
                panel.classList.toggle('is-active', isActive);
                panel.setAttribute('aria-hidden', String(!isActive));
            });
        }

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => activateTab(tab.dataset.tab));
            tab.addEventListener('keydown', (event) => {
                const index = tabs.indexOf(tab);
                if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    const next = tabs[(index + 1) % tabs.length];
                    next.focus();
                    activateTab(next.dataset.tab);
                }
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const prev = tabs[(index - 1 + tabs.length) % tabs.length];
                    prev.focus();
                    activateTab(prev.dataset.tab);
                }
            });
        });
    }

});