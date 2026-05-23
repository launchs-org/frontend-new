import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="mb-4 w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
      {icon ?? (
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )}
    </div>
    <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
    {description && <p className="text-xs text-gray-500 mb-4 max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
