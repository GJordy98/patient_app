import React from 'react';

interface LogoProps {
  size?: number;
  /** 'full' = icône + texte, 'icon' = icône seulement, 'text' = texte seulement */
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

/**
 * Logo e-Dr TIM PHARMACY — reproduit fidèlement le logo officiel :
 * fond vert arrondi, croix médicale blanche avec stéthoscope intégré,
 * texte "e-Dr TIM" + "PHARMACY" en blanc.
 */
export const Logo: React.FC<LogoProps> = ({ size = 48, variant = 'full', className = '' }) => {
  const IconSVG = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${variant === 'full' ? '' : className}`}
      aria-label="e-Dr TIM Pharmacy"
    >
      {/* Fond vert arrondi */}
      <rect width="120" height="120" rx="26" fill="#1fa01a"/>

      {/* Croix médicale */}
      <rect x="45" y="18" width="30" height="84" rx="10" fill="white"/>
      <rect x="18" y="45" width="84" height="30" rx="10" fill="white"/>

      {/* Stéthoscope — arc supérieur */}
      <path
        d="M38 52 C28 52 22 42 30 35 C35 30 42 34 42 40"
        stroke="#1fa01a" strokeWidth="5" strokeLinecap="round" fill="none"
      />
      {/* Tête du stéthoscope (côté patient) */}
      <circle cx="56" cy="78" r="8" stroke="#1fa01a" strokeWidth="5" fill="none"/>
      {/* Cordon du stéthoscope */}
      <path
        d="M42 40 C42 55 48 65 56 70"
        stroke="#1fa01a" strokeWidth="5" strokeLinecap="round" fill="none"
      />
      {/* Embouts auriculaires */}
      <circle cx="30" cy="35" r="4" fill="#1fa01a"/>
      <circle cx="38" cy="32" r="4" fill="#1fa01a"/>
    </svg>
  );

  if (variant === 'icon') return IconSVG;

  if (variant === 'text') {
    return (
      <div className={`flex flex-col leading-tight ${className}`}>
        <span className="font-black text-primary tracking-tight" style={{ fontSize: size * 0.38 }}>e-Dr TIM</span>
        <span className="font-bold text-primary/70 uppercase tracking-widest" style={{ fontSize: size * 0.18 }}>PHARMACY</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {IconSVG}
      <div className="flex flex-col leading-tight">
        <span className="font-black text-primary tracking-tight" style={{ fontSize: size * 0.38 }}>e-Dr TIM</span>
        <span className="font-bold text-primary/70 uppercase tracking-widest" style={{ fontSize: size * 0.18 }}>PHARMACY</span>
      </div>
    </div>
  );
};

export default Logo;
