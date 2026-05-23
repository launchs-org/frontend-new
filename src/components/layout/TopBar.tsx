import React from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface TopBarProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ breadcrumbs, actions }) => {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 bg-white sticky top-0 z-10">
      <nav className="flex items-center gap-1.5">
        {breadcrumbs.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-sm font-semibold text-gray-800">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
