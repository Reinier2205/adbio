
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 75C63.8071 75 75 63.8071 75 50C75 48.5 74.8 47 74.5 45.6L82 40L78 30L70 32C67 28 63 25 59 23L58 15H42L41 23C37 25 33 28 30 32L22 30L18 40L25.5 45.6C25.2 47 25 48.5 25 50C25 63.8071 36.1929 75 50 75Z" stroke="#14B8A6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M50 10V20M80 20L72 28M20 20L28 28" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="50" cy="50" r="10" fill="#14B8A6"/>
      </svg>
      <span className="font-heading font-bold text-xl tracking-tight text-text-main">
        Inno<span className="text-primary">Fix</span>
      </span>
    </div>
  );
};

export default Logo;
