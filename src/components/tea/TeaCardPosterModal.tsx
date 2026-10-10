import React, { useRef, useState, useEffect } from 'react';
import { Download, Sparkles, X, Share2, Check, Printer, Loader2, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TeaItem } from '../../types/tea';
import { FlavorRadar } from './FlavorRadar';
import { Button } from '../ui/Button';
import { formatDate } from '../../utils/formatters';

export interface TeaCardPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeaItem;
}

export const TeaCardPosterModal: React.FC<TeaCardPosterModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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

  // 1. 复制雅签文本
  const handleCopyText = () => {
    const text = `🍃 【茶韵典藏 · 鉴赏签】
品名：${item.name}
类别：${isTea ? '茶品' : '茶器'} · ${item.category}
年份：${item.year || '未标'}
产地：${item.origin || '未标'}
${item.material ? `泥料/材质：${item.material}\n` : ''}${item.capacity_ml ? `容量：${item.capacity_ml}ml\n` : ''}${item.paired_tea ? `侍茶配对：${item.paired_tea}\n` : ''}库存：${item.quantity} ${item.unit}
${item.description ? `心得：${item.description}\n` : ''}—— 录自 茶韵典藏 私房茶志`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. 高清保存为雅签图片 (PNG)
  const handleSaveAsImage = async () => {
    if (!cardRef.current || isExportingImage) return;
    setIsExportingImage(true);
    setStatusMsg('正在生成高清鉴赏雅签图片...');

    try {
      // 避免外部跨域字体样式表解析导致 SecurityError，设置 skipFonts: true 和 fontEmbedCSS: ''
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // 2x 高清Retina画质
        backgroundColor: '#fdfbf7',
        skipFonts: true,
        fontEmbedCSS: '',
        imagePlaceholder:
          'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 100 100%22%3E%3Crect fill%3D%22%23f3f4f6%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3C%2Fsvg%3E',
      });

      const link = document.createElement('a');
      const cleanName = item.name.replace(/[\\/:*?"<>|]/g, '_');
      link.download = `茶韵雅签_${cleanName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatusMsg('图片保存成功！');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      console.error('Failed to export card image:', err);
      // 备用机制：若跨域外链图片导致跨域污染，尝试直接调用打印
      setStatusMsg('由于网络图片跨域保护，正在为您唤起系统打印/另存为PDF...');
      setTimeout(() => {
        window.print();
        setStatusMsg(null);
      }, 800);
    } finally {
      setIsExportingImage(false);
    }
  };

  // 3. 唤起系统打印 / 保存为 PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#f7f5f0] rounded-2xl w-full max-w-md shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col h-[90vh] max-h-[90vh] min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-stone-200 bg-white/70 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <h3 className="font-serif font-bold text-sm text-stone-800">藏品鉴赏雅签</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="px-4 py-2 bg-accent/10 border-b border-accent/20 text-accent text-xs font-serif text-center flex items-center justify-center gap-2 animate-in fade-in">
            {isExportingImage && <Loader2 size={13} className="animate-spin" />}
            {statusMsg}
          </div>
        )}

        {/* Scrollable Printable Card */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex justify-center custom-scrollbar">
          <div
            id="printable-tea-card"
            ref={cardRef}
            className="w-full bg-[#fdfbf7] border-2 border-stone-300 rounded-xl p-5 shadow-lg relative overflow-hidden text-stone-800"
            style={{
              backgroundImage:
                'radial-gradient(#e8e4db 0.75px, transparent 0.75px), radial-gradient(#e8e4db 0.75px, #fdfbf7 0.75px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px'
            }}
          >
            {/* Traditional Decorative Frame */}
            <div className="border border-stone-400/50 p-4 rounded-lg relative">
              {/* Corner Ornaments */}
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-accent" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-accent" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-accent" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-accent" />

              {/* Top Seal & Title */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] tracking-widest text-stone-500 uppercase block font-serif">
                    TEA COLLECTION ARCHIVE
                  </span>
                  <h2 className="font-serif text-xl font-bold text-stone-900 tracking-tight mt-0.5">
                    {item.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                    <span className="bg-stone-200/70 px-1.5 py-0.5 rounded text-[11px] font-medium font-serif">
                      {item.category}
                    </span>
                    {item.year && <span>{item.year} 年</span>}
                    {item.origin && <span>· {item.origin}</span>}
                  </div>
                </div>

                {/* Oriental Red Seal Watermark */}
                <div className="w-12 h-12 rounded-sm border-2 border-red-800/80 bg-red-50/50 flex items-center justify-center text-red-800 font-serif text-[10px] leading-tight font-bold rotate-6 shadow-xs select-none p-1 text-center">
                  茶韵<br />珍赏
                </div>
              </div>

              {/* Photo if available */}
              {item.image_url && (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-stone-200 mb-4 bg-stone-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Tea Specific: Radar Chart */}
              {isTea && item.flavor_profile && (
                <div className="my-3 py-2 bg-white/70 rounded-xl border border-stone-200/70 flex flex-col items-center">
                  <div className="text-[11px] font-serif text-stone-600 mb-1">
                    —— 感官风味特征 ——
                  </div>
                  <FlavorRadar data={item.flavor_profile} size={200} readOnly />
                </div>
              )}

              {/* Ware Specific: Material & Capacity */}
              {!isTea && (
                <div className="my-3 grid grid-cols-2 gap-2 bg-white/70 p-3 rounded-xl border border-stone-200/70 text-xs">
                  {item.material && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">泥料/材质</span>
                      <span className="font-serif font-bold text-stone-800">{item.material}</span>
                    </div>
                  )}
                  {item.capacity_ml && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">器物容量</span>
                      <span className="font-mono font-bold text-stone-800">
                        {item.capacity_ml} ml
                      </span>
                    </div>
                  )}
                  {item.pore_type && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">出水孔型</span>
                      <span className="font-serif text-stone-800">{item.pore_type}</span>
                    </div>
                  )}
                  {item.paired_tea && (
                    <div>
                      <span className="text-stone-400 block text-[10px]">侍茶偏好</span>
                      <span className="font-serif text-accent font-bold">
                        {item.paired_tea}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Quotes */}
              {item.description && (
                <div className="text-xs text-stone-600 italic bg-stone-100/60 p-2.5 rounded-lg border border-stone-200/60 my-3 leading-relaxed font-serif">
                  “{item.description}”
                </div>
              )}

              {/* Bottom Footer Info */}
              <div className="pt-3 border-t border-dashed border-stone-300 flex justify-between items-end text-[11px] text-stone-500 font-serif">
                <div>
                  <div>当前结余: {item.quantity} {item.unit}</div>
                  {item.storage_location && (
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      仓位: {item.storage_location}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-stone-400">
                    登记: {formatDate(item.created_at)}
                  </div>
                  <div className="text-accent text-[10px] font-bold mt-0.5">
                    茶韵典藏 · 私房志
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-stone-200 bg-white/70 flex flex-wrap justify-end gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={handleCopyText}>
            {copied ? (
              <>
                <Check size={14} className="text-green-600" /> 已复制
              </>
            ) : (
              <>
                <Share2 size={14} /> 复制文本
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSaveAsImage}
            disabled={isExportingImage}
          >
            {isExportingImage ? (
              <>
                <Loader2 size={14} className="animate-spin" /> 生成中...
              </>
            ) : (
              <>
                <ImageIcon size={14} /> 保存为图片
              </>
            )}
          </Button>

          <Button size="sm" onClick={handlePrint}>
            <Printer size={14} /> 打印 / PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
