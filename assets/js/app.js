const habits = document.querySelectorAll('.habit-check');
const score = document.querySelector('.score-number');
const scoreTrack = document.querySelector('.score-track span');

function syncScore() {
  const complete = document.querySelectorAll('.habit-check.is-complete').length;
  score.innerHTML = `${complete}<span>/${habits.length}</span>`;
  scoreTrack.style.width = `${(complete / habits.length) * 100}%`;
  score.parentElement.setAttribute('aria-label', `Today’s progress: ${complete} of ${habits.length} habits complete`);
}

habits.forEach((habit) => habit.addEventListener('click', () => {
  const complete = habit.classList.toggle('is-complete');
  habit.setAttribute('aria-pressed', String(complete));
  habit.querySelector('.tick').textContent = complete ? '✓' : '';
  habit.querySelector('time').textContent = complete ? 'Now' : '—';
  syncScore();
}));

const heatmap = document.querySelector('#heatmap');
const levels = [0, 0, 1, 2, 0, 3, 1, 0, 0, 2, 4, 3, 1, 0, 2, 1, 0, 3, 2, 0, 1, 3, 2, 1, 0, 4, 3, 1];
for (let day = 0; day < 371; day += 1) {
  const level = levels[(day * 7 + Math.floor(day / 13)) % levels.length];
  const square = document.createElement('button');
  square.className = 'day';
  square.type = 'button';
  square.dataset.level = level;
  square.setAttribute('aria-label', `Day ${day + 1}: ${level === 0 ? 'no completed commitments' : `${level} completed commitments`}`);
  square.title = square.getAttribute('aria-label');
  heatmap.append(square);
}
