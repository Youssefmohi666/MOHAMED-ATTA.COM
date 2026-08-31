import React from 'react';

/** 🔥 Consecutive-activity badge. Pure presentational — the count comes from `days`. */
const StreakBadge = ({ days, variant = 'light' }: { days: number; variant?: 'light' | 'dark' }) => {
  const base =
    'inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 whitespace-nowrap';
  if (days <= 0) {
    return (
      <span className={`${base} ${
        variant === 'dark'
          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
          : 'bg-amber-50 text-amber-600 border border-amber-200'
      }`}>
        <span className="text-sm leading-none">🔥</span> ابدأ سلسلة نشاطك اليوم
      </span>
    );
  }
  return (
    <span className={`${base} ${
      variant === 'dark'
        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
        : 'bg-amber-50 text-amber-600 border border-amber-200'
    }`}>
      <span className="text-sm leading-none">🔥</span>
      {days} {days === 1 ? 'يوم' : 'أيام'} متتالية
    </span>
  );
};

export default StreakBadge;