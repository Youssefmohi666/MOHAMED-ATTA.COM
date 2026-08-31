import React from 'react';

const ITEMS = [
  'المادة العلمية',
  'شروحات مبسطة بأحدث التقنيات',
  'امتحانات ذكية وخطة مذاكرة مقترحة',
  'ابدأ التعلم الآن',
];

const TopBar: React.FC = () => {
  const row = ITEMS.join('   ✦   ');
  return (
    <div dir="rtl" className="relative overflow-hidden bg-[#DC2626] text-white text-xs sm:text-sm font-semibold py-1.5 select-none" aria-hidden="true">
      <div className="ticker-track">
        {/* Two copies so the scroll loops seamlessly */}
        <span className="px-4">{row}</span>
        <span className="px-4">{row}</span>
      </div>
    </div>
  );
};

export default TopBar;
