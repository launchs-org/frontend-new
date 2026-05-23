import React, { useState, useEffect, useCallback } from 'react';
import { containerService } from '../services/containerService';
import {
  Plus,
  Search,
  Folder,
  MoreVertical,
  ChevronRight,
  X,
  Loader2,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  namespace: string;
  k8s_resource_name: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; pulse: boolean }> = {
  Pending:  { label: '準備中',  badgeClass: 'bg-yellow-100 text-yellow-800', pulse: true },
  Running:  { label: '稼働中',  badgeClass: 'bg-green-100 text-green-800',  pulse: false },
  Deleting: { label: '削除中',  badgeClass: 'bg-red-100 text-red-700',     pulse: true },
};

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '' });

  const fetchProjects = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await containerService.getProjects();
      setProjects(response.data.data ?? []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const t = setInterval(() => fetchProjects(true), 5000);
    return () => clearInterval(t);
  }, [fetchProjects]);

  const handleCreateProject = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setCreating(true);
    try {
      await containerService.createProject(formData);
      setShowModal(false);
      setFormData({ name: '' });
      fetchProjects(true);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('プロジェクトの作成に失敗しました。プロジェクト名は英小文字、数字、ハイフンのみ使用可能です。');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (evt: React.MouseEvent, id: string, name: string) => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!confirm(`プロジェクト "${name}" を削除しますか？\nこの操作は取り消せません。`)) return;

    try {
      await containerService.deleteProject(id);
      fetchProjects(true);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('プロジェクトの削除に失敗しました。');
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = evt.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isDisabled = (project: Project) =>
    project.status === 'Pending' || project.status === 'Deleting';

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-[#202124]">プロジェクト</h2>
          <p className="text-sm text-[#5f6368] mt-1">デプロイ環境とサービスグループを管理します。</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="プロジェクトを検索"
              className="pl-10 pr-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-1 focus:ring-google-blue focus:border-google-blue text-sm w-72"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-6 py-2 bg-google-blue text-white text-sm font-medium rounded-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>新規プロジェクト</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="google-card p-6 h-48 animate-pulse bg-gray-50" />
          ))
        ) : projects.length === 0 ? (
          <div className="col-span-full py-20 text-center google-card border-dashed">
            <Folder size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[#5f6368]">プロジェクトがまだありません。新しいプロジェクトを作成してください。</p>
          </div>
        ) : (
          projects.map((project) => {
            const statusConfig = STATUS_CONFIG[project.status] ?? { label: project.status, badgeClass: 'bg-gray-100 text-gray-500', pulse: false };
            const disabled = isDisabled(project);

            const cardContent = (
              <div
                className={`google-card p-6 transition-all group border-transparent relative ${
                  disabled
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:shadow-lg hover:border-google-blue/20 cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl transition-colors ${
                    disabled
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-50 text-google-blue group-hover:bg-google-blue group-hover:text-white'
                  }`}>
                    <Folder size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.badgeClass}`}>
                      {statusConfig.pulse && <Loader2 size={10} className="animate-spin" />}
                      {statusConfig.label}
                    </span>
                    {!disabled && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                          className="p-2 text-[#5f6368] hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {openMenuId === project.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-100 z-10 py-1 animate-in fade-in zoom-in duration-200">
                            <button
                              onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                              className="w-full text-left px-4 py-2 text-sm text-google-red hover:bg-red-50 flex items-center space-x-2 transition-colors"
                            >
                              <Trash2 size={16} />
                              <span>プロジェクトを削除</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-lg font-medium transition-colors ${
                      disabled ? 'text-gray-400' : 'text-[#202124] group-hover:text-google-blue'
                    }`}>{project.name}</h3>
                    <p className="text-xs text-[#5f6368] mt-1 truncate">ネームスペース: {project.namespace}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#f1f3f4]">
                    <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider truncate mr-2">リソース名: {project.k8s_resource_name}</span>
                    <ChevronRight size={18} className={`transition-all shrink-0 ${disabled ? 'text-gray-200' : 'text-gray-300 group-hover:text-google-blue'}`} />
                  </div>
                </div>
              </div>
            );

            return disabled ? (
              <div key={project.id}>{cardContent}</div>
            ) : (
              <Link key={project.id} to={`/projects/${project.id}`}>
                {cardContent}
              </Link>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-medium text-[#202124]">プロジェクトを新規作成</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">プロジェクト名</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  pattern="^[a-z0-9-]+$"
                  placeholder="英小文字、数字、ハイフンのみ"
                  className="w-full px-4 py-3 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-2 focus:ring-google-blue/20 focus:border-google-blue transition-all text-sm"
                />
                <p className="text-[10px] text-[#5f6368]">
                  ※ プロジェクト名は Kubernetes のネームスペース名としても使用されます。
                </p>
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-google-blue text-white rounded-md hover:shadow-lg font-medium transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>作成中...</span>
                    </>
                  ) : (
                    <span>プロジェクトを作成</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
