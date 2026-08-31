import React, { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // Fallback logo with Arabic text matching the Mohamed Atta branding
  const FallbackLogo = () => (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#DC2626] rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
          </svg>
        </div>
        {/* Decorative book element */}
        <div className="absolute -top-1 -right-1">
          <svg className="w-4 h-4 text-[#DC2626]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col leading-none">
        <span className={`${textSizes[size]} font-black text-[#1E3A8A] dark:text-white`} style={{ fontFamily: 'Cairo, sans-serif' }}>
          محمد عطا
        </span>
        <span className="text-xs font-semibold text-[#DC2626] tracking-wide">
          mohamed-atta
        </span>
      </div>
    </div>
  );

  if (imageError) {
    return <FallbackLogo />;
  }

  return (
    <div className={`logo-wrapper inline-flex items-center ${className}`}>
      <img
        src="/assets/logo.svg"
        alt="Mohamed Atta - محمد عطا"
        className={`${sizeClasses[size]} w-auto object-contain rounded-xl`}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default Logo;
