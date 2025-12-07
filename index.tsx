
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SCHEMA_SQL as INIT_SQL } from './db/schema_definition.js';
import { 
  Plus, 
  Search, 
  Settings, 
  Image as ImageIcon, 
  Loader2, 
  Trash2, 
  X, 
  Upload, 
  Camera, 
  Leaf, 
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  LogOut,
  Cpu,
  Bug,
  Server,
  Wifi,
  Key,
  History,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Gift,
  AlertOctagon,
  ClipboardList,
  Copy,
  Terminal,
  Play,
  Zap,
  ChevronDown,
  ChevronUp,
  Cloud,
  Scale
} from 'lucide-react';

// --- Types ---

type ItemType = 'TEA' | 'TEAWARE';

interface TeaItem {
  id: string; // UUID from DB
  name: string;
  type: ItemType;
  category: string;
  year?: string;
  origin?: string;
  description?: string;
  image_url?: string;
  quantity: number; 
  unit: string; // Added unit
  created_at: number;
}

interface InventoryLog {
  id: string;
  item_id: string;
  change_amount: number;
  current_balance: number;
  reason: 'PURCHASE' | 'CONSUME' | 'GIFT' | 'DAMAGE' | 'ADJUST' | 'INITIAL';
  note?: string;
  created_at: number;
}

interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  imageApiUrl: string;
  imageApiToken: string;
  hasServerDb?: boolean; 
}

// --- Constants ---

const TEA_UNITS = ['克 (g)', '千克 (kg)', '饼', '砖', '沱', '盒', '罐', '袋', '泡'];
const TEAWARE_UNITS = ['件', '套', '个', '把', '只', '组'];

const formatReason = (reason: string, changeAmount: number = 0) => {
  switch (reason) {
    case 'PURCHASE': return '新购入库';
    case 'CONSUME': return '品饮/使用';
    case 'GIFT': return changeAmount > 0 ? '获赠' : '赠友';
    case 'DAMAGE': return '损耗/遗失';
    case 'ADJUST': return changeAmount > 0 ? '盘盈调整' : '盘亏调整';
    case 'INITIAL': return '初始入库';
    default: return reason;
  }
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button', size = 'md' }: any) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20",
    secondary: "bg-white text-tea-700 border border-tea-200 hover:bg-tea-50 hover:border-tea-300",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    ghost: "text-tea-600 hover:bg-tea-100",
    outline: "border-2 border-tea-200 text-tea-600 hover:border-accent hover:text-accent"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider flex justify-between">
      {label}
      {props.rightLabel}
    </label>
    <input 
      className="w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-tea-800 placeholder-tea-300 disabled:opacity-50 disabled:bg-tea-100/50"
      {...props}
    />
  </div>
);

const TextArea = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">{label}</label>
    <textarea 
      className="w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-tea-800 placeholder-tea-300 min-h-[100px]"
      {...props}
    />
  </div>
);

const Badge = ({ children, color = 'tea' }: any) => {
  const colors = {
    tea: "bg-tea-100 text-tea-700",
    accent: "bg-accent-light/30 text-accent-dark",
    clay: "bg-orange-100 text-orange-800",
    red: "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[color as keyof typeof colors]}`}>
      {children}
    </span>
  );
};

// --- Main Application ---

const App = () => {
  // Config State
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('tea_app_config');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      supabaseUrl: '',
      supabaseKey: '',
      imageApiUrl: 'https://cfbed.sanyue.de/api/upload',
      imageApiToken: '',
      hasServerDb: false
    };
  });

  const [serverConfig, setServerConfig] = useState<AppConfig | null>(null);
  const [isEnvLoading, setIsEnvLoading] = useState(false);

  // Fetch Env from API on Mount
  useEffect(() => {
    const fetchEnv = async () => {
      setIsEnvLoading(true);
      try {
        const res = await fetch('/api/env');
        if (res.ok) {
          const envData = await res.json();
          setServerConfig(envData);
          
          // Auto-inject and update server capability
          setConfig(prev => {
            const newConfig = { ...prev, hasServerDb: envData.hasServerDb }; 
            let changed = prev.hasServerDb !== envData.hasServerDb;
            
            if (!newConfig.supabaseUrl && envData.supabaseUrl) {
              newConfig.supabaseUrl = envData.supabaseUrl;
              changed = true;
            }
            if (!newConfig.supabaseKey && envData.supabaseKey) {
              newConfig.supabaseKey = envData.supabaseKey;
              changed = true;
            }
            if ((!newConfig.imageApiUrl || newConfig.imageApiUrl.includes('cfbed')) && envData.imageApiUrl) {
              newConfig.imageApiUrl = envData.imageApiUrl;
              changed = true;
            }
            if (!newConfig.imageApiToken && envData.imageApiToken) {
              newConfig.imageApiToken = envData.imageApiToken;
              changed = true;
            }

            return changed ? newConfig : prev;
          });
        }
      } catch (e) {
        console.warn("Failed to fetch environment variables from API", e);
      } finally {
        setIsEnvLoading(false);
      }
    };
    
    fetchEnv();
  }, []);

  // Supabase Client Instance (Client-side)
  const supabase = useMemo(() => {
    if (config.supabaseUrl && config.supabaseKey) {
      try {
        if (!config.supabaseUrl.startsWith('http')) return null;
        return createClient(config.supabaseUrl, config.supabaseKey);
      } catch (e) {
        console.error("Invalid Supabase Config", e);
        return null;
      }
    }
    return null;
  }, [config.supabaseUrl, config.supabaseKey]);

  // Derived state: Is System Connected?
  const isConnected = !!supabase || !!config.hasServerDb;

  // Data States
  const [items, setItems] = useState<TeaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TeaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TEA' | 'TEAWARE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null); 
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDbInitOpen, setIsDbInitOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeaItem | null>(null);

  // Dynamic Greeting Logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return '夜深了';
    if (hour < 11) return '早安';
    if (hour < 13) return '午安';
    if (hour < 18) return '午后好';
    return '晚上好';
  }, []);

  // Persist config changes
  useEffect(() => {
    localStorage.setItem('tea_app_config', JSON.stringify(config));
  }, [config]);

  // Load Data
  const fetchItems = async () => {
    if (!isConnected) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setDbError(null);

    try {
      let data: any[] = [];
      let error: any = null;

      if (supabase) {
        const result = await supabase
          .from('tea_items')
          .select('*')
          .order('created_at', { ascending: false });
        data = result.data || [];
        error = result.error;
      } else if (config.hasServerDb) {
        const res = await fetch('/api/data');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Server error');
        data = json.data;
      }

      if (error) {
          if (error.code === '42P01' || error.message.includes('relation "tea_items" does not exist')) { 
              setDbError('TABLE_MISSING');
              setIsDbInitOpen(true);
          } else {
              throw error;
          }
      } else {
          // IMPORTANT: Parse numeric fields from DB (which might be returned as strings by postgres driver)
          const parsedItems = data.map(item => ({
            ...item,
            quantity: Number(item.quantity), // Ensure quantity is a number
            created_at: Number(item.created_at) // Ensure created_at is a number (FIX: Fix 'Invalid Date' issue)
          }));
          setItems(parsedItems);
      }
    } catch (error: any) {
      console.error('Error fetching tea items:', error);
      if (error.message && (error.message.includes('relation "tea_items" does not exist') || error.message.includes('does not exist'))) {
           setDbError('TABLE_MISSING');
           setIsDbInitOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [supabase, config.hasServerDb]); 

  // Filter Logic
  useEffect(() => {
    let result = items;
    if (filterType !== 'ALL') {
      result = result.filter(i => i.type === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q) ||
        i.origin?.toLowerCase().includes(q)
      );
    }
    setFilteredItems(result);
  }, [items, filterType, searchQuery]);

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这件藏品吗？\n删除后相关的库存历史也将一并删除。')) return;
    
    const previousItems = [...items];
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingItem?.id === id) setIsModalOpen(false);

    try {
        if (supabase) {
            const { error } = await supabase.from('tea_items').delete().eq('id', id);
            if (error) throw error;
        } else if (config.hasServerDb) {
            await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('删除失败，数据已恢复');
        setItems(previousItems);
    }
  };

  // Handle Save
  const handleSave = async (item: Partial<TeaItem>) => {
    const itemData = {
      name: item.name,
      type: item.type,
      category: item.category,
      year: item.year,
      origin: item.origin,
      description: item.description,
      image_url: item.image_url,
      quantity: Number(item.quantity ?? 1), // Ensure number
      unit: item.unit || '件',
      ...(item.id ? {} : { created_at: Date.now() }) 
    };

    try {
        if (!isConnected) throw new Error("数据库未连接");

        let savedData: TeaItem | null = null;

        if (supabase) {
            // Mode A: Supabase Client
            if (item.id) {
                const { data, error } = await supabase
                    .from('tea_items')
                    .update(itemData)
                    .eq('id', item.id)
                    .select()
                    .single();
                if (error) throw error;
                savedData = data;
            } else {
                const { data, error } = await supabase
                    .from('tea_items')
                    .insert([itemData])
                    .select()
                    .single();
                if (error) throw error;
                savedData = data;
                
                if (savedData && savedData.quantity > 0) {
                    await supabase.from('inventory_logs').insert([{
                        item_id: savedData.id,
                        change_amount: savedData.quantity,
                        current_balance: savedData.quantity,
                        reason: 'INITIAL',
                        note: '初始入库',
                        created_at: Date.now()
                    }]);
                }
            }
        } else if (config.hasServerDb) {
            // Mode B: Server API
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: item.id ? 'update' : 'create',
                    id: item.id,
                    data: itemData
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            savedData = json.data;
        }

        if (savedData) {
            // Parse savedData numeric fields
            const parsedSavedData = { ...savedData, quantity: Number(savedData.quantity) };
            
            setItems(prev => {
                const exists = prev.find(i => i.id === parsedSavedData!.id);
                if (exists) {
                    return prev.map(i => i.id === parsedSavedData!.id ? parsedSavedData! : i);
                }
                return [parsedSavedData!, ...prev];
            });
            setIsModalOpen(false);
            setEditingItem(null);
        }

    } catch (e: any) {
        console.error("Save error:", e);
        if (e.code === '42P01' || (e.message && e.message.includes('does not exist'))) {
             setDbError('TABLE_MISSING');
             setIsDbInitOpen(true);
        } else {
            alert(`保存失败: ${e.message}`);
        }
    }
  };

  // Stock Update
  const handleStockUpdate = async (id: string, newQuantity: number, changeAmount: number, reason: string, note: string) => {
    if (!isConnected) return;
    try {
      let updatedItem: TeaItem | null = null;

      if (supabase) {
          // Mode A: Supabase 
          const { error: logError } = await supabase.from('inventory_logs').insert([{
            item_id: id,
            change_amount: changeAmount,
            current_balance: newQuantity,
            reason: reason,
            note: note,
            created_at: Date.now()
          }]);
          if (logError) throw logError;

          const { data, error: itemError } = await supabase.from('tea_items')
            .update({ quantity: newQuantity })
            .eq('id', id)
            .select()
            .single();
          if (itemError) throw itemError;
          updatedItem = data as TeaItem;

      } else if (config.hasServerDb) {
          // Mode B: Server API
          const res = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'stock_update',
                  id,
                  newQuantity,
                  changeAmount,
                  reason,
                  note
              })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          updatedItem = json.data;
      }

      if (updatedItem) {
        // IMPORTANT: Parse updatedItem numeric fields
        const parsedUpdatedItem = { ...updatedItem, quantity: Number(updatedItem.quantity) };
        setItems(prev => prev.map(i => i.id === id ? parsedUpdatedItem! : i));
        setEditingItem(parsedUpdatedItem);
        return true;
      }
    } catch (e) {
      console.error("Stock update failed", e);
      alert("库存更新失败，请重试");
      return false;
    }
    return false;
  };

  return (
    <div className="min-h-screen text-tea-800 font-sans pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-40 glass-panel border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
              <Leaf size={18} />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-tea-900">茶韵典藏</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="!px-2" onClick={() => setIsSettingsOpen(true)}>
              {isConnected ? (
                  <div className={`w-2 h-2 rounded-full mr-2 shadow-[0_0_8px_rgba(34,197,94,0.5)] ${config.hasServerDb && !supabase ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              ) : (
                  <div className="w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></div>
              )}
              <Settings size={20} />
            </Button>
            <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} disabled={!isConnected || !!dbError}>
              <Plus size={18} />
              <span className="hidden sm:inline">记一笔</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-24">
        
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-tea-900 mb-4">
            {greeting}，藏家
          </h1>
          <p className="text-tea-500 max-w-xl leading-relaxed">
            {!isConnected
              ? "系统未连接到云端。请点击右上角设置图标，配置数据库连接。" 
              : dbError === 'TABLE_MISSING' 
                ? <span className="text-red-500 flex items-center gap-2 font-medium bg-red-50 px-2 py-0.5 rounded-md inline-block mt-1"><AlertTriangle size={16}/> 数据库尚未初始化</span>
                : `目前云端共收录 ${items.length} 件藏品。每一片叶子都有它的故事。`
            }
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 sticky top-20 z-30 py-2 -mx-4 px-4 bg-[#f7f7f5]/90 backdrop-blur-sm sm:static sm:bg-transparent">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tea-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索名称、产地或分类..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-tea-200 focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: '全部', value: 'ALL' },
              { label: '茶品', value: 'TEA' },
              { label: '茶器', value: 'TEAWARE' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterType(tab.value as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === tab.value 
                    ? 'bg-tea-800 text-white shadow-md' 
                    : 'bg-white text-tea-600 hover:bg-tea-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-tea-400" size={32} />
            </div>
        )}

        {/* Error State for Missing DB */}
        {dbError === 'TABLE_MISSING' && !isLoading && (
             <div className="col-span-full py-12 text-center bg-white rounded-xl border border-red-100 p-8 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-2 font-serif">数据库未初始化</h3>
              <p className="text-tea-600 mb-6 max-w-lg mx-auto leading-relaxed">
                您的 Vercel 部署已成功，但数据库中还缺少必要的表结构。
                <br/>您可以选择使用连接字符串一键修复。
              </p>
              <Button onClick={() => setIsDbInitOpen(true)} className="mx-auto" variant="danger">
                 <Terminal size={18}/> 打开初始化向导
              </Button>
            </div>
        )}

        {/* Grid */}
        {!isLoading && !dbError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-tea-100 flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] bg-tea-100 overflow-hidden">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-tea-300">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-medium">点击查看详情</p>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                   <Badge color="tea">
                      {item.quantity} {item.unit || '件'}
                   </Badge>
                  <Badge color={item.type === 'TEA' ? 'accent' : 'clay'}>
                    {item.type === 'TEA' ? '茶' : '器'}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-lg font-bold text-tea-900 line-clamp-1">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-tea-500 mb-3">
                  <span className="bg-tea-50 px-2 py-0.5 rounded border border-tea-100">{item.category}</span>
                  {item.year && <span>{item.year}</span>}
                </div>
                
                <div className="mt-auto pt-3 border-t border-tea-50 flex items-center justify-between text-xs text-tea-400">
                  <span>{item.origin || '未知产地'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center text-tea-400">
              <div className="mx-auto w-16 h-16 bg-tea-100 rounded-full flex items-center justify-center mb-4">
                <Database size={24} className="text-tea-400" />
              </div>
              <p>暂无数据。{isConnected ? "快点击右上角添加第一款藏品吧。" : "请在设置中配置 Supabase 连接。"}</p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Modals */}
      {isModalOpen && (
        <ItemModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          item={editingItem}
          onSave={handleSave}
          onDelete={handleDelete}
          onStockUpdate={handleStockUpdate}
          config={config}
          supabase={supabase}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          serverConfig={serverConfig}
          isEnvLoading={isEnvLoading}
          onSave={setConfig}
        />
      )}

      {/* DB Init Modal */}
      {isDbInitOpen && (
        <DbInitModal 
          isOpen={isDbInitOpen} 
          onClose={() => setIsDbInitOpen(false)} 
        />
      )}
    </div>
  );
};

// --- Sub Components ---

const DbInitModal = ({ isOpen, onClose }: any) => {
    const [copied, setCopied] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrateStatus, setMigrateStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');

    const handleCopy = () => {
        navigator.clipboard.writeText(INIT_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAutoMigrate = async () => {
        setIsMigrating(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/migrate', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMigrateStatus('SUCCESS');
                // Reload after a short delay
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMigrateStatus('ERROR');
                setErrorMessage(data.details || data.error || '未知错误');
            }
        } catch (e: any) {
             setMigrateStatus('ERROR');
             setErrorMessage(e.message);
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="font-serif text-xl font-bold text-tea-900 flex items-center gap-2">
                             <Terminal className="text-accent" /> 数据库初始化向导
                        </h3>
                        <p className="text-sm text-tea-500 mt-1">检测到数据库缺失表结构，请选择初始化方式。</p>
                     </div>
                     <button onClick={onClose}><X size={20} className="text-tea-400" /></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    
                    {/* Method 1: Auto Fix */}
                    <div className={`p-5 rounded-xl border-2 transition-all ${migrateStatus === 'ERROR' ? 'border-red-100 bg-red-50' : 'border-accent/20 bg-accent/5'}`}>
                        <div className="flex items-center gap-3 mb-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${migrateStatus === 'ERROR' ? 'bg-red-200 text-red-700' : 'bg-accent text-white'}`}>
                                 {isMigrating ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>}
                             </div>
                             <div>
                                 <h4 className="font-bold text-tea-900">方式一：一键自动初始化 (推荐)</h4>
                                 <p className="text-xs text-tea-500">需要预先在 Vercel 环境变量中配置 <code className="bg-black/5 px-1 rounded">DATABASE_URL</code></p>
                             </div>
                        </div>

                        {migrateStatus === 'SUCCESS' ? (
                            <div className="text-green-600 font-bold flex items-center gap-2 p-2 bg-green-100 rounded-lg justify-center">
                                <CheckCircle2 size={18}/> 初始化成功！正在刷新页面...
                            </div>
                        ) : (
                            <div className="pl-11">
                                <Button onClick={handleAutoMigrate} disabled={isMigrating} className="w-full sm:w-auto">
                                    {isMigrating ? '正在执行...' : '立即执行初始化'}
                                </Button>
                                {migrateStatus === 'ERROR' && (
                                    <div className="mt-3 text-xs text-red-600 bg-white/50 p-2 rounded border border-red-200">
                                        <strong>执行失败:</strong> {errorMessage}
                                        <div className="mt-1 text-tea-500">
                                            请检查 Vercel 环境变量 <code className="text-red-500">DATABASE_URL</code> 是否配置正确，且包含 pg 依赖。
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Method 2: Manual */}
                    <div className="border border-tea-200 rounded-xl overflow-hidden">
                        <button onClick={() => setShowManual(!showManual)} className="w-full flex items-center justify-between p-4 bg-tea-50 hover:bg-tea-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-tea-200 flex items-center justify-center text-tea-600">
                                    <ClipboardList size={16}/>
                                </div>
                                <div className="text-left">
                                     <h4 className="font-bold text-tea-800">方式二：手动 SQL 初始化</h4>
                                     <p className="text-xs text-tea-500">如果不方便配置连接字符串，可手动复制 SQL 执行</p>
                                </div>
                            </div>
                            {showManual ? <ChevronUp size={16} className="text-tea-400"/> : <ChevronDown size={16} className="text-tea-400"/>}
                        </button>
                        
                        {showManual && (
                            <div className="p-4 bg-white border-t border-tea-100 animate-in slide-in-from-top-2">
                                <ol className="list-decimal list-inside space-y-2 text-sm text-tea-600 mb-4">
                                    <li>前往 <a href="https://supabase.com/dashboard" target="_blank" className="text-accent underline">Supabase Dashboard</a> {"->"} SQL Editor {"->"} New Query</li>
                                    <li>复制下方代码并粘贴执行</li>
                                </ol>
                                <div className="relative">
                                    <div className="absolute top-2 right-2 z-10">
                                        <Button size="sm" onClick={handleCopy} className={copied ? "!bg-green-600 !text-white" : ""}>
                                            {copied ? <><CheckCircle2 size={14}/> 已复制</> : <><Copy size={14}/> 复制代码</>}
                                        </Button>
                                    </div>
                                    <pre className="bg-[#1e1e1e] text-gray-300 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-700 leading-relaxed shadow-inner max-h-[200px]">
                                        {INIT_SQL}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
                
                <div className="mt-6 pt-4 border-t border-tea-50 flex justify-end">
                    <Button onClick={() => window.location.reload()}>
                        <RotateCcw size={16}/> 刷新页面检查状态
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ItemModal = ({ isOpen, onClose, item, onSave, onDelete, onStockUpdate, config, supabase }: any) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
  const [formData, setFormData] = useState<Partial<TeaItem>>({
    type: 'TEA',
    name: '',
    category: '',
    year: '',
    origin: '',
    description: '',
    image_url: '',
    quantity: 1,
    unit: '克 (g)' // Default for tea
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History State
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setActiveTab('DETAILS');
      fetchLogs(item.id);
    } else {
      setFormData({
        type: 'TEA',
        name: '',
        category: '',
        year: '',
        origin: '',
        description: '',
        image_url: '',
        quantity: 1,
        unit: '克 (g)'
      });
      setActiveTab('DETAILS');
      setLogs([]);
    }
  }, [item]);

  // Auto-switch default unit when type changes
  useEffect(() => {
    // Only auto-switch for new items to prevent overwriting existing custom units
    // or if the current unit is completely invalid/empty
    const isNew = !item;
    const currentUnit = formData.unit || '';
    
    if (isNew) {
        if (formData.type === 'TEA' && !TEA_UNITS.includes(currentUnit)) {
            setFormData(prev => ({...prev, unit: '克 (g)'}));
        } else if (formData.type === 'TEAWARE' && !TEAWARE_UNITS.includes(currentUnit)) {
            setFormData(prev => ({...prev, unit: '件'}));
        }
    }
  }, [formData.type, item]); // Added item dependency to be explicit

  const fetchLogs = async (itemId: string) => {
    setIsLoadingLogs(true);
    try {
        if (supabase) {
            const { data } = await supabase.from('inventory_logs')
            .select('*')
            .eq('item_id', itemId)
            .order('created_at', { ascending: false });
            if (data) setLogs(data);
        } else if (config.hasServerDb) {
            const res = await fetch(`/api/data?action=get_logs&id=${itemId}`);
            const json = await res.json();
            if (json.data) {
                // Parse logs numeric fields
                const parsedLogs = json.data.map((log: any) => ({
                    ...log,
                    change_amount: Number(log.change_amount),
                    current_balance: Number(log.current_balance),
                    created_at: Number(log.created_at) // FIX: Parse created_at here too for consistency
                }));
                setLogs(parsedLogs);
            }
        }
    } catch (e) {
        console.error("Fetch logs error", e);
    } finally {
        setIsLoadingLogs(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const readFileAsBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    };

    try {
      let uploadSuccess = false;
      if (config.imageApiUrl) {
          try {
              const data = new FormData();
              data.append('file', file);
              if (config.imageApiToken) {
                  data.append('token', config.imageApiToken);
              }
              const response = await fetch(config.imageApiUrl, { method: 'POST', body: data });
              if (response.ok) {
                const result = await response.json();
                const uploadedUrl = result.url || result.data?.url || result.link; 
                if (uploadedUrl) {
                  setFormData(prev => ({ ...prev, image_url: uploadedUrl }));
                  uploadSuccess = true;
                }
              }
          } catch (netError) { console.warn('Network upload failed, falling back to base64'); }
      }
      if (!uploadSuccess) {
        const base64 = await readFileAsBase64(file);
        setFormData(prev => ({ ...prev, image_url: base64 }));
      }
    } catch (error) { alert('图片处理出错'); } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Helper to ensure current unit is in options list
  const getUnitOptions = () => {
    const baseOptions = formData.type === 'TEA' ? TEA_UNITS : TEAWARE_UNITS;
    const current = formData.unit || '';
    if (current && !baseOptions.includes(current)) {
        return [current, ...baseOptions];
    }
    return baseOptions;
  };
  const currentOptions = getUnitOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#fcfcfb] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-tea-100 flex justify-between items-center bg-white">
           <h2 className="font-serif text-xl font-bold text-tea-900">
              {item ? (activeTab === 'DETAILS' ? '藏品详情' : '库存与历史') : '入库登记'}
           </h2>
           <button onClick={onClose} className="text-tea-400 hover:text-tea-600"><X size={24} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* Left: Image (Visible on Desktop) */}
            <div className="hidden md:block w-5/12 bg-tea-100 relative">
            {formData.image_url ? (
                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-tea-400 p-6 text-center">
                <Camera size={48} strokeWidth={1} className="mb-2" />
                <span className="text-sm">暂无图片</span>
                </div>
            )}
            {activeTab === 'DETAILS' && (
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <Button variant="secondary" size="sm" className="shadow-lg bg-white/90 backdrop-blur" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                        {formData.image_url ? '更换' : '上传'}
                    </Button>
                </div>
            )}
            </div>

            {/* Right: Content Area */}
            <div className="flex-1 flex flex-col bg-[#fcfcfb] h-full overflow-hidden">
                
                {/* Tabs (Only if editing) */}
                {item && (
                    <div className="flex border-b border-tea-100">
                        <button 
                            onClick={() => setActiveTab('DETAILS')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'DETAILS' ? 'text-accent border-b-2 border-accent bg-tea-50/50' : 'text-tea-500 hover:bg-tea-50'}`}
                        >
                            <ClipboardList size={16}/> 基本信息
                        </button>
                        <button 
                            onClick={() => setActiveTab('HISTORY')}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'text-accent border-b-2 border-accent bg-tea-50/50' : 'text-tea-500 hover:bg-tea-50'}`}
                        >
                            <History size={16}/> 库存与历史
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* --- TAB: DETAILS --- */}
                    {(activeTab === 'DETAILS' || !item) && (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {/* Mobile Image Upload (Simplified) */}
                            <div className="md:hidden flex items-center gap-4 mb-2">
                                <div className="w-20 h-20 bg-tea-100 rounded-lg overflow-hidden flex-shrink-0">
                                    {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-tea-300"><ImageIcon size={20}/></div>}
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>上传图片</Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            <div className="flex bg-tea-50 p-1 rounded-lg">
                                {(['TEA', 'TEAWARE'] as const).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    formData.type === t ? 'bg-white text-tea-900 shadow-sm' : 'text-tea-500 hover:text-tea-700'
                                    }`}
                                    onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                                >
                                    {t === 'TEA' ? '茶品' : '茶器'}
                                </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <Input label="名称" value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} placeholder="藏品名称" required />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="分类" value={formData.category} onChange={(e: any) => setFormData({...formData, category: e.target.value})} required placeholder={formData.type === 'TEA' ? '如：普洱、红茶' : '如：紫砂壶、盖碗'}/>
                                    <Input label="年份" value={formData.year} onChange={(e: any) => setFormData({...formData, year: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <Input label="产地 / 来源" value={formData.origin} onChange={(e: any) => setFormData({...formData, origin: e.target.value})} />
                                     
                                     {/* Inventory Input Group */}
                                     {/* Only show initial quantity input if creating new */}
                                     {!item && (
                                         <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">初始数量 & 单位</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    min="0.01" 
                                                    step="0.01"
                                                    className="w-1/2 px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-tea-800"
                                                    value={formData.quantity} 
                                                    onChange={(e: any) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} 
                                                />
                                                <select 
                                                    className="w-1/2 px-2 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-tea-800 text-sm"
                                                    value={formData.unit}
                                                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                                >
                                                    {currentOptions.map(u => (
                                                        <option key={u} value={u}>{u}</option>
                                                    ))}
                                                </select>
                                            </div>
                                         </div>
                                     )}
                                     
                                     {/* If editing, show read-only quantity here */}
                                     {item && (
                                         <div className="space-y-1.5 opacity-60">
                                            <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">当前库存</label>
                                            <div className="w-full px-3 py-2 bg-tea-50 border border-tea-200 rounded-lg text-tea-800 font-mono">
                                                {formData.quantity} <span className="text-tea-500 text-xs ml-1">{formData.unit}</span>
                                            </div>
                                         </div>
                                     )}
                                </div>
                                
                                {/* Unit Editor for Existing Items (In case user wants to fix unit) */}
                                {item && (
                                    <div className="space-y-1.5">
                                       <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">计量单位</label>
                                       <div className="flex gap-2">
                                           <select 
                                                className="w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-tea-800"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                                            >
                                                {currentOptions.map(u => (
                                                    <option key={u} value={u}>{u}</option>
                                                ))}
                                            </select>
                                       </div>
                                    </div>
                                )}

                                <TextArea label="描述 / 品鉴笔记" value={formData.description} onChange={(e: any) => setFormData({...formData, description: e.target.value})} />
                            </div>

                            <div className="mt-4 pt-4 border-t border-tea-50 flex justify-end gap-3">
                                {item && <Button type="button" variant="danger" onClick={() => onDelete(item.id)} className="mr-auto"><Trash2 size={18} /></Button>}
                                {!item && <Button variant="secondary" onClick={onClose}>取消</Button>}
                                <Button type="submit">{item ? '更新信息' : '保存藏品'}</Button>
                            </div>
                        </form>
                    )}

                    {/* --- TAB: HISTORY & STOCK --- */}
                    {activeTab === 'HISTORY' && item && (
                        <InventoryManager 
                            item={item} 
                            logs={logs} 
                            isLoading={isLoadingLogs}
                            onUpdate={async (amt: number, reason: string, note: string) => {
                                // Explicitly cast item.quantity to number before adding
                                // This prevents string concatenation (e.g. "251" + -10 = "251-10") when pg returns numerics as strings
                                const currentQty = Number(item.quantity || 0);
                                const newQty = currentQty + amt;

                                // Add check for consumption
                                if (amt < 0 && newQty < 0) {
                                    alert("库存不足，无法出库");
                                    return false;
                                }
                                
                                const success = await onStockUpdate(item.id, newQty, amt, reason, note);
                                if (success) {
                                    setFormData(prev => ({...prev, quantity: newQty})); // Update local form too
                                    fetchLogs(item.id); // Refresh logs
                                }
                                return success;
                            }}
                        />
                    )}

                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, config, serverConfig, isEnvLoading, onSave }: any) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-xl font-bold text-tea-900 flex items-center gap-2">
            <Settings className="text-tea-400" /> 设置
          </h2>
          <button onClick={onClose}><X size={20} className="text-tea-400" /></button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Server Status Section */}
          <div className="bg-tea-50 p-4 rounded-lg border border-tea-100">
            <h3 className="font-bold text-tea-800 text-sm mb-2 flex items-center gap-2">
              <Server size={14}/> 服务端状态
            </h3>
            {isEnvLoading ? (
              <div className="flex items-center gap-2 text-tea-500 text-xs">
                <Loader2 size={12} className="animate-spin"/> 正在检测环境...
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                 <div className="flex items-center justify-between">
                    <span className="text-tea-600">PostgreSQL 数据库</span>
                    {serverConfig?.hasServerDb ? (
                        <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 size={12}/> 已连接</span>
                    ) : (
                        <span className="text-tea-400 flex items-center gap-1">未配置 (仅客户端模式)</span>
                    )}
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-tea-600">服务端 API</span>
                    <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 size={12}/> 正常</span>
                 </div>
              </div>
            )}
          </div>

          {/* Connection Config */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-tea-800 text-sm">连接配置</h3>
                <button 
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="text-xs text-accent hover:underline"
                >
                  {showSecrets ? '隐藏密钥' : '显示密钥'}
                </button>
            </div>

            <Input 
                label="Supabase URL" 
                placeholder="https://xyz.supabase.co" 
                value={localConfig.supabaseUrl}
                onChange={(e: any) => setLocalConfig({...localConfig, supabaseUrl: e.target.value})}
                disabled={!!serverConfig?.supabaseUrl} 
                rightLabel={serverConfig?.supabaseUrl ? <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">已由环境变量托管</span> : null}
            />
            
            <Input 
                label="Supabase Anon Key" 
                placeholder="eyJh..." 
                type={showSecrets ? "text" : "password"}
                value={localConfig.supabaseKey}
                onChange={(e: any) => setLocalConfig({...localConfig, supabaseKey: e.target.value})}
                disabled={!!serverConfig?.supabaseKey}
                rightLabel={serverConfig?.supabaseKey ? <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">已由环境变量托管</span> : null}
            />
          </div>

          {/* Image Upload Config */}
          <div className="space-y-4 pt-4 border-t border-tea-50">
             <h3 className="font-bold text-tea-800 text-sm">图床配置 (可选)</h3>
             <Input 
                label="Upload API URL" 
                placeholder="https://api.example.com/upload" 
                value={localConfig.imageApiUrl}
                onChange={(e: any) => setLocalConfig({...localConfig, imageApiUrl: e.target.value})}
            />
            <Input 
                label="Token / Key" 
                placeholder="Bearer ..." 
                type={showSecrets ? "text" : "password"}
                value={localConfig.imageApiToken}
                onChange={(e: any) => setLocalConfig({...localConfig, imageApiToken: e.target.value})}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-tea-50 flex justify-end gap-3">
           <Button variant="secondary" onClick={onClose}>取消</Button>
           <Button onClick={handleSave}><Save size={16}/> 保存配置</Button>
        </div>
      </div>
    </div>
  );
};

const InventoryManager = ({ item, logs, isLoading, onUpdate }: any) => {
    const [mode, setMode] = useState<'VIEW' | 'IN' | 'OUT'>('VIEW');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) return alert('请输入有效数量');
        
        setIsSubmitting(true);
        // If mode is OUT, amount should be negative
        const change = mode === 'OUT' ? -numAmount : numAmount;
        // Default reasons if not selected
        const finalReason = reason || (mode === 'IN' ? 'PURCHASE' : 'CONSUME');
        
        const success = await onUpdate(change, finalReason, note);
        if (success) {
            setMode('VIEW');
            setAmount('');
            setReason('');
            setNote('');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Action Bar */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={() => setMode(mode === 'IN' ? 'VIEW' : 'IN')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'IN' ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20' : 'bg-white border-tea-200 text-tea-600 hover:bg-green-50/50'}`}
                >
                    <ArrowDownCircle size={18} className={mode === 'IN' ? 'text-green-600' : 'text-tea-300'}/>
                    入库 (增加)
                </button>
                <button 
                    onClick={() => setMode(mode === 'OUT' ? 'VIEW' : 'OUT')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'OUT' ? 'bg-orange-50 border-orange-200 text-orange-700 ring-2 ring-orange-500/20' : 'bg-white border-tea-200 text-tea-600 hover:bg-orange-50/50'}`}
                >
                    <ArrowUpCircle size={18} className={mode === 'OUT' ? 'text-orange-600' : 'text-tea-300'}/>
                    出库 (减少)
                </button>
            </div>

            {/* Operation Form */}
            {mode !== 'VIEW' && (
                <form onSubmit={handleSubmit} className="bg-tea-50/50 p-4 rounded-xl border border-tea-100 mb-6 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-tea-800 text-sm">
                            {mode === 'IN' ? '新增入库' : '消耗/出库'}
                        </h4>
                        <button type="button" onClick={() => setMode('VIEW')}><X size={16} className="text-tea-400"/></button>
                    </div>

                    <div className="space-y-4">
                         <div className="flex gap-4">
                             <div className="w-1/2 space-y-1.5">
                                 <label className="text-xs font-semibold text-tea-500 uppercase">数量 ({item.unit})</label>
                                 <input 
                                    type="number" step="0.01" min="0.01" required
                                    className="w-full px-3 py-2 bg-white border border-tea-200 rounded-lg focus:ring-2 focus:ring-accent/50 focus:border-accent text-tea-800 font-mono"
                                    value={amount} onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                 />
                             </div>
                             <div className="w-1/2 space-y-1.5">
                                 <label className="text-xs font-semibold text-tea-500 uppercase">原因</label>
                                 <select 
                                    className="w-full px-3 py-2 bg-white border border-tea-200 rounded-lg text-sm text-tea-800"
                                    value={reason} onChange={e => setReason(e.target.value)}
                                 >
                                    {mode === 'IN' ? (
                                        <>
                                            <option value="PURCHASE">新购入库</option>
                                            <option value="GIFT">获赠</option>
                                            <option value="ADJUST">盘盈调整</option>
                                            <option value="OTHER">其他入库</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="CONSUME">品饮/使用</option>
                                            <option value="GIFT">赠友</option>
                                            <option value="DAMAGE">损耗/遗失</option>
                                            <option value="ADJUST">盘亏调整</option>
                                            <option value="OTHER">其他出库</option>
                                        </>
                                    )}
                                 </select>
                             </div>
                         </div>
                         <Input 
                            label="备注 (可选)" 
                            placeholder={mode === 'IN' ? "来源、价格等..." : "品鉴感受、去向等..."}
                            value={note} onChange={(e: any) => setNote(e.target.value)}
                         />
                         <Button type="submit" disabled={isSubmitting} className="w-full" variant={mode === 'IN' ? 'primary' : 'danger'}>
                             {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                             确认{mode === 'IN' ? '入库' : '出库'}
                         </Button>
                    </div>
                </form>
            )}

            {/* History List */}
            <div className="flex-1 overflow-hidden flex flex-col">
                 <h4 className="font-bold text-tea-800 text-sm mb-3 flex items-center gap-2">
                     <History size={14}/> 库存记录
                 </h4>
                 
                 <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                     {isLoading ? (
                         <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-tea-300"/></div>
                     ) : logs.length === 0 ? (
                         <div className="text-center py-10 text-tea-400 text-sm">暂无记录</div>
                     ) : (
                         logs.map((log: InventoryLog) => (
                             <div key={log.id} className="bg-white p-3 rounded-lg border border-tea-100 shadow-sm flex items-start gap-3">
                                 <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.change_amount > 0 ? 'bg-green-500' : (log.change_amount < 0 ? 'bg-orange-500' : 'bg-gray-400')}`} />
                                 <div className="flex-1 min-w-0">
                                     <div className="flex justify-between items-start">
                                         <span className="font-medium text-tea-800 text-sm truncate">{formatReason(log.reason, log.change_amount)}</span>
                                         <span className={`font-mono text-sm font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                             {log.change_amount > 0 ? '+' : ''}{log.change_amount} {item.unit}
                                         </span>
                                     </div>
                                     <div className="text-xs text-tea-400 mt-1 flex justify-between">
                                         <span>{new Date(log.created_at).toLocaleString()}</span>
                                         <span>结余: {log.current_balance}</span>
                                     </div>
                                     {log.note && (
                                         <div className="mt-2 text-xs text-tea-600 bg-tea-50 p-2 rounded">
                                             {log.note}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
