import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  RotateCcw,
  User,
  Copy,
  Check,
  Settings,
  Leaf,
  Coffee,
  ChevronRight,
  Share2,
  CornerDownLeft,
  AlertCircle
} from 'lucide-react';
import { TeaItem, AiChatMessage, AiConfig } from '../../types/tea';
import { sendSommelierChat, buildCollectionSummary, getAiConfig } from '../../services/aiService';
import { AiSettingsModal } from './AiSettingsModal';
import { SommelierMarkdown } from './SommelierMarkdown';

export interface FloatingSommelierProps {
  items: TeaItem[];
  onSelectItem?: (item: TeaItem) => void;
}

// 场景化快捷启发提问
const PROMPT_CATEGORIES = [
  {
    category: '时令适饮',
    icon: '🍃',
    prompts: [
      '今日时令宜饮何茶？请结合我库存中的名茶推荐',
      '晚上想喝点温和不失眠的茶，库存里哪款最合适？',
      '今日阴雨微寒，有何驱寒暖胃的茶品与配器建议？'
    ]
  },
  {
    category: '挑壶配器',
    icon: '🫖',
    prompts: [
      '帮我盘点库存茶器，给我的存茶做最佳器茶配伍',
      '紫砂壶泡老白茶和生普分别有何泥料讲究？',
      '库里的盖碗与紫砂壶分别适合出哪类茶汤？'
    ]
  },
  {
    category: '冲泡指津',
    icon: '💧',
    prompts: [
      '请为我挑选一款茶，详细指导投茶量、水温与出汤节拍',
      '陈年老茶开汤前如何洗茶与唤醒叶底？',
      '高香型乌龙茶如何高冲聚香并避免苦涩？'
    ]
  },
  {
    category: '存藏体检',
    icon: '📊',
    prompts: [
      '盘点我的存茶结构：哪些适宜尽早品饮？哪些适宜继续陈放？',
      '我库存中的茶品受潮或串味风险排查建议',
      '如何为新购入的紧压茶进行醒茶与散仓？'
    ]
  }
];

export const FloatingSommelier: React.FC<FloatingSommelierProps> = ({
  items,
  onSelectItem
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  const [aiConfig, setAiConfig] = useState<AiConfig>(() => getAiConfig());
  const [activeModelName, setActiveModelName] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '茶友安好。我是您的私房**「茶席侍茶师」**。\n\n我已悉数研读您的藏茶名录与茶器珍藏。无论是**今日时令选茶**、**器茶配伍法门**、**冲泡水温节拍**，或是**仓储陈化洞察**，随时愿为您侍茶奉答。请问今日茶席想探讨何等茶事？',
      timestamp: Date.now()
    }
  ]);

  // 跨组件 / 本地配置变更实时监听
  useEffect(() => {
    const handleStorageChange = () => {
      setAiConfig(getAiConfig());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 统计藏品现状
  const summary = useMemo(() => buildCollectionSummary(items), [items]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // 发送消息
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await sendSommelierChat(history, summary);

      const aiMsg: AiChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        isFallback: res.isFallback,
        usedModel: res.usedModel,
        modelDisplayName: res.modelDisplayName
      };

      if (res.modelDisplayName || res.usedModel) {
        setActiveModelName(res.modelDisplayName || res.usedModel || '');
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '水温略沸，侍茶偶遇延迟。请稍候重试。',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 重置对话
  const handleResetConfirmed = () => {
    setMessages([
      {
        id: `w-${Date.now()}`,
        role: 'assistant',
        content:
          '茶席已重新布设洁净，炭火初红。请问今日想品鉴哪款茶品或探讨何等茶事？',
        timestamp: Date.now()
      }
    ]);
    setShowResetConfirm(false);
  };

  // 复制单条消息
  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => {
        setCopiedMsgId(null);
      }, 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // 复制整个茶席记录
  const handleExportFullChat = async () => {
    const text = messages
      .map((m) => {
        const role = m.role === 'user' ? '【茶友提问】' : '【侍茶师奉答】';
        return `${role}\n${m.content}\n`;
      })
      .join('\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('茶席全案对话已成功复制至剪贴板，可粘贴至笔记或分享给茶友。');
    } catch (e) {
      console.error(e);
    }
  };

  // 点击标签跳转对应藏品
  const handleTeaTagClick = (teaName: string) => {
    const clean = teaName.trim().toLowerCase();
    const matched = items.find(
      (item) =>
        item.name.toLowerCase() === clean ||
        item.name.toLowerCase().includes(clean) ||
        clean.includes(item.name.toLowerCase())
    );
    if (matched && onSelectItem) {
      onSelectItem(matched);
    }
  };

  // 识别消息中提及的实际藏品
  const getReferencedItems = (content: string): TeaItem[] => {
    if (!content) return [];
    return items.filter((item) => {
      if (!item.name || item.name.length < 2) return false;
      return content.includes(item.name);
    });
  };

  // 智能推导针对当前助手回答的 3 个快捷追问
  const getFollowUpSuggestions = (content: string): string[] => {
    const suggestions: string[] = [];
    if (content.includes('壶') || content.includes('器') || content.includes('紫砂')) {
      suggestions.push('🍵 推荐此器冲泡的最佳适温与投茶量');
      suggestions.push('✨ 这把壶日常如何开壶与养护养光？');
    }
    if (content.includes('水温') || content.includes('冲泡') || content.includes('泡')) {
      suggestions.push('⏱️ 给出前 6 泡每泡精确出汤秒数表');
      suggestions.push('🌿 这款茶可以用于煮茶或冷萃吗？');
    }
    if (content.includes('白茶') || content.includes('普洱') || content.includes('老茶')) {
      suggestions.push('📦 开封后如何醒茶以散去仓气？');
      suggestions.push('🍵 推荐我库中另一款风味互补的茶');
    }
    if (suggestions.length < 3) {
      suggestions.push('🫖 推荐搭配我库存中的哪把茶壶？');
      suggestions.push('🍃 推荐今日适宜的另一款茶品');
      suggestions.push('💧 详细各泡出汤水温与汤感变化');
    }
    return Array.from(new Set(suggestions)).slice(0, 3);
  };

  // 引擎与模型标签展示（真实反映当前配置或最新调用的模型）
  const engineLabel = useMemo(() => {
    if (activeModelName) {
      if (activeModelName.startsWith('gemini')) {
        return `⚡ ${activeModelName}`;
      }
      return activeModelName;
    }
    if (aiConfig.provider === 'gemini') {
      const model = aiConfig.geminiModel || 'gemini-3.8-flash';
      return `⚡ ${model}`;
    }
    if (aiConfig.provider === 'openai_compatible') {
      const model = aiConfig.customModel || 'DeepSeek';
      return `🚀 ${model}`;
    }
    return '🍵 内置大师 (免Key)';
  }, [aiConfig, activeModelName]);

  const activeCategory = PROMPT_CATEGORIES[activeCategoryIdx] || PROMPT_CATEGORIES[0];

  return (
    <>
      {/* 浮动触发小印 (Floating Trigger Button) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-[#3d655a] hover:bg-[#34574d] text-amber-50 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 border border-emerald-400/30 group cursor-pointer"
          title="展开茶席侍茶师"
          aria-label="茶席侍茶师"
        >
          {/* 朱砂小印风图标 */}
          <div className="relative flex items-center justify-center w-7 h-7 rounded bg-amber-100/10 border border-amber-200/30 text-amber-200 group-hover:scale-105 transition-transform">
            <Sparkles size={15} className="animate-pulse" />
          </div>
          <div className="text-left">
            <span className="font-serif text-sm font-semibold tracking-wide block leading-tight">
              茶席侍茶师
            </span>
            <span className="text-[10px] text-emerald-200/80 font-sans tracking-tight block">
              已载入 {summary.teas.length} 款茶 · {summary.wares.length} 件器
            </span>
          </div>
        </button>
      )}

      {/* 侍茶师交互面板 (Sommelier Chat Panel) */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col bg-[#fdfbf7] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden text-stone-800 transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 ${
            isExpanded
              ? 'w-[calc(100vw-2rem)] sm:w-[680px] max-w-[760px] h-[680px] max-h-[90vh]'
              : 'w-[calc(100vw-2rem)] sm:w-[440px] max-w-[480px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* 1. Header 顶栏 */}
          <div className="bg-[#3d655a] text-stone-100 px-4 py-3 flex items-center justify-between border-b border-[#2e4f46] shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-400/30 flex items-center justify-center text-amber-200 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm font-semibold tracking-wide text-amber-100 whitespace-nowrap">
                    茶席侍茶师
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/70 hover:bg-emerald-800 text-amber-200 border border-emerald-400/25 font-sans transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    title="点击配置或切换 AI 模型引擎"
                  >
                    {engineLabel}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-200/75 font-sans truncate mt-0.5">
                  已挂载：{summary.teas.length} 种藏茶 · {summary.wares.length} 件茶器
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-stone-300">
              {/* 导出全案 */}
              <button
                onClick={handleExportFullChat}
                title="复制整席茶事记录"
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Share2 size={15} />
              </button>
              {/* AI 模型设置 */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="AI 侍茶引擎与模型设置"
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <Settings size={15} />
              </button>
              {/* 宽屏展开切换 */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? '还原标准窗口' : '展开宽屏研读模式'}
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors hidden sm:flex cursor-pointer"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              {/* 重新开席 / 重置 */}
              <button
                onClick={() => setShowResetConfirm(true)}
                title="重新开席（清空对话）"
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>
              {/* 最小化收起 */}
              <button
                onClick={() => setIsOpen(false)}
                title="收起侍茶小印"
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 清空对话确认浮层 */}
          {showResetConfirm && (
            <div className="bg-amber-50/95 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-stone-700 animate-in fade-in shrink-0">
              <div className="flex items-center gap-1.5 text-stone-800 font-serif">
                <AlertCircle size={14} className="text-amber-700" />
                <span>确定清空当前对话，重新摆布茶席吗？</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-0.5 text-stone-600 hover:text-stone-800 text-[11px] cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleResetConfirmed}
                  className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                >
                  确认重新开席
                </button>
              </div>
            </div>
          )}

          {/* 2. 场景化快捷启发分类栏 */}
          <div className="bg-[#f5f1e8] border-b border-stone-200/90 px-3 py-1.5 flex items-center justify-between text-[11px] shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {PROMPT_CATEGORIES.map((cat, idx) => {
                const isActive = activeCategoryIdx === idx;
                return (
                  <button
                    key={cat.category}
                    onClick={() => setActiveCategoryIdx(idx)}
                    className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-serif cursor-pointer ${
                      isActive
                        ? 'bg-[#3d655a] text-white font-medium shadow-2xs'
                        : 'bg-stone-200/60 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 当前分类下的快捷提问条 */}
          <div className="bg-[#faf6ee] border-b border-stone-200/70 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px] shrink-0">
            {activeCategory.prompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(promptText)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-300/80 rounded-md transition-colors font-serif shadow-2xs hover:border-emerald-300 cursor-pointer disabled:opacity-50 text-left"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* 3. 对话消息流 (Messages Flow) */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 bg-[#fdfbf7] custom-scrollbar text-sm">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isLatestAssistant =
                !isUser &&
                idx === messages.length - 1;
              const referencedItems = !isUser ? getReferencedItems(msg.content) : [];
              const followUps = isLatestAssistant && !isLoading ? getFollowUpSuggestions(msg.content) : [];

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`flex gap-2.5 max-w-[94%] ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* 头像 */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-2xs ${
                        isUser
                          ? 'bg-stone-300 text-stone-700'
                          : 'bg-[#3d655a] text-amber-100 font-serif font-bold border border-emerald-400/30'
                      }`}
                    >
                      {isUser ? <User size={14} /> : '茶'}
                    </div>

                    {/* 消息正文卡片 */}
                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl leading-relaxed text-xs sm:text-[13px] ${
                        isUser
                          ? 'bg-[#3d655a] text-white rounded-tr-xs shadow-xs font-sans'
                          : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      {/* 助手消息操作按钮（复制） */}
                      {!isUser && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            title="复制侍茶指津"
                            className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      )}

                      {/* 消息内容：用户纯文本，AI 采用专业 SommelierMarkdown 渲染 */}
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      ) : (
                        <SommelierMarkdown
                          content={msg.content}
                          onTeaTagClick={handleTeaTagClick}
                        />
                      )}

                      {/* 涉及藏品联动卡片 (Referenced Items) */}
                      {!isUser && referencedItems.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-200/80">
                          <div className="text-[11px] text-stone-500 font-serif flex items-center gap-1 mb-1.5">
                            <Leaf size={12} className="text-[#3d655a]" />
                            <span>席上涉及私房藏品（点击查看详情）：</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {referencedItems.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => onSelectItem?.(item)}
                                className="flex items-center gap-2 p-1.5 rounded-lg bg-stone-50 hover:bg-emerald-50 border border-stone-200/80 hover:border-emerald-300 text-left transition-all cursor-pointer group/item"
                              >
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-7 h-7 rounded object-cover shrink-0 border border-stone-200"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-emerald-100/50 text-[#3d655a] flex items-center justify-center shrink-0">
                                    {item.type === 'TEA' ? <Leaf size={13} /> : <Coffee size={13} />}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-serif text-[11px] font-semibold text-stone-800 group-hover/item:text-[#2e4f46] truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-stone-500 truncate">
                                    {item.category} {item.year ? `· ${item.year}年` : ''}{' '}
                                    {item.material ? `· ${item.material}` : ''}
                                  </div>
                                </div>
                                <ChevronRight
                                  size={12}
                                  className="text-stone-400 group-hover/item:text-emerald-700 shrink-0"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 模型版本与来源小标签 */}
                      {!isUser && (msg.usedModel || msg.modelDisplayName || msg.isFallback !== undefined) && (
                        <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-sans">
                          <span className="flex items-center gap-1">
                            {msg.isFallback ? (
                              <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                🍵 内置茶学知识库
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                ⚡ {msg.usedModel || msg.modelDisplayName || '已连接模型'}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 针对最新助手回复的智能追问启发气泡 */}
                  {followUps.length > 0 && (
                    <div className="ml-9 mt-2 flex flex-wrap gap-1.5 animate-in fade-in">
                      <span className="text-[10px] text-stone-400 font-serif self-center mr-0.5">
                        继续追问：
                      </span>
                      {followUps.map((fu, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSend(fu)}
                          className="text-[11px] px-2.5 py-0.5 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 rounded-full font-serif transition-colors shadow-2xs cursor-pointer"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 加载思考态 */}
            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-stone-600 font-serif italic py-1.5 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-[#3d655a] text-amber-100 flex items-center justify-center shrink-0">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/60">
                  <span>侍茶师正在研酌配伍、拟定理化水温与出汤节拍...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 4. 输入交互区 (Multi-line Textarea Input) */}
          <div className="p-2.5 sm:p-3 bg-white border-t border-stone-200 shrink-0">
            <div className="relative flex items-end gap-2 bg-stone-50 border border-stone-300 focus-within:border-[#3d655a] focus-within:ring-1 focus-within:ring-[#3d655a] rounded-xl p-1.5 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="向侍茶师提问（如：今晚喝哪款茶？这把段泥壶配什么茶？Enter 发送，Shift+Enter 换行）"
                disabled={isLoading}
                className="flex-1 bg-transparent border-0 resize-none max-h-24 px-2 py-1 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none font-serif custom-scrollbar"
                style={{ minHeight: '36px' }}
              />

              {input.trim() && (
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
                  title="清空文字"
                >
                  <X size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-[#3d655a] hover:bg-[#34574d] disabled:opacity-40 text-amber-50 rounded-lg transition-colors flex items-center justify-center text-xs font-medium cursor-pointer shrink-0 shadow-xs"
                title="发送问题 (Enter)"
              >
                {isLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-stone-400 font-sans">
              <span>Enter 发送 · Shift+Enter 换行</span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="hover:text-stone-600 transition-colors underline cursor-pointer"
              >
                当前引擎：{engineLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Settings Modal */}
      <AiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={(updated) => {
          setAiConfig(updated);
          setActiveModelName('');
        }}
      />
    </>
  );
};
