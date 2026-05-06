"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0a0e12",
          color: "#e2e8f0",
          fontFamily: 'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace',
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <p
            style={{
              color: "#e5484d",
              fontSize: "11px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Critical fault
          </p>
          <h1
            style={{
              color: "#f1f5f9",
              fontSize: "2.25rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              margin: "0.75rem 0 0.5rem",
            }}
          >
            FreightMatch is offline
          </h1>
          {error.digest ? (
            <p
              style={{
                color: "#475569",
                fontSize: "10px",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              trace · {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              backgroundColor: "#f5b342",
              border: "1px solid #f5b342",
              borderRadius: "6px",
              color: "#0a0e12",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.24em",
              marginTop: "1.75rem",
              padding: "0.625rem 1rem",
              textTransform: "uppercase",
            }}
            type="button"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
