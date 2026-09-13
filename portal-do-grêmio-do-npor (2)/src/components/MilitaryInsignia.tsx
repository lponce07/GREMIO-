export function MilitaryInsignia({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Brasão do Grêmio do NPOR"
    >
      {/* Outer Shield */}
      <path
        d="M50 5 L88 22 V54 C88 74 50 95 50 95 C50 95 12 74 12 54 V22 Z"
        fill="#263820"
        stroke="#D4AF37"
        strokeWidth="3.5"
      />
      {/* Inner Shield */}
      <path
        d="M50 12 L80 26 V52 C80 68 50 86 50 86 C50 86 20 68 20 52 V26 Z"
        fill="#1B2816"
        stroke="#B8860B"
        strokeWidth="1.5"
      />
      {/* Crossed Swords (Espadas da Reserva / Oficiais) */}
      <line x1="28" y1="72" x2="72" y2="28" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
      <line x1="26" y1="74" x2="34" y2="66" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="27" cy="73" r="3" fill="#D4AF37" />

      <line x1="72" y1="72" x2="28" y2="28" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
      <line x1="74" y1="74" x2="66" y2="66" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="73" cy="73" r="3" fill="#D4AF37" />

      {/* Central Star of the Reserve Army (Estrela de 5 pontas) */}
      <polygon
        points="50,33 54,44 65,44 56,51 59,62 50,55 41,62 44,51 35,44 46,44"
        fill="#F4D03F"
        stroke="#B8860B"
        strokeWidth="1"
      />
      {/* Small Central Ruby / Core */}
      <circle cx="50" cy="49" r="3" fill="#8B0000" />
      
      {/* Motto / Lettering banner */}
      <path
        d="M26 80 Q50 88 74 80"
        stroke="#D4AF37"
        strokeWidth="2"
        fill="none"
      />
      <text x="50" y="81" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" letterSpacing="1">
        NPOR
      </text>
    </svg>
  );
}
