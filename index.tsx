
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Camera, Upload, Leaf, Coffee, ChevronDown, Trash2, 
  Plus, Search, Settings, LogOut, User, Package, History,
  Database, Shield, Lock, Edit2, Loader2, CheckCircle2,
  AlertTriangle, Coins, AlertCircle, Menu, X, Cloud
} from 'lucide-react';

// --- Types ---

type ItemType = 'TEA' | 'TEAWARE';

interface TeaItem {
  id: string; 
  name: string;
  type: ItemType;
  category: string;
  year?: string;
  origin?: string;
  description?: string;
  image_url?: string;
  quantity: number; 
  unit: string; 
  price?: number; 
  unit_price?: number; 
  created_at: number;
}

interface InventoryLog {
  id: string;
  item_id: string;
  change_amount: number;
  current_balance: number;
  reason: string;
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

interface UserProfile {
    id: string;
    username: string;
    nickname: string;
    role: 'admin' | 'user';
    is_initial: boolean;
}

// --- Constants ---

const TEA_UNITS = ['克 (g)', '千克 (kg)', '饼', '砖', '沱', '盒', '罐', '袋', '泡'];
const TEAWARE_UNITS = ['件', '套', '个', '把', '只', '组'];

const SUGGESTIONS = {
  TEA: {
    category: ['普洱 (生)', '普洱 (熟)', '绿茶', '红茶', '岩茶', '乌龙', '白茶', '黑茶', '黄茶', '花茶', '单丛'],
    origin: ['云南', '福建', '浙江', '安徽', '四川', '台湾', '广东', '江苏']
  },
  TEAWARE: {
    category: ['紫砂壶', '盖碗', '品茗杯', '公道杯', '茶宠', '建盏', '柴烧', '茶叶罐', '茶盘', '茶荷', '煮茶器'],
    origin: ['宜兴', '景德镇', '德化', '龙泉', '建阳', '潮州']
  }
};

const TEA_QUOTES = [
    "茶亦醉人何必酒，书能香我无须花。",
    "一碗喉吻润，二碗破孤闷。",
    "半壁山房待明月，一盏清茗酬知音。",
    "且将新火试新茶，诗酒趁年华。",
    "寒夜客来茶当酒，竹炉汤沸火初红。",
    "赌书消得泼茶香，当时只道是寻常。",
    "从来佳茗似佳人。",
    "琴里知闻唯渌水，茶中故旧是蒙山。",
    "小鼎煎茶面曲池，白须道士竹间棋。",
    "汲来江水烹新茗，买尽青山当画屏。"
];

// --- Helpers ---

const formatReason = (reason: string, changeAmount: number = 0) => {
    const map: Record<string, string> = {
        'PURCHASE': '新购入库',
        'CONSUME': '品饮/使用', // Legacy
        'CONSUMPTION': '品饮/使用',
        'GIFT': changeAmount > 0 ? '获赠' : '赠友',
        'DAMAGE': '损耗/遗失', // Legacy
        'LOSS': '损耗/遗失',
        'ADJUST': '盘盈调整', // Legacy
        'ADJUSTMENT': changeAmount > 0 ? '盘盈调整' : '盘亏调整',
        'INITIAL': '初始入库'
    };
    return map[reason] || reason;
};

const formatCurrency = (amount: number = 0) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount);
};

const formatUnitPrice = (price: number, unit: string) => {
    if (!price) return '';
    return `≈ ${new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(price)} / ${unit.split(' ')[0]}`;
};

const isDbSchemaError = (msg: string) => {
    if (!msg) return false;
    const m = msg.toLowerCase();
    return m.includes('relation') || m.includes('does not exist') || m.includes('column') || m.includes('undefined table');
};

const authFetch = async (url: string, options: any = {}) => {
    const token = localStorage.getItem('tea_auth_token');
    const headers = { 
        'Content-Type': 'application/json', 
        ...(options.headers || {}),
        'Authorization': token ? `Bearer ${token}` : ''
    };
    return fetch(url, { ...options, headers });
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
    <div className="flex justify-between items-baseline">
        <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">{label}</label>
        {props.rightLabel}
    </div>
    <div className="relative">
      <input 
        className={`w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-tea-800 placeholder-tea-300 disabled:opacity-50 disabled:bg-tea-100/50 ${props.prefixicon ? 'pl-9' : ''}`}
        {...props}
      />
      {props.prefixicon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-tea-400 pointer-events-none">
          {props.prefixicon}
        </div>
      )}
    </div>
  </div>
);

const Combobox = ({ label, value, onChange, options = [], placeholder, ...props }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt: string) => 
        !value || opt.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <div className="space-y-1.5" ref={wrapperRef}>
            <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">{label}</label>
                {props.rightLabel}
            </div>
            <div className="relative">
                <input
                    className={`w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-tea-800 placeholder-tea-300 ${props.prefixicon ? 'pl-9' : ''}`}
                    value={value}
                    onChange={(e) => { onChange(e); setIsOpen(true); }}
                    onFocus={() => { setIsFocused(true); setIsOpen(true); }}
                    placeholder={placeholder}
                    {...props}
                />
                <div 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tea-400 cursor-pointer hover:text-accent"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {isOpen && (isFocused || value) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-tea-100 rounded-lg shadow-lg max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {filteredOptions.length > 0 ? (
                            <div className="p-1 grid grid-cols-2 gap-1">
                                {filteredOptions.map((opt: string) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className="text-left px-3 py-1.5 text-sm text-tea-700 hover:bg-tea-50 hover:text-accent rounded-md transition-colors truncate"
                                        onClick={() => {
                                            onChange({ target: { value: opt } });
                                            setIsOpen(false);
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-3 py-2 text-xs text-tea-400 text-center">
                                可直接输入 "{value}"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const Badge = ({ children, color = 'tea', className = '' }: any) => {
  const colors = {
    tea: "bg-tea-100 text-tea-700",
    accent: "bg-accent text-white shadow-sm shadow-accent/30",
    clay: "bg-[#a67b5b] text-white shadow-sm shadow-[#a67b5b]/30",
    red: "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
    dark: "bg-black/60 text-white backdrop-blur-sm"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[color as keyof typeof colors]} ${className}`}>
      {children}
    </span>
  );
};

const StatCard = ({ icon, label, value, subtext }: any) => (
    <div className="bg-white/60 backdrop-blur-md border border-tea-100 rounded-xl px-5 py-4 flex items-center gap-4 shadow-sm min-w-[180px] transition-transform hover:scale-105 duration-300">
        <div className="w-12 h-12 rounded-full bg-tea-50 flex items-center justify-center text-accent shrink-0">
            {icon}
        </div>
        <div>
            <div className="text-xs text-tea-500 font-bold uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-2xl font-bold text-tea-900 font-serif leading-tight">{value}</div>
            {subtext && <div className="text-xs text-tea-400 mt-0.5">{subtext}</div>}
        </div>
    </div>
);

// --- Main Application ---

const App = () => {
  // Config & Env
  const [serverConfig, setServerConfig] = useState<AppConfig | null>(null);
  const [isEnvLoading, setIsEnvLoading] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Data State
  const [items, setItems] = useState<TeaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TeaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TEA' | 'TEAWARE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null); 
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDbInitOpen, setIsDbInitOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeaItem | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const savedUser = localStorage.getItem('tea_user');
    const token = localStorage.getItem('tea_auth_token');
    if (savedUser && token) {
        setUser(JSON.parse(savedUser));
    }
    setIsAuthLoading(false);

    const fetchEnv = async () => {
      setIsEnvLoading(true);
      try {
        const res = await fetch('/api/env');
        if (res.ok) {
          const envData = await res.json();
          setServerConfig(envData);
        }
      } catch (e) {
        console.warn("Env fetch failed", e);
      } finally {
        setIsEnvLoading(false);
      }
    };
    fetchEnv();
  }, []);

  // 2. Fetch Data
  const fetchItems = async () => {
    if (!user) return;
    setIsLoading(true);
    setDbError(null);

    try {
        const res = await authFetch('/api/data');
        if (res.status === 401) {
            handleLogout();
            return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Server error');
        
        const parsedItems = json.data.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity),
            price: Number(item.price || 0),
            unit_price: Number(item.unit_price || 0),
            created_at: Number(item.created_at)
        }));
        setItems(parsedItems);
    } catch (error: any) {
      console.error('Error fetching tea items:', error);
      if (isDbSchemaError(error.message)) {
           setDbError('TABLE_MISSING');
           setIsDbInitOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if(user) fetchItems(); }, [user]);

  // 3. Filter
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

  // 4. Force Password Change
  useEffect(() => {
      if (user?.is_initial) {
          setIsPasswordModalOpen(true);
      }
  }, [user]);

  // --- Actions ---
  const handleLogout = () => {
      localStorage.removeItem('tea_user');
      localStorage.removeItem('tea_auth_token');
      setUser(null);
      setItems([]);
  };

  const handlePasswordUpdated = () => {
    // 关键修复：更新本地状态和缓存，而不是刷新页面
    // 刷新页面会导致再次读取旧的 localStorage (is_initial=true)，从而死循环
    if (user) {
        const updatedUser = { ...user, is_initial: false };
        setUser(updatedUser);
        localStorage.setItem('tea_user', JSON.stringify(updatedUser));
    }
    setIsPasswordModalOpen(false);
  };

  const handleSave = async (item: Partial<TeaItem>) => {
    const itemData = {
      name: item.name,
      type: item.type,
      category: item.category,
      year: item.year,
      origin: item.origin,
      description: item.description,
      image_url: item.image_url,
      quantity: Number(item.quantity ?? 1), 
      unit: item.unit || '件',
      price: Number(item.price || 0), 
      ...(item.id ? {} : { created_at: Date.now() }) 
    };

    try {
        const res = await authFetch('/api/data', {
            method: 'POST',
            body: JSON.stringify({
                action: item.id ? 'update' : 'create',
                id: item.id,
                data: itemData
            })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        
        const savedData = json.data;
        if (savedData) {
            const parsedSavedData = { 
                ...savedData, 
                quantity: Number(savedData.quantity),
                price: Number(savedData.price || 0),
                unit_price: Number(savedData.unit_price || 0),
                created_at: Number(savedData.created_at)
            };
            setItems(prev => {
                const exists = prev.find(i => i.id === parsedSavedData!.id);
                if (exists) return prev.map(i => i.id === parsedSavedData!.id ? parsedSavedData! : i);
                return [parsedSavedData!, ...prev];
            });
            setIsModalOpen(false);
            setEditingItem(null);
        }
    } catch (e: any) {
        if(isDbSchemaError(e.message)) {
            setIsDbInitOpen(true);
        } else {
            alert(`保存失败: ${e.message}`);
        }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这件藏品吗？')) return;
    const previousItems = [...items];
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingItem?.id === id) setIsModalOpen(false);

    try {
        const res = await authFetch('/api/data?action=delete', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Delete failed');
        }
    } catch (error: any) {
        alert(`删除失败: ${error.message}`);
        setItems(previousItems);
    }
  };

  const handleStockUpdate = async (id: string, newQuantity: number, changeAmount: number, reason: string, note: string) => {
    try {
        const res = await authFetch('/api/data', {
            method: 'POST',
            body: JSON.stringify({
                action: 'stock_update',
                id, newQuantity, changeAmount, reason, note
            })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        
        const updatedItem = json.data;
        if (updatedItem) {
            const parsed = { 
                ...updatedItem, 
                quantity: Number(updatedItem.quantity),
                price: Number(updatedItem.price || 0),
                unit_price: Number(updatedItem.unit_price || 0),
                created_at: Number(updatedItem.created_at)
            };
            setItems(prev => prev.map(i => i.id === id ? parsed! : i));
            setEditingItem(parsed);
            return true;
        }
    } catch (e: any) {
       if(isDbSchemaError(e.message)) setIsDbInitOpen(true);
       else alert("库存更新失败");
       return false;
    }
    return false;
  };

  // --- View ---
  
  if (!isAuthLoading && !user) {
      return (
          <LoginScreen 
            onLogin={(u: UserProfile, token: string) => {
                localStorage.setItem('tea_user', JSON.stringify(u));
                localStorage.setItem('tea_auth_token', token);
                setUser(u);
            }} 
          />
      );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 11) return '早安';
    if (h < 13) return '午安';
    if (h < 18) return '午后好';
    return '晚上好';
  })();
  
  const quote = TEA_QUOTES[Math.floor(Math.random() * TEA_QUOTES.length)];
  const stats = {
      totalItems: items.length,
      totalValue: items.reduce((s, i) => s + (i.price || 0), 0)
  };

  return (
    <div className="min-h-screen text-tea-800 font-sans pb-20 bg-[#f7f7f5]">
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
              {user?.role === 'admin' ? <Shield size={18} className="mr-1 text-accent"/> : <User size={18} className="mr-1"/>}
              <Settings size={20} />
            </Button>
            <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} disabled={!!dbError}>
              <Plus size={18} />
              <span className="hidden sm:inline">记一笔</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-24">
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <h1 className="font-serif text-3xl md:text-4xl text-tea-900 mb-3 tracking-tight">
              {greeting}，{user?.nickname || user?.username}
            </h1>
            
            {dbError === 'TABLE_MISSING' ? (
                <p className="text-red-500 font-medium flex items-center gap-2 bg-red-50 px-3 py-1 rounded-md inline-block">
                    <AlertTriangle size={16}/> 数据库尚未初始化
                </p>
            ) : (
              <div className="text-tea-600 font-serif italic flex items-center gap-2 text-sm md:text-base opacity-80">
                  <span className="w-6 h-[1px] bg-accent/50 inline-block"></span>
                  {quote}
              </div>
            )}
          </div>

          {!dbError && (
             <div className="flex gap-4 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                  <StatCard icon={<Package size={24}/>} label="藏品总数" value={stats.totalItems} subtext="件/套"/>
                  <StatCard icon={<Coins size={24}/>} label="资产总值" value={formatCurrency(stats.totalValue)} subtext="估算价值"/>
             </div>
          )}
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 sticky top-20 z-30 py-2 -mx-4 px-4 bg-[#f7f7f5]/90 backdrop-blur-sm sm:static sm:bg-transparent transition-all">
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
                  filterType === tab.value ? 'bg-tea-800 text-white shadow-md' : 'bg-white text-tea-600 hover:bg-tea-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-tea-400" size={32} />
            </div>
        )}

        {/* DB Error State */}
        {dbError === 'TABLE_MISSING' && !isLoading && (
             <div className="col-span-full py-12 text-center bg-white rounded-xl border border-red-100 p-8 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-2 font-serif">数据库未初始化</h3>
              <Button onClick={() => setIsDbInitOpen(true)} className="mx-auto mt-4" variant="danger">
                 打开初始化向导
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
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-tea-100 flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] bg-tea-100 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-tea-300">
                    <Camera size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-3 left-3">
                    <Badge color={item.type === 'TEA' ? 'accent' : 'clay'} className="shadow-lg">
                        {item.type === 'TEA' ? '茶' : '器'}
                    </Badge>
                </div>
                <div className="absolute top-3 right-3">
                   <Badge color="dark">{item.quantity} {item.unit}</Badge>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex justify-between items-baseline mb-2 gap-2">
                  <h3 className="font-serif text-lg font-bold text-tea-900 truncate">{item.name}</h3>
                  {item.year && <span className="text-xs text-tea-400 shrink-0 font-medium">{item.year}</span>}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-tea-500 mb-4">
                  <span className="bg-tea-50 px-1.5 py-0.5 rounded text-tea-600">{item.category}</span>
                  {item.origin && <><span className="text-tea-300">|</span><span>{item.origin}</span></>}
                </div>
                
                <div className="mt-auto pt-3 border-t border-tea-50 flex items-center justify-between">
                   <div className="flex items-baseline gap-1">
                      {item.price && item.price > 0 ? (
                        <>
                            <span className="text-[10px] text-amber-700 font-medium">¥</span>
                            <span className="text-lg font-bold text-amber-700 font-serif">{item.price.toLocaleString()}</span>
                            <span className="text-[10px] text-tea-300 ml-2 font-mono">
                                {item.unit_price ? `(${Math.round(item.unit_price * 100) / 100}/${item.unit.substring(0,1)})` : ''}
                            </span>
                        </>
                      ) : <span className="text-xs text-tea-300">--</span>}
                   </div>
                  <span className="text-[10px] text-tea-300">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center text-tea-400">
              <div className="mx-auto w-16 h-16 bg-tea-100 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-tea-400" />
              </div>
              <p>暂无数据。</p>
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
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          config={serverConfig}
          user={user}
          setUser={setUser}
          onLogout={handleLogout}
          onChangePassword={() => setIsPasswordModalOpen(true)}
          onDbError={() => setIsDbInitOpen(true)}
        />
      )}

      {isDbInitOpen && <DbInitModal isOpen={isDbInitOpen} onClose={() => setIsDbInitOpen(false)} />}

      {isPasswordModalOpen && (
          <ChangePasswordModal 
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            onSuccess={handlePasswordUpdated}
            forced={user?.is_initial}
          />
      )}
    </div>
  );
};

// --- Sub Components ---

const LoginScreen = ({ onLogin }: any) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showInit, setShowInit] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });
            const data = await res.json();
            if(res.ok) {
                onLogin(data.user, data.token);
            } else {
                setError(data.error || '登录失败');
            }
        } catch(e) {
            setError('无法连接到服务器');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] p-4 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-accent/20">
                        <Leaf size={32} />
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-tea-900 tracking-tight">茶韵典藏</h1>
                    <p className="text-tea-500 mt-2 text-sm">请登录以管理您的私人藏品</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-tea-500 uppercase tracking-wider">用户名</label>
                        <input className="w-full px-4 py-3 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-tea-800" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-tea-500 uppercase tracking-wider">密码</label>
                         <input type="password" className="w-full px-4 py-3 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all text-tea-800" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex flex-col gap-2">
                            <div className="flex items-center gap-2"><AlertCircle size={16}/><span>{error}</span></div>
                            {isDbSchemaError(error) && (
                                <Button type="button" variant="danger" size="sm" onClick={() => setShowInit(true)}><Database size={14}/> 修复数据库</Button>
                            )}
                        </div>
                    )}
                    <Button type="submit" className="w-full !py-3 !text-lg shadow-lg shadow-accent/30 mt-4" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin"/> : '进入茶室'}
                    </Button>
                </form>
            </div>
            {showInit && <DbInitModal isOpen={showInit} onClose={() => setShowInit(false)} />}
        </div>
    );
};

const ItemModal = ({ isOpen, onClose, item, onSave, onDelete, onStockUpdate }: any) => {
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
    const [formData, setFormData] = useState<Partial<TeaItem>>({ type: 'TEA', name: '', category: '', year: '', origin: '', description: '', image_url: '', quantity: 1, unit: '克 (g)', price: 0, unit_price: 0 });
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(item) { 
            setFormData(item); 
            setActiveTab('DETAILS'); 
            fetchLogs(item.id); 
        } else { 
            setFormData({ type: 'TEA', name: '', category: '', year: '', origin: '', description: '', image_url: '', quantity: 1, unit: '克 (g)', price: 0, unit_price: 0 }); 
            setActiveTab('DETAILS'); 
            setLogs([]); 
        }
    }, [item]);

    const derivedUnitPrice = useMemo(() => {
        const p = parseFloat(formData.price as any) || 0;
        const q = parseFloat(formData.quantity as any) || 0;
        return q > 0 ? p / q : 0;
    }, [formData.price, formData.quantity]);

    const fetchLogs = async (itemId: string) => {
        setIsLoadingLogs(true);
        try {
            const res = await authFetch(`/api/data?action=get_logs&id=${itemId}`); 
            const json = await res.json();
            if(json.data) setLogs(json.data.map((l:any)=>({...l, change_amount:Number(l.change_amount), current_balance:Number(l.current_balance), created_at:Number(l.created_at)})));
        } finally { setIsLoadingLogs(false); }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setFormData(prev => ({ ...prev, image_url: reader.result as string }));
        reader.readAsDataURL(file);
    };

    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
             <div className="bg-[#fcfcfb] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
                 <div className="hidden md:block w-5/12 bg-tea-100 relative group">
                     {formData.image_url ? 
                        <img src={formData.image_url} className="w-full h-full object-cover"/> : 
                        <div className="w-full h-full flex items-center justify-center text-tea-300 bg-tea-50/50"><Camera size={48}/></div>
                     }
                     <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="secondary" onClick={()=>fileInputRef.current?.click()} className="shadow-lg"><Upload size={16}/> 更换图片</Button>
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </div>
                 <div className="flex-1 flex flex-col h-full overflow-hidden">
                     {item && (
                         <div className="flex border-b border-tea-100">
                             <button onClick={()=>setActiveTab('DETAILS')} className={`flex-1 py-3 text-sm font-bold ${activeTab==='DETAILS'?'text-accent border-b-2 border-accent':'text-tea-400'}`}>详情</button>
                             <button onClick={()=>setActiveTab('HISTORY')} className={`flex-1 py-3 text-sm font-bold ${activeTab==='HISTORY'?'text-accent border-b-2 border-accent':'text-tea-400'}`}>历史</button>
                         </div>
                     )}
                     <div className="flex-1 overflow-y-auto p-6">
                         {activeTab==='DETAILS' || !item ? (
                             <form onSubmit={(e)=>{e.preventDefault(); onSave(formData);}} className="space-y-5">
                                 <div className="flex bg-tea-100 p-1 rounded-lg">
                                    <button type="button" onClick={() => setFormData({...formData, type: 'TEA', unit: TEA_UNITS[0]})} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'TEA' ? 'bg-white text-accent shadow-sm' : 'text-tea-500 hover:text-tea-700'}`}>
                                        <Leaf size={14} /> 茶品
                                    </button>
                                    <button type="button" onClick={() => setFormData({...formData, type: 'TEAWARE', unit: TEAWARE_UNITS[0]})} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${formData.type === 'TEAWARE' ? 'bg-white text-clay shadow-sm' : 'text-tea-500 hover:text-tea-700'}`}>
                                        <Coffee size={14} /> 茶器
                                    </button>
                                 </div>

                                 <Input label="名称" value={formData.name} onChange={(e:any)=>setFormData({...formData, name:e.target.value})} required placeholder="例如：2003年易武正山野生茶"/>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                     <Combobox 
                                        label="分类" 
                                        value={formData.category} 
                                        onChange={(e:any)=>setFormData({...formData, category:e.target.value})}
                                        options={formData.type === 'TEA' ? SUGGESTIONS.TEA.category : SUGGESTIONS.TEAWARE.category}
                                        placeholder={formData.type === 'TEA' ? '例如：普洱 (生)' : '例如：紫砂壶'}
                                     />
                                     <Input label="年份" value={formData.year} onChange={(e:any)=>setFormData({...formData, year:e.target.value})} placeholder="例如：2018"/>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                     <Combobox 
                                        label="产地" 
                                        value={formData.origin} 
                                        onChange={(e:any)=>setFormData({...formData, origin:e.target.value})}
                                        options={formData.type === 'TEA' ? SUGGESTIONS.TEA.origin : SUGGESTIONS.TEAWARE.origin}
                                        placeholder="例如：云南"
                                     />
                                     <Input 
                                        label="总价" type="number" value={formData.price} onChange={(e:any)=>setFormData({...formData, price:parseFloat(e.target.value)||0})}
                                        rightLabel={derivedUnitPrice > 0 && <span className="text-xs text-tea-400 font-normal">{formatUnitPrice(derivedUnitPrice, formData.unit || '')}</span>}
                                        placeholder="0"
                                     />
                                 </div>
                                 
                                 {!item && (
                                     <div className="flex gap-2 items-end">
                                         <div className="flex-1"><Input label="初始数量" type="number" value={formData.quantity} onChange={(e:any)=>setFormData({...formData, quantity:parseFloat(e.target.value)||0})}/></div>
                                         <div className="w-1/3">
                                            <div className="relative">
                                                <select className="w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none text-tea-800 text-sm h-[38px]" value={formData.unit} onChange={e=>setFormData({...formData, unit:e.target.value})}>
                                                    {(formData.type === 'TEA' ? TEA_UNITS : TEAWARE_UNITS).map(u=><option key={u}>{u}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-tea-400 pointer-events-none" size={14}/>
                                            </div>
                                         </div>
                                     </div>
                                 )}

                                 <div className="flex justify-end gap-2 pt-4 border-t border-tea-50 mt-2">
                                     {item && <Button type="button" variant="danger" onClick={()=>onDelete(item.id)}><Trash2 size={16}/></Button>}
                                     <Button variant="secondary" onClick={onClose}>取消</Button>
                                     <Button type="submit">保存</Button>
                                 </div>
                             </form>
                         ) : (
                             <InventoryManager item={item} logs={logs} isLoading={isLoadingLogs} onUpdate={async (amt:number, r:string, n:string) => {
                                 const newQ = (item.quantity||0) + amt;
                                 if(newQ<0) {alert('库存不足'); return false;}
                                 const ok = await onStockUpdate(item.id, newQ, amt, r, n);
                                 if(ok) { setFormData({...formData, quantity:newQ}); fetchLogs(item.id); }
                                 return ok;
                             }}/>
                         )}
                     </div>
                 </div>
             </div>
        </div>
    );
};

const InventoryManager = ({ item, logs, isLoading, onUpdate }: any) => {
    const [mode, setMode] = useState<'IN'|'OUT'>('OUT');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('CONSUMPTION');
    const [note, setNote] = useState('');
    
    const handleSubmit = async (e:any) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if(!val) return;
        
        let finalReason = reason;
        if (mode === 'IN' && reason === 'CONSUMPTION') finalReason = 'PURCHASE'; 
        if (mode === 'OUT' && reason === 'PURCHASE') finalReason = 'CONSUMPTION';

        const finalAmt = mode==='IN'? val : -val;
        if(await onUpdate(finalAmt, finalReason, note)) { setAmount(''); setNote(''); }
    };
    
    const reasons = mode === 'IN' 
    ? [{v: 'PURCHASE', l: '新购入库'}, {v: 'GIFT', l: '获赠'}, {v: 'ADJUSTMENT', l: '盘盈调整'}, {v: 'RETURN', l: '退货入库'}]
    : [{v: 'CONSUMPTION', l: '品饮/使用'}, {v: 'GIFT', l: '赠友'}, {v: 'LOSS', l: '损耗/遗失'}, {v: 'ADJUSTMENT', l: '盘亏调整'}];

    return (
        <div className="space-y-4">
            <div className="bg-tea-50 p-4 rounded-lg">
                <div className="flex gap-2 mb-2">
                    <button onClick={()=>setMode('OUT')} className={`px-3 py-1 rounded text-sm font-bold ${mode==='OUT'?'bg-amber-100 text-amber-800':'text-gray-400'}`}>出库</button>
                    <button onClick={()=>setMode('IN')} className={`px-3 py-1 rounded text-sm font-bold ${mode==='IN'?'bg-green-100 text-green-800':'text-gray-400'}`}>入库</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-2">
                    <Input type="number" placeholder="数量" value={amount} onChange={(e:any)=>setAmount(e.target.value)}/>
                    <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">变动原因</label>
                            <select className="w-full px-3 py-2 bg-white border border-tea-200 rounded-lg text-sm h-[38px]" value={reason} onChange={(e) => setReason(e.target.value)}>
                                {reasons.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                            </select>
                    </div>
                    <Input placeholder="备注" value={note} onChange={(e:any)=>setNote(e.target.value)}/>
                    <Button type="submit" size="sm" className="w-full">确认</Button>
                </form>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((l:any)=>(
                    <div key={l.id} className="text-sm p-2 border-b flex justify-between">
                        <span>{formatReason(l.reason, l.change_amount)} {l.change_amount>0?`+${l.change_amount}`:l.change_amount}</span>
                        <span className="text-gray-400">{new Date(l.created_at).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, user, setUser, onLogout, onChangePassword, onDbError, config }: any) => {
    const [tab, setTab] = useState<'SYSTEM' | 'USERS'>('SYSTEM');
    const [nickname, setNickname] = useState(user?.nickname || '');
    const [isEditingNick, setIsEditingNick] = useState(false);

    const handleUpdateNickname = async () => {
        if (!nickname.trim()) return alert('昵称不能为空');
        const res = await authFetch('/api/auth?action=update_profile', { method: 'POST', body: JSON.stringify({ nickname }) });
        if (res.ok) {
            setUser({ ...user, nickname });
            setIsEditingNick(false);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-serif text-xl font-bold text-tea-900 flex items-center gap-2"><Settings className="text-tea-400"/> 设置</h2>
                    <button onClick={onClose}><X size={20} className="text-tea-400"/></button>
                </div>
                <div className="flex items-center gap-4 mb-6 border-b border-tea-100 pb-1">
                    <button onClick={()=>setTab('SYSTEM')} className={`pb-2 text-sm font-bold ${tab==='SYSTEM'?'text-accent border-b-2 border-accent':'text-tea-400'}`}>系统配置</button>
                    {user?.role === 'admin' && <button onClick={()=>setTab('USERS')} className={`pb-2 text-sm font-bold ${tab==='USERS'?'text-accent border-b-2 border-accent':'text-tea-400'}`}>用户管理</button>}
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    {tab === 'USERS' ? <UserManagement onDbError={onDbError} /> : (
                        <div className="space-y-6">
                            <div className="bg-tea-50 p-4 rounded-lg border border-tea-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-tea-600 shadow-sm border border-tea-200"><User size={20}/></div>
                                    <div>
                                        <div className="font-bold text-tea-900 flex items-center gap-2">
                                            {isEditingNick ? (
                                                <><input className="px-2 py-1 text-sm border rounded w-32" value={nickname} onChange={e => setNickname(e.target.value)} autoFocus/><button onClick={handleUpdateNickname}><CheckCircle2 size={16} className="text-green-600"/></button></>
                                            ) : (
                                                <>{user?.nickname} <button onClick={() => setIsEditingNick(true)}><Edit2 size={14} className="text-tea-300 hover:text-accent"/></button></>
                                            )}
                                        </div>
                                        <div className="text-xs text-tea-500">角色: {user?.role === 'admin' ? '管理员' : '普通用户'}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={onChangePassword}>修改密码</Button>
                                    <Button size="sm" variant="danger" onClick={onLogout}><LogOut size={14}/> 退出</Button>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-tea-400 uppercase tracking-wider mb-3">环境状态</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 border border-tea-100 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-tea-600">
                                            <Database size={16}/> <span>数据库</span>
                                        </div>
                                        {config?.hasServerDb ? <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">已连接</span> : <span className="text-xs text-amber-500 font-bold bg-amber-50 px-2 py-0.5 rounded">未配置</span>}
                                    </div>
                                    <div className="p-3 border border-tea-100 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-tea-600">
                                            <Cloud size={16}/> <span>图床 API</span>
                                        </div>
                                        {config?.imageApiUrl ? <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">自定义</span> : <span className="text-xs text-tea-400 font-bold bg-tea-50 px-2 py-0.5 rounded">默认</span>}
                                    </div>
                                </div>
                                <p className="text-[10px] text-tea-300 mt-2 text-center">Version 1.2.0 • Tea Collection</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const UserManagement = ({ onDbError }: any) => {
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({username: '', password: '', nickname: ''});
    const [editId, setEditId] = useState<string|null>(null);
    const [editNick, setEditNick] = useState('');

    const loadUsers = async () => {
        const res = await authFetch('/api/auth?action=list_users');
        const json = await res.json();
        if(res.ok) setUsers(json.data);
    };
    useEffect(() => { loadUsers(); }, []);

    const addUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await authFetch('/api/auth?action=create_user', { method: 'POST', body: JSON.stringify(newUser) });
        if(res.ok) { setNewUser({username:'', password:'', nickname: ''}); loadUsers(); }
        else alert('失败');
    };

    const deleteUser = async (id: string) => {
        if(!confirm('确定删除该用户吗？')) return;
        const res = await authFetch('/api/auth?action=delete_user', { method: 'POST', body: JSON.stringify({id}) });
        if(res.ok) loadUsers();
    };

    const startEdit = (u: any) => { setEditId(u.id); setEditNick(u.nickname); };
    const cancelEdit = () => { setEditId(null); setEditNick(''); };
    
    const saveEdit = async (id: string) => {
        if (!editNick.trim()) return;
        const res = await authFetch('/api/auth?action=admin_update_user', { method: 'POST', body: JSON.stringify({id, nickname: editNick}) });
        if(res.ok) { loadUsers(); cancelEdit(); }
        else alert('更新失败');
    };

    return (
        <div className="space-y-6">
            <div className="bg-tea-50 p-4 rounded-lg border border-tea-100">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Plus size={16}/> 新增用户</h4>
                <form onSubmit={addUser} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <input className="flex-1 px-3 py-2 rounded border border-tea-200 text-sm" placeholder="用户名" value={newUser.username} onChange={e=>setNewUser({...newUser, username:e.target.value})} required />
                        <input className="flex-1 px-3 py-2 rounded border border-tea-200 text-sm" placeholder="初始密码" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} required />
                    </div>
                    <div className="flex gap-2">
                         <input className="flex-1 px-3 py-2 rounded border border-tea-200 text-sm" placeholder="昵称 (选填)" value={newUser.nickname} onChange={e=>setNewUser({...newUser, nickname:e.target.value})} />
                         <Button type="submit" size="sm" className="whitespace-nowrap">添加</Button>
                    </div>
                </form>
            </div>
            <div className="space-y-2">
                {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-white border border-tea-100 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role==='admin'?'bg-accent text-white':'bg-tea-200 text-tea-600'}`}><User size={16}/></div>
                            <div>
                                <div className="font-bold text-sm text-tea-900 flex items-center gap-2">
                                    {u.username} 
                                    {editId === u.id ? (
                                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                            <input className="w-20 px-1 py-0.5 text-xs border rounded bg-white" value={editNick} onChange={e=>setEditNick(e.target.value)} autoFocus />
                                            <button onClick={()=>saveEdit(u.id)} className="text-green-600 hover:bg-green-50 p-0.5 rounded"><CheckCircle2 size={14}/></button>
                                            <button onClick={cancelEdit} className="text-red-400 hover:bg-red-50 p-0.5 rounded"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <span className="font-normal text-tea-500 cursor-pointer hover:text-accent flex items-center gap-1" onClick={()=>startEdit(u)}>
                                            ({u.nickname}) <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-tea-400">{u.role}</div>
                            </div>
                        </div>
                        {u.role !== 'admin' && <button onClick={()=>deleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DbInitModal = ({ isOpen, onClose }: any) => {
    const [status, setStatus] = useState<'IDLE'|'LOADING'|'SUCCESS'|'ERROR'>('IDLE');
    const [msg, setMsg] = useState('');

    const handleMigrate = async () => {
        setStatus('LOADING');
        try {
            const res = await fetch('/api/migrate', { method: 'POST' });
            if (res.ok) {
                setStatus('SUCCESS');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                const d = await res.json();
                setStatus('ERROR');
                setMsg(d.details || d.error);
            }
        } catch (e: any) {
             setStatus('ERROR');
             setMsg(e.message);
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-2xl">
                 <h3 className="font-bold text-xl mb-4 text-tea-900 flex items-center gap-2"><Database className="text-accent"/> 初始化数据库</h3>
                 <p className="text-sm text-tea-500 mb-6">检测到数据库结构异常。点击下方按钮尝试自动修复。</p>
                 {status === 'ERROR' && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-xs break-all">{msg}</div>}
                 {status === 'SUCCESS' && <div className="bg-green-50 text-green-600 p-3 rounded mb-4 text-xs flex items-center gap-2"><CheckCircle2 size={14}/> 成功！即将刷新...</div>}
                 <Button onClick={handleMigrate} disabled={status==='LOADING' || status==='SUCCESS'} className="w-full h-12">
                     {status==='LOADING' ? <Loader2 className="animate-spin"/> : '立即修复'}
                 </Button>
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ isOpen, onClose, forced, onSuccess }: any) => {
    const [pass, setPass] = useState('');
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = await authFetch('/api/auth?action=change_password', { method: 'POST', body: JSON.stringify({ newPassword: pass }) });
        if(res.ok) { 
            alert('修改成功'); 
            if (onSuccess) onSuccess(); 
            else onClose(); 
            // Previous version used reload here, which caused an infinite loop due to stale localStorage
        }
    };
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock className="text-accent"/> 修改密码</h3>
                {forced && <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-4">为了安全起见，初始登录请修改默认密码。</p>}
                <form onSubmit={handleSubmit}>
                    <Input label="新密码" type="password" value={pass} onChange={(e:any)=>setPass(e.target.value)} required minLength={4} />
                    <div className="flex justify-end gap-2 mt-4">
                        {!forced && <Button variant="secondary" onClick={onClose}>取消</Button>}
                        <Button type="submit">确认</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
