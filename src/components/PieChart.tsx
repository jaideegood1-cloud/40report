import React, { useState } from 'react';

export interface PieChartSegment {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

interface PieChartProps {
  title: string;
  subtitle?: string;
  data: PieChartSegment[];
  totalLabel?: string;
  plainCard?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  title,
  subtitle,
  data,
  totalLabel = 'รวมทั้งหมด',
  plainCard = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate angles
  let accumulatedAngle = 0;
  const segments = data.map((item, idx) => {
    const percent = total > 0 ? (item.value / total) * 100 : 0;
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      ...item,
      percentage: Number(percent.toFixed(1)),
      startAngle,
      endAngle: accumulatedAngle,
      index: idx,
    };
  });

  // SVG helper coordinates for donut
  const size = 220;
  const center = size / 2;
  const radius = 85;
  const innerRadius = 52;

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const createArc = (startAngle: number, endAngle: number, r: number, ir: number) => {
    // If 360 degrees full circle
    const isFull = endAngle - startAngle >= 359.99;
    const end = isFull ? 359.99 : endAngle;

    const start = polarToCartesian(center, center, r, end);
    const finish = polarToCartesian(center, center, r, startAngle);
    const innerStart = polarToCartesian(center, center, ir, end);
    const innerFinish = polarToCartesian(center, center, ir, startAngle);

    const largeArcFlag = end - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, finish.x, finish.y,
      'L', innerFinish.x, innerFinish.y,
      'A', ir, ir, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      'Z',
    ].join(' ');
  };

  return (
    <div className={plainCard ? "flex flex-col justify-between h-full" : "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"}>
      {title && (
        <div className="mb-2">
          <h4 className="font-bold font-heading text-slate-900 text-sm sm:text-base leading-snug">
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-2">
        {/* SVG Donut Chart */}
        <div className="relative w-44 h-44 flex-shrink-0 flex items-center justify-center">
          {total === 0 ? (
            <div className="w-36 h-36 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
              ไม่มีข้อมูล
            </div>
          ) : (
            <>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {segments.map((seg) => {
                  if (seg.value === 0) return null;
                  const isHovered = hoveredIndex === seg.index;
                  const currentRadius = isHovered ? radius + 4 : radius;

                  return (
                    <path
                      key={seg.label}
                      d={createArc(seg.startAngle, seg.endAngle, currentRadius, innerRadius)}
                      fill={seg.color}
                      className="transition-all duration-300 cursor-pointer hover:opacity-90 stroke-white stroke-2"
                      onMouseEnter={() => setHoveredIndex(seg.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Info Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {hoveredIndex !== null && segments[hoveredIndex] ? (
                  <>
                    <span className="text-lg font-bold font-heading text-slate-900 leading-none">
                      {segments[hoveredIndex].percentage}%
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium max-w-[80px] truncate leading-tight mt-0.5">
                      {segments[hoveredIndex].label}
                    </span>
                    <span className="text-[10px] font-bold text-teal-800">
                      ({segments[hoveredIndex].value})
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold font-heading text-slate-900 leading-none">
                      {total}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                      {totalLabel}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5 text-xs">
          {segments.map((seg) => (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredIndex === seg.index ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-3 h-3 rounded-md flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                ></span>
                <span className="text-slate-700 truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-600 font-medium">
                <span>{seg.value}</span>
                <span className="text-[11px] text-slate-400">({seg.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
