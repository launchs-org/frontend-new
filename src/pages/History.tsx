import React from 'react';
import { History, RotateCcw, Filter, Search } from 'lucide-react';

const HistoryPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-[#202124]">履歴・ロールバック</h2>
          <p className="text-sm text-[#5f6368] mt-1">過去の構成スナップショットの管理とシステムの復元を行います。</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="履歴を検索" 
              className="pl-10 pr-4 py-2 bg-white border border-[#dadce0] rounded-md focus:outline-none focus:ring-1 focus:ring-google-blue focus:border-google-blue text-sm w-72"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 py-2 border-b border-[#dadce0]">
        <button className="flex items-center space-x-2 px-3 py-1 hover:bg-gray-100 rounded text-sm text-[#5f6368] font-medium">
          <Filter size={16} />
          <span>プロジェクトで絞り込み</span>
        </button>
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="google-card p-5 bg-white flex items-center justify-between group hover:border-google-blue transition-all">
            <div className="flex items-center space-x-6">
              <div className="p-2.5 bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-google-blue rounded-lg transition-all">
                <History size={20} />
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <p className="text-sm font-medium text-[#202124]">構成スナップショット #{1000-i}</p>
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full font-bold text-[#5f6368] uppercase">System Auto</span>
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1">
                   2026年4月{26-i}日 14:30 • プロジェクト: <span className="font-medium text-[#202124]">main-cluster</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-[#5f6368] font-medium uppercase tracking-wider">変更されたコンテナ</p>
                <p className="text-xs font-medium text-[#202124]">api-gateway, auth-server</p>
              </div>
              <button className="px-4 py-1.5 border border-[#dadce0] rounded text-xs font-medium text-google-blue hover:bg-blue-50 transition-all flex items-center space-x-1">
                <RotateCcw size={14} />
                <span>この時点に復元</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
