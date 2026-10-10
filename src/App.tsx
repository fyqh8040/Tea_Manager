import React, { useState, useEffect, useMemo } from 'react';
import {
  Leaf,
  Plus,
  Search,
  Settings,
  Shield,
  User as UserIcon,
  Package,
  Coins,
  AlertTriangle,
  Loader2,
  Database,
  LayoutGrid,
  Table as TableIcon,
  Hourglass,
  Tag
} from 'lucide-react';

import { TeaItem, AppConfig, ViewMode } from './types/tea';
import { useAuth } from './hooks/useAuth';
import { useTeaData } from './hooks/useTeaData';
import { TEA_QUOTES } from './constants/tea';
import { getGreeting, formatCurrency } from './utils/formatters';

import { Button } from './components/ui/Button';
import { StatCard } from './components/ui/StatCard';
import { EmptyState } from './components/ui/EmptyState';
import { LoginScreen } from './components/auth/LoginScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { ItemCard } from './components/tea/ItemCard';
import { ItemModal } from './components/tea/ItemModal';
import { TableView } from './components/tea/TableView';
import { TimelineView } from './components/tea/TimelineView';
import { TeaCardPosterModal } from './components/tea/TeaCardPosterModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { DbInitModal } from './components/settings/DbInitModal';
import { FloatingSommelier } from './components/ai/FloatingSommelier';

export const App: React.FC = () => {
  // Server Config
  const [serverConfig, setServerConfig] = useState<AppConfig | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('GALLERY');

  // Poster Modal
  const [posterItem, setPosterItem] = useState<TeaItem | null>(null);

  // Auth Hook
  const { user, setUser, isAuthLoading, login, logout, markPasswordChanged } = useAuth();

  // Tea Data Hook
  const {
    items,
    filteredItems,
    isLoading,
    dbError,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedTag,
    setSelectedTag,
    allTags,
    fetchItems,
    saveItem,
    deleteItem,
    updateStock,
    stats
  } = useTeaData(!!user, logout);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDbInitOpen, setIsDbInitOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeaItem | null>(null);

  // Fetch Public Env Info
  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await fetch('/api/env');
        if (res.ok) {
          const envData = await res.json();
          setServerConfig(envData);
        }
      } catch (e) {
        console.warn('Env fetch failed:', e);
      }
    };
    fetchEnv();
  }, []);

  // Force Password Change for Initial Admin
  useEffect(() => {
    if (user?.is_initial) {
      setIsPasswordModalOpen(true);
    }
  }, [user]);

  // Greeting & Tea Quote
  const greeting = useMemo(() => getGreeting(), []);
  const quote = useMemo(
    () => TEA_QUOTES[Math.floor(Math.random() * TEA_QUOTES.length)],
    []
  );

  // Export JSON Backup
  const handleExportData = () => {
    if (items.length === 0) {
      alert('当前暂无可导出的藏品数据');
      return;
    }
    const exportPayload = {
      app: '茶韵典藏',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      user: user?.nickname || user?.username,
      totalCount: items.length,
      items: items
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `茶韵典藏_数据备份_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 1. Loading Authentication State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  // 2. Unauthenticated -> Show Login Screen
  if (!user) {
    return (
      <>
        <LoginScreen onLogin={login} onOpenDbInit={() => setIsDbInitOpen(true)} />
        {isDbInitOpen && (
          <DbInitModal
            isOpen={isDbInitOpen}
            onClose={() => setIsDbInitOpen(false)}
            onSuccess={fetchItems}
          />
        )}
      </>
    );
  }

  // 3. Authenticated -> Main Workspace
  return (
    <div className="min-h-screen text-tea-800 font-sans pb-24 bg-[#f7f7f5]">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-40 glass-panel border-b border-white/40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white shadow-sm shadow-accent/25">
              <Leaf size={19} />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-tea-900 block leading-tight">
                茶韵典藏
              </span>
              <span className="text-[10px] text-tea-400 font-mono tracking-wider">
                TEA COLLECTION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              className="!px-2.5"
              onClick={() => setIsSettingsOpen(true)}
              title="设置"
            >
              {user.role === 'admin' ? (
                <Shield size={16} className="text-accent mr-1" />
              ) : (
                <UserIcon size={16} className="text-tea-500 mr-1" />
              )}
              <Settings size={18} />
            </Button>

            <Button
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              disabled={!!dbError}
              className="shadow-md shadow-accent/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline font-medium">添置藏品</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 pt-24 sm:pt-28">
        {/* Header Banner */}
        <header className="mb-7 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <h1 className="font-serif text-3xl md:text-4xl text-tea-900 mb-2.5 tracking-tight">
              {greeting}，{user.nickname || user.username}
            </h1>

            {dbError === 'TABLE_MISSING' ? (
              <p className="text-red-600 font-medium text-xs flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg inline-flex">
                <AlertTriangle size={15} /> 数据库尚未检测到数据表结构
              </p>
            ) : (
              <div className="text-tea-600 font-serif italic flex items-center gap-2 text-xs md:text-sm opacity-85">
                <span className="w-5 h-[1px] bg-accent/60 inline-block" />
                {quote}
              </div>
            )}
          </div>

          {!dbError && (
            <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <StatCard
                icon={<Package size={22} />}
                label="藏品总数"
                value={stats.totalItems}
                subtext={`茶品 ${stats.teaCount} · 茶器 ${stats.teawareCount}`}
              />
              <StatCard
                icon={<Coins size={22} />}
                label="估算总值"
                value={formatCurrency(stats.totalValue)}
                subtext={
                  stats.lowStockCount > 0
                    ? `⚠️ ${stats.lowStockCount} 款藏品库存见底`
                    : '入库总成本'
                }
              />
            </div>
          )}
        </header>

        {/* Toolbar: Search, Type Tabs & Multi-View Switcher */}
        <div className="flex flex-col gap-3 mb-6 sticky top-16 z-30 py-2.5 -mx-4 px-4 bg-[#f7f7f5]/95 backdrop-blur-md transition-all border-b border-tea-100 sm:border-b-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tea-400"
                size={17}
              />
              <input
                type="text"
                placeholder="快速搜寻品名、年份、产地、泥料、仓位或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-tea-200/80 focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-xs text-sm placeholder-tea-300 transition-all"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Type Filter Buttons */}
              <div className="flex gap-1 bg-tea-100/70 p-1 rounded-xl">
                {(
                  [
                    { label: '全部', value: 'ALL' },
                    { label: '茶品', value: 'TEA' },
                    { label: '茶器', value: 'TEAWARE' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterType(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      filterType === tab.value
                        ? 'bg-white text-tea-900 shadow-xs'
                        : 'text-tea-500 hover:text-tea-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Mode Switcher */}
              <div className="flex gap-0.5 bg-tea-100/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('GALLERY')}
                  title="画廊卡片视图"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'GALLERY'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-tea-400 hover:text-tea-700'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  title="紧凑数据表格视图"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-tea-400 hover:text-tea-700'
                  }`}
                >
                  <TableIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TIMELINE')}
                  title="陈化时间轴视图"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'TIMELINE'
                      ? 'bg-white text-accent shadow-xs'
                      : 'text-tea-400 hover:text-tea-700'
                  }`}
                >
                  <Hourglass size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Tag Filter Bar (if tags exist) */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-tea-400 shrink-0 flex items-center gap-1 text-[11px] mr-1">
                <Tag size={12} /> 标签:
              </span>
              <button
                type="button"
                onClick={() => setSelectedTag('ALL')}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedTag === 'ALL'
                    ? 'bg-tea-800 text-white'
                    : 'bg-white text-tea-600 border border-tea-200/70 hover:border-tea-300'
                }`}
              >
                全部标签
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === t ? 'ALL' : t)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                    selectedTag === t
                      ? 'bg-accent text-white'
                      : 'bg-white text-tea-600 border border-tea-200/70 hover:border-accent hover:text-accent'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        )}

        {/* Database Missing Error State */}
        {dbError === 'TABLE_MISSING' && !isLoading && (
          <div className="py-14 text-center bg-white rounded-2xl border border-red-100 p-8 shadow-sm max-w-lg mx-auto">
            <div className="mx-auto w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 text-red-500">
              <Database size={26} />
            </div>
            <h3 className="text-lg font-bold text-red-700 mb-2 font-serif">数据库未初始化</h3>
            <p className="text-xs text-tea-500 mb-5 leading-relaxed">
              云端 PostgreSQL / Neon 已连接，但尚未创建数据表结构。点击下方按钮即可一键完成安全初始化。
            </p>
            <Button
              onClick={() => setIsDbInitOpen(true)}
              className="mx-auto"
              variant="danger"
            >
              打开初始化向导
            </Button>
          </div>
        )}

        {/* View Modes Rendering */}
        {!isLoading && !dbError && (
          <>
            {filteredItems.length === 0 ? (
              <EmptyState
                title={searchQuery || selectedTag !== 'ALL' ? '未找到匹配藏品' : '暂无藏品登记'}
                description={
                  searchQuery || selectedTag !== 'ALL'
                    ? '未搜寻到匹配筛选条件的藏品，请尝试清空筛选。'
                    : '静坐啜香茗，幽芳自可怡。点击下方按钮登记您的第一款茶品或茶器。'
                }
                actionLabel={searchQuery || selectedTag !== 'ALL' ? '清空筛选' : '添置藏品'}
                onAction={() => {
                  if (searchQuery || selectedTag !== 'ALL') {
                    setSearchQuery('');
                    setSelectedTag('ALL');
                  } else {
                    setEditingItem(null);
                    setIsItemModalOpen(true);
                  }
                }}
              />
            ) : (
              <>
                {/* 1. Gallery Mode */}
                {viewMode === 'GALLERY' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                        onOpenPoster={(itemToShare) => setPosterItem(itemToShare)}
                      />
                    ))}
                  </div>
                )}

                {/* 2. Table Mode */}
                {viewMode === 'TABLE' && (
                  <TableView
                    items={filteredItems}
                    onSelectItem={(item) => {
                      setEditingItem(item);
                      setIsItemModalOpen(true);
                    }}
                    onOpenPoster={(itemToShare) => setPosterItem(itemToShare)}
                  />
                )}

                {/* 3. Timeline Mode */}
                {viewMode === 'TIMELINE' && (
                  <TimelineView
                    items={filteredItems}
                    onSelectItem={(item) => {
                      setEditingItem(item);
                      setIsItemModalOpen(true);
                    }}
                    onOpenPoster={(itemToShare) => setPosterItem(itemToShare)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Item Modal (Create / Edit, Radar, Tasting Notes & Inventory Logs) */}
      {isItemModalOpen && (
        <ItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          item={editingItem}
          onSave={async (itemData) => {
            const ok = await saveItem(itemData);
            if (ok) {
              setIsItemModalOpen(false);
              setEditingItem(null);
            }
          }}
          onDelete={async (id) => {
            const ok = await deleteItem(id);
            if (ok) {
              setIsItemModalOpen(false);
              setEditingItem(null);
            }
          }}
          onStockUpdate={async (id, newQ, amt, r, n) => {
            const updated = await updateStock(id, newQ, amt, r, n);
            return !!updated;
          }}
          config={serverConfig}
          onOpenPoster={(itemToShare) => setPosterItem(itemToShare)}
        />
      )}

      {/* Tea Card Poster Modal */}
      {posterItem && (
        <TeaCardPosterModal
          isOpen={!!posterItem}
          onClose={() => setPosterItem(null)}
          item={posterItem}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={serverConfig}
          user={user}
          setUser={setUser}
          onLogout={logout}
          onChangePassword={() => setIsPasswordModalOpen(true)}
          onDbError={() => setIsDbInitOpen(true)}
          onExportData={handleExportData}
          onImportSuccess={fetchItems}
        />
      )}

      {/* Database Schema Migration Modal */}
      {isDbInitOpen && (
        <DbInitModal
          isOpen={isDbInitOpen}
          onClose={() => setIsDbInitOpen(false)}
          onSuccess={fetchItems}
        />
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSuccess={markPasswordChanged}
          forced={user?.is_initial}
        />
      )}

      {/* AI Floating Tea Sommelier */}
      {user && (
        <FloatingSommelier
          items={items}
          onSelectItem={(selectedItem) => {
            setEditingItem(selectedItem);
            setIsItemModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
