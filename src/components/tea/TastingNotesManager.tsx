import React, { useState, useEffect } from 'react';
import { Plus, Star, Trash2, Loader2, Sparkles, Droplets, Thermometer, Clock } from 'lucide-react';
import { TastingNote, TeaItem } from '../../types/tea';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FLAVOR_TAGS, SOUP_COLORS } from '../../constants/tea';
import { formatDateTime } from '../../utils/formatters';
import { authFetch } from '../../utils/api';
import { analyzeSensoryProfile } from '../../services/aiService';

export interface TastingNotesManagerProps {
  item: TeaItem;
}

export const TastingNotesManager: React.FC<TastingNotesManagerProps> = ({ item }) => {
  const [notes, setNotes] = useState<TastingNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [rating, setRating] = useState(5);
  const [waterTemp, setWaterTemp] = useState<number | ''>(
    item.brewing_guide?.water_temp || 95
  );
  const [teaAmount, setTeaAmount] = useState<number | ''>(
    item.brewing_guide?.tea_grams || 8
  );
  const [steepSeconds, setSteepSeconds] = useState<number | ''>(
    item.brewing_guide?.steep_seconds || 15
  );
  const [wareName, setWareName] = useState(
    item.brewing_guide?.recommended_ware || ''
  );
  const [soupColor, setSoupColor] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isAiPolishing, setIsAiPolishing] = useState(false);

  const handleAiPolish = async () => {
    setIsAiPolishing(true);
    try {
      const promptText =
        content.trim() ||
        `汤色${soupColor || '明亮'}，滋味表现${flavorTags.join('、') || '醇爽回甘'}。`;
      const res = await analyzeSensoryProfile(promptText, {
        name: item.name,
        category: item.category,
        year: item.year,
        origin: item.origin
      });
      if (res.polished_note) {
        setContent(res.polished_note);
      }
    } catch (e) {
      console.error('AI Polish error:', e);
    } finally {
      setIsAiPolishing(false);
    }
  };

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/data?action=get_tasting_notes&id=${item.id}`);
      if (!res.ok) {
        setNotes([]);
        return;
      }
      const json = await res.json();
      if (json.data) {
        setNotes(
          json.data.map((n: any) => ({
            ...n,
            rating: Number(n.rating || 5),
            water_temp: n.water_temp ? Number(n.water_temp) : undefined,
            steep_seconds: n.steep_seconds ? Number(n.steep_seconds) : undefined,
            tea_amount: n.tea_amount ? Number(n.tea_amount) : undefined,
            created_at: Number(n.created_at)
          }))
        );
      }
    } catch (e) {
      console.warn('Fetch tasting notes failed:', e);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (item.id) {
      fetchNotes();
    }
  }, [item.id]);

  const handleToggleTag = (tag: string) => {
    if (flavorTags.includes(tag)) {
      setFlavorTags(flavorTags.filter((t) => t !== tag));
    } else {
      setFlavorTags([...flavorTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && flavorTags.length === 0) {
      alert('请填写品鉴感悟或选择风味特征');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        item_id: item.id,
        rating,
        water_temp: waterTemp ? Number(waterTemp) : null,
        steep_seconds: steepSeconds ? Number(steepSeconds) : null,
        tea_amount: teaAmount ? Number(teaAmount) : null,
        ware_name: wareName.trim() || null,
        soup_color: soupColor || null,
        flavor_tags: flavorTags.join(','),
        notes: content.trim()
      };

      const res = await authFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_tasting_note',
          data: payload
        })
      });

      if (res.ok) {
        setContent('');
        setFlavorTags([]);
        setIsAdding(false);
        fetchNotes();
      } else {
        const err = await res.json();
        alert(err.error || '添加笔记失败');
      }
    } catch (e) {
      alert('网络异常');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('确认删除此篇茶席冲泡笔记？')) return;
    try {
      const res = await authFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_tasting_note',
          id: noteId
        })
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (e) {
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Add */}
      <div className="flex items-center justify-between bg-tea-50/70 p-3.5 rounded-xl border border-tea-100">
        <div>
          <h4 className="font-serif font-bold text-sm text-tea-900 flex items-center gap-1.5">
            <Sparkles size={16} className="text-accent" />
            茶席品饮日记
          </h4>
          <p className="text-[11px] text-tea-500 mt-0.5">
            记录水温、投茶量与开泡口感转化，沉淀属于您的私房茶志
          </p>
        </div>
        <Button
          size="sm"
          variant={isAdding ? 'secondary' : 'primary'}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? '收起表单' : <><Plus size={14} /> 开泡记一笔</>}
        </Button>
      </div>

      {/* Add New Note Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-xl border border-tea-200/90 shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-tea-100">
            <span className="text-xs font-bold text-tea-700">本次开泡综合评分</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-amber-500' : 'text-tea-200'
                  }`}
                >
                  <Star size={18} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          {/* Brewing Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Input
              label="水温 (°C)"
              type="number"
              value={waterTemp}
              onChange={(e) =>
                setWaterTemp(e.target.value === '' ? '' : parseFloat(e.target.value))
              }
              prefixIcon={<Thermometer size={14} />}
              placeholder="95"
            />
            <Input
              label="投茶量 (g)"
              type="number"
              step="any"
              value={teaAmount}
              onChange={(e) =>
                setTeaAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
              }
              prefixIcon={<Droplets size={14} />}
              placeholder="8"
            />
            <Input
              label="出汤秒数 (s)"
              type="number"
              value={steepSeconds}
              onChange={(e) =>
                setSteepSeconds(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              prefixIcon={<Clock size={14} />}
              placeholder="15"
            />
            <Input
              label="主泡器皿"
              value={wareName}
              onChange={(e) => setWareName(e.target.value)}
              placeholder="例如：朱泥石瓢壶"
            />
          </div>

          {/* Soup Color Selection */}
          <div>
            <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1.5">
              汤色鉴赏
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SOUP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSoupColor(soupColor === color ? '' : color)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    soupColor === color
                      ? 'bg-accent text-white border-accent shadow-xs'
                      : 'bg-tea-50/60 text-tea-700 border-tea-200 hover:border-tea-300'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Flavor Tags */}
          <div>
            <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block mb-1.5">
              风味特征 (可多选)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FLAVOR_TAGS.map((tag) => {
                const isSelected = flavorTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-tea-800 text-white border-tea-800 shadow-xs'
                        : 'bg-white text-tea-600 border-tea-200 hover:border-accent hover:text-accent'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-tea-600 uppercase tracking-wider block">
                品饮心得与变化
              </label>
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isAiPolishing}
                className="text-[11px] font-serif text-[#3d655a] hover:text-[#2c4941] flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                title="AI 润色为优美文学茶评"
              >
                {isAiPolishing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>AI 润色中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="text-amber-600" />
                    <span>AI 润色文人品记</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-white border border-tea-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-tea-800 text-sm placeholder-tea-300 resize-none font-serif"
              placeholder="初泡花香高扬，三泡后汤水厚度显著，回甘悠长生津如泉..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button size="sm" type="submit" loading={isSubmitting}>
              保存此篇笔记
            </Button>
          </div>
        </form>
      )}

      {/* Tasting Notes History List */}
      <div>
        <h4 className="font-bold text-tea-800 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>历次品饮记录 ({notes.length})</span>
        </h4>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-accent" size={24} />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-tea-400 text-xs bg-tea-50/50 rounded-xl border border-dashed border-tea-200">
            暂无茶席品饮记录。开泡后不妨记下一笔，记录光阴滋味。
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {notes.map((note) => {
              const tags = note.flavor_tags ? note.flavor_tags.split(',').filter(Boolean) : [];
              return (
                <div
                  key={note.id}
                  className="bg-white p-3.5 rounded-xl border border-tea-100 shadow-xs hover:border-tea-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          fill={s <= note.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                      <span className="text-xs font-mono font-bold text-tea-800 ml-1">
                        {note.rating}.0
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-tea-400">
                        {formatDateTime(note.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="text-tea-300 hover:text-red-500 p-1"
                        title="删除笔记"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Param Badges */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-tea-600 mb-2">
                    {note.water_temp && (
                      <span className="bg-tea-50 px-2 py-0.5 rounded border border-tea-100">
                        {note.water_temp}°C
                      </span>
                    )}
                    {note.tea_amount && (
                      <span className="bg-tea-50 px-2 py-0.5 rounded border border-tea-100">
                        投茶 {note.tea_amount}g
                      </span>
                    )}
                    {note.steep_seconds && (
                      <span className="bg-tea-50 px-2 py-0.5 rounded border border-tea-100">
                        出汤 {note.steep_seconds}s
                      </span>
                    )}
                    {note.ware_name && (
                      <span className="bg-tea-50 px-2 py-0.5 rounded border border-tea-100">
                        器具: {note.ware_name}
                      </span>
                    )}
                    {note.soup_color && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                        汤色: {note.soup_color}
                      </span>
                    )}
                  </div>

                  {/* Flavor Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="bg-accent/10 text-accent font-medium text-[10px] px-1.5 py-0.5 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {note.notes && (
                    <p className="text-xs text-tea-700 leading-relaxed bg-tea-50/40 p-2 rounded-lg border border-tea-50">
                      {note.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
