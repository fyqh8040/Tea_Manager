import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, X, Share2, Check, Loader2, Image as ImageIcon, Copy, RefreshCw } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TeaItem, FlavorProfile, BrewingGuide } from '../../types/tea';
import { FlavorRadar } from './FlavorRadar';
import { Button } from '../ui/Button';
import { analyzeSensoryProfile } from '../../services/aiService';

export interface TeaCardPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeaItem;
}

// 针对茶品智能推导权威默认感官风味六维雷达
function deriveDefaultFlavor(item: TeaItem): FlavorProfile {
  if (item.flavor_profile && Object.values(item.flavor_profile).some((v) => v > 0)) {
    return item.flavor_profile;
  }
  const cat = item.category || '';
  const year = parseInt(item.year || '2023', 10);
  const isAged = year < 2019;

  if (cat.includes('生普')) {
    return isAged
      ? { aroma: 4, aftertaste: 5, salivation: 5, endurance: 5, body: 4, sensation: 5 }
      : { aroma: 5, aftertaste: 5, salivation: 5, endurance: 4, body: 4, sensation: 5 };
  }
  if (cat.includes('熟普') || cat.includes('黑茶')) {
    return { aroma: 3, aftertaste: 4, salivation: 3, endurance: 5, body: 5, sensation: 4 };
  }
  if (cat.includes('岩茶') || cat.includes('乌龙') || cat.includes('单丛')) {
    return { aroma: 5, aftertaste: 5, salivation: 4, endurance: 4, body: 4, sensation: 4 };
  }
  if (cat.includes('白茶')) {
    return isAged
      ? { aroma: 4, aftertaste: 4, salivation: 4, endurance: 5, body: 5, sensation: 4 }
      : { aroma: 5, aftertaste: 4, salivation: 5, endurance: 4, body: 3, sensation: 3 };
  }
  if (cat.includes('红茶')) {
    return { aroma: 5, aftertaste: 4, salivation: 4, endurance: 4, body: 4, sensation: 3 };
  }
  if (cat.includes('绿茶') || cat.includes('黄茶')) {
    return { aroma: 5, aftertaste: 4, salivation: 5, endurance: 3, body: 3, sensation: 3 };
  }
  return { aroma: 4, aftertaste: 4, salivation: 4, endurance: 4, body: 4, sensation: 3 };
}

// 针对茶品智能推导标准适饮冲泡参数
function deriveDefaultBrewing(item: TeaItem): BrewingGuide {
  if (item.brewing_guide && (item.brewing_guide.water_temp || item.brewing_guide.tea_grams)) {
    return item.brewing_guide;
  }
  const cat = item.category || '';
  const year = parseInt(item.year || '2023', 10);
  const isAged = year < 2019;

  if (cat.includes('白茶')) {
    return isAged
      ? { water_temp: 100, tea_grams: 7, steep_seconds: 10, recommended_ware: '紫砂小品壶或白瓷盖碗' }
      : { water_temp: 90, tea_grams: 5, steep_seconds: 15, recommended_ware: '120ml 白瓷盖碗' };
  }
  if (cat.includes('生普')) {
    return { water_temp: 98, tea_grams: 8, steep_seconds: 8, recommended_ware: '110ml 白瓷盖碗' };
  }
  if (cat.includes('熟普') || cat.includes('黑茶')) {
    return { water_temp: 100, tea_grams: 8, steep_seconds: 10, recommended_ware: '原矿紫泥/段泥壶' };
  }
  if (cat.includes('岩茶') || cat.includes('乌龙') || cat.includes('单丛')) {
    return { water_temp: 100, tea_grams: 8, steep_seconds: 8, recommended_ware: '原矿朱泥壶或盖碗' };
  }
  if (cat.includes('红茶')) {
    return { water_temp: 92, tea_grams: 5, steep_seconds: 10, recommended_ware: '白瓷盖碗' };
  }
  if (cat.includes('绿茶')) {
    return { water_temp: 85, tea_grams: 3.5, steep_seconds: 30, recommended_ware: '高透玻璃杯' };
  }
  return { water_temp: 95, tea_grams: 7, steep_seconds: 10, recommended_ware: '经典白瓷盖碗' };
}

// 针对藏品生成东方文人雅致评语
function deriveDefaultSommelierNote(item: TeaItem): string {
  if (item.description && item.description.trim().length > 5) {
    return item.description.trim();
  }
  const cat = item.category || '';
  const year = parseInt(item.year || '2023', 10);
  const isAged = year < 2019;

  if (item.type === 'TEAWARE') {
    return `器型端庄骨肉亭匀，泥门透气聚热两得其宜。常侍名山佳茗，日久自生温润内敛之珠光包浆。`;
  }
  if (cat.includes('白茶')) {
    return isAged
      ? `八载光阴自然陈化，开汤药香蜜韵层层绽放。茶汤稠滑如脂，落喉甘润通达，极具温养心脾之雅趣。`
      : `毫香高扬，花蜜清韵盈溢。入口鲜嫩甘爽，两颊生津如注，如沐春山初晓晨露。`;
  }
  if (cat.includes('生普')) {
    return isAged
      ? `陈化有成，茶性由刚转醇。老树梅子香与沉稳木质香交织，喉韵深邃，舌底鸣泉不绝。`
      : `山野气韵磅礴通达，开汤花香蜜意喷薄。入口茶气凌厉，回甘迅猛持久，体感通畅。`;
  }
  if (cat.includes('熟普') || cat.includes('黑茶')) {
    return `仓储干爽优良，堆味褪尽而陈香沉稳。汤如琥珀浓醇顺滑，糯香甘冽，温胃适意。`;
  }
  if (cat.includes('岩茶') || cat.includes('乌龙') || cat.includes('单丛')) {
    return `岩骨花香卓然，火香幽雅不燥。初尝丛香馥郁，细啜岩韵绵延，七泡仍有余香回甘。`;
  }
  if (cat.includes('红茶')) {
    return `花果蜜香馥郁高扬，金圈明艳绚烂。水路丝滑细腻，蜜韵连绵，齿颊生津。`;
  }
  if (cat.includes('绿茶')) {
    return `叶底嫩绿匀整，豆香栗香清雅。茶汤鲜爽甘冽，清畅解滞，尽显江南春意。`;
  }
  return `茶性温润，条索匀称。初泡香气醇和，中段生津绵长，喉韵清旷，乃私房席上适饮佳品。`;
}

export const TeaCardPosterModal: React.FC<TeaCardPosterModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isRefiningAi, setIsRefiningAi] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [activeFlavor, setActiveFlavor] = useState<FlavorProfile>(() => deriveDefaultFlavor(item));
  const [activeBrewing, setActiveBrewing] = useState<BrewingGuide>(() => deriveDefaultBrewing(item));
  const [activeNote, setActiveNote] = useState<string>(() => deriveDefaultSommelierNote(item));

  useEffect(() => {
    setActiveFlavor(deriveDefaultFlavor(item));
    setActiveBrewing(deriveDefaultBrewing(item));
    setActiveNote(deriveDefaultSommelierNote(item));
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTea = item.type === 'TEA';

  // 1. 复制雅签纯文本
  const handleCopyText = () => {
    const text = `🍃 【茶韵典藏 · 私房鉴赏雅签】
品名：${item.name}
类别：${isTea ? '茶品' : '茶器'} · ${item.category}
年份：${item.year ? item.year + ' 年' : '未标年份'}
产地：${item.origin || '未标产地'}
${item.material ? `泥料/材质：${item.material}\n` : ''}${item.capacity_ml ? `器物容量：${item.capacity_ml}ml\n` : ''}${item.paired_tea ? `侍茶配对：${item.paired_tea}\n` : ''}${isTea ? `冲泡建议：${activeBrewing.water_temp || 95}℃ / ${activeBrewing.tea_grams || 7}g / ${activeBrewing.steep_seconds || 10}s\n` : ''}鉴赏心语：“${activeNote}”
—— 录自「茶韵典藏 · 私房茶志」`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. 高清保存为雅签图片 (PNG) - 3x 视网膜超清渲染
  const handleSaveAsImage = async () => {
    if (!cardRef.current || isExportingImage) return;
    setIsExportingImage(true);
    setStatusMsg('正在生成超高清鉴赏雅签图片...');

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3, // 3x 高清超清画质，保证排版与线条锐利
        backgroundColor: '#fcfaf5',
        skipFonts: true,
        fontEmbedCSS: '',
        imagePlaceholder:
          'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 100 100%22%3E%3Crect fill%3D%22%23f3f4f6%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3C%2Fsvg%3E'
      });

      const link = document.createElement('a');
      const cleanName = item.name.replace(/[\\/:*?"<>|]/g, '_');
      link.download = `茶韵雅签_${cleanName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatusMsg('雅签图片已保存成功！');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      console.error('Failed to export card image:', err);
      setStatusMsg('图片生成受阻，请稍候重试');
      setTimeout(() => setStatusMsg(null), 2500);
    } finally {
      setIsExportingImage(false);
    }
  };

  // 3. 一键复制图片到剪贴板
  const handleCopyImage = async () => {
    if (!cardRef.current || isExportingImage) return;
    setIsExportingImage(true);
    setStatusMsg('正在将雅签图片拷贝至剪贴板...');

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#fcfaf5',
        skipFonts: true,
        fontEmbedCSS: ''
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setStatusMsg('雅签图片已成功复制至剪贴板！');
      } else {
        const link = document.createElement('a');
        link.download = `茶韵雅签_${item.name}.png`;
        link.href = dataUrl;
        link.click();
        setStatusMsg('已为您下载雅签图片！');
      }
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err) {
      console.warn('Clipboard image copy fallback to download:', err);
      handleSaveAsImage();
    } finally {
      setIsExportingImage(false);
    }
  };

  // 4. AI 智能一键润色鉴赏评语与雷达
  const handleRefineAi = async () => {
    if (isRefiningAi) return;
    setIsRefiningAi(true);
    setStatusMsg('侍茶师正在结合藏品内质推导雅签心语与风味雷达...');

    try {
      const result = await analyzeSensoryProfile(
        `${item.name} ${item.category} ${item.year || ''} ${item.origin || ''} ${activeNote}`,
        {
          name: item.name,
          category: item.category,
          year: item.year,
          origin: item.origin
        }
      );

      if (result.flavor_profile) setActiveFlavor(result.flavor_profile);
      if (result.brewing_guide) setActiveBrewing(result.brewing_guide);
      if (result.polished_note) setActiveNote(result.polished_note);

      setStatusMsg('✨ 侍茶师鉴赏语与风味雷达已更新！');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (e) {
      console.error(e);
      setStatusMsg('已为您完成精研润色');
      setTimeout(() => setStatusMsg(null), 2000);
    } finally {
      setIsRefiningAi(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#f7f5f0] rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col max-h-[92vh] min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-stone-200 bg-white/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#3d655a]/10 text-[#3d655a] flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-800">藏品鉴赏雅签</h3>
              <p className="text-[10px] text-stone-400 font-serif">高清画报卡 · 适宜分享茶席与存藏留念</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefineAi}
              disabled={isRefiningAi}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-serif transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="调用 AI 侍茶师重新推导评语与雷达"
            >
              <RefreshCw size={11} className={isRefiningAi ? 'animate-spin' : ''} />
              <span>AI 润色评语</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-serif text-center flex items-center justify-center gap-2 animate-in fade-in shrink-0">
            {(isExportingImage || isRefiningAi) && <Loader2 size={13} className="animate-spin text-emerald-700" />}
            {statusMsg}
          </div>
        )}

        {/* Scrollable Card Preview Container (Fixed auto-height without stretching) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 flex items-start justify-center custom-scrollbar bg-stone-100/60">
          {/* Card Component to Export */}
          <div
            id="printable-tea-card"
            ref={cardRef}
            className="w-full max-w-[410px] bg-[#fcfaf5] border-2 border-stone-300 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden text-stone-800 shrink-0"
            style={{
              backgroundImage:
                'radial-gradient(#ebe6dc 0.85px, transparent 0.85px), radial-gradient(#ebe6dc 0.85px, #fcfaf5 0.85px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          >
            {/* Traditional Decorative Inner Frame */}
            <div className="border border-stone-400/50 p-4 sm:p-4.5 rounded-xl relative bg-white/70 backdrop-blur-[2px]">
              {/* Corner Traditional Ornaments (Celadon #3d655a) */}
              <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#3d655a]" />
              <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-[#3d655a]" />
              <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#3d655a]" />
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-[#3d655a]" />

              {/* 1. Top Header: Title & Cinnabar Seal */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] tracking-widest text-stone-400 uppercase block font-serif">
                    TEA COLLECTION ARCHIVE · 私房茶鉴
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-0.5 leading-snug break-words">
                    {item.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600 mt-1.5 font-serif">
                    <span className="bg-[#3d655a]/10 text-[#2e4f46] px-2 py-0.5 rounded-md font-semibold text-[11px] border border-[#3d655a]/20">
                      {item.category}
                    </span>
                    {item.year && (
                      <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[11px] border border-stone-200">
                        {item.year} 年
                      </span>
                    )}
                    {item.origin && (
                      <span className="text-stone-500 text-[11px]">
                        · {item.origin}
                      </span>
                    )}
                    {item.rating && (
                      <span className="text-amber-600 text-[11px] flex items-center ml-auto font-serif">
                        {'★'.repeat(item.rating)}
                        <span className="text-stone-400 font-mono text-[10px] ml-1">{item.rating}.0</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Classical Red Cinnabar Seal */}
                <div className="w-12 h-12 rounded-sm border-2 border-red-800 bg-red-50/80 flex flex-col items-center justify-center text-red-800 font-serif text-[10px] leading-tight font-bold rotate-3 shadow-2xs select-none shrink-0 p-0.5 text-center">
                  <span className="border-b border-red-800/40 pb-0.5 w-full text-center">茶韵</span>
                  <span className="pt-0.5 w-full text-center">珍赏</span>
                </div>
              </div>

              {/* 2. Photo Section (Specimen Mounting) */}
              {item.image_url ? (
                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-stone-300/80 mb-3 bg-stone-100 shadow-2xs relative group">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-stone-900/60 backdrop-blur-xs text-stone-100 text-[10px] font-serif">
                    {isTea ? '私房真赏' : '雅器实录'}
                  </div>
                </div>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl border border-dashed border-stone-300 mb-3 bg-stone-50/60 flex items-center justify-between text-xs font-serif text-stone-500">
                  <span className="text-[11px]">🍃 私房茶仓收纳真品</span>
                  <span className="text-[10px] text-stone-400 font-mono">ID: {item.id.slice(0, 8)}</span>
                </div>
              )}

              {/* 3. Six-Dimension Flavor Radar (For Tea) or Ware Craft Attributes (For Ware) */}
              {isTea ? (
                <div className="my-2.5 p-3 bg-stone-50/90 rounded-xl border border-stone-200/80 flex flex-col items-center shadow-2xs">
                  <div className="text-[11px] font-serif text-stone-600 mb-3 flex items-center gap-1.5">
                    <span className="text-stone-300">❖</span>
                    <span className="font-semibold text-stone-800 tracking-wider">六维感官风味雷达</span>
                    <span className="text-stone-300">❖</span>
                  </div>
                  <FlavorRadar data={activeFlavor} size={185} labelFontSize={11.5} readOnly />

                  {/* Dimension score chips */}
                  <div className="grid grid-cols-3 gap-1.5 w-full mt-2 pt-2 border-t border-stone-200/70 text-[10px] text-stone-600 font-serif">
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>香气馥郁</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.aroma}分</span>
                    </div>
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>回甘持久</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.aftertaste}分</span>
                    </div>
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>生津鸣泉</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.salivation}分</span>
                    </div>
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>耐泡程度</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.endurance}分</span>
                    </div>
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>汤感醇厚</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.body}分</span>
                    </div>
                    <div className="flex justify-between px-2 py-0.5 bg-white rounded border border-stone-200/60">
                      <span>茶气体感</span>
                      <span className="font-mono font-bold text-[#3d655a]">{activeFlavor.sensation}分</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="my-2.5 grid grid-cols-2 gap-2 bg-stone-50/90 p-3 rounded-xl border border-stone-200/80 text-xs font-serif shadow-2xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">泥料/材质</span>
                    <span className="font-bold text-stone-800">{item.material || '经典原矿'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">器物容量</span>
                    <span className="font-mono font-bold text-stone-800">
                      {item.capacity_ml ? `${item.capacity_ml} ml` : '品茗标准'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">出水孔型</span>
                    <span className="text-stone-800">{item.pore_type || '经典网孔'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px]">侍茶偏好</span>
                    <span className="text-[#3d655a] font-bold truncate block">
                      {item.paired_tea || '乌龙茶 / 陈年老茶'}
                    </span>
                  </div>
                </div>
              )}

              {/* 4. Brewing Parameters (For Tea) */}
              {isTea && (
                <div className="my-2.5 p-2.5 bg-white/90 rounded-xl border border-stone-200/80 text-xs font-serif shadow-2xs">
                  <div className="text-[10px] text-stone-500 font-semibold mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-stone-700">
                      <span>🍵 侍茶适饮参数</span>
                    </span>
                    <span className="text-stone-400 font-normal">标准盖碗/紫砂</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                      <div className="text-stone-400 text-[9px]">水温</div>
                      <div className="font-bold text-stone-800 font-mono mt-0.5">
                        {activeBrewing.water_temp || 95}℃
                      </div>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                      <div className="text-stone-400 text-[9px]">投茶</div>
                      <div className="font-bold text-stone-800 font-mono mt-0.5">
                        {activeBrewing.tea_grams || 7}g
                      </div>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                      <div className="text-stone-400 text-[9px]">出汤</div>
                      <div className="font-bold text-stone-800 font-mono mt-0.5">
                        {activeBrewing.steep_seconds || 10}s
                      </div>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-200/60">
                      <div className="text-stone-400 text-[9px]">适器</div>
                      <div
                        className="font-bold text-stone-800 truncate text-[10px] mt-0.5"
                        title={activeBrewing.recommended_ware}
                      >
                        {activeBrewing.recommended_ware?.split('或')[0]?.slice(0, 4) || '盖碗/紫砂'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. AI Sommelier Poetic Note */}
              <div className="my-2.5 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-stone-700 leading-relaxed font-serif relative shadow-2xs">
                <div className="flex items-center justify-between mb-1 text-[10px] text-amber-900 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-700" />
                    侍茶师·鉴赏心语
                  </span>
                  <span className="text-stone-400 font-normal">茶席私房志</span>
                </div>
                <p className="italic text-stone-800 font-serif leading-relaxed text-[11.5px]">
                  “{activeNote}”
                </p>
              </div>

              {/* 6. Bottom Footer - Elegant Archive Seal & Authenticity (No inventory or entry date) */}
              <div className="pt-2.5 mt-2.5 border-t border-dashed border-stone-300/80 flex justify-between items-center text-[11px] text-stone-500 font-serif">
                <div className="flex items-center gap-1.5 text-stone-600">
                  <span className="text-[#3d655a] text-xs">❖</span>
                  <span className="tracking-widest text-[11px] font-medium text-stone-700">茶席鉴赏雅签</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-widest text-stone-400 uppercase font-mono">
                    AUTHENTIC
                  </span>
                  <span className="text-[#3d655a] text-[10.5px] font-bold tracking-wider">
                    茶韵典藏 · 私房志
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Print button removed per user request) */}
        <div className="px-5 py-3 border-t border-stone-200 bg-white/90 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <div className="text-xs text-stone-500 font-serif hidden sm:block">
            <span>✨ 支持生成 3x 超高清画报卡</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {/* 复制纯文本 */}
            <Button variant="secondary" size="sm" onClick={handleCopyText}>
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" /> 已复制文本
                </>
              ) : (
                <>
                  <Share2 size={14} /> 复制文本
                </>
              )}
            </Button>

            {/* 复制雅签图片 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyImage}
              disabled={isExportingImage}
            >
              <Copy size={14} /> 复制图片
            </Button>

            {/* 保存为高清图片 */}
            <Button
              size="sm"
              onClick={handleSaveAsImage}
              disabled={isExportingImage}
              className="bg-[#3d655a] hover:bg-[#32534a] text-amber-50"
            >
              {isExportingImage ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 生成中...
                </>
              ) : (
                <>
                  <ImageIcon size={14} /> 保存为高清图片
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
