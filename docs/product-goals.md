# Streak product goals

This document is the shared memory for what Streak should become. It captures
the durable product vision, the principles that guide decisions, and ideas we
may explore later.

It is intentionally not a release schedule. An idea appearing here does not
mean it has been approved for implementation. Before development, an idea must
be turned into a small, clearly defined piece of work with acceptance criteria.

## Vision

Streak is a private, thoughtful place for keeping track of the promises you
make to yourself.

It should help a person decide what matters, show up consistently, understand
their patterns, and recover without shame when they fall out of rhythm. The
product begins with one person's real goals and habits. Once that daily
experience is useful and trustworthy, Streak can open to other people so each
person can create and follow their own system.

## Product journey

### Phase 1: Personal foundation

Build around Victor's real routines and use the product regularly. Prove that
the core loop is genuinely useful before broadening the audience.

The core loop is:

1. Decide which commitments matter.
2. See what is expected today.
3. Record what was completed.
4. Review patterns over time.
5. Adjust commitments based on what was learned.

### Phase 2: Dependable personal tool

Replace demonstration behavior with persistent data, accurate calculations,
and dependable workflows. The application should be safe enough to hold real
personal history and pleasant enough to use every day.

### Phase 3: Public product

Allow other people to register, create their own habits and goals, and see only
their own data. Introduce public-product concerns such as onboarding, account
recovery, privacy controls, support, abuse prevention, and reliable production
operations.

## Product principles

- **Personal before universal.** Solve a real daily need first; generalize only
  after the workflow has been proven through use.
- **Small, complete increments.** Each change should deliver one understandable
  improvement that can be tested and reviewed on its own.
- **Reflection over pressure.** Encourage consistency and honest learning
  without guilt, punishment, or manipulative engagement mechanics.
- **Truthful data.** Streaks, rates, and insights must be calculated from real
  records and clearly explain what they mean.
- **Closed days stay closed.** A user may record or correct today's activity,
  but once that day ends in their configured time zone, its completion history
  becomes read-only. A missed commitment remains part of the honest record and
  cannot be filled in retrospectively.
- **Private by design.** Personal goals and activity are sensitive. Access,
  storage, exports, and future sharing features must respect that.
- **Quiet, purposeful interface.** The product should feel focused and human,
  with visual decisions serving comprehension rather than decoration.
- **Accessible by default.** Core workflows must work with keyboards, assistive
  technologies, reduced motion, and common screen sizes.
- **Build for ownership.** Prefer maintainable technology, documented choices,
  automated tests, and deployment paths the project can sustainably operate.
- **Prepare for multiple users without premature complexity.** Personal records
  should belong to a user from the beginning, while public registration and
  SaaS infrastructure wait until they are actually needed.

## Near-term outcomes

These outcomes describe direction, not a fixed implementation order:

- Victor can use Streak as the source of truth for his current habits.
- Completing a habit persists across page loads and records when it happened.
- A completed calendar day cannot be edited or backfilled through the website,
  Telegram, or any other user-facing interface.
- Habits can be created, edited, scheduled, paused, and archived without losing
  their history.
- The activity map, completion rate, streaks, and insights use real data.
- Weekly reflection helps identify what worked, what did not, and what should
  change next.
- Personal data is recoverable through backups or export before the application
  becomes the only copy of meaningful history.

## Future idea inbox

Ideas live here without committing the team to build them. Add enough context
to remember the problem behind an idea, not just the proposed feature.

### Goals and habits

- Connect small recurring habits to a larger goal or life area.
- Support flexible schedules, minimum viable versions, and intentional rest
  days.
- Record a short note or reason when a commitment is completed or missed.
- Let habits be paused or archived while preserving their history.
- Provide milestones for goals that have a clear finish line.

### Reflection and insight

- Guided weekly and monthly reviews.
- Explain changes in consistency rather than only displaying percentages.
- Surface useful patterns by time of day, weekday, category, or workload.
- Provide a GitHub-style activity map that combines the different kinds of
  meaningful work recorded in Streak, such as habit completions, goal progress,
  reviews, and milestones. Each day's intensity should reflect the activity
  completed on that day.
- Let the activity map be filtered or broken down by activity type, goal, habit,
  or life area so the user can see what contributed to the overall pattern
  without losing the unified view.
- Distinguish a current streak from long-term consistency so one missed day
  does not erase the value of prior effort.
- Let the user annotate unusual periods such as travel, illness, or holidays.

### Motivation and experience

- Gentle reminders chosen and controlled by the user.
- Celebrate meaningful milestones without turning the product into a game.
- A focused daily view that makes the next useful action obvious.
- Themes or personalization that preserve the product's calm visual character.

### Telegram automation

- Let the user record habit completions through a Telegram conversation so
  logging does not require opening the dashboard.
- Send opt-in reminders for habits that are due, respecting the user's time
  zone, schedule, quiet hours, and notification preferences.
- Allow conversational commands such as viewing today's remaining habits,
  completing or undoing a habit, and requesting a short progress summary.
- Update the dashboard from the same completion records used by the web
  interface so Telegram never becomes a separate source of truth.
- Require an explicit, secure link between a Telegram account and a Streak
  account, with a clear way to revoke access.
- Make bot responses confirm exactly what was changed and provide a safe way to
  correct misunderstandings or duplicate messages.

### Ownership and portability

- Export personal history in a readable, portable format.
- Import existing habit history where practical.
- Clear backup, restore, retention, and account-deletion behavior.
- Optional sharing of a goal or progress summary, private by default.

### Public product

- Registration, sign-in, account recovery, and onboarding.
- Strict separation of every user's habits, goals, completions, and reviews.
- Time-zone-aware schedules and completion boundaries.
- Notification preferences and delivery controls.
- A sustainable operating model for hosting, support, and future pricing.

## Open product questions

- What is the smallest useful definition of a goal in Streak?
- Should an unfinished habit be stored explicitly as missed when its day closes,
  or inferred as missed from the absence of a completion record?
- What exact local time closes a day, and should users be allowed a short grace
  period for actions sent just before midnight but processed afterward?
- How should legitimate corrections be handled when a completion was recorded
  incorrectly before a day closed, while still preventing retrospective
  backfilling?
- When does a habit count as completed if it spans multiple steps or quantities?
- Which statistics actually help Victor make a decision or change behavior?
- Which activities should count toward the unified map, and how should unlike
  activities contribute to a day's intensity without implying false
  equivalence between them?
- What information belongs in a weekly review?
- Should Telegram habit logging begin with explicit commands and buttons before
  attempting free-form natural-language interpretation?
- How should reminders adapt after a habit is completed, skipped, paused, or
  rescheduled?
- Which parts of the personal workflow should remain opinionated when Streak
  opens to the public?

## Working with this document

- Add raw ideas to the future idea inbox as they arise.
- Record the problem and intended outcome before proposing an implementation.
- Move an idea toward development only after discussing its value and defining
  acceptance criteria.
- Keep technical implementation details in feature documentation, issues, or
  architecture decision records rather than in this product vision.
- Revisit the vision and principles when a proposed feature changes the
  product's direction.
