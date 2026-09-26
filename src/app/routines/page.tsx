import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { requirePageSession } from "@/lib/auth";
import { describeWeekdays } from "@/lib/routine-rules";
import { listRoutines } from "@/lib/routines";
import { AddRoutineForm } from "./AddRoutineForm";
import { RoutineActions } from "./RoutineActions";

export const metadata: Metadata = { title: "Routines · Streak" };

export default async function RoutinesPage() {
  await requirePageSession();
  const routines = await listRoutines();

  return (
    <>
      <AppHeader current="routines" />
      <main id="main-content" className="centered-shell">
        <section className="panel routines-panel" aria-labelledby="routines-heading">
          <p className="eyebrow">Routines</p>
          <h1 id="routines-heading">
            Every <em>day.</em>
          </h1>
          <p className="routines-intro">
            Routines appear on your list by themselves on the days you pick. Unfinished ones carry over to the
            next day.
          </p>

          <AddRoutineForm />

          {routines.length === 0 ? (
            <p className="empty-state">No routines yet. Add one above — it shows up on today’s list straight away.</p>
          ) : (
            <ul className="routine-list">
              {routines.map((routine) => (
                <li key={routine.id} className={routine.paused_at ? "routine is-paused" : "routine"}>
                  <div className="routine-copy">
                    <strong>{routine.title}</strong>
                    <small>
                      {describeWeekdays(routine.weekdays)}
                      {routine.paused_at ? " · Paused" : ""}
                    </small>
                  </div>
                  <span className="routine-streak" title="Scheduled days in a row it was completed">
                    <strong>{routine.streak}</strong>
                    <small>{routine.streak === 1 ? "day" : "days"}</small>
                  </span>
                  <RoutineActions id={routine.id} title={routine.title} paused={Boolean(routine.paused_at)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
