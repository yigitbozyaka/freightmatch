"use client";

export function GridBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%23F5B342' stroke-width='0.5' stroke-opacity='0.04'/%3E%3C/svg%3E")`,
        backgroundSize: "24px 24px",
      }}
    />
  );
}
