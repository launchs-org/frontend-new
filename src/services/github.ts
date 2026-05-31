const GITHUB_API = 'https://api.github.com';

export interface GitHubBranch {
  name: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
}

/** GitHub URL または owner/repo 形式から owner/repo を抽出します */
export function parseRepo(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, '');
  // https://github.com/owner/repo 形式
  const urlMatch = trimmed.match(/github\.com\/([^/]+\/[^/]+)/);
  if (urlMatch) return urlMatch[1];
  // owner/repo 形式
  if (/^[^/]+\/[^/]+$/.test(trimmed)) return trimmed;
  return null;
}

export async function listBranches(repo: string): Promise<GitHubBranch[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/branches?per_page=100`);
  if (!res.ok) throw new Error('ブランチの取得に失敗しました');
  return res.json();
}

export async function listCommits(repo: string, branch: string): Promise<GitHubCommit[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=30`);
  if (!res.ok) throw new Error('コミット履歴の取得に失敗しました');
  return res.json();
}

export async function listDirectories(repo: string, branch: string): Promise<string[]> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/git/trees/${branch}?recursive=1`);
  if (!res.ok) throw new Error('ディレクトリの取得に失敗しました');
  const data: { tree: GitHubTreeItem[]; truncated?: boolean } = await res.json();
  const dirs = data.tree
    .filter((item) => item.type === 'tree')
    .map((item) => `./${item.path}`);
  return ['.', ...dirs];
}
