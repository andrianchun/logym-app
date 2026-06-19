import React from 'react';

const FilterChips = ({ t, label, options, selected, onToggle, formatOption }) => {
  const isLarge = options.length > 5;
  return (
    <div className="space-y-1.5">
      <span className={`text-[10px] font-black uppercase tracking-wider ${t.textMuted}`}>{label}</span>
      <div className={`${isLarge ? 'grid grid-rows-2 grid-flow-col' : 'flex'} gap-1.5 overflow-x-auto hide-scrollbar pb-2`}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
              selected.includes(opt)
                ? `${t.bgAccent} text-white shadow-sm border border-transparent`
                : `bg-transparent border border-solid ${t.border} ${t.textMuted} hover:border-[rgba(183,147,71,0.5)]`
            }`}
          >
            {formatOption ? formatOption(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterChips;
