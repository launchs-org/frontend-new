import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { User, Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import { api } from './lib/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(!!sessionStorage.getItem('access_token'));
  const [isVerifying, setIsVerifying] = React.useState(!!localStorage.getItem('token'));

  React.useEffect(() => {
    const checkAuth = async () => {
      const refreshToken = localStorage.getItem('token');
      if (!refreshToken) {
        setIsAuthenticated(false);
        setIsVerifying(false);
        return;
      }

      try {
        // Use absolute path and specify useRefreshToken option
        await api.get(import.meta.env.VITE_API_AUTH_ME_PATH || '/auth/me', { useRefreshToken: true });
        setIsAuthenticated(true);
      } catch (error: any) {

        if (error.response?.status === 401) {
          setIsAuthenticated(false);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    checkAuth();
  }, []);


  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 font-sans">
        <Loader2 className="w-8 h-8 text-google-blue animate-spin mb-4" />
        <p className="text-[#5f6368] font-medium">認証状態を確認中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
        <div className="google-card p-10 text-center w-full max-w-md bg-white">
          <div className="w-16 h-16 bg-blue-50 text-google-blue rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={32} />
          </div>
          <h1 className="text-2xl font-medium text-[#202124] mb-4">ログインが必要です</h1>
          <p className="text-[#5f6368] mb-8 leading-relaxed">
            Launchs を管理するには、AuthBase での認証が必要です。下のボタンからログインページへ進んでください。
          </p>
          
          <a 
            href="/auth/login" 
            className="inline-block w-full bg-google-blue hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-all shadow-sm hover:shadow-md"
          >
            ログイン画面へ移動
          </a>
          
          <p className="mt-6 text-xs text-gray-400">
            ログイン後、このページに戻ってきてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/ui/">
      <Layout>
        <Routes>
          <Route path="/" element={<Projects />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {/* <Route path="/containers/:id" element={<ContainerDetail />} /> */}
          {/* <Route path="/history" element={<History />} />
          <Route path="/monitoring" element={<Monitoring />} /> */}
          {/* Add more routes here as they are created */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <h1 className="text-9xl font-black italic tracking-tighter">404</h1>
              <p className="text-sm font-bold uppercase tracking-[0.5em] text-gray-400">Page not found</p>
              <button onClick={() => window.history.back()} className="mt-8 px-8 py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors uppercase tracking-widest text-xs border border-black">
                GO BACK
              </button>
            </div>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
