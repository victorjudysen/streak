(() => {
  'use strict';

  const STORAGE_KEYS = {
    habits: 'streak.v1.habits',
    completions: 'streak.v1.completions',
  };

  const SEED_HABITS = [
    { id: 'morning-prayers', name: 'Morning prayers', category: 'Faith' },
    { id: 'kreative-karakana', name: 'Kreative Karakana', category: 'Work & building' },
    { id: 'open-source-work', name: 'Open-source work', category: 'Work & building' },
    { id: 'no-soda', name: 'No soda', category: 'Health' },
    { id: 'push-ups', name: '15 M · Push-ups', category: 'Health' },
  ];

  const elements = {
    todayLabel: document.querySelector('#today-label'),
    score: document.querySelector('#score-number'),
    scoreTrack: document.querySelector('#score-track'),
    scorePercent: document.querySelector('#score-percent'),
    dailyScore: document.querySelector('#daily-score'),
    habitList: document.querySelector('#habit-list'),
    emptyState: document.querySelector('#empty-state'),
    showAddForm: document.querySelector('#show-add-form'),
    emptyAdd: document.querySelector('#empty-add'),
    formWrap: document.querySelector('#habit-form-wrap'),
    form: document.querySelector('#habit-form'),
    cancelAdd: document.querySelector('#cancel-add'),
    nameInput: document.querySelector('#habit-name'),
    categoryInput: document.querySelector('#habit-category'),
    nameError: document.querySelector('#name-error'),
    categoryError: document.querySelector('#category-error'),
    saveStatus: document.querySelector('#save-status'),
    mapYear: document.querySelector('#map-year'),
    annualTotal: document.querySelector('#annual-total'),
    bestStreak: document.querySelector('#best-streak'),
    heatmap: document.querySelector('#heatmap'),
    monthLabels: document.querySelector('#month-labels'),
    todayMapSummary: document.querySelector('#today-map-summary'),
  };

  const today = new Date();
  const todayKey = toDateKey(today);
  const currentYear = today.getFullYear();
  let habits = loadHabits();
  let completions = loadCompletions();

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function safeParse(value, fallback) {
    try {
      return value === null ? fallback : JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function loadHabits() {
    const stored = localStorage.getItem(STORAGE_KEYS.habits);
    if (stored === null) {
      const seeded = SEED_HABITS.map((habit) => ({ ...habit, createdAt: new Date().toISOString() }));
      localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(seeded));
      return seeded;
    }

    const parsed = safeParse(stored, []);
    return Array.isArray(parsed) ? parsed.filter(isValidHabit) : [];
  }

  function isValidHabit(habit) {
    return habit
      && typeof habit.id === 'string'
      && typeof habit.name === 'string'
      && typeof habit.category === 'string';
  }

  function loadCompletions() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.completions), {});
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};

    return Object.fromEntries(Object.entries(parsed).filter(([, ids]) => Array.isArray(ids)));
  }

  function persistHabits() {
    localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(habits));
  }

  function persistCompletions() {
    localStorage.setItem(STORAGE_KEYS.completions, JSON.stringify(completions));
  }

  function completedIds(dateKey) {
    return new Set(completions[dateKey] || []);
  }

  function completionCount(dateKey) {
    return new Set(completions[dateKey] || []).size;
  }

  function toggleCompletion(habitId) {
    const completed = completedIds(todayKey);
    let message;

    if (completed.has(habitId)) {
      completed.delete(habitId);
      message = 'Commitment reopened. Saved in this browser.';
    } else {
      completed.add(habitId);
      message = 'Commitment kept. Saved in this browser.';
    }

    if (completed.size) {
      completions[todayKey] = [...completed];
    } else {
      delete completions[todayKey];
    }

    persistCompletions();
    render();
    announce(message);
  }

  function makeHabitId(name) {
    const slug = name.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32) || 'habit';
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return `${slug}-${suffix}`;
  }

  function addHabit(name, category) {
    habits.push({
      id: makeHabitId(name),
      name: name.trim(),
      category: category.trim(),
      createdAt: new Date().toISOString(),
    });
    persistHabits();
    render();
    closeForm();
    announce(`${name.trim()} added. Saved in this browser.`);
  }

  function render() {
    renderHabits();
    renderScore();
    renderHeatmap();
  }

  function renderHabits() {
    const completed = completedIds(todayKey);
    elements.habitList.replaceChildren();

    habits.forEach((habit) => {
      const isComplete = completed.has(habit.id);
      const item = document.createElement('li');
      const button = document.createElement('button');
      const tick = document.createElement('span');
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      const category = document.createElement('small');
      const time = document.createElement('time');

      button.className = `habit-check${isComplete ? ' is-complete' : ''}`;
      button.type = 'button';
      button.setAttribute('aria-pressed', String(isComplete));
      button.setAttribute('aria-label', `${habit.name}, ${habit.category}. ${isComplete ? 'Completed today' : 'Not completed today'}`);
      button.addEventListener('click', () => toggleCompletion(habit.id));

      tick.className = 'tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = isComplete ? '✓' : '';
      name.textContent = habit.name;
      category.textContent = habit.category;
      copy.append(name, category);
      time.textContent = isComplete ? 'Done' : '—';
      button.append(tick, copy, time);
      item.append(button);
      elements.habitList.append(item);
    });

    const hasHabits = habits.length > 0;
    elements.habitList.hidden = !hasHabits;
    elements.emptyState.hidden = hasHabits;
  }

  function renderScore() {
    const complete = completionCount(todayKey);
    const total = habits.length;
    const percentage = total ? Math.round((complete / total) * 100) : 0;

    elements.score.replaceChildren(document.createTextNode(String(complete)));
    const totalLabel = document.createElement('span');
    totalLabel.textContent = `/${total}`;
    elements.score.append(totalLabel);
    elements.scoreTrack.style.width = `${Math.min(percentage, 100)}%`;
    elements.scorePercent.textContent = `${percentage}%`;
    elements.dailyScore.setAttribute('aria-label', `Today’s progress: ${complete} of ${total} habits complete, ${percentage} percent`);
    elements.todayMapSummary.textContent = `Today: ${complete} ${complete === 1 ? 'commitment' : 'commitments'}`;
  }

  function intensityLevel(count) {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }

  function renderMonthLabels() {
    elements.monthLabels.replaceChildren();
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
    for (let month = 0; month < 12; month += 1) {
      const label = document.createElement('span');
      label.textContent = formatter.format(new Date(currentYear, month, 1));
      elements.monthLabels.append(label);
    }
  }

  function renderHeatmap() {
    elements.heatmap.replaceChildren();
    const firstDay = new Date(currentYear, 0, 1);
    const lastDay = new Date(currentYear, 11, 31);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInYear = Math.round((new Date(currentYear + 1, 0, 1) - firstDay) / 86400000);
    const weekColumns = Math.ceil((mondayOffset + daysInYear) / 7);
    let annualTotal = 0;

    elements.heatmap.style.gridTemplateColumns = `repeat(${weekColumns}, 11px)`;

    for (let cursor = new Date(firstDay), index = 0; cursor <= lastDay; cursor.setDate(cursor.getDate() + 1), index += 1) {
      const date = new Date(cursor);
      const dateKey = toDateKey(date);
      const count = completionCount(dateKey);
      const cellIndex = mondayOffset + index;
      const square = document.createElement('button');
      const readableDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date);

      annualTotal += count;
      square.className = `day${dateKey === todayKey ? ' is-today' : ''}`;
      square.type = 'button';
      square.dataset.level = String(intensityLevel(count));
      square.style.gridColumn = String(Math.floor(cellIndex / 7) + 1);
      square.style.gridRow = String((cellIndex % 7) + 1);
      square.setAttribute('aria-label', `${readableDate}: ${count} ${count === 1 ? 'commitment' : 'commitments'} completed`);
      square.title = square.getAttribute('aria-label');
      square.tabIndex = count > 0 || dateKey === todayKey ? 0 : -1;
      square.addEventListener('click', () => announce(square.getAttribute('aria-label')));
      elements.heatmap.append(square);
    }

    elements.annualTotal.textContent = String(annualTotal);
    elements.bestStreak.textContent = String(calculateBestStreak());
  }

  function calculateBestStreak() {
    let best = 0;
    let current = 0;

    for (let cursor = new Date(currentYear, 0, 1); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
      if (completionCount(toDateKey(cursor)) > 0) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    return best;
  }

  function clearErrors() {
    elements.nameError.textContent = '';
    elements.categoryError.textContent = '';
    elements.nameInput.removeAttribute('aria-invalid');
    elements.categoryInput.removeAttribute('aria-invalid');
  }

  function validateForm(name, category) {
    clearErrors();
    let firstInvalid = null;

    if (!name.trim()) {
      elements.nameError.textContent = 'Enter a habit name.';
      elements.nameInput.setAttribute('aria-invalid', 'true');
      firstInvalid = elements.nameInput;
    } else if (habits.some((habit) => habit.name.toLowerCase() === name.trim().toLowerCase())) {
      elements.nameError.textContent = 'That habit is already in your daily ledger.';
      elements.nameInput.setAttribute('aria-invalid', 'true');
      firstInvalid = elements.nameInput;
    }

    if (!category.trim()) {
      elements.categoryError.textContent = 'Enter a category.';
      elements.categoryInput.setAttribute('aria-invalid', 'true');
      firstInvalid ||= elements.categoryInput;
    }

    firstInvalid?.focus();
    return !firstInvalid;
  }

  function openForm() {
    elements.formWrap.hidden = false;
    elements.showAddForm.setAttribute('aria-expanded', 'true');
    clearErrors();
    elements.nameInput.focus();
  }

  function closeForm() {
    elements.form.reset();
    clearErrors();
    elements.formWrap.hidden = true;
    elements.showAddForm.setAttribute('aria-expanded', 'false');
    elements.showAddForm.focus();
  }

  function announce(message) {
    elements.saveStatus.textContent = '';
    requestAnimationFrame(() => {
      elements.saveStatus.textContent = message;
    });
  }

  elements.showAddForm.addEventListener('click', () => {
    if (elements.formWrap.hidden) openForm();
    else closeForm();
  });
  elements.emptyAdd.addEventListener('click', openForm);
  elements.cancelAdd.addEventListener('click', closeForm);
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(elements.form);
    const name = String(formData.get('name') || '');
    const category = String(formData.get('category') || '');
    if (validateForm(name, category)) addHabit(name, category);
  });

  elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today);
  elements.mapYear.textContent = String(currentYear);
  renderMonthLabels();
  render();
})();
