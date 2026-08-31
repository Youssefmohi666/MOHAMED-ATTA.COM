import React from 'react';

/**
 * Styled select wrapper with custom chevron and dark/light theme support.
 *
 * Usage:
 *   <SelectField id="my-id" value={val} onChange={e => setVal(e.target.value)}>
 *     <option value="a">خيار أ</option>
 *   </SelectField>
 */

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Colour theme: 'dark' (default) for dashboards, 'light' for public forms */
  theme?: 'dark' | 'light';
  /** Extra wrapper className */
  wrapperClassName?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  theme = 'dark',
  wrapperClassName = '',
  className = '',
  children,
  ...rest
}) => {
  const base =
    'font-cairo w-full appearance-none cursor-pointer rounded-xl text-sm ' +
    'outline-none transition-all duration-150 box-border pl-8 pr-3';

  const darkCls =
    'select-dark bg-[#0d1f3c] border border-white/[0.12] text-slate-200 py-2.5 ' +
    'hover:border-white/25 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/40 ' +
    'focus:bg-[#0f2540] shadow-sm';

  const lightCls =
    'select-light bg-[#f3f4f5] border border-[#DBEAFE] text-[#1E3A8A] py-2.5 ' +
    'hover:border-[#1E3A8A]/40 focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/20 ' +
    'focus:bg-white shadow-sm';

  const themeCls = theme === 'light' ? lightCls : darkCls;

  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        className={`${base} ${themeCls} ${className}`}
        {...rest}
      >
        {children}
      </select>

      {/* Custom chevron — pointer-events-none so clicks pass through */}
      <span
        className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center"
        aria-hidden="true"
      >
        <svg
          className={`w-4 h-4 transition-colors duration-150 ${
            theme === 'light' ? 'text-[#1E3A8A]/50' : 'text-slate-500'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
};

export default SelectField;
