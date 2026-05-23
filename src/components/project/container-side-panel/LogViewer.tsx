import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowUp, ArrowDown, ChevronsDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface LogLine {
    raw: string;
    index: number; // original order
}

interface LogViewerProps {
    lines: string[];
    isPolling?: boolean;
    pollingLabel?: string;
    emptyMessage?: string;
}

type SortOrder = 'asc' | 'desc';

export const LogViewer: React.FC<LogViewerProps> = ({
    lines,
    isPolling = false,
    pollingLabel = 'ポーリング中',
    emptyMessage = 'ログがありません',
}) => {
    const [query, setQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [autoScroll, setAutoScroll] = useState(true);
    const [matchIndex, setMatchIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const matchRefs = useRef<(HTMLDivElement | null)[]>([]);

    // build display lines
    const displayLines: LogLine[] = React.useMemo(() => {
        const mapped = lines.map((raw, index) => ({ raw, index }));
        return sortOrder === 'desc' ? [...mapped].reverse() : mapped;
    }, [lines, sortOrder]);

    const filteredLines: LogLine[] = React.useMemo(() => {
        if (!query.trim()) return displayLines;
        const q = query.toLowerCase();
        return displayLines.filter(l => l.raw.toLowerCase().includes(q));
    }, [displayLines, query]);

    const matchCount = filteredLines.length;

    // auto scroll to bottom
    useEffect(() => {
        if (autoScroll && sortOrder === 'asc') {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [lines, autoScroll, sortOrder]);

    // reset match index when query changes
    useEffect(() => {
        setMatchIndex(0);
    }, [query]);

    // scroll to current match
    useEffect(() => {
        if (!query.trim() || matchCount === 0) return;
        const el = matchRefs.current[matchIndex];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [matchIndex, query, matchCount]);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        setAutoScroll(atBottom);
    }, []);

    const highlight = (text: string, q: string) => {
        if (!q.trim()) return <span className="text-gray-200 break-all">{text}</span>;
        const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <span className="text-gray-200 break-all">
                {parts.map((p, i) =>
                    p.toLowerCase() === q.toLowerCase()
                        ? <mark key={i} className="bg-yellow-400 text-black rounded-sm px-0.5">{p}</mark>
                        : p
                )}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a]">
            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-[#111] border-b border-white/10">
                {/* Search */}
                <div className="flex-1 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-1">
                    <Search size={11} className="text-gray-500 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="ログを検索..."
                        className="flex-1 bg-transparent text-[10px] text-gray-300 placeholder-gray-600 outline-none min-w-0"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-400">
                            <X size={10} />
                        </button>
                    )}
                </div>

                {/* Match navigation */}
                {query.trim() && (
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-gray-500 font-mono whitespace-nowrap">
                            {matchCount === 0 ? '0件' : `${matchIndex + 1}/${matchCount}`}
                        </span>
                        <button
                            onClick={() => setMatchIndex(i => Math.max(0, i - 1))}
                            disabled={matchCount === 0 || matchIndex === 0}
                            className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30"
                        >
                            <ArrowUp size={11} />
                        </button>
                        <button
                            onClick={() => setMatchIndex(i => Math.min(matchCount - 1, i + 1))}
                            disabled={matchCount === 0 || matchIndex === matchCount - 1}
                            className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30"
                        >
                            <ArrowDown size={11} />
                        </button>
                    </div>
                )}

                {/* Sort */}
                <button
                    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? '新しい順に並び替え' : '古い順に並び替え'}
                    className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-bold border transition-colors shrink-0",
                        sortOrder === 'desc'
                            ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                            : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                    )}
                >
                    <ArrowUpDown size={10} />
                    <span>{sortOrder === 'asc' ? '古い順' : '新しい順'}</span>
                </button>

                {/* Auto scroll */}
                <button
                    onClick={() => {
                        setAutoScroll(v => !v);
                        if (!autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="末尾に自動スクロール"
                    className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-bold border transition-colors shrink-0",
                        autoScroll
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                            : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                    )}
                >
                    <ChevronsDown size={10} />
                    <span>自動</span>
                </button>

                {/* Status */}
                <div className="flex items-center gap-1 shrink-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isPolling ? "bg-yellow-400 animate-pulse" : "bg-gray-600")} />
                    <span className="text-[8px] text-gray-500 whitespace-nowrap">
                        {isPolling ? pollingLabel : 'IDLE'}
                    </span>
                </div>
            </div>

            {/* Log area */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed"
            >
                {filteredLines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-[10px]">
                        {query ? `"${query}" に一致するログがありません` : emptyMessage}
                    </div>
                ) : (
                    filteredLines.map((l, i) => (
                        <div
                            key={l.index}
                            ref={el => { matchRefs.current[i] = el; }}
                            className={cn(
                                "flex gap-3 text-gray-400 group rounded-sm px-0.5",
                                query.trim() && i === matchIndex && "bg-yellow-400/10 outline outline-1 outline-yellow-400/30"
                            )}
                        >
                            <span className="w-7 text-right text-gray-600 select-none group-hover:text-gray-500 shrink-0 tabular-nums">
                                {l.index + 1}
                            </span>
                            {highlight(l.raw, query)}
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </div>

            {/* Footer: line count */}
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-1 bg-[#111] border-t border-white/10">
                <span className="text-[8px] font-mono text-gray-600">
                    {query ? `${matchCount} / ${lines.length} 行` : `${lines.length} 行`}
                </span>
                <span className="text-[8px] font-mono text-gray-700">{sortOrder === 'asc' ? '↑ 古い順' : '↓ 新しい順'}</span>
            </div>
        </div>
    );
};
