import { ActivityMap } from "@/components/ActivityMap";
import { AppHeader } from "@/components/AppHeader";
import { DashboardTabs } from "@/components/DashboardTabs";
import { LiveUpdates } from "@/components/LiveUpdates";
import { SetupNotice } from "@/components/SetupNotice";
import { TaskBoard, type TaskView } from "@/components/TaskBoard";
import { requirePageSession } from "@/lib/auth";
import { isConfigured, missingEnv } from "@/lib/config";
import { formatDay, formatTime, localDate } from "@/lib/dates";
import { TASKS_CHANGED_EVENT, realtimeTopic } from "@/lib/realtime";
import { buildMap, mapStart, strongestWeekday, summarize, thisWeek } from "@/lib/stats";
import { isCarriedOver } from "@/lib/task-rules";
import { completionsByDay, listForToday } from "@/lib/tasks";

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function Dashboard() {
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
  const since = mapStart(day);
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

  const map = buildMap(day, counts);
  const summary = summarize(day, counts, since);
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

      <dl className="map-stats">
        <div>
          <dt>tasks done in the last year</dt>
          <dd>{summary.completed}</dd>
        </div>
        <div>
          <dt>days with a task done</dt>
          <dd>{summary.activeDays}</dd>
        </div>
        <div>
          <dt>best run of days</dt>
          <dd>{summary.best}</dd>
        </div>
      </dl>

      <ActivityMap days={map} />

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
            <code>/list</code> see today, numbered
          </li>
          <li>
            <code>/done 2</code> tick off task 2
          </li>
          <li>
            <code>/undo 2</code> untick (today only)
          </li>
          <li>
            <code>/remove 2</code> take it off the list
          </li>
        </ul>
      </section>
    </aside>
  );

  return (
    <>
      <AppHeader />
      <DashboardTabs panels={{ today, record, bot: rail }} />
    </>
  );
}
