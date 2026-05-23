import { useState, useEffect, useCallback } from 'react';
import type { Project, ContainerSummary } from './lib/types';
import { checkAuth, logout } from './lib/api';
import { listProjects, getProject } from './services/projects';
import { getContainer } from './services/containers';
import { Layout } from './components/layout/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ContainerDetailPage } from './pages/ContainerDetailPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { ToastContainer } from './components/ui/Toast';
import { Spinner } from './components/ui/Spinner';
import './index.css';

type PageName = 'projects' | 'project-detail' | 'container-detail' | 'templates';
type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

interface NavState {
  page: PageName;
  project?: Project;
  container?: ContainerSummary;
  tab?: string;
}

const UI_BASE = '/ui';

// URL からナビ状態を復元
function parseUrl(): { page: PageName; projectId?: string; containerId?: string; tab?: string } {
  // /ui/ プレフィックスを除去してパスを解析
  const rawPath = window.location.pathname;
  const path = rawPath.startsWith(UI_BASE) ? rawPath.slice(UI_BASE.length) || '/' : rawPath;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') ?? undefined;

  const containerMatch = path.match(/^\/projects\/([^/]+)\/containers\/([^/]+)/);
  if (containerMatch) {
    return { page: 'container-detail', projectId: containerMatch[1], containerId: containerMatch[2], tab };
  }
  const projectMatch = path.match(/^\/projects\/([^/]+)/);
  if (projectMatch) {
    return { page: 'project-detail', projectId: projectMatch[1], tab };
  }
  if (path === '/templates') {
    return { page: 'templates' };
  }
  return { page: 'projects' };
}

// ナビ状態から URL を生成
function navToUrl(nav: NavState): string {
  let path = '/';
  if (nav.page === 'templates') {
    path = '/templates';
  } else if (nav.page === 'project-detail' && nav.project) {
    path = `/projects/${nav.project.id}`;
  } else if (nav.page === 'container-detail' && nav.project && nav.container) {
    path = `/projects/${nav.project.id}/containers/${nav.container.id}`;
  }
  const search = nav.tab ? `?tab=${nav.tab}` : '';
  return UI_BASE + path + search;
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
        <p className="text-gray-500 text-sm mb-8">続けるにはログインが必要です。</p>
        <a
          href="/auth/login"
          className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-150"
        >
          ログインページへ
        </a>
        <p className="mt-6 text-xs text-gray-400">ログイン後、このページに自動で戻ります。</p>
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────────

function MainApp() {
  const [nav, setNav] = useState<NavState>({ page: 'projects' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [initializing, setInitializing] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await listProjects();
      setProjects(data);
      return data;
    } catch {
      return [];
    }
  }, []);

  // 初回: URLからナビ状態を復元
  useEffect(() => {
    const { page, projectId, containerId, tab } = parseUrl();

    const restore = async () => {
      const allProjects = await fetchProjects();

      if (page === 'templates') {
        setNav({ page: 'templates' });
      } else if (page === 'container-detail' && projectId && containerId) {
        try {
          const project = allProjects.find((p) => p.id === projectId) ?? await getProject(projectId);
          const container = await getContainer(projectId, containerId);
          setNav({ page: 'container-detail', project, container, tab });
        } catch {
          setNav({ page: 'projects' });
        }
      } else if (page === 'project-detail' && projectId) {
        const project = allProjects.find((p) => p.id === projectId);
        if (project) {
          setNav({ page: 'project-detail', project, tab });
        } else {
          setNav({ page: 'projects' });
        }
      } else {
        setNav({ page: 'projects' });
      }
      setInitializing(false);
    };

    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ナビ状態変化時にURL更新
  useEffect(() => {
    if (initializing) return;
    const url = navToUrl(nav);
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState(null, '', url);
    }
  }, [nav, initializing]);

  // ブラウザ戻る/進む対応
  useEffect(() => {
    const handler = () => {
      const { page, projectId, containerId, tab } = parseUrl();
      if (page === 'templates') {
        setNav({ page: 'templates' });
      } else if (page === 'container-detail' && projectId && containerId) {
        setNav((prev) => {
          if (prev.project?.id === projectId && prev.container?.id === containerId) {
            return { ...prev, tab };
          }
          return prev;
        });
      } else if (page === 'project-detail' && projectId) {
        const project = projects.find((p) => p.id === projectId);
        if (project) setNav({ page: 'project-detail', project, tab });
      } else {
        setNav({ page: 'projects' });
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [projects]);

  const setNavAndUrl = useCallback((next: NavState) => {
    setNav(next);
  }, []);

  const handleNavigate = (page: PageName, params?: Record<string, string>) => {
    if (page === 'projects') {
      setNavAndUrl({ page: 'projects' });
    } else if (page === 'project-detail' && params?.projectId) {
      const project = projects.find((p) => p.id === params.projectId);
      if (project) setNavAndUrl({ page: 'project-detail', project });
    } else if (page === 'templates') {
      setNavAndUrl({ page: 'templates' });
    } else {
      setNavAndUrl({ page });
    }
  };

  const selectedProjectId =
    nav.page === 'project-detail' || nav.page === 'container-detail'
      ? (nav.project?.id ?? null)
      : null;

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

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
            setNavAndUrl({ page: 'project-detail', project });
          }}
        />
      )}

      {nav.page === 'project-detail' && nav.project && (
        <ProjectDetailPage
          project={nav.project}
          initialTab={nav.tab}
          onBack={() => {
            fetchProjects();
            setNavAndUrl({ page: 'projects' });
          }}
          onSelectContainer={(container) => {
            setNavAndUrl({ page: 'container-detail', project: nav.project, container });
          }}
          onTabChange={(tab) => {
            setNav((prev) => ({ ...prev, tab }));
          }}
        />
      )}

      {nav.page === 'container-detail' && nav.project && nav.container && (
        <ContainerDetailPage
          project={nav.project}
          container={nav.container}
          initialTab={nav.tab}
          onBack={() => {
            setNavAndUrl({ page: 'project-detail', project: nav.project });
          }}
          onTabChange={(tab) => {
            setNav((prev) => ({ ...prev, tab }));
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
