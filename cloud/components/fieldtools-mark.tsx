/**
 * The FieldTools.ai mark — Alex's compass rose with FT set inside.
 * Ink parts follow currentColor (adapts to theme); the T and the north
 * point are flare: the tool is the needle, and it points north.
 */
export function FieldToolsMark({
  size = 64,
  letters = true,
  className,
}: {
  size?: number;
  /** letters off = compass-only (favicon scale) */
  letters?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="FieldTools.ai"
    >
      {/* ring, broken at the four cardinal points */}
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        <path d="M 36.9 12.6 A 20 20 0 0 1 51.4 27.1" />
        <path d="M 51.4 36.9 A 20 20 0 0 1 36.9 51.4" />
        <path d="M 27.1 51.4 A 20 20 0 0 1 12.6 36.9" />
        <path d="M 12.6 27.1 A 20 20 0 0 1 27.1 12.6" />
      </g>
      {/* cardinal points — north is flare */}
      <path d="M32 1.5 L37 14.5 L27 14.5 Z" fill="#FF6A3D" />
      <path d="M62.5 32 L49.5 37 L49.5 27 Z" fill="currentColor" />
      <path d="M32 62.5 L27 49.5 L37 49.5 Z" fill="currentColor" />
      <path d="M1.5 32 L14.5 27 L14.5 37 Z" fill="currentColor" />
      {letters && (
        <>
          {/* paper coin — fixed colors so the face reads identically on both themes */}
          <circle cx="32" cy="32" r="17.4" fill="#EDEAE3" />
          <text
            x="18.5"
            y="40"
            fontFamily="var(--font-bricolage), system-ui, sans-serif"
            fontStyle="italic"
            fontWeight="700"
            fontSize="23"
            letterSpacing="-0.5"
          >
            <tspan fill="#1C222B">F</tspan>
            <tspan fill="#FF6A3D">T</tspan>
          </text>
        </>
      )}
    </svg>
  );
}
