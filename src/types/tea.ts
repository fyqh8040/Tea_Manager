export type ItemType = 'TEA' | 'TEAWARE';

export type ViewMode = 'GALLERY' | 'TABLE' | 'TIMELINE';

export interface FlavorProfile {
  aroma: number; // 香气 (1-5)
  aftertaste: number; // 回甘 (1-5)
  salivation: number; // 生津 (1-5)
  endurance: number; // 耐泡度 (1-5)
  body: number; // 汤感醇厚 (1-5)
  sensation: number; // 茶气体感 (1-5)
}

export interface BrewingGuide {
  water_temp?: number; // 水温 °C
  tea_grams?: number; // 投茶量 g
  steep_seconds?: number; // 出汤秒数 s
  recommended_ware?: string; // 推荐器皿
}

export interface TastingNote {
  id: string;
  item_id: string;
  rating: number; // 1-5 星
  water_temp?: number;
  steep_seconds?: number;
  tea_amount?: number;
  ware_name?: string;
  soup_color?: string;
  flavor_tags?: string;
  notes?: string;
  created_at: number;
}

export interface TeaItem {
  id: string;
  user_id?: string;
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

  // 专业扩展属性
  material?: string; // 泥料 / 材质 (如紫泥、底槽清、柴烧)
  capacity_ml?: number; // 容量 (ml)
  pore_type?: string; // 出水孔类型 (球孔、网孔、单孔)
  paired_tea?: string; // 侍茶绑定 (如专侍生普)
  storage_location?: string; // 存放仓位 (如茶柜A层、紫砂罐01)
  tags?: string; // 标签 (逗号分隔，如 口粮茶,珍藏老茶)
  flavor_profile?: FlavorProfile; // 六维风味雷达数据
  brewing_guide?: BrewingGuide; // 推荐冲泡指南
  rating?: number; // 藏家自评星级 (1-5)
  low_stock_threshold?: number; // 低库存预警阈值
}

export interface InventoryLog {
  id: string;
  item_id: string;
  change_amount: number;
  current_balance: number;
  reason: string;
  note?: string;
  created_at: number;
}

export interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  imageApiUrl: string;
  imageApiToken: string;
  hasServerDb?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  role: 'admin' | 'user';
  is_initial: boolean;
}

export interface SystemStats {
  totalItems: number;
  totalValue: number;
  teaCount: number;
  teawareCount: number;
  lowStockCount: number;
}

// AI 智能功能类型定义
export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isFallback?: boolean;
  usedModel?: string;
  modelDisplayName?: string;
}

export interface SensoryAnalysisResult {
  flavor_profile?: FlavorProfile;
  brewing_guide?: BrewingGuide;
  polished_note?: string;
  suggested_tags?: string[];
  isFallback?: boolean;
}

export interface VisionExtractionResult {
  type?: ItemType;
  name?: string;
  category?: string;
  year?: string;
  origin?: string;
  material?: string;
  capacity_ml?: number;
  paired_tea?: string;
  description?: string;
  tags?: string[];
  isFallback?: boolean;
}

export type AiProviderType = 'builtin' | 'gemini' | 'openai_compatible';

export interface AiConfig {
  provider: AiProviderType;
  geminiApiKey?: string;
  geminiModel?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;
}
