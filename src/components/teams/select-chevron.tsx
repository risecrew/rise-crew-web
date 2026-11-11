// The arrow for a SELECT. Its parent is `relative` and holds only the select.
export function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-white/75"
    >
      <path
        d="M3.5 6l4.5 4.5L12.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
