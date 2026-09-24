export function SetupNotice({ missing }: { missing: string[] }) {
  return (
    <main id="main-content" className="centered-shell">
      <section className="panel notice-panel">
        <p className="eyebrow">Setup needed</p>
        <h1>
          Almost <em>ready.</em>
        </h1>
        <p>Add these to <code>.env.local</code> (or your host’s environment settings), then restart the app:</p>
        <ul className="command-list">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p className="panel-note">The README explains where to find each value.</p>
      </section>
    </main>
  );
}
