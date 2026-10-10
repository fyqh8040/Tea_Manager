import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  X,
  Check,
  AlertCircle,
  Leaf,
  Coffee,
  RotateCcw
} from 'lucide-react';
import { ItemType, VisionExtractionResult } from '../../types/tea';
import { extractItemFromImage } from '../../services/aiService';
import { compressImage } from '../../utils/imageCompressor';

export interface ImageTeaScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (extracted: VisionExtractionResult, rawImageUrl?: string) => void;
  initialTypeHint?: ItemType;
}

export const ImageTeaScannerModal: React.FC<ImageTeaScannerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialTypeHint = 'TEA'
}) => {
  const [typeHint, setTypeHint] = useState<ItemType | 'AUTO'>(initialTypeHint);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<VisionExtractionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setExtractedData(null);

    try {
      // 压缩图片以保证在传输中高响应速度并直接获取 Base64
      const { base64 } = await compressImage(file, 1024, 1024, 0.8);
      setImagePreview(base64);
      // 自动开始识别
      handleAnalyze(base64);
    } catch (err: any) {
      console.error('Failed to read image:', err);
      setErrorMsg('图片读取失败，请重试');
    }
  };

  const handleAnalyze = async (imgBase64?: string) => {
    const targetImage = imgBase64 || imagePreview;
    if (!targetImage) {
      setErrorMsg('请先选择或上传一张藏品照片');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await extractItemFromImage(targetImage, typeHint);
      setExtractedData(result);
    } catch (err: any) {
      setErrorMsg('识别未能完成，请手动录入或重新尝试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmApply = () => {
    if (!extractedData) return;
    onApply(extractedData, imagePreview || undefined);
    onClose();
  };

  const resetAll = () => {
    setImagePreview(null);
    setExtractedData(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAnalyzing) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[#fdfbf7] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-800">
        {/* Header */}
        <div className="bg-[#3d655a] text-stone-100 px-5 py-4 flex items-center justify-between border-b border-[#2e4f46]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/40 border border-emerald-400/30 flex items-center justify-center text-amber-200">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold tracking-wide text-amber-100">
                AI 识图快速录入
              </h3>
              <p className="text-xs text-emerald-200/70">
                智能解析茶饼棉纸、包装内飞、茶叶条索或茶壶底款证书
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 hover:bg-white/10 rounded-lg text-stone-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* 类型倾向选择器 */}
          <div className="flex items-center justify-between bg-stone-100 p-1.5 rounded-xl border border-stone-200 text-xs font-serif">
            <span className="text-stone-500 pl-2">识别目标：</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTypeHint('TEA')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  typeHint === 'TEA'
                    ? 'bg-[#3d655a] text-white shadow-xs font-medium'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Leaf size={13} />
                茶叶 / 茶品
              </button>
              <button
                type="button"
                onClick={() => setTypeHint('TEAWARE')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  typeHint === 'TEAWARE'
                    ? 'bg-[#3d655a] text-white shadow-xs font-medium'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Coffee size={13} />
                茶壶 / 茶器
              </button>
              <button
                type="button"
                onClick={() => setTypeHint('AUTO')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  typeHint === 'AUTO'
                    ? 'bg-[#3d655a] text-white shadow-xs font-medium'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                自动识别
              </button>
            </div>
          </div>

          {/* 上传区域 / 预览区域 */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-[#4A7C6F] bg-white/70 hover:bg-stone-50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-stone-100 group-hover:bg-emerald-50 text-stone-500 group-hover:text-[#4A7C6F] flex items-center justify-center mb-3 transition-colors">
                <Camera size={26} />
              </div>
              <p className="font-serif text-sm font-semibold text-stone-800">
                点击拍照或选取藏品图片
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs">
                支持茶叶包装、茶饼棉纸、散茶条索、紫砂壶底款或说明书
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full h-48 bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
                <img
                  src={imagePreview}
                  alt="待识别藏品"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={resetAll}
                  disabled={isAnalyzing}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-stone-900/70 hover:bg-stone-900 text-white text-xs rounded-lg flex items-center gap-1 backdrop-blur-sm transition-colors"
                >
                  <RotateCcw size={12} />
                  换一张
                </button>
              </div>

              {isAnalyzing && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <Loader2 size={24} className="animate-spin text-[#4A7C6F]" />
                  <p className="font-serif text-sm text-stone-700 font-medium">
                    AI 正在审阅图纹、年份底款与泥料特征...
                  </p>
                  <p className="text-xs text-stone-400">基于多模态大模型进行深度特征提取</p>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 识别结果卡片展示 */}
          {extractedData && !isAnalyzing && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <span className="font-serif text-xs font-bold text-[#3d655a] flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  提取完成，请核对信息：
                </span>
                <span className="text-[11px] text-stone-400 font-serif">
                  {extractedData.type === 'TEAWARE' ? '茶器' : '茶品'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">品名 / 壶名</span>
                  <span className="font-serif font-bold text-stone-800">
                    {extractedData.name || '未提取'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">类别 / 器形</span>
                  <span className="font-serif text-stone-700">
                    {extractedData.category || '未提取'}
                  </span>
                </div>
                {extractedData.year && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">年份</span>
                    <span className="font-mono text-stone-700">{extractedData.year} 年</span>
                  </div>
                )}
                {extractedData.origin && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">产地</span>
                    <span className="font-serif text-stone-700">{extractedData.origin}</span>
                  </div>
                )}
                {extractedData.material && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">泥料 / 材质</span>
                    <span className="font-serif text-stone-700">{extractedData.material}</span>
                  </div>
                )}
                {extractedData.capacity_ml && (
                  <div>
                    <span className="text-stone-400 block text-[10px]">容量</span>
                    <span className="font-mono text-stone-700">
                      {extractedData.capacity_ml} ml
                    </span>
                  </div>
                )}
                {extractedData.paired_tea && (
                  <div className="col-span-2">
                    <span className="text-stone-400 block text-[10px]">侍茶搭配建议</span>
                    <span className="font-serif text-stone-700">{extractedData.paired_tea}</span>
                  </div>
                )}
              </div>

              {extractedData.description && (
                <div className="pt-2 border-t border-stone-100 text-xs">
                  <span className="text-stone-400 block text-[10px] mb-0.5">心得 / 评述</span>
                  <p className="font-serif text-stone-600 leading-relaxed italic">
                    “{extractedData.description}”
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-serif text-stone-600 hover:text-stone-900 transition-colors"
          >
            取消
          </button>

          {extractedData && (
            <button
              type="button"
              onClick={handleConfirmApply}
              className="px-5 py-2 bg-[#3d655a] hover:bg-[#34574d] text-amber-50 rounded-xl text-xs font-serif font-medium shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check size={14} />
              应用到录入表单
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
