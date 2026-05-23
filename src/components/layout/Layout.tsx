import React from 'react';
import { Sidebar } from './Sidebar';
import type { Project } from '../../lib/types';

type PageName = 'projects' | 'project-detail' | 'container-detail' | 'templates' | 'volumes';

interface LayoutProps {
  currentPage: PageName;
  projects: Project[];
  selectedProjectId: string | null;
  onNavigate: (page: PageName, params?: Record<string, string>) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  projects,
  selectedProjectId,
  onNavigate,
  onLogout,
  children,
}) => {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
};
