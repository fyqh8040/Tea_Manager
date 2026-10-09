import React from 'react';
import { Camera, AlertTriangle, Star, Sparkles, MapPin } from 'lucide-react';
import { TeaItem } from '../../types/tea';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/formatters';

export interface ItemCardProps {
  item: TeaItem;
  onClick: () => void;
  onOpenPoster?: (item: TeaItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick, onOpenPoster }) => {
  const isTea = item.type === 'TEA';

  // Low stock check
  const isLowStock =
    (item.low_stock_threshold !== undefined &&
      item.low_stock_threshold !== null &&
      item.quantity <= item.low_stock_threshold) ||
    (isTea && item.quantity <= 0.5 && item.unit.includes('饼')) ||
    (isTea && item.quantity <= 20 && item.unit.includes('克'));

  const tags = item.tags ? item.tags.split(',').filter(Boolean) : [];

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-tea-200/80 flex flex-col h-full relative"
    >
      {/* Cover Image */}
      <div className="relative aspect-[4/3] bg-tea-100 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-tea-300 bg-tea-50/70">
            <Camera size={32} />
            <span className="text-[11px] mt-1 text-tea-400">暂无图片</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <Badge color={isTea ? 'accent' : 'clay'} className="shadow-sm">
            {isTea ? '茶品' : '茶器'}
          </Badge>
          {isLowStock && (
            <Badge color="amber" size="sm" className="shadow-xs animate-pulse">
              <AlertTriangle size={11} className="mr-0.5" /> 见底
            </Badge>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {onOpenPoster && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPoster(item);
              }}
              title="生成鉴赏雅签"
              className="p-1 rounded-md bg-black/40 hover:bg-black/70 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Sparkles size={14} />
            </button>
          )}
          <Badge color="dark" size="sm">
            {item.quantity} {item.unit}
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex justify-between items-baseline mb-1 gap-2">
          <h3 className="font-serif text-base font-bold text-tea-900 truncate tracking-tight">
            {item.name}
          </h3>
          {item.year && (
            <span className="text-[11px] text-tea-500 shrink-0 font-medium font-serif bg-tea-50 px-1.5 py-0.5 rounded border border-tea-100">
              {item.year}
            </span>
          )}
        </div>

        {/* Category & Material & Origin */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-tea-600 mb-2">
          <span className="bg-tea-100/70 px-1.5 py-0.5 rounded text-tea-700 font-medium text-[11px]">
            {item.category}
          </span>
          {item.material && (
            <span className="bg-amber-50 text-amber-800 border border-amber-200/50 px-1.5 py-0.5 rounded text-[11px]">
              {item.material}
            </span>
          )}
          {item.origin && (
            <span className="text-tea-400 text-[11px]">· {item.origin}</span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] bg-tea-50 text-tea-600 px-1.5 py-0.5 rounded border border-tea-100/70"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Storage Location & Rating */}
        {(item.storage_location || (item.rating && item.rating > 0)) && (
          <div className="flex items-center justify-between text-[11px] text-tea-400 mb-2">
            {item.storage_location ? (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin size={11} className="shrink-0 text-accent" />
                {item.storage_location}
              </span>
            ) : <span />}

            {item.rating && item.rating > 0 ? (
              <span className="flex items-center gap-0.5 text-amber-500 font-mono font-bold">
                <Star size={11} fill="currentColor" /> {item.rating}
              </span>
            ) : null}
          </div>
        )}

        {/* Price & Date Bottom Bar */}
        <div className="mt-auto pt-2.5 border-t border-tea-100 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            {item.price && item.price > 0 ? (
              <>
                <span className="text-[10px] text-amber-700 font-medium">¥</span>
                <span className="text-base font-bold text-amber-700 font-serif">
                  {item.price.toLocaleString()}
                </span>
                {item.unit_price ? (
                  <span className="text-[10px] text-tea-400 ml-1.5 font-mono">
                    (¥{Math.round(item.unit_price * 10) / 10}/{item.unit.split(' ')[0]})
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-xs text-tea-300">--</span>
            )}
          </div>
          <span className="text-[10px] text-tea-400">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
