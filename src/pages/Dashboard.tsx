import React, { useState, useEffect } from 'react';
import { containerService } from '../services/containerService';
import {
  Layers,
  ArrowUpRight,
  MoreHorizontal,
  Server,
  Box,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface Stats {
  active_projects: number;
  total_containers: number;
  running_instances: number;
}

interface ContainerRow {
  id: string;
  name: string;
  project_id: string;
  status: string;
  git_repo?: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ active_projects: 0, total_containers: 0, running_instances: 0 });
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projectsRes = await containerService.getProjects();
        const projects: any[] = projectsRes.data.data ?? [];

        const active_projects = projects.length;

        // プロジェクト詳細を並列取得してコンテナ一覧を集計
        const detailResults = await Promise.allSettled(
          projects.map((p: any) => containerService.getProject(p.id))
        );

        const allContainers: ContainerRow[] = [];
        let running_instances = 0;

        detailResults.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          const detail = result.value.data.data;
          const cs: any[] = detail.containers ?? [];
          cs.forEach((c) => {
            allContainers.push({
              id: c.id,
              name: c.name,
              project_id: detail.id,
              status: c.status,
              git_repo: c.git_repo,
            });
            if (c.status === 'running') running_instances += (c.ready_replicas ?? 0);
          });
        });

        setStats({
          active_projects,
          total_containers: allContainers.length,
          running_instances,
        });
        setContainers(allContainers);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { name: '稼働中のプロジェクト', value: stats.active_projects.toString(), icon: Box, color: 'text-google-blue' },
    { name: '総コンテナ数', value: stats.total_containers.toString(), icon: Layers, color: 'text-google-green' },
    { name: '実行中のインスタンス', value: stats.running_instances.toString(), icon: Server, color: 'text-google-yellow' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-normal text-[#202124]">ダッシュボード</h2>
          <p className="text-sm text-[#5f6368] mt-1">システム全体の稼働状況を確認できます。</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="google-card p-6">
            <div className="flex justify-between items-start">
              <div className={stat.color}>
                <stat.icon size={24} />
              </div>
              <ArrowUpRight size={18} className="text-gray-300" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-[#5f6368]">{stat.name}</p>
              <h3 className="text-3xl font-medium text-[#202124] mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {/* Recent Containers */}
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-medium text-[#202124]">最近のコンテナ</h3>
          <Link to="/projects" className="text-sm text-google-blue font-medium hover:underline">プロジェクト一覧</Link>
        </div>

        {loading ? (
          <div className="google-card flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-google-blue animate-spin" />
            <p className="text-sm text-[#5f6368]">データを読み込み中...</p>
          </div>
        ) : (
          <div className="google-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#dadce0]">
                <tr>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">コンテナ名</th>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">ステータス</th>
                  <th className="px-6 py-4 font-medium text-[#5f6368]">リポジトリ</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0]">
                {containers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#5f6368]">デプロイされたコンテナはありません</td>
                  </tr>
                ) : (
                  containers.slice(0, 5).map((container) => (
                    <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <Server size={18} className="text-google-blue" />
                          <div>
                            <p className="font-medium text-[#202124]">{container.name}</p>
                            <p className="text-xs text-[#5f6368] truncate max-w-[200px]">{container.git_repo ?? '---'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "flex items-center space-x-2",
                          container.status === 'running' ? "text-google-green" : "text-[#5f6368]"
                        )}>
                          {container.status === 'running' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                          <span className="font-medium">{container.status === 'running' ? '稼働中' : container.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-[#3c4043] font-mono">
                          {container.git_repo ? container.git_repo.split('/').slice(-1)[0] : '---'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/projects/${container.project_id}`} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 inline-block">
                          <MoreHorizontal size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
