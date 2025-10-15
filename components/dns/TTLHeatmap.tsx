'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TTLBucket } from '@/lib/mock-dns-data';

interface TTLHeatmapProps {
  data: TTLBucket[];
}

export function TTLHeatmap({ data }: TTLHeatmapProps) {
  // Color gradient from cool to hot based on percentage
  const getColor = (percentage: number) => {
    if (percentage < 10) return '#A8DADC'; // light blue
    if (percentage < 25) return '#457B9D'; // blue
    if (percentage < 50) return '#1D3557'; // dark blue
    if (percentage < 75) return '#F1931'; // orange
    return '#E63946'; // red/hot
  };

  return (
    <div className="w-full h-80 [&_svg]:outline-none [&_svg]:focus:outline-none flex justify-center">
      <ResponsiveContainer width="95%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <YAxis
            dataKey="bucket"
            type="category"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            width={75}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TTLBucket;
                return (
                  <div className="bg-white dark:bg-gray-slate border border-gray-light rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-orange-dark">{data.bucket}</p>
                    <p className="text-sm text-gray-slate">
                      Records: <span className="font-medium text-orange-dark">{data.count}</span>
                    </p>
                    <p className="text-sm text-gray-slate">
                      Percentage: <span className="font-medium text-orange-dark">{data.percentage}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.percentage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="-mt-2 flex justify-center items-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#A8DADC' }} />
          <span className="text-gray-slate">Low (&lt;10%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#457B9D' }} />
          <span className="text-gray-slate">Medium (10-50%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E63946' }} />
          <span className="text-gray-slate">High (&gt;50%)</span>
        </div>
      </div>
    </div>
  );
}

