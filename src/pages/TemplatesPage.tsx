import React, { useEffect, useState } from 'react';
import type { TemplateSummary } from '../lib/types';
import { listTemplates } from '../services/templates';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { TopBar } from '../components/layout/TopBar';
import { toastError } from '../components/ui/Toast';

const CATEGORY_COLORS: Record<string, string> = {
  database:   'bg-blue-100 text-blue-700',
  cache:      'bg-orange-100 text-orange-700',
  queue:      'bg-purple-100 text-purple-700',
  messaging:  'bg-purple-100 text-purple-700',
  web:        'bg-green-100 text-green-700',
  storage:    'bg-pink-100 text-pink-700',
  monitoring: 'bg-yellow-100 text-yellow-700',
  default:    'bg-gray-100 text-gray-600',
};

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((e: unknown) => toastError(e instanceof Error ? e.message : 'テンプレートの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(templates.map((t) => t.category))];

  const filtered = templates.filter((t) => {
    const matchSearch = !search ||
      t.display_name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <>
      <TopBar breadcrumbs={[{ label: 'テンプレート' }]} />

      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">テンプレート</h1>
          <p className="text-sm text-gray-500 mt-0.5">データベース・キャッシュ・メッセージキューなどをすぐにデプロイできます</p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="テンプレートを検索..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${!activeCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize
                  ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="テンプレートが見つかりません" description="検索条件を変更してみてください。" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t) => {
              const catStyle = CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.default;
              return (
                <div
                  key={t.name}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl">
                      {t.icon}
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${catStyle}`}>
                      {t.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">{t.display_name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{t.description}</p>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-mono">{t.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">v{t.version}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
