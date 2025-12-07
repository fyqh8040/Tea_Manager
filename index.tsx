
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
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
  Coffee,
  RotateCcw
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
  imageUrl?: string;
  createdAt: number;
}

interface ImageConfig {
  apiUrl: string;
  apiToken: string;
}

// --- Constants ---
const DEFAULT_API_URL = 'https://cfbed.sanyue.de/api/upload';

// --- Helper for Safe Env Access ---
const getEnv = (key: string): string | undefined => {
  // 1. Try process.env (Next.js / CRA / Webpack)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  
  // 2. Try import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  return undefined;
};

// --- Mock Data ---

const INITIAL_DATA: TeaItem[] = [
  {
    id: '1',
    name: '2003年 易武正山',
    type: 'TEA',
    category: '普洱生茶',
    year: '2003',
    origin: '云南西双版纳',
    description: '汤色金黄明亮，口感醇厚，回甘持久。存放二十年，陈韵初显。',
    imageUrl: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now(),
  },
  {
    id: '2',
    name: '顾景舟款 仿古壶',
    type: 'TEAWARE',
    category: '紫砂壶',
    year: '现代',
    origin: '江苏宜兴',
    description: '泥料为原矿底槽清，做工精细，出水流畅。',
    imageUrl: 'https://images.unsplash.com/photo-1578859765790-2e90c6753730?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now() - 10000,
  }
];

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
    <label className="text-xs font-semibold text-tea-500 uppercase tracking-wider">{label}</label>
    <input 
      className="w-full px-3 py-2 bg-white/50 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all text-tea-800 placeholder-tea-300"
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
  const [items, setItems] = useState<TeaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TeaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TEA' | 'TEAWARE'>('ALL');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TeaItem | null>(null);
  
  // Image Config State
  const [imageConfig, setImageConfig] = useState<ImageConfig>(() => {
    // Determine Env Vars
    const envUrl = getEnv('NEXT_PUBLIC_IMAGE_API_URL');
    const envToken = getEnv('NEXT_PUBLIC_IMAGE_API_TOKEN');
    
    const effectiveDefaultUrl = envUrl || DEFAULT_API_URL;
    const effectiveDefaultToken = envToken || '';

    // 1. Try LocalStorage
    const savedConfigStr = localStorage.getItem('tea_image_config');
    if (savedConfigStr) {
      const savedConfig = JSON.parse(savedConfigStr);
      
      // Intelligent Correction:
      // If the saved URL is the *old default* AND we now have a *new env var*, 
      // it means the cache is stale. Ignore cache and use Env Var.
      if (savedConfig.apiUrl === DEFAULT_API_URL && envUrl && envUrl !== DEFAULT_API_URL) {
         console.log('Detected stale config. Updating to Environment Variable.');
         return {
           apiUrl: envUrl,
           apiToken: envToken || savedConfig.apiToken
         };
      }
      return savedConfig;
    }

    // 2. Use Env Vars or Default
    return {
      apiUrl: effectiveDefaultUrl,
      apiToken: effectiveDefaultToken
    };
  });

  // Load Data
  useEffect(() => {
    const saved = localStorage.getItem('tea_collection_items');
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      setItems(INITIAL_DATA);
    }
  }, []);

  // Persist Data
  useEffect(() => {
    localStorage.setItem('tea_collection_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('tea_image_config', JSON.stringify(imageConfig));
  }, [imageConfig]);

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

  const handleDelete = (id: string) => {
    if (confirm('确认删除这件藏品吗？')) {
      setItems(prev => prev.filter(i => i.id !== id));
      if (editingItem?.id === id) setIsModalOpen(false);
    }
  };

  const handleSave = (item: TeaItem) => {
    if (items.find(i => i.id === item.id)) {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
    } else {
      setItems(prev => [item, ...prev]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleResetConfig = () => {
    const envUrl = getEnv('NEXT_PUBLIC_IMAGE_API_URL');
    const envToken = getEnv('NEXT_PUBLIC_IMAGE_API_TOKEN');
    
    const defaultConfig = {
      apiUrl: envUrl || DEFAULT_API_URL,
      apiToken: envToken || ''
    };
    
    setImageConfig(defaultConfig);
    return defaultConfig;
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
              <Settings size={20} />
            </Button>
            <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
              <Plus size={18} />
              <span className="hidden sm:inline">记一笔</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-24">
        
        {/* Header / Stats */}
        <header className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-tea-900 mb-4">
            {new Date().getHours() < 12 ? '早安' : '午安'}，藏家
          </h1>
          <p className="text-tea-500 max-w-xl leading-relaxed">
            目前共收录 {items.length} 件藏品。每一片叶子都有它的故事，每一把壶都记录着时光的温度。
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-tea-100 flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] bg-tea-100 overflow-hidden">
                {item.imageUrl ? (
                  <img 
                    src={item.imageUrl} 
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
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center text-tea-400">
              <div className="mx-auto w-16 h-16 bg-tea-100 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-tea-400" />
              </div>
              <p>没有找到相关藏品，去泡杯茶休息一下吧。</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <ItemModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          item={editingItem}
          onSave={handleSave}
          onDelete={handleDelete}
          imageConfig={imageConfig}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          config={imageConfig}
          onSave={setImageConfig}
          onReset={handleResetConfig}
        />
      )}
    </div>
  );
};

// --- Sub Components ---

const ItemModal = ({ isOpen, onClose, item, onSave, onDelete, imageConfig }: any) => {
  const [formData, setFormData] = useState<Partial<TeaItem>>({
    type: 'TEA',
    name: '',
    category: '',
    year: '',
    origin: '',
    description: '',
    imageUrl: ''
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
        imageUrl: ''
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: item?.id || Math.random().toString(36).substr(2, 9),
      createdAt: item?.createdAt || Date.now()
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Helper to read file as Base64 for local fallback
    const readFileAsBase64 = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    };

    try {
      // 1. Attempt API Upload if URL is configured
      let uploadSuccess = false;

      if (imageConfig.apiUrl) {
        try {
          const data = new FormData();
          data.append('file', file);
          if (imageConfig.apiToken) {
              data.append('token', imageConfig.apiToken);
          }

          const response = await fetch(imageConfig.apiUrl, {
            method: 'POST',
            body: data,
          });
          
          if (response.ok) {
            const result = await response.json();
            // Try to find the URL in common response formats
            const uploadedUrl = result.url || result.data?.url || result.link; 
            
            if (uploadedUrl) {
              setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
              uploadSuccess = true;
            }
          } else {
            console.warn(`API upload failed with status: ${response.status}`);
          }
        } catch (netError) {
          console.warn('Network error during upload (CORS or Offline), switching to local mode.', netError);
        }
      }

      // 2. Fallback: Use Local Base64 if API failed or wasn't configured
      if (!uploadSuccess) {
        const base64 = await readFileAsBase64(file);
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
        // Optionally log or toast here: "Using local storage for image"
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      alert('图片处理出错，请重试');
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
          {formData.imageUrl ? (
            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
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
              {formData.imageUrl ? '更换图片' : '上传图片'}
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

          {/* Type Selector */}
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
                placeholder={formData.type === 'TEA' ? "例如：普洱生茶" : "例如：紫砂壶"}
                required
              />
              <Input 
                label="年份" 
                value={formData.year} 
                onChange={(e: any) => setFormData({...formData, year: e.target.value})} 
                placeholder="例如：2015" 
              />
            </div>

            <Input 
              label="产地 / 来源" 
              value={formData.origin} 
              onChange={(e: any) => setFormData({...formData, origin: e.target.value})} 
              placeholder="例如：云南西双版纳" 
            />

            <TextArea 
              label="描述 / 品鉴笔记" 
              value={formData.description} 
              onChange={(e: any) => setFormData({...formData, description: e.target.value})} 
              placeholder="记录香气、口感、入手渠道或收藏心得..." 
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

const SettingsModal = ({ isOpen, onClose, config, onSave, onReset }: any) => {
  const [localConfig, setLocalConfig] = useState(config);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl animate-in fade-in scale-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-xl font-bold text-tea-900 flex items-center gap-2">
            <Settings size={20} /> 系统设置
          </h3>
          <button onClick={onClose}><X size={20} className="text-tea-400" /></button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg leading-relaxed">
            <strong>图床说明：</strong> 项目默认支持对接类似 cfbed 的 API。
            <br/>接口需支持 POST 请求，FormData 字段为 `file`，可选 `token`。
            <br/>在 Vercel 部署时，建议将这些配置写入环境变量。
          </div>
          
          <Input 
            label="图床 API 地址" 
            value={localConfig.apiUrl}
            onChange={(e: any) => setLocalConfig({...localConfig, apiUrl: e.target.value})}
            placeholder="https://cfbed.sanyue.de/api/upload"
          />
          <Input 
            label="API Token (可选)" 
            type="password"
            value={localConfig.apiToken}
            onChange={(e: any) => setLocalConfig({...localConfig, apiToken: e.target.value})}
            placeholder="输入你的 API Token"
          />
        </div>

        <div className="flex justify-between gap-3 pt-2 border-t border-tea-50">
          <Button variant="ghost" onClick={() => {
             if(confirm("确定要重置为系统默认配置（读取环境变量）吗？")) {
               const defaults = onReset();
               setLocalConfig(defaults);
             }
          }} className="text-red-400 hover:text-red-600 hover:bg-red-50 !px-2">
            <RotateCcw size={16} className="mr-1"/> 重置默认
          </Button>
          <div className="flex gap-3">
             <Button variant="secondary" onClick={onClose}>取消</Button>
             <Button onClick={() => { onSave(localConfig); onClose(); }}>保存配置</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
