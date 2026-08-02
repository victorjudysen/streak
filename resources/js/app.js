const dashboard = document.querySelector('[data-dashboard]');

if (dashboard) {
    const habitButtons = [...dashboard.querySelectorAll('[data-habit-check]')];
    const score = dashboard.querySelector('[data-score]');
    const scoreTrack = dashboard.querySelector('[data-score-track]');
    const todayCell = dashboard.querySelector('.day-cell.is-today');

    const syncDemoScore = () => {
        const completed = habitButtons.filter((button) => button.getAttribute('aria-pressed') === 'true').length;
        const percentage = habitButtons.length ? Math.round((completed / habitButtons.length) * 100) : 0;

        score.textContent = `${completed}/${habitButtons.length}`;
        scoreTrack.style.width = `${percentage}%`;
        todayCell?.setAttribute('data-level', String(Math.min(completed, 4)));
    };

    habitButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const complete = button.getAttribute('aria-pressed') !== 'true';
            button.setAttribute('aria-pressed', String(complete));
            button.classList.toggle('is-complete', complete);
            button.querySelector('.check-mark').textContent = complete ? '✓' : '';
            button.querySelector('.habit-time').textContent = complete ? 'Now' : '—';
            syncDemoScore();
        });
    });

    const tabs = [...dashboard.querySelectorAll('[data-dashboard-tab]')];
    const panels = [...dashboard.querySelectorAll('[data-dashboard-panel]')];

    const selectMobilePanel = (name) => {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.dashboardTab === name;
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });
        panels.forEach((panel) => panel.classList.toggle('is-mobile-active', panel.dataset.dashboardPanel === name));
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => selectMobilePanel(tab.dataset.dashboardTab)));
    tabs.forEach((tab, index) => tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const nextTab = tabs[(index + direction + tabs.length) % tabs.length];
        selectMobilePanel(nextTab.dataset.dashboardTab);
        nextTab.focus();
    }));
    selectMobilePanel('today');
}
