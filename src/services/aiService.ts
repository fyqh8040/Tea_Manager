import {
  TeaItem,
  AiChatMessage,
  SensoryAnalysisResult,
  VisionExtractionResult,
  AiConfig
} from '../types/tea';

export interface CollectionSummary {
  teas: Array<{
    id: string;
    name: string;
    category: string;
    year?: string;
    origin?: string;
    quantity: number;
    unit: string;
    description?: string;
    rating?: number;
  }>;
  wares: Array<{
    id: string;
    name: string;
    category: string;
    material?: string;
    capacity_ml?: number;
    paired_tea?: string;
    quantity: number;
    unit: string;
  }>;
}

const AI_CONFIG_KEY = 'tea_ai_engine_config_v1';

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'builtin',
  geminiModel: 'gemini-3.8-flash',
  customBaseUrl: 'https://api.deepseek.com/v1',
  customModel: 'deepseek-chat'
};

/**
 * 获取当前用户的 AI 引擎配置
 */
export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);
    const config = { ...DEFAULT_AI_CONFIG, ...parsed };
    // 自动平滑迁移已弃用的 gemini-2.5-flash 为最新的 gemini-3.8-flash
    if (!config.geminiModel || config.geminiModel === 'gemini-2.5-flash') {
      config.geminiModel = 'gemini-3.8-flash';
    }
    return config;
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

/**
 * 保存 AI 引擎配置到本地
 */
export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AI config:', e);
  }
}

/**
 * 将当前系统的藏品列表提炼为精简结构上下文，便于挂载到 AI 对话 Prompt 中
 */
export function buildCollectionSummary(items: TeaItem[]): CollectionSummary {
  const teas: CollectionSummary['teas'] = [];
  const wares: CollectionSummary['wares'] = [];

  for (const item of items) {
    if (item.type === 'TEA') {
      teas.push({
        id: item.id,
        name: item.name,
        category: item.category,
        year: item.year,
        origin: item.origin,
        quantity: item.quantity,
        unit: item.unit,
        description: item.description,
        rating: item.rating
      });
    } else {
      wares.push({
        id: item.id,
        name: item.name,
        category: item.category,
        material: item.material,
        capacity_ml: item.capacity_ml,
        paired_tea: item.paired_tea,
        quantity: item.quantity,
        unit: item.unit
      });
    }
  }

  return { teas, wares };
}

/**
 * 1. 侍茶师智能多轮对话
 */
export async function sendSommelierChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  summary?: CollectionSummary
): Promise<{ reply: string; isFallback?: boolean; usedModel?: string; modelDisplayName?: string; warning?: string }> {
  const config = getAiConfig();

  try {
    const res = await fetch('/api/ai?action=chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        messages,
        collectionSummary: summary,
        aiConfig: config
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      reply: data.reply || '茶烟袅袅，侍茶师暂未领会您的深意，请换一种方式与我交流。',
      isFallback: !!data.isFallback,
      usedModel: data.usedModel,
      modelDisplayName: data.modelDisplayName,
      warning: data.warning
    };
  } catch (err: any) {
    console.warn('AI Chat API fallback:', err);
    // 客户端离线保障
    const query = messages[messages.length - 1]?.content || '';
    return {
      reply: `【茶席侍茶师】\n水沸声清，已为您调取私房茶学知识库。\n\n关于您咨询的「${query.slice(0, 20)}」：\n• 若为晨起或午后，建议冲泡高香乌龙或古树生普，水温98℃高冲，醒脑提神；\n• 若为晚间，建议选择五年以上陈年老白茶或熟普，以紫砂小品壶冲泡，茶性温和醇润，养胃安神。`,
      isFallback: true,
      usedModel: 'builtin',
      modelDisplayName: '内置茶学专家 (离线知识库)'
    };
  }
}

/**
 * 2. 感官品记分析与六维风味雷达自动推导
 */
export async function analyzeSensoryProfile(
  text: string,
  teaInfo?: { name?: string; category?: string; year?: string; origin?: string }
): Promise<SensoryAnalysisResult> {
  const config = getAiConfig();

  try {
    const res = await fetch('/api/ai?action=sensory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sensory',
        text,
        teaInfo,
        aiConfig: config
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      return {
        flavor_profile: json.data.flavor_profile,
        brewing_guide: json.data.brewing_guide,
        polished_note: json.data.polished_note,
        suggested_tags: json.data.suggested_tags,
        isFallback: !!json.isFallback
      };
    }
    throw new Error('Invalid sensory response');
  } catch (err: any) {
    console.warn('AI Sensory API fallback:', err);
    return {
      flavor_profile: {
        aroma: 4,
        aftertaste: 4,
        salivation: 4,
        endurance: 4,
        body: 4,
        sensation: 3
      },
      brewing_guide: {
        water_temp: 95,
        tea_grams: 7.5,
        steep_seconds: 12,
        recommended_ware: '原矿紫砂壶或白瓷盖碗'
      },
      polished_note: `【${teaInfo?.name || '此款茶品'}】开汤香气醇正高扬。初汤汤色明澈，入口水路细腻温润；中段回甘生津连绵，喉韵清冽；尾段茶韵悠长，体感通透舒适。`,
      suggested_tags: ['清雅幽香', '生津绵长', '宜盖碗/紫砂'],
      isFallback: true
    };
  }
}

/**
 * 3. 图像多模态识别与藏品建档提取
 */
export async function extractItemFromImage(
  imageBase64: string,
  typeHint?: 'TEA' | 'TEAWARE' | 'AUTO'
): Promise<VisionExtractionResult> {
  const config = getAiConfig();

  try {
    const res = await fetch('/api/ai?action=vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vision',
        image: imageBase64,
        typeHint,
        aiConfig: config
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      return {
        ...json.data,
        isFallback: !!json.isFallback
      };
    }
    throw new Error('Invalid vision response');
  } catch (err: any) {
    console.warn('AI Vision API fallback:', err);
    const isWare = typeHint === 'TEAWARE';
    return {
      type: isWare ? 'TEAWARE' : 'TEA',
      name: isWare ? '紫砂仿古壶' : '易武正山古树生茶',
      category: isWare ? '紫砂壶' : '生普',
      year: '2021',
      origin: isWare ? '江苏宜兴' : '云南西双版纳',
      material: isWare ? '原矿底槽清' : undefined,
      capacity_ml: isWare ? 180 : undefined,
      paired_tea: isWare ? '生普 / 乌龙茶' : undefined,
      description: isWare
        ? '壶身饱满圆润，骨肉停匀。口盖严密，出水圆柱挺拔有力。'
        : '条索紧结肥壮，白毫显露。开汤花蜜香高扬，山野气韵饱满。',
      tags: isWare ? ['名家工料', '器型稳健'] : ['高山古树', '生津回甘'],
      isFallback: true
    };
  }
}
