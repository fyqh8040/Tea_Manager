import React from 'react';
import { FlavorProfile } from '../../types/tea';

export interface FlavorRadarProps {
  data?: FlavorProfile;
  onChange?: (updated: FlavorProfile) => void;
  size?: number;
  readOnly?: boolean;
  labelFontSize?: number;
}

const DIMENSIONS: Array<{ key: keyof FlavorProfile; label: string }> = [
  { key: 'aroma', label: '香气馥郁' },
  { key: 'aftertaste', label: '回甘持久' },
  { key: 'salivation', label: '生津鸣泉' },
  { key: 'endurance', label: '耐泡度' },
  { key: 'body', label: '汤感醇厚' },
  { key: 'sensation', label: '茶气体感' }
];

export const FlavorRadar: React.FC<FlavorRadarProps> = ({
  data = { aroma: 4, aftertaste: 4, salivation: 4, endurance: 4, body: 4, sensation: 3 },
  onChange,
  size = 240,
  readOnly = false,
  labelFontSize
}) => {
  const center = size / 2;
  // 优化半径为 0.33，预留充裕的上下边距，杜绝标签与上层标题发生重叠紧贴
  const radius = size * 0.33;
  const levels = [1, 2, 3, 4, 5];
  const total = DIMENSIONS.length;
  const actualFontSize = labelFontSize ?? (size <= 200 ? 11.5 : 12);

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (value / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    // 针对顶部（index 0）与底部（index 3）垂直标签微调安全距离，确保在 SVG 内部居中舒适呈现
    const isVertical = index === 0 || index === 3;
    const r = radius + (isVertical ? 17 : 20);
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const polygonPoints = DIMENSIONS.map((dim, i) => {
    const val = data[dim.key] || 1;
    const { x, y } = getCoordinates(i, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center select-none">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Web Polygons */}
        {levels.map((lvl) => {
          const points = DIMENSIONS.map((_, i) => {
            const { x, y } = getCoordinates(i, lvl);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={lvl}
              points={points}
              fill={lvl === 5 ? 'rgba(74, 124, 111, 0.03)' : 'none'}
              stroke="#e5e5dc"
              strokeWidth={lvl === 5 ? '1.5' : '1'}
              strokeDasharray={lvl < 5 ? '2,2' : undefined}
            />
          );
        })}

        {/* Axis Lines */}
        {DIMENSIONS.map((_, i) => {
          const { x, y } = getCoordinates(i, 5);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e2e2d8"
              strokeWidth="1"
            />
          );
        })}

        {/* Value Area */}
        <polygon
          points={polygonPoints}
          fill="rgba(74, 124, 111, 0.35)"
          stroke="#4a7c6f"
          strokeWidth="2.5"
          className="transition-all duration-300"
        />

        {/* Value Points */}
        {DIMENSIONS.map((dim, i) => {
          const val = data[dim.key] || 1;
          const { x, y } = getCoordinates(i, val);
          return (
            <circle
              key={dim.key}
              cx={x}
              cy={y}
              r={readOnly ? 3.5 : 4.5}
              fill="#ffffff"
              stroke="#345e52"
              strokeWidth="2"
              className="transition-all duration-300 drop-shadow-xs"
            />
          );
        })}

        {/* Labels */}
        {DIMENSIONS.map((dim, i) => {
          const { x, y } = getLabelCoordinates(i);
          const val = data[dim.key] || 1;
          return (
            <text
              key={dim.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={actualFontSize}
              style={{ fontSize: `${actualFontSize}px` }}
              className="font-serif fill-stone-700 font-medium tracking-normal select-none"
            >
              {dim.label} {val > 0 && (
                <tspan
                  fontSize={Math.max(9.5, actualFontSize - 1.5)}
                  style={{ fontSize: `${Math.max(9.5, actualFontSize - 1.5)}px` }}
                  className="fill-[#3d655a] font-mono font-bold"
                >
                  ({val})
                </tspan>
              )}
            </text>
          );
        })}
      </svg>

      {/* Interactive Controls (When not readOnly) */}
      {!readOnly && onChange && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-tea-100">
          {DIMENSIONS.map((dim) => {
            const currentVal = data[dim.key] || 3;
            return (
              <div key={dim.key} className="bg-tea-50/70 p-2 rounded-lg border border-tea-100/80">
                <div className="flex justify-between items-center text-[11px] mb-1 font-serif text-tea-800">
                  <span>{dim.label}</span>
                  <span className="font-mono font-bold text-accent">{currentVal}分</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={currentVal}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      [dim.key]: parseInt(e.target.value, 10)
                    })
                  }
                  className="w-full accent-accent h-1.5 bg-tea-200 rounded-lg cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
