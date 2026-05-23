import React from 'react';
import type { Project } from '../../lib/types';
import { StatusDot } from '../ui/StatusDot';

type PageName = 'projects' | 'project-detail' | 'container-detail' | 'templates' | 'volumes';

interface SidebarProps {
  currentPage: PageName;
  projects: Project[];
  selectedProjectId: string | null;
  onNavigate: (page: PageName, params?: Record<string, string>) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  projects,
  selectedProjectId,
  onNavigate,
  onLogout,
}) => {
  return (
    <aside className="flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-800 tracking-tight">Launchs</span>
            <p className="text-[10px] text-gray-400">PaaS コンソール</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        {/* プロジェクト */}
        <NavItem
          label="プロジェクト"
          active={currentPage === 'projects' && !selectedProjectId}
          onClick={() => onNavigate('projects')}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />

        {/* プロジェクト一覧 */}
        {projects.length > 0 && (
          <div className="mt-4">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              プロジェクト
            </p>
            <div className="space-y-0.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onNavigate('project-detail', { projectId: p.id })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150
                    ${selectedProjectId === p.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                >
                  <StatusDot status={p.container_count > 0 ? 'running' : 'stopped'} />
                  <span className="truncate flex-1 text-left text-xs">{p.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-full">{p.container_count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold shrink-0">
            U
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">ユーザー</p>
            <p className="text-[10px] text-gray-400">管理者</p>
          </div>
          <button
            onClick={onLogout}
            title="ログアウト"
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all duration-150
      ${active
        ? 'bg-blue-50 text-blue-700 font-medium'
        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
      }`}
  >
    <span className={active ? 'text-blue-600' : 'text-gray-500'}>{icon}</span>
    {label}
  </button>
);
