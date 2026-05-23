import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, GitBranch, Folder, ChevronDown } from 'lucide-react';

interface DeployModalProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    creating: boolean;
}

const GITHUB_URL_RE = /github\.com[/:][^/]+\/[^/\s]+/;

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
    const m = url.match(/github\.com[/:]([^/]+)\/([^/\s]+)/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function fetchBranches(repoUrl: string): Promise<string[]> {
    const parsed = parseGitHubRepo(repoUrl);
    if (!parsed) throw new Error('invalid url');
    const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`,
        { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return (data as { name: string }[]).map((b) => b.name);
}

async function fetchDirectories(repoUrl: string, branch: string): Promise<string[]> {
    const parsed = parseGitHubRepo(repoUrl);
    if (!parsed) throw new Error('invalid url');
    const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/?ref=${branch}`,
        { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const dirs = (data as { name: string; type: string; path: string }[])
        .filter((c) => c.type === 'dir')
        .map((c) => `./${c.path}`);
    return ['.', ...dirs];
}

export const DeployModal: React.FC<DeployModalProps> = ({
    formData, setFormData, onSubmit, onClose, creating
}) => {
    const [branches, setBranches] = useState<string[]>([]);
    const [directories, setDirectories] = useState<string[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingDirs, setLoadingDirs] = useState(false);
    const [repoError, setRepoError] = useState<string | null>(null);

    const lastFetchedRepo = useRef('');
    const lastFetchedBranchKey = useRef('');

    // URLが有効なGitHubリポジトリURLになったらブランチを取得
    useEffect(() => {
        const url = formData.repository_url?.trim() ?? '';
        if (!GITHUB_URL_RE.test(url)) {
            setBranches([]);
            setDirectories([]);
            setRepoError(null);
            lastFetchedRepo.current = '';
            lastFetchedBranchKey.current = '';
            return;
        }
        if (lastFetchedRepo.current === url) return;
        lastFetchedRepo.current = url;
        lastFetchedBranchKey.current = '';

        setBranches([]);
        setDirectories([]);
        setLoadingBranches(true);
        setRepoError(null);

        fetchBranches(url)
            .then((items) => {
                setBranches(items);
                const defaultBranch = items.includes('main')
                    ? 'main'
                    : items.includes('master')
                        ? 'master'
                        : items[0] ?? '';
                setFormData((prev: any) => ({ ...prev, branch: defaultBranch, directory: '' }));
            })
            .catch(() => {
                setRepoError('リポジトリが見つかりません。URLを確認してください。');
            })
            .finally(() => setLoadingBranches(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.repository_url]);

    // ブランチが確定したらディレクトリ一覧を取得
    useEffect(() => {
        const url = formData.repository_url?.trim() ?? '';
        const branch = formData.branch ?? '';
        if (!url || !branch || !GITHUB_URL_RE.test(url)) return;

        const key = `${url}@${branch}`;
        if (lastFetchedBranchKey.current === key) return;
        lastFetchedBranchKey.current = key;

        setDirectories([]);
        setLoadingDirs(true);

        fetchDirectories(url, branch)
            .then((items) => {
                setDirectories(items);
                setFormData((prev: any) => ({ ...prev, directory: items[0] ?? '.' }));
            })
            .catch(() => {
                setDirectories(['.']);
                setFormData((prev: any) => ({ ...prev, directory: '.' }));
            })
            .finally(() => setLoadingDirs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.branch, formData.repository_url]);

    const handleBranchChange = (branch: string) => {
        lastFetchedBranchKey.current = '';
        setDirectories([]);
        setFormData({ ...formData, branch, directory: '' });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">新規デプロイ</h3>
                        <p className="text-xs text-gray-500 mt-1">GitHubリポジトリからコンテナを作成します</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-8 space-y-6">
                    {/* コンテナ名 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">コンテナ名</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="my-awesome-api"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* GitHub URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">GitHub Repository URL</label>
                        <div className="relative">
                            <input
                                type="url"
                                value={formData.repository_url}
                                onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
                                required
                                placeholder="https://github.com/user/repo"
                                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all pr-10 ${
                                    repoError ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-blue-500'
                                }`}
                            />
                            {loadingBranches && (
                                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                            )}
                        </div>
                        {repoError && (
                            <p className="text-xs text-red-500">{repoError}</p>
                        )}
                    </div>

                    {/* ブランチ選択 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <GitBranch size={11} />ブランチ
                        </label>
                        {branches.length > 0 ? (
                            <div className="relative">
                                <select
                                    value={formData.branch}
                                    onChange={(e) => handleBranchChange(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all appearance-none pr-10"
                                >
                                    {branches.map((b) => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    placeholder={loadingBranches ? '取得中...' : 'main'}
                                    disabled={loadingBranches}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                                />
                                {loadingBranches && (
                                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                                )}
                            </div>
                        )}
                    </div>

                    {/* ディレクトリ選択 */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Folder size={11} />ディレクトリ
                        </label>
                        {directories.length > 0 ? (
                            <div className="relative">
                                <select
                                    value={formData.directory}
                                    onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all appearance-none pr-10"
                                >
                                    {directories.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData.directory}
                                    onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                                    placeholder={loadingDirs ? '取得中...' : '.'}
                                    disabled={loadingDirs}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                                />
                                {loadingDirs && (
                                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={creating || loadingBranches}
                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
                    >
                        {creating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                        <span>{creating ? '準備中...' : 'デプロイを開始する'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};
