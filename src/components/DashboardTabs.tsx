"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const TABS = [
  { id: "today", label: "Today" },
  { id: "record", label: "Record" },
  { id: "bot", label: "Streak" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Desktop shows all three panels side by side. Below 780px only the selected
 * panel is visible, so the phone view never becomes one long page.
 */
export function DashboardTabs({ panels }: { panels: Record<TabId, ReactNode> }) {
  const [active, setActive] = useState<TabId>("today");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setActive(TABS[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <main id="main-content" className="dashboard-shell">
      <div className="mobile-tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          className={`dashboard-slot slot-${tab.id}${active === tab.id ? " is-mobile-active" : ""}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
        >
          {panels[tab.id]}
        </div>
      ))}
    </main>
  );
}
