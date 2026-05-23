import React from 'react';
import { TrendingUp, BarChart2, ShieldCheck } from 'lucide-react';

const Monitoring: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-normal text-[#202124]">モニタリング</h2>
        <p className="text-sm text-[#5f6368] mt-1">リソースの使用状況とシステムの健全性をリアルタイムで監視します。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="google-card p-6 h-64 flex flex-col items-center justify-center text-gray-400 space-y-4">
          <TrendingUp size={48} opacity={0.2} />
          <p className="text-sm">CPU 使用率グラフ (実装予定)</p>
        </div>
        <div className="google-card p-6 h-64 flex flex-col items-center justify-center text-gray-400 space-y-4">
          <BarChart2 size={48} opacity={0.2} />
          <p className="text-sm">メモリ使用率グラフ (実装予定)</p>
        </div>
      </div>

      <div className="google-card p-6 space-y-4">
        <h3 className="text-lg font-medium text-[#202124]">ノードの健全性</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShieldCheck size={18} className="text-google-green" />
                <span className="text-sm font-medium">k8s-node-{i}</span>
              </div>
              <span className="text-xs font-bold text-google-green uppercase tracking-widest">Healthy</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Monitoring;
