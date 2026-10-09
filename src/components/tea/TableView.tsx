import React, { useState } from 'react';
import { ArrowUpDown, Star, AlertTriangle, Sparkles, Edit2 } from 'lucide-react';
import { TeaItem } from '../../types/tea';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export interface TableViewProps {
  items: TeaItem[];
  onSelectItem: (item: TeaItem) => void;
  onOpenPoster?: (item: TeaItem) => void;
}

type SortField = 'name' | 'year' | 'quantity' | 'price' | 'created_at' | 'rating';

export const TableView: React.FC<TableViewProps> = ({
  items,
  onSelectItem,
  onOpenPoster
}) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'year') {
      aVal = parseInt(a.year || '0', 10) || 0;
      bVal = parseInt(b.year || '0', 10) || 0;
    }

    if (aVal === undefined || aVal === null) aVal = 0;
    if (bVal === undefined || bVal === null) bVal = 0;

    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-white rounded-2xl border border-tea-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-tea-700">
          <thead className="bg-tea-50/80 text-tea-600 font-serif border-b border-tea-200/70">
            <tr>
              <th className="py-3 px-4 font-bold">藏品</th>
              <th className="py-3 px-3 font-bold">类型 / 分类</th>
              <th
                className="py-3 px-3 font-bold cursor-pointer hover:text-accent"
                onClick={() => handleSort('year')}
              >
                <div className="flex items-center gap-1">
                  年份 <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3 px-3 font-bold">产地 / 泥料</th>
              <th
                className="py-3 px-3 font-bold cursor-pointer hover:text-accent"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center gap-1">
                  结余库存 <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                className="py-3 px-3 font-bold cursor-pointer hover:text-accent"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  估算买入价 <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3 px-3 font-bold">存放仓位</th>
              <th
                className="py-3 px-3 font-bold cursor-pointer hover:text-accent"
                onClick={() => handleSort('rating')}
              >
                <div className="flex items-center gap-1">
                  自评 <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                className="py-3 px-3 font-bold cursor-pointer hover:text-accent"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  登记时间 <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3 px-4 font-bold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tea-100">
            {sortedItems.map((item) => {
              const isTea = item.type === 'TEA';
              const isLowStock =
                (item.low_stock_threshold !== undefined &&
                  item.low_stock_threshold !== null &&
                  item.quantity <= item.low_stock_threshold) ||
                (isTea && item.quantity <= 0.5 && item.unit.includes('饼'));

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="hover:bg-tea-50/50 transition-colors cursor-pointer group"
                >
                  {/* Name & Cover */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-tea-100 shrink-0 border border-tea-200/50">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-tea-300 text-[10px]">
                            无图
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold font-serif text-tea-900 group-hover:text-accent transition-colors flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isLowStock && (
                            <AlertTriangle size={12} className="text-amber-500" />
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-tea-400 line-clamp-1 max-w-xs">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3">
                    <Badge color={isTea ? 'accent' : 'clay'} size="sm" className="mr-1">
                      {isTea ? '茶' : '器'}
                    </Badge>
                    <span className="font-medium text-tea-800">{item.category}</span>
                  </td>

                  {/* Year */}
                  <td className="py-3 px-3 font-serif">
                    {item.year ? `${item.year}` : '--'}
                  </td>

                  {/* Origin & Material */}
                  <td className="py-3 px-3">
                    <div className="text-tea-800">{item.origin || '--'}</div>
                    {item.material && (
                      <div className="text-[11px] text-amber-700 font-mono">
                        {item.material}
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono font-bold ${
                        isLowStock ? 'text-amber-600' : 'text-tea-900'
                      }`}
                    >
                      {item.quantity}
                    </span>{' '}
                    <span className="text-tea-400 text-[11px]">{item.unit}</span>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3">
                    {item.price && item.price > 0 ? (
                      <span className="font-serif font-bold text-amber-700">
                        {formatCurrency(item.price)}
                      </span>
                    ) : (
                      <span className="text-tea-300">--</span>
                    )}
                  </td>

                  {/* Storage */}
                  <td className="py-3 px-3 text-tea-500">
                    {item.storage_location || '--'}
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-3">
                    {item.rating && item.rating > 0 ? (
                      <div className="flex items-center text-amber-500 font-mono font-bold">
                        <Star size={11} fill="currentColor" className="mr-0.5" />
                        {item.rating}
                      </div>
                    ) : (
                      <span className="text-tea-300">--</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-tea-400 text-[11px]">
                    {formatDate(item.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {onOpenPoster && (
                        <button
                          type="button"
                          onClick={() => onOpenPoster(item)}
                          title="生成雅签"
                          className="p-1.5 rounded-lg text-tea-400 hover:text-accent hover:bg-tea-100 transition-colors"
                        >
                          <Sparkles size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        title="编辑/查看"
                        className="p-1.5 rounded-lg text-tea-400 hover:text-tea-800 hover:bg-tea-100 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
