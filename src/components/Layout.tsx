import React, { useState } from 'react'; // useStateを追加
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    History,
    Settings,
    Plus,
    Activity,
    Menu
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    // サイドバーの状態管理
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { name: 'ダッシュボード', icon: LayoutDashboard, path: '/', disabled: true },
        { name: 'プロジェクト', icon: Box, path: '/projects' },
        { name: '履歴・ロールバック', icon: History, path: '/history', disabled: true },
        { name: 'モニタリング', icon: Activity, path: '/monitoring', disabled: true },
        { name: '設定', icon: Settings, path: '/settings', disabled: true },
    ];

    // 開いているタブが変わるたびに呼び出す
    React.useEffect(() => {
        console.log(location.pathname);

        // /projects/ 配下の時はサイドバーを閉じる
        if (location.pathname.startsWith('/projects/')) {
            setIsCollapsed(true);
        }
    }, [location.pathname]);

    return (
        <div className="flex h-screen bg-[#f8f9fa] text-[#3c4043] font-sans">
            {/* Sidebar */}
            <aside 
                className={cn(
                    "flex flex-col bg-white border-r border-[#dadce0] transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-96"
                )}
            >
                {/* Header / Toggle Area */}
                <div className="h-16 flex items-center px-6">
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <Menu size={20} />
                    </button>
                    {!isCollapsed && (
                        <h1 className="ml-4 text-xl font-medium text-[#5f6368] tracking-tight whitespace-nowrap">
                            Launchs
                        </h1>
                    )}
                </div>

                {/* Create Button Area */}
                <div className={cn("p-4 mb-2 flex", isCollapsed ? "justify-center" : "justify-start")}>
                    <button 
                        className={cn(
                            "flex items-center bg-white border border-[#dadce0] shadow-sm hover:shadow-md transition-all text-sm font-medium",
                            isCollapsed 
                                ? "p-3 rounded-2xl" // 閉じている時は正方形に近い形
                                : "px-4 py-3 rounded-full space-x-3" // 開いている時は丸薬型
                        )}
                    >
                        <Plus className="text-[#1a73e8]" size={24} />
                        {!isCollapsed && <span>作成</span>}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 pr-4 space-y-1 overflow-x-hidden">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path && !item.disabled;
                        
                        return (
                            <div
                                key={item.name}
                                className={cn(
                                    "flex items-center justify-between py-3 transition-colors text-sm font-medium relative group",
                                    isCollapsed ? "px-0 justify-center ml-4" : "pl-6 pr-2",
                                    isActive
                                        ? "sidebar-item-active" // active時のスタイルはCSSクラスに依存
                                        : "text-[#5f6368] hover:bg-gray-100 rounded-r-full",
                                    item.disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center space-x-4">
                                    <item.icon 
                                        size={20} 
                                        className={isActive ? "text-[#1a73e8]" : "text-gray-500"} 
                                    />
                                    {!isCollapsed && (
                                        <div className="whitespace-nowrap overflow-hidden">
                                            {!item.disabled ? (
                                                <Link to={item.path} className="stretched-link">{item.name}</Link>
                                            ) : (
                                                <span>{item.name}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {!isCollapsed && item.disabled && (
                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                                        Soon
                                    </span>
                                )}

                                {/* 閉じている時のツールチップ（オプション） */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                        {item.name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className={cn(
                    "p-4 border-t border-[#dadce0] text-[11px] text-gray-500 flex transition-all",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {isCollapsed ? (
                        <a href="https://launchs-org.github.io/docs/usage/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">?</a>
                    ) : (
                        <>
                            <span>プライバシー • 規約</span>
                            <a href="https://launchs-org.github.io/docs/usage/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">ヘルプ</a>
                        </>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;