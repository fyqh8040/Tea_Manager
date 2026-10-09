import React, { useMemo } from 'react';
import { Clock, Hourglass, Sparkles } from 'lucide-react';
import { TeaItem } from '../../types/tea';
import { ItemCard } from './ItemCard';

export interface TimelineViewProps {
  items: TeaItem[];
  onSelectItem: (item: TeaItem) => void;
  onOpenPoster?: (item: TeaItem) => void;
}

interface TimelineEra {
  id: string;
  title: string;
  yearsRange: string;
  agingStage: string;
  description: string;
  items: TeaItem[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  onSelectItem,
  onOpenPoster
}) => {
  const currentYear = new Date().getFullYear();

  const eras: TimelineEra[] = useMemo(() => {
    const eraDefs = [
      {
        id: 'vintage',
        title: '传家老茶 · 岁月琼浆',
        yearsRange: '2000 年及更早',
        agingStage: '陈香入骨 · 药香樟香',
        description: '历经二十余载干仓转化，茶性温和醇厚，汤色琥珀红浓，饮之通体舒泰。',
        filter: (item: TeaItem) => {
          const y = parseInt(item.year || '0', 10);
          return y > 0 && y <= 2000;
        }
      },
      {
        id: 'mature',
        title: '中期熟成 · 黄金蜕变',
        yearsRange: '2001 - 2012 年',
        agingStage: '蜜韵显露 · 生津绵长',
        description: '陈化十至二十年，苦涩已完全褪去，水路柔顺甘甜，正值品饮黄金升华期。',
        filter: (item: TeaItem) => {
          const y = parseInt(item.year || '0', 10);
          return y >= 2001 && y <= 2012;
        }
      },
      {
        id: 'drinking',
        title: '适饮佳期 · 芳华正盛',
        yearsRange: '2013 - 2020 年',
        agingStage: '七年成宝 · 渐入佳境',
        description: '七至十二年转化期，既保留鲜活野韵与花果香，又沉淀出深厚喉韵与体感。',
        filter: (item: TeaItem) => {
          const y = parseInt(item.year || '0', 10);
          return y >= 2013 && y <= 2020;
        }
      },
      {
        id: 'young',
        title: '初醒新茶 · 灵动野韵',
        yearsRange: '2021 年至今',
        agingStage: '三年为药 · 初显回甘',
        description: '新茶气韵丰沛，花香高扬，山头辨识度鲜明，静待岁月慢养与时光沉淀。',
        filter: (item: TeaItem) => {
          const y = parseInt(item.year || '0', 10);
          return y > 2020;
        }
      },
      {
        id: 'wares_or_unspecified',
        title: '器物雅蓄 · 当代名作',
        yearsRange: '传世茶器 / 年代未详',
        agingStage: '包浆温润 · 一器侍道',
        description: '砂壶养润、建盏曜变、柴烧落灰，器以载道，与佳茗相伴相生。',
        filter: (item: TeaItem) => {
          const y = parseInt(item.year || '0', 10);
          return !y || item.type === 'TEAWARE';
        }
      }
    ];

    return eraDefs
      .map((def) => ({
        id: def.id,
        title: def.title,
        yearsRange: def.yearsRange,
        agingStage: def.agingStage,
        description: def.description,
        items: items.filter(def.filter)
      }))
      .filter((era) => era.items.length > 0);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-12 relative before:absolute before:inset-0 before:left-4 md:before:left-1/2 before:w-0.5 before:bg-tea-200/60">
      {eras.map((era, eraIndex) => (
        <div key={era.id} className="relative">
          {/* Era Milestone Banner */}
          <div className="flex flex-col items-start md:items-center justify-center mb-6 pl-10 md:pl-0">
            <div className="z-10 bg-tea-900 text-white font-serif px-4 py-1.5 rounded-full shadow-md text-xs font-bold flex items-center gap-2 border border-tea-700">
              <Hourglass size={14} className="text-accent-light" />
              <span>{era.title}</span>
              <span className="text-[10px] text-tea-300 font-mono">({era.yearsRange})</span>
            </div>

            <div className="text-center max-w-lg mt-2">
              <span className="text-accent font-serif text-xs font-bold block mb-0.5">
                ✦ {era.agingStage} ✦
              </span>
              <p className="text-[11px] text-tea-500 leading-relaxed">
                {era.description}
              </p>
            </div>
          </div>

          {/* Cards Grid for this Era */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pl-10 md:pl-0">
            {era.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => onSelectItem(item)}
                onOpenPoster={onOpenPoster}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
