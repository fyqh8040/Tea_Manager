import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  Key
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
  created_at: number;
}

interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  imageApiUrl: string;
  imageApiToken: string;
}

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20",
    secondary: "bg-white text-tea-700 border border-tea-200 hover:bg-tea-50 hover:border-tea-300",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    ghost: "text-tea-600 hover:bg-tea-100"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
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
    clay: "bg-orange-100 text-orange-800"
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
      imageApiToken: ''
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
          
          // Auto-inject if local config is empty or matches defaults
          setConfig(prev => {
            const newConfig = { ...prev };
            let changed = false;
            
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
            // Fix: Add Image Token Injection
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

  // Supabase Client Instance
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

  // Data States
  const [items, setItems] = useState<TeaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TeaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TEA' | 'TEAWARE'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeaItem | null>(null);

  // Persist config changes
  useEffect(() => {
    localStorage.setItem('tea_app_config', JSON.stringify(config));
  }, [config]);

  // Load Data
  const fetchItems = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tea_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setItems(data as TeaItem[]);
    } catch (error) {
      console.error('Error fetching tea items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [supabase]);

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

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这件藏品吗？')) return;
    
    const previousItems = [...items];
    setItems(prev => prev.filter(i => i.id !== id));
    if (editingItem?.id === id) setIsModalOpen(false);

    if (supabase) {
      const { error } = await supabase.from('tea_items').delete().eq('id', id);
      if (error) {
        console.error('Delete failed:', error);
        alert('删除失败，数据已恢复');
        setItems(previousItems);
      }
    }
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
      ...(item.id ? {} : { created_at: Date.now() }) 
    };

    try {
        if (!supabase) throw new Error("数据库未连接");

        let savedData: TeaItem | null = null;

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
        }

        if (savedData) {
            setItems(prev => {
                const exists = prev.find(i => i.id === savedData!.id);
                if (exists) {
                    return prev.map(i => i.id === savedData!.id ? savedData! : i);
                }
                return [savedData!, ...prev];
            });
            setIsModalOpen(false);
            setEditingItem(null);
        }

    } catch (e: any) {
        console.error("Save error:", e);
        alert(`保存失败: ${e.message}`);
    }
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
              {supabase ? <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> : <div className="w-2 h-2 rounded-full bg-red-400 mr-2 animate-pulse"></div>}
              <Settings size={20} />
            </Button>
            <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} disabled={!supabase}>
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
            {new Date().getHours() < 12 ? '早安' : '午安'}，藏家
          </h1>
          <p className="text-tea-500 max-w-xl leading-relaxed">
            {!supabase 
              ? "系统未连接到云端。请点击右上角设置图标，配置 Supabase 连接信息。" 
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

        {/* Grid */}
        {!isLoading && (
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
                <div className="absolute top-3 right-3">
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
              <p>暂无数据。{supabase ? "快点击右上角添加第一款藏品吧。" : "请在设置中配置 Supabase 连接。"}</p>
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
          config={config}
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
    </div>
  );
};

// --- Sub Components ---

const ItemModal = ({ isOpen, onClose, item, onSave, onDelete, config }: any) => {
  const [formData, setFormData] = useState<Partial<TeaItem>>({
    type: 'TEA',
    name: '',
    category: '',
    year: '',
    origin: '',
    description: '',
    image_url: ''
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        type: 'TEA',
        name: '',
        category: '',
        year: '',
        origin: '',
        description: '',
        image_url: ''
      });
    }
  }, [item]);

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
      
      // Attempt API Upload
      if (config.imageApiUrl) {
          try {
              const data = new FormData();
              data.append('file', file);
              if (config.imageApiToken) {
                  data.append('token', config.imageApiToken);
              }

              const response = await fetch(config.imageApiUrl, {
                method: 'POST',
                body: data,
              });
              
              if (response.ok) {
                const result = await response.json();
                const uploadedUrl = result.url || result.data?.url || result.link; 
                
                if (uploadedUrl) {
                  setFormData(prev => ({ ...prev, image_url: uploadedUrl }));
                  uploadSuccess = true;
                }
              }
          } catch (netError) {
              console.warn('Network upload failed, falling back to base64');
          }
      }

      // Fallback
      if (!uploadSuccess) {
        const base64 = await readFileAsBase64(file);
        setFormData(prev => ({ ...prev, image_url: base64 }));
      }
    } catch (error) {
      alert('图片处理出错');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#fcfcfb] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left: Image */}
        <div className="w-full md:w-5/12 bg-tea-100 relative min-h-[200px] md:min-h-full">
          {formData.image_url ? (
            <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-tea-400 p-6 text-center border-b md:border-b-0 md:border-r border-tea-200">
              <Camera size={48} strokeWidth={1} className="mb-2" />
              <span className="text-sm">暂无图片</span>
            </div>
          )}
          
          <div className="absolute bottom-4 right-4 flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <Button 
              variant="secondary" 
              className="!px-3 !py-1.5 text-xs shadow-lg bg-white/90 backdrop-blur"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              {formData.image_url ? '更换图片' : '上传图片'}
            </Button>
          </div>
        </div>

        {/* Right: Form */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-2xl font-bold text-tea-900">
              {item ? '编辑藏品' : '入库登记'}
            </h2>
            <button type="button" onClick={onClose} className="text-tea-400 hover:text-tea-600">
              <X size={24} />
            </button>
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
            <Input 
              label="名称" 
              value={formData.name} 
              onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
              placeholder={formData.type === 'TEA' ? "例如：2003年 易武正山" : "例如：顾景舟款 仿古壶"}
              required 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="分类" 
                value={formData.category} 
                onChange={(e: any) => setFormData({...formData, category: e.target.value})} 
                required
              />
              <Input 
                label="年份" 
                value={formData.year} 
                onChange={(e: any) => setFormData({...formData, year: e.target.value})} 
              />
            </div>

            <Input 
              label="产地 / 来源" 
              value={formData.origin} 
              onChange={(e: any) => setFormData({...formData, origin: e.target.value})} 
            />

            <TextArea 
              label="描述 / 品鉴笔记" 
              value={formData.description} 
              onChange={(e: any) => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="mt-auto pt-6 flex justify-end gap-3">
            {item && (
              <Button type="button" variant="danger" onClick={() => onDelete(item.id)} className="mr-auto">
                <Trash2 size={18} />
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button type="submit">保存藏品</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Settings Modal ---

const SettingsModal = ({ isOpen, onClose, config, onSave, serverConfig, isEnvLoading }: any) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleResetToEnv = () => {
    if (serverConfig) {
      setLocalConfig(serverConfig);
      alert('已加载系统环境变量，请点击“保存”以应用。');
    } else {
      alert('未能获取到系统变量，请检查 Vercel 部署。');
    }
  };

  if (!isOpen) return null;

  const envStatus = {
     connected: !!serverConfig,
     hasUrl: !!serverConfig?.supabaseUrl,
     hasKey: !!serverConfig?.supabaseKey,
     hasImgUrl: !!serverConfig?.imageApiUrl,
     hasImgToken: !!serverConfig?.imageApiToken
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl w-full max-w-lg p-6 relative shadow-xl animate-in fade-in scale-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl font-bold text-tea-900 flex items-center gap-2">
            <Settings size={20} /> 系统配置
          </h3>
          <button onClick={onClose}><X size={20} className="text-tea-400" /></button>
        </div>

        <div className="space-y-6 mb-6">
          {/* Environment Diagnosis */}
          <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
             <div className="flex items-center justify-between gap-2 mb-2 text-tea-800 text-sm font-bold">
               <div className="flex items-center gap-2">
                 <Server size={14}/> 环境变量服务状态
               </div>
               <div className="flex items-center gap-1 text-xs">
                 {isEnvLoading ? (
                   <span className="flex items-center gap-1 text-tea-400"><Loader2 size={10} className="animate-spin"/> 连接中...</span>
                 ) : envStatus.connected ? (
                   <span className="flex items-center gap-1 text-green-600"><Wifi size={10}/> 已连接到云端</span>
                 ) : (
                   <span className="flex items-center gap-1 text-red-500"><Wifi size={10}/> 无法连接云端</span>
                 )}
               </div>
             </div>
             
             <div className="space-y-1 text-xs text-tea-600">
               <div className="flex justify-between">
                 <span>Supabase Config:</span>
                 {envStatus.hasUrl && envStatus.hasKey ? <span className="text-green-600 font-mono">✅ 已获取</span> : <span className="text-red-500 font-mono">⚠️ 部分缺失</span>}
               </div>
               <div className="flex justify-between">
                  <span>Image API Token:</span>
                  {envStatus.hasImgToken ? <span className="text-green-600 font-mono">✅ 已获取</span> : <span className="text-stone-400 font-mono">◯ 未配置 (可选)</span>}
               </div>
               <div className="text-[10px] text-tea-400 mt-1 border-t border-stone-200 pt-1">
                 系统正在尝试从 /api/env 读取配置。如果失败，请检查是否已在 Vercel 重新部署。
               </div>
             </div>
          </div>

          {/* Supabase Config */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-tea-100">
               <Database size={16} className="text-accent"/>
               <h4 className="font-bold text-tea-800 text-sm">Supabase 数据库</h4>
            </div>
            
            <Input 
              label="Project URL (API URL)" 
              rightLabel={envStatus.hasUrl && <span className="text-green-600 text-[10px] flex items-center gap-0.5"><CheckCircle2 size={10}/> 自动获取</span>}
              value={localConfig.supabaseUrl}
              onChange={(e: any) => setLocalConfig({...localConfig, supabaseUrl: e.target.value})}
              placeholder="https://your-project.supabase.co"
            />
            <Input 
              label="API Key (anon / public)" 
              rightLabel={envStatus.hasKey && <span className="text-green-600 text-[10px] flex items-center gap-0.5"><CheckCircle2 size={10}/> 自动获取</span>}
              type="password"
              value={localConfig.supabaseKey}
              onChange={(e: any) => setLocalConfig({...localConfig, supabaseKey: e.target.value})}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
          </div>

          {/* Image Config */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-tea-100">
               <ImageIcon size={16} className="text-accent"/>
               <h4 className="font-bold text-tea-800 text-sm">图床设置</h4>
            </div>
            
            <Input 
              label="图床 API 地址" 
              value={localConfig.imageApiUrl}
              onChange={(e: any) => setLocalConfig({...localConfig, imageApiUrl: e.target.value})}
              placeholder="https://cfbed.sanyue.de/api/upload"
            />
            <Input 
              label="API Token (可选)" 
              rightLabel={envStatus.hasImgToken && <span className="text-green-600 text-[10px] flex items-center gap-0.5"><CheckCircle2 size={10}/> 自动获取</span>}
              type="password"
              value={localConfig.imageApiToken}
              onChange={(e: any) => setLocalConfig({...localConfig, imageApiToken: e.target.value})}
              placeholder="输入你的 API Token"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-tea-50">
           <Button variant="ghost" onClick={handleResetToEnv} className="!px-2 text-tea-400 hover:text-tea-600" disabled={!serverConfig}>
              <RotateCcw size={14} className="mr-1"/> 重置为系统变量
           </Button>
           <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button onClick={() => { onSave(localConfig); onClose(); }}>
                <Save size={16}/> 保存并连接
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);