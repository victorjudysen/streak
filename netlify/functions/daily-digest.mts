// Netlify scheduled function: every day at 06:00 UTC = 09:00 East Africa Time
// (EAT has no daylight saving, so this never drifts). It asks the app to send
// today's list to Telegram. Scheduled functions only run on the published
// production deploy and cannot be reached over HTTP.

export default async function dailyDigest(): Promise<Response> {
  const siteUrl = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!siteUrl || !secret) {
    console.error("daily digest: URL or CRON_SECRET is not set");
    return new Response("Not configured", { status: 500 });
  }

  const response = await fetch(`${siteUrl}/api/cron/daily-digest`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  if (!response.ok) console.error(`daily digest: app answered ${response.status}: ${body}`);
  else console.info(`daily digest: ${body}`);
  return new Response(body, { status: response.status });
}

export const config = {
  schedule: "0 6 * * *",
};
