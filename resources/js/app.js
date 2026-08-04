const dashboard = document.querySelector('[data-dashboard]');

if (dashboard) {
    const habitButtons = [...dashboard.querySelectorAll('[data-habit-check]')];
    const score = dashboard.querySelector('[data-score]');
    const scoreTrack = dashboard.querySelector('[data-score-track]');
    const todayCell = dashboard.querySelector('.day-cell.is-today');
    const saveStatus = dashboard.querySelector('[data-save-status]');
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const syncSnapshot = (snapshot) => {
        const percentage = snapshot.habit_count ? Math.round((snapshot.completed_count / snapshot.habit_count) * 100) : 0;

        score.textContent = `${snapshot.completed_count}/${snapshot.habit_count}`;
        scoreTrack.style.width = `${percentage}%`;
        todayCell?.setAttribute('data-level', String(snapshot.today_level));
        dashboard.querySelector('[data-annual-total]').textContent = snapshot.annual_total;
        dashboard.querySelector('[data-best-streak]').textContent = snapshot.best_streak;
        dashboard.querySelector('[data-completion-rate]').textContent = `${snapshot.completion_rate}%`;
        dashboard.querySelector('[data-weekly-score]').textContent = `${snapshot.weekly_completed}/${snapshot.weekly_expected}`;
        dashboard.querySelector('[data-monthly-rate]').textContent = `${snapshot.monthly_rate}%`;

        const monthlyRing = dashboard.querySelector('[data-monthly-ring]');
        monthlyRing.style.setProperty('--progress', snapshot.monthly_rate);
        monthlyRing.setAttribute('aria-label', `${snapshot.monthly_rate} percent completion rate`);

        dashboard.querySelector('[data-rhythm-name]').textContent = snapshot.strongest_rhythm.name;
        dashboard.querySelector('[data-rhythm-description]').textContent = snapshot.strongest_rhythm.description;
        dashboard.querySelector('[data-attention-name]').textContent = snapshot.attention?.name || 'No active habits';
        dashboard.querySelector('[data-attention-summary]').textContent = snapshot.attention
            ? `${snapshot.attention.completed} of ${snapshot.attention.expected} planned days completed.`
            : 'Add an active habit to begin.';
    };

    habitButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const complete = button.getAttribute('aria-pressed') !== 'true';
            button.disabled = true;
            saveStatus.textContent = 'Saving…';

            try {
                const response = await fetch(button.dataset.completionUrl, {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        date: button.dataset.completionDate,
                        completed: complete,
                    }),
                });
                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(result.message || 'The change could not be saved.');
                }

                button.setAttribute('aria-pressed', String(result.completed));
                button.classList.toggle('is-complete', result.completed);
                button.querySelector('.check-mark').textContent = result.completed ? '✓' : '';
                button.querySelector('.habit-time').textContent = result.completed_at || '—';
                syncSnapshot(result);
                saveStatus.textContent = result.completed ? 'Commitment saved.' : 'Completion undone.';
            } catch (error) {
                saveStatus.textContent = error instanceof Error
                    ? error.message
                    : 'The change could not be saved. Please try again.';
            } finally {
                button.disabled = false;
            }
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
