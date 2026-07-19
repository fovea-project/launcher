/**
 * Fovea brand mark. Size it with `className` (e.g. `size-8`).
 * `fill` defaults to the brand lime; pass `"currentColor"` to tint it via a
 * text-color class (used for decorative scattered marks).
 */
export function Logo({ className, fill = "#BBEF1F" }: { className?: string; fill?: string }) {
  return (
    <svg
      viewBox="0 0 491 491"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Fovea"
    >
      <path
        d="M23.9584 302.865L187.174 466.081C219.119 498.026 270.92 498.026 302.865 466.081L466.081 302.865C498.026 270.92 498.026 219.12 466.081 187.175L302.865 23.9587C270.92 -7.98639 219.119 -7.98639 187.174 23.9587L23.9585 187.175C-7.98664 219.12 -7.98665 270.92 23.9584 302.865ZM294.29 178.322L350.593 161.527C362 158.113 372.092 169.722 367.16 180.523L261.03 413.471C259.361 417.164 253.822 415.975 253.847 411.903L253.847 232.626C253.847 207.586 270.313 185.505 294.316 178.347L294.29 178.322ZM139.446 161.527L195.749 178.322C219.752 185.48 236.218 207.561 236.218 232.601L236.192 411.903C236.192 415.95 230.678 417.164 229.009 413.471L122.879 180.573C117.947 169.773 128.039 158.164 139.446 161.578L139.446 161.527Z"
        fill={fill}
      />
    </svg>
  );
}
