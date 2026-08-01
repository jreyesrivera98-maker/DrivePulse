/** Isotipo de DrivePulse: línea de pulso sobre fondo negro de marca. */
export default function PulseMark({ size = 28, color = "#2dd4bf", logoUrl = null }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Logotipo"
        width={size}
        height={size}
        className="rounded-[10px] object-cover bg-dp-black"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#090d16" />
      <path
        d="M5 21h6l3-9 5 17 4-13 2 5h10"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
