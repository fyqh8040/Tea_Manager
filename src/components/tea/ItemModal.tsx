import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Upload,
  Leaf,
  Coffee,
  Trash2,
  Loader2,
  ChevronDown,
  Star,
  Sparkles,
  BookOpen,
  History,
  Activity,
  MapPin,
  Tag,
  X
} from 'lucide-react';
import {
  TeaItem,
  InventoryLog,
  AppConfig,
  ItemType,
  VisionExtractionResult
} from '../../types/tea';
import { ImageTeaScannerModal } from '../ai/ImageTeaScannerModal';
import { analyzeSensoryProfile } from '../../services/aiService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Combobox } from '../ui/Combobox';
import { InventoryManager } from './InventoryManager';
import { TastingNotesManager } from './TastingNotesManager';
import { FlavorRadar } from './FlavorRadar';
import {
  TEA_UNITS,
  TEAWARE_UNITS,
  SUGGESTIONS,
  PRESET_TAGS
} from '../../constants/tea';
import { formatUnitPrice } from '../../utils/formatters';
import { authFetch, uploadImageFile } from '../../utils/api';
import { compressImage } from '../../utils/imageCompressor';

export interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: TeaItem | null;
  onSave: (item: Partial<TeaItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStockUpdate: (
    id: string,
    newQuantity: number,
    changeAmount: number,
    reason: string,
    note: string
  ) => Promise<boolean>;
  config: AppConfig | null;
  onOpenPoster?: (item: TeaItem) => void;
}

type TabType = 'DETAILS' | 'RADAR' | 'TASTING' | 'HISTORY';

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  onDelete,
  onStockUpdate,
  config,
  onOpenPoster
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DETAILS');
  const [formData, setFormData] = useState<Partial<TeaItem>>({
    type: 'TEA',
    name: '',
    category: '',
    year: '',
    origin: '',
    description: '',
    image_url: '',
    quantity: 1,
    unit: '克 (g)',
    price: 0,
    rating: 5,
    flavor_profile: { aroma: 4, aftertaste: 4, salivation: 4, endurance: 4, body: 4, sensation: 3 },
    brewing_guide: { water_temp: 95, tea_grams: 8, steep_seconds: 15, recommended_ware: '' }
  });

  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAnalyzingSensory, setIsAnalyzingSensory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleApplyExtractedData = (extracted: VisionExtractionResult, rawImageUrl?: string) => {
    setFormData((prev) => ({
      ...prev,
      type: extracted.type || prev.type,
      name: extracted.name || prev.name,
      category: extracted.category || prev.category,
      year: extracted.year || prev.year,
      origin: extracted.origin || prev.origin,
      material: extracted.material || prev.material,
      capacity_ml: extracted.capacity_ml !== undefined ? extracted.capacity_ml : prev.capacity_ml,
      paired_tea: extracted.paired_tea || prev.paired_tea,
      description: extracted.description || prev.description,
      tags: extracted.tags && extracted.tags.length > 0 ? extracted.tags.join(',') : prev.tags,
      image_url: rawImageUrl || prev.image_url
    }));
  };

  const handleAiSensoryProfile = async () => {
    setIsAnalyzingSensory(true);
    try {
      const promptText = formData.description || formData.name || '优质茗茶';
      const result = await analyzeSensoryProfile(promptText, {
        name: formData.name,
        category: formData.category,
        year: formData.year,
        origin: formData.origin
      });

      setFormData((prev) => ({
        ...prev,
        flavor_profile: result.flavor_profile || prev.flavor_profile,
        brewing_guide: result.brewing_guide || prev.brewing_guide,
        description: prev.description ? prev.description : (result.polished_note || prev.description)
      }));
    } catch (err) {
      console.error('Sensory AI failed:', err);
    } finally {
      setIsAnalyzingSensory(false);
    }
  };

  // Prevent background scrolling and support Escape key
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

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        flavor_profile: item.flavor_profile || {
          aroma: 4,
          aftertaste: 4,
          salivation: 4,
          endurance: 4,
          body: 4,
          sensation: 3
        },
        brewing_guide: item.brewing_guide || {
          water_temp: 95,
          tea_grams: 8,
          steep_seconds: 15,
          recommended_ware: ''
        }
      });
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
        unit: '克 (g)',
        price: 0,
        rating: 5,
        flavor_profile: { aroma: 4, aftertaste: 4, salivation: 4, endurance: 4, body: 4, sensation: 3 },
        brewing_guide: { water_temp: 95, tea_grams: 8, steep_seconds: 15, recommended_ware: '' }
      });
      setActiveTab('DETAILS');
      setLogs([]);
    }
  }, [item, isOpen]);

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
      if (json.data) {
        setLogs(
          json.data.map((l: any) => ({
            ...l,
            change_amount: Number(l.change_amount),
            current_balance: Number(l.current_balance),
            created_at: Number(l.created_at)
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    try {
      const { file: compressedFile, base64 } = await compressImage(rawFile, 1200, 1200, 0.82);

      if (config?.imageApiUrl) {
        try {
          const result = await uploadImageFile(compressedFile, config);
          setFormData((prev) => ({ ...prev, image_url: result.url }));
          return;
        } catch (uploadErr) {
          console.warn('图床上传失败，优雅回退至轻量 Base64 存储', uploadErr);
        }
      }

      setFormData((prev) => ({ ...prev, image_url: base64 }));
    } catch (err: any) {
      alert(`处理图片失败: ${err.message || '未知错误'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTypeChange = (newType: ItemType) => {
    const defaultUnit = newType === 'TEA' ? TEA_UNITS[0] : TEAWARE_UNITS[0];
    setFormData((prev) => ({
      ...prev,
      type: newType,
      unit: defaultUnit,
      category: '',
      material: '',
      capacity_ml: undefined
    }));
  };

  const handleAddPresetTag = (tag: string) => {
    const currentTags = formData.tags ? formData.tags.split(',').filter(Boolean) : [];
    if (!currentTags.includes(tag)) {
      const updated = [...currentTags, tag].join(',');
      setFormData({ ...formData, tags: updated });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('请填写藏品名称');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isTea = formData.type === 'TEA';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#fcfcfb] rounded-2xl w-full max-w-3xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-tea-100 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Image / Cover */}
        <div className="hidden md:block w-4/12 bg-tea-100 relative group overflow-hidden shrink-0 h-full">
          {formData.image_url ? (
            <img
              src={formData.image_url}
              alt={formData.name || '藏品图片'}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isUploading ? 'opacity-50 blur-sm' : ''
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-tea-300 bg-tea-50/70 p-6 text-center">
              <Camera size={44} />
              <span className="text-xs text-tea-400 mt-2 font-medium">点击更换或上传照片</span>
            </div>
          )}

          <div
            className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${
              isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center text-white">
                <Loader2 size={24} className="animate-spin mb-2" />
                <span className="text-xs font-medium">压缩上传中...</span>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="shadow-lg bg-white/95"
                >
                  <Upload size={14} /> 更换图片
                </Button>
                {item && onOpenPoster && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenPoster(item)}
                    className="bg-white/90 shadow-md text-xs"
                  >
                    <Sparkles size={13} /> 生成鉴赏雅签
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Form and Multi-Tabs */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />

          {/* Tab Navigation Header with Universal Close Button */}
          <div className="flex items-center justify-between border-b border-tea-100 bg-tea-50/80 shrink-0 pr-3">
            <div className="flex flex-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('DETAILS')}
                className={`px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'DETAILS'
                    ? 'text-accent border-b-2 border-accent bg-white'
                    : 'text-tea-500 hover:text-tea-800'
                }`}
              >
                藏品属性
              </button>

              {isTea && (
                <button
                  type="button"
                  onClick={() => setActiveTab('RADAR')}
                  className={`px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'RADAR'
                      ? 'text-accent border-b-2 border-accent bg-white'
                      : 'text-tea-500 hover:text-tea-800'
                  }`}
                >
                  <Activity size={13} /> 风味雷达
                </button>
              )}

              {item && isTea && (
                <button
                  type="button"
                  onClick={() => setActiveTab('TASTING')}
                  className={`px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'TASTING'
                      ? 'text-accent border-b-2 border-accent bg-white'
                      : 'text-tea-500 hover:text-tea-800'
                  }`}
                >
                  <BookOpen size={13} /> 品饮日记
                </button>
              )}

              {item && (
                <button
                  type="button"
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'HISTORY'
                      ? 'text-accent border-b-2 border-accent bg-white'
                      : 'text-tea-500 hover:text-tea-800'
                  }`}
                >
                  <History size={13} /> 库存流水
                </button>
              )}
            </div>

            {/* AI Scan Button */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-serif text-[#3d655a] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/70 rounded-lg transition-colors shrink-0 ml-auto"
              title="拍照或上传藏品图片，AI 自动提取品名年份泥料等信息"
            >
              <Sparkles size={13} className="text-amber-600" />
              <span>AI 识图填单</span>
            </button>

            {/* Universal Close Button (Accessible across all tabs) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-tea-400 hover:text-tea-800 hover:bg-tea-200/60 rounded-lg transition-colors shrink-0 ml-2"
              title="关闭弹窗 (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Container with Guaranteed overflow-y and min-h-0 */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 custom-scrollbar">
            {/* 1. Tab: DETAILS */}
            {activeTab === 'DETAILS' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mobile Image Selector */}
                <div className="md:hidden">
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="relative w-full aspect-video bg-tea-50 rounded-xl border border-tea-200 border-dashed flex items-center justify-center overflow-hidden cursor-pointer active:scale-98 transition-transform"
                  >
                    {formData.image_url ? (
                      <>
                        <img
                          src={formData.image_url}
                          alt="preview"
                          className={`w-full h-full object-cover ${
                            isUploading ? 'opacity-50 blur-sm' : ''
                          }`}
                        />
                        {isUploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                            <Loader2 size={24} className="animate-spin" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs gap-1 font-medium">
                            <Camera size={18} /> 点击更换
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-tea-400">
                        {isUploading ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : (
                          <Camera size={28} />
                        )}
                        <span className="text-xs font-medium">
                          {isUploading ? '上传中...' : '点击上传藏品照片'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Type Switcher */}
                <div className="flex bg-tea-100/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('TEA')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      isTea
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-tea-500 hover:text-tea-800'
                    }`}
                  >
                    <Leaf size={14} /> 茶品 (消耗品)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('TEAWARE')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      !isTea
                        ? 'bg-white text-clay shadow-sm'
                        : 'text-tea-500 hover:text-tea-800'
                    }`}
                  >
                    <Coffee size={14} /> 茶器 (固定资产)
                  </button>
                </div>

                {/* Name & Rating */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-8 sm:col-span-9">
                    <Input
                      label="藏品全称"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder={
                        isTea
                          ? '例如：2003年易武正山古树茶'
                          : '例如：底槽清子冶石瓢壶'
                      }
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1">
                      藏家自评
                    </label>
                    <div className="flex items-center gap-1 bg-white border border-tea-200 rounded-lg px-2 h-[38px]">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: s })}
                          className={`p-0.5 ${
                            s <= (formData.rating || 5) ? 'text-amber-500' : 'text-tea-200'
                          }`}
                        >
                          <Star size={14} fill={s <= (formData.rating || 5) ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category & Year */}
                <div className="grid grid-cols-2 gap-3">
                  <Combobox
                    label="分类"
                    value={formData.category || ''}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                    options={
                      isTea
                        ? SUGGESTIONS.TEA.category
                        : SUGGESTIONS.TEAWARE.category
                    }
                    placeholder={isTea ? '普洱 (生)' : '紫砂壶'}
                  />
                  <Input
                    label="年份 / 年代"
                    value={formData.year || ''}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="例如：2018 或 清末"
                  />
                </div>

                {/* Origin & Material */}
                <div className="grid grid-cols-2 gap-3">
                  <Combobox
                    label="产地 / 窑口"
                    value={formData.origin || ''}
                    onChange={(val) => setFormData({ ...formData, origin: val })}
                    options={
                      isTea ? SUGGESTIONS.TEA.origin : SUGGESTIONS.TEAWARE.origin
                    }
                    placeholder={isTea ? '例如：云南西双版纳' : '例如：宜兴丁蜀'}
                  />

                  {!isTea ? (
                    <Combobox
                      label="泥料 / 材质"
                      value={formData.material || ''}
                      onChange={(val) => setFormData({ ...formData, material: val })}
                      options={SUGGESTIONS.TEAWARE.material}
                      placeholder="例如：底槽清 / 大红袍"
                    />
                  ) : (
                    <Input
                      label="存放仓位"
                      value={formData.storage_location || ''}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      placeholder="例如：茶柜A层紫砂罐01"
                      prefixIcon={<MapPin size={14} />}
                    />
                  )}
                </div>

                {/* TeaWare Specialized Attributes */}
                {!isTea && (
                  <div className="grid grid-cols-3 gap-3 bg-tea-50/60 p-3 rounded-xl border border-tea-100">
                    <Input
                      label="容量 (ml)"
                      type="number"
                      value={formData.capacity_ml === undefined ? '' : formData.capacity_ml}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity_ml: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      placeholder="180"
                    />
                    <Combobox
                      label="出水孔型"
                      value={formData.pore_type || ''}
                      onChange={(val) => setFormData({ ...formData, pore_type: val })}
                      options={SUGGESTIONS.TEAWARE.pore_type}
                      placeholder="球孔"
                    />
                    <Combobox
                      label="侍茶偏好"
                      value={formData.paired_tea || ''}
                      onChange={(val) => setFormData({ ...formData, paired_tea: val })}
                      options={SUGGESTIONS.TEAWARE.paired_tea}
                      placeholder="专侍熟普"
                    />
                  </div>
                )}

                {/* Price & Low Stock Threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="总买入价 (元)"
                    type="number"
                    step="any"
                    value={formData.price === undefined ? '' : formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value === '' ? 0 : parseFloat(e.target.value)
                      })
                    }
                    rightLabel={
                      derivedUnitPrice > 0 && (
                        <span className="text-[11px] text-tea-400 font-normal">
                          {formatUnitPrice(derivedUnitPrice, formData.unit || '')}
                        </span>
                      )
                    }
                    placeholder="0"
                  />
                  <Input
                    label="低库存预警阈值 (选填)"
                    type="number"
                    step="any"
                    value={
                      formData.low_stock_threshold === undefined
                        ? ''
                        : formData.low_stock_threshold
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        low_stock_threshold:
                          e.target.value === '' ? undefined : parseFloat(e.target.value)
                      })
                    }
                    placeholder="低于此数量时提醒"
                  />
                </div>

                {/* Initial Quantity (Only when creating) */}
                {!item && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        label="初始数量"
                        type="number"
                        step="any"
                        value={formData.quantity === undefined ? '' : formData.quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity: e.target.value === '' ? 0 : parseFloat(e.target.value)
                          })
                        }
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1.5">
                        计量单位
                      </label>
                      <div className="relative">
                        <select
                          className="w-full px-3 py-2 bg-white/70 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none text-tea-800 text-sm h-[38px]"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        >
                          {(isTea ? TEA_UNITS : TEAWARE_UNITS).map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-tea-400 pointer-events-none"
                          size={14}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags System */}
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block">
                      分类标签
                    </label>
                    <span className="text-[10px] text-tea-400">多个用逗号隔开</span>
                  </div>
                  <Input
                    placeholder="例如：口粮茶,珍藏老茶,待客茶"
                    value={formData.tags || ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    prefixIcon={<Tag size={14} />}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_TAGS.map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handleAddPresetTag(pt)}
                        className="text-[10px] bg-tea-50 text-tea-600 hover:text-accent border border-tea-200/60 rounded px-1.5 py-0.5 transition-colors"
                      >
                        +{pt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1.5">
                    藏品描述与品饮心得 (可选)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-white/70 border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-tea-800 text-sm placeholder-tea-300 resize-none"
                    placeholder="记录仓储转化、香气特点、名家工料等..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Actions Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-tea-100">
                  <div>
                    {item && onOpenPoster && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenPoster(item)}
                      >
                        <Sparkles size={14} /> 鉴赏雅签
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item && (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => onDelete(item.id)}
                        disabled={isSaving || isUploading}
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      disabled={isSaving || isUploading}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      loading={isSaving || isUploading}
                    >
                      保存藏品
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* 2. Tab: RADAR */}
            {activeTab === 'RADAR' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="text-center">
                  <h4 className="font-serif font-bold text-base text-tea-900">
                    六维感官风味雷达
                  </h4>
                  <p className="text-xs text-tea-400 mt-1">
                    直观记录茶品在香气、回甘、生津、耐泡度、汤感醇厚与茶气体感上的表现
                  </p>
                </div>

                {/* AI Sensory & Brewing Recommendation Card */}
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#3d655a]">
                      <Sparkles size={14} className="text-amber-600" />
                      AI 智能感官风味与冲泡推导
                    </div>
                    <p className="text-[11px] text-stone-600 font-serif">
                      基于【{formData.name || '此款茶品'}】({formData.category || '茶类'}, {formData.year ? formData.year + '年' : ''})
                      深度推演六维风味数值并推荐投茶与水温。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiSensoryProfile}
                    disabled={isAnalyzingSensory}
                    className="px-3.5 py-1.5 bg-[#3d655a] hover:bg-[#34574d] text-amber-50 rounded-lg text-xs font-serif transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    {isAnalyzingSensory ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>正在推导中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>一键推算六维雷达</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-tea-100 shadow-xs flex flex-col items-center">
                  <FlavorRadar
                    data={formData.flavor_profile}
                    onChange={(updated) =>
                      setFormData({ ...formData, flavor_profile: updated })
                    }
                    size={260}
                    readOnly={false}
                  />
                </div>

                {/* Brewing Parameters Guide */}
                <div className="bg-tea-50/70 p-4 rounded-xl border border-tea-100">
                  <h5 className="font-bold text-xs text-tea-700 uppercase tracking-wider mb-2.5">
                    黄金冲泡备忘录
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      label="推荐水温 (°C)"
                      type="number"
                      value={formData.brewing_guide?.water_temp || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brewing_guide: {
                            ...formData.brewing_guide,
                            water_temp: parseFloat(e.target.value) || undefined
                          }
                        })
                      }
                      placeholder="95"
                    />
                    <Input
                      label="投茶量 (g)"
                      type="number"
                      step="any"
                      value={formData.brewing_guide?.tea_grams || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brewing_guide: {
                            ...formData.brewing_guide,
                            tea_grams: parseFloat(e.target.value) || undefined
                          }
                        })
                      }
                      placeholder="8"
                    />
                    <Input
                      label="出汤秒数 (s)"
                      type="number"
                      value={formData.brewing_guide?.steep_seconds || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brewing_guide: {
                            ...formData.brewing_guide,
                            steep_seconds: parseInt(e.target.value, 10) || undefined
                          }
                        })
                      }
                      placeholder="15"
                    />
                    <Input
                      label="主泡器皿"
                      value={formData.brewing_guide?.recommended_ware || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          brewing_guide: {
                            ...formData.brewing_guide,
                            recommended_ware: e.target.value
                          }
                        })
                      }
                      placeholder="紫砂壶/盖碗"
                    />
                  </div>
                </div>

                {/* Footer with both Cancel & Save buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-tea-100">
                  <Button variant="secondary" onClick={onClose}>
                    关闭
                  </Button>
                  <Button onClick={handleSubmit} loading={isSaving}>
                    保存风味设置
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Tab: TASTING NOTES */}
            {activeTab === 'TASTING' && item && (
              <div className="space-y-6">
                <TastingNotesManager item={item} />
                <div className="flex justify-end pt-3 border-t border-tea-100">
                  <Button variant="secondary" onClick={onClose}>
                    完成并关闭
                  </Button>
                </div>
              </div>
            )}

            {/* 4. Tab: INVENTORY HISTORY */}
            {activeTab === 'HISTORY' && item && (
              <div className="space-y-6">
                <InventoryManager
                  item={item}
                  logs={logs}
                  isLoading={isLoadingLogs}
                  onUpdate={async (amt: number, r: string, n: string) => {
                    const newQ = (item.quantity || 0) + amt;
                    if (newQ < 0) {
                      alert('出库数量超过当前库存结余！');
                      return false;
                    }
                    const ok = await onStockUpdate(item.id, newQ, amt, r, n);
                    if (ok) {
                      setFormData({ ...formData, quantity: newQ });
                      fetchLogs(item.id);
                    }
                    return ok;
                  }}
                />
                <div className="flex justify-end pt-3 border-t border-tea-100">
                  <Button variant="secondary" onClick={onClose}>
                    完成并关闭
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Multimodal Image Scanner Modal */}
      <ImageTeaScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApply={handleApplyExtractedData}
        initialTypeHint={formData.type}
      />
    </div>
  );
};
