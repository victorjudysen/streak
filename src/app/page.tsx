import Link from "next/link";
import { ActivityMap } from "@/components/ActivityMap";
import { AppHeader } from "@/components/AppHeader";
import { DashboardTabs } from "@/components/DashboardTabs";
import { DayDetails } from "@/components/DayDetails";
import { LiveUpdates } from "@/components/LiveUpdates";
import { SetupNotice } from "@/components/SetupNotice";
import { TaskBoard, type TaskView } from "@/components/TaskBoard";
import { requirePageSession } from "@/lib/auth";
import { isConfigured, missingEnv } from "@/lib/config";
import { formatDay, formatTime, localDate } from "@/lib/dates";
import { TASKS_CHANGED_EVENT, realtimeTopic } from "@/lib/realtime";
import {
  buildCalendar,
  dashboardHref,
  lastYearRange,
  parseDayParam,
  strongestWeekday,
  summarize,
  thisWeek,
  yearRange,
} from "@/lib/stats";
import { isCarriedOver } from "@/lib/task-rules";
import { completedOn, completionsByDay, firstCompletionYear, listForToday } from "@/lib/tasks";

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePageSession();

  if (!isConfigured("database")) {
    return (
      <>
        <AppHeader />
        <SetupNotice missing={missingEnv("database")} />
      </>
    );
  }

  const { day, tasks } = await listForToday();
  const currentYear = Number(day.slice(0, 4));
  const firstYear = (await firstCompletionYear()) ?? currentYear;
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i);

  // ?year=2025 shows that calendar year; anything else shows the last year, like GitHub.
  const params = await searchParams;
  const requested = Number(params.year);
  const selectedYear = years.includes(requested) ? requested : null;
  // ?day=2026-09-27 opens that day's completed tasks under the graph.
  const selectedDay = parseDayParam(params.day, day);
  const dayTasks = selectedDay ? await completedOn(selectedDay) : [];
  const lastYear = lastYearRange(day);
  const range = selectedYear ? yearRange(selectedYear, day) : lastYear;
  const rangeLabel = selectedYear ? String(selectedYear) : "the last year";

  const since = range.start < lastYear.start ? range.start : lastYear.start;
  const counts = await completionsByDay(since);

  const views: TaskView[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    done: task.done_at !== null,
    doneTime: task.done_at && localDate(task.done_at) === day ? formatTime(task.done_at) : null,
    carriedFrom: isCarriedOver(task, day)
      ? formatDay(task.task_date, { weekday: "short", day: "numeric", month: "short" })
      : null,
    fromTelegram: task.source === "telegram",
    isRoutine: task.routine_id !== null,
  }));

  const calendar = buildCalendar(range, counts);
  // The streak card always looks back from today; the record panel follows the selected range.
  const summary = summarize(day, counts, lastYear.start);
  const rangeSummary = summarize(range.end, counts, range.start);
  const week = thisWeek(day, counts);
  const weekTotal = week.reduce((sum, { count }) => sum + count, 0);
  const weekPeak = Math.max(1, ...week.map(({ count }) => count));
  const rhythm = strongestWeekday(counts);
  const telegramReady = isConfigured("telegram") && Boolean(process.env.TELEGRAM_ALLOWED_CHAT_ID);
  const topic = realtimeTopic();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const live =
    topic && publishableKey ? (
      <LiveUpdates
        url={process.env.NEXT_PUBLIC_SUPABASE_URL!}
        publishableKey={publishableKey}
        topic={topic}
        event={TASKS_CHANGED_EVENT}
      />
    ) : null;

  const today = (
    <section className="panel today-panel" aria-labelledby="today-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true">●</span> {formatDay(day, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 id="today-heading">
            Today’s
            <br />
            <em>list.</em>
          </h1>
        </div>
        {live}
      </div>
      <TaskBoard tasks={views} />
    </section>
  );

  const record = (
    <section className="panel map-panel" aria-labelledby="map-heading">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Your record</p>
          <h2 id="map-heading">A year of showing up.</h2>
        </div>
      </div>

      <div className="graph-heading">
        <h3>
          {calendar.total} {calendar.total === 1 ? "task" : "tasks"} done in {rangeLabel}
        </h3>
        <nav className="graph-years" aria-label="Choose a year">
          <Link href="/" scroll={false} aria-current={selectedYear === null ? "page" : undefined}>
            Last year
          </Link>
          {years.map((year) => (
            <Link
              key={year}
              href={`/?year=${year}`}
              scroll={false}
              aria-current={selectedYear === year ? "page" : undefined}
            >
              {year}
            </Link>
          ))}
        </nav>
      </div>

      <ActivityMap calendar={calendar} rangeLabel={rangeLabel} range={range} year={selectedYear} selectedDay={selectedDay} />

      <dl className="map-stats">
        <div>
          <dt>days with a task done</dt>
          <dd>{rangeSummary.activeDays}</dd>
        </div>
        <div>
          <dt>best run of days</dt>
          <dd>{rangeSummary.best}</dd>
        </div>
      </dl>

      {selectedDay ? (
        <DayDetails day={selectedDay} today={day} tasks={dayTasks} closeHref={dashboardHref(selectedYear, null)} />
      ) : (
        <div className="map-bottom">
          <article className="weekly-card">
            <div>
              <p className="eyebrow">This week</p>
              <strong>{weekTotal}</strong>
              <small>tasks done</small>
            </div>
            <div className="week-bars" aria-label="Tasks done each day this week">
              {week.map(({ date, count }, index) => (
                <span key={date} style={{ ["--bar-height" as string]: `${(count / weekPeak) * 100}%` }}>
                  <i title={`${count} done`} />
                  <small>{WEEK_LETTERS[index]}</small>
                </span>
              ))}
            </div>
          </article>
          <article className="quote-card">
            {rhythm ? (
              <p>
                Your strongest day is <em>{rhythm}.</em>
              </p>
            ) : (
              <p>
                Keep going — patterns show after <em>ten active days.</em>
              </p>
            )}
            <span>Calculated from the tasks you have completed.</span>
          </article>
        </div>
      )}
    </section>
  );

  const rail = (
    <aside className="insights-rail">
      <section className="panel streak-card">
        <p className="eyebrow">Current streak</p>
        <strong className="streak-number">{summary.current}</strong>
        <p>
          {summary.current === 1 ? "day" : "days"} in a row with at least one task done.
          {summary.current > 0 && (counts.get(day) ?? 0) === 0 ? " Finish one today to keep it going." : ""}
        </p>
      </section>

      <section className="panel telegram-card">
        <div className="panel-header">
          <p className="eyebrow">Telegram</p>
          <span className={telegramReady ? "status is-on" : "status"}>{telegramReady ? "Connected" : "Not set up"}</span>
        </div>
        <p>Message the bot to update this list from anywhere.</p>
        <ul className="command-list">
          <li>
            <code>buy milk</code> add a task
          </li>
          <li>
            <code>/list</code> what’s left, numbered
          </li>
          <li>
            <code>/done 2</code> tick off task 2
          </li>
          <li>
            <code>/remove 2</code> take it off the list
          </li>
          <li>
            <code>/undo</code> see and untick today’s done tasks
          </li>
        </ul>
      </section>
    </aside>
  );

  return (
    <>
      <AppHeader />
      <DashboardTabs panels={{ today, record, bot: rail }} initialTab={selectedYear || selectedDay ? "record" : "today"} />
    </>
  );
}
