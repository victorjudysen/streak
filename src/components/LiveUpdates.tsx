"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Status = "connecting" | "live" | "offline";

const LABELS: Record<Status, string> = {
  connecting: "Connecting",
  live: "Live",
  offline: "Offline",
};

/**
 * Listens for the server's "tasks-changed" signal (see lib/realtime.ts) and reloads
 * the page's data, so a task ticked off in Telegram appears here without a refresh.
 * Also reloads when the tab becomes visible again, in case the connection dropped
 * while a phone was asleep.
 */
export function LiveUpdates({
  url,
  publishableKey,
  topic,
  event,
}: {
  url: string;
  publishableKey: string;
  topic: string;
  event: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several changes in quick succession (e.g. /done 1 2 3) cause one reload.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = client
      .channel(topic)
      .on("broadcast", { event }, refresh)
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("offline");
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [url, publishableKey, topic, event, router]);

  return (
    <span
      className={`live-status is-${status}`}
      title={
        status === "live"
          ? "Changes from Telegram or other devices appear here instantly"
          : "Live updates unavailable; the list refreshes when you return to this tab"
      }
    >
      <i aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
