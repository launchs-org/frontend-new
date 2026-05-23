import { useState, useEffect, useCallback } from 'react';
import type { Project, ContainerSummary } from './lib/types';
import { checkAuth, logout } from './lib/api';
import { listProjects } from './services/projects';
import { Layout } from './components/layout/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ContainerDetailPage } from './pages/ContainerDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ToastContainer } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';
import './index.css';

type PageName = 'projects' | 'project-detail' | 'container-detail' | 'templates' | 'volumes';
type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

interface NavState {
  page: PageName;
  project?: Project;
  container?: ContainerSummary;
}

// ── 未認証画面 ────────────────────────────────────────────────

function LoginPrompt() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Launchs コンソール</h1>
        <p className="text-gray-500 text-sm mb-8">
          続けるにはログインが必要です。
        </p>

        <a
          href="/auth/login"
          className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-150"
        >
          ログインページへ
        </a>

        <p className="mt-6 text-xs text-gray-400">
          ログイン後、このページに自動で戻ります。
        </p>
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────────

function MainApp() {
  const [nav, setNav] = useState<NavState>({ page: 'projects' });
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch {
      // ProjectsPage 側でエラー表示
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleNavigate = (page: PageName, params?: Record<string, string>) => {
    if (page === 'projects') {
      setNav({ page: 'projects' });
    } else if (page === 'project-detail' && params?.projectId) {
      const project = projects.find((p) => p.id === params.projectId);
      if (project) setNav({ page: 'project-detail', project });
    } else if (page === 'templates') {
      setNav({ page: 'templates' });
    } else {
      setNav({ page });
    }
  };

  const selectedProjectId =
    nav.page === 'project-detail' || nav.page === 'container-detail'
      ? (nav.project?.id ?? null)
      : null;

  return (
    <Layout
      currentPage={nav.page}
      projects={projects}
      selectedProjectId={selectedProjectId}
      onNavigate={handleNavigate}
      onLogout={logout}
    >
      {nav.page === 'projects' && (
        <ProjectsPage
          onSelectProject={(project) => {
            setProjects((prev) => {
              if (!prev.find((p) => p.id === project.id)) return [...prev, project];
              return prev.map((p) => (p.id === project.id ? project : p));
            });
            setNav({ page: 'project-detail', project });
          }}
        />
      )}

      {nav.page === 'project-detail' && nav.project && (
        <ProjectDetailPage
          project={nav.project}
          onBack={() => {
            fetchProjects();
            setNav({ page: 'projects' });
          }}
          onSelectContainer={(container) => {
            setNav({ page: 'container-detail', project: nav.project, container });
          }}
        />
      )}

      {nav.page === 'container-detail' && nav.project && nav.container && (
        <ContainerDetailPage
          project={nav.project}
          container={nav.container}
          onBack={() => {
            setNav({ page: 'project-detail', project: nav.project });
          }}
        />
      )}

      {nav.page === 'templates' && <TemplatesPage />}
    </Layout>
  );
}

// ── ルート ────────────────────────────────────────────────────

function App() {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    checkAuth().then((ok) => {
      setAuthState(ok ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-400">認証を確認中...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <LoginPrompt />;
  }

  return (
    <>
      <MainApp />
      <ToastContainer />
    </>
  );
}

export default App;
