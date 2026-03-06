import React from 'react';

interface LogoProps {
  size?: number;
  /** 'full' = logo image, 'icon' = logo image (carré), 'text' = texte seulement */
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 48, variant = 'full', className = '' }) => {
  if (variant === 'text') {
    return (
      <div className={`flex flex-col leading-tight ${className}`}>
        <span className="font-black text-primary tracking-tight" style={{ fontSize: size * 0.38 }}>e-Dr TIM</span>
        <span className="font-bold text-primary/70 uppercase tracking-widest" style={{ fontSize: size * 0.18 }}>PHARMACY</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="e-Dr TIM Pharmacy"
      style={{ height: size, width: 'auto' }}
      className={`object-contain ${className}`}
    />
  );
};

export default Logo;
