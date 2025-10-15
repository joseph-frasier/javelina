'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { RecordTypeCount } from '@/lib/mock-dns-data';

interface RecordDistributionChartProps {
  data: RecordTypeCount[];
}

export function RecordDistributionChart({ data }: RecordDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="count"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as RecordTypeCount;
                return (
                  <div className="bg-white dark:bg-gray-slate border border-gray-light rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-orange-dark">{data.type} Records</p>
                    <p className="text-sm text-gray-slate">
                      Count: <span className="font-medium text-orange-dark">{data.count}</span>
                    </p>
                    <p className="text-sm text-gray-slate">
                      Percentage: <span className="font-medium text-orange-dark">
                        {((data.count / total) * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            content={({ payload }) => (
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {payload?.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-slate font-medium">
                      {entry.value}: {data[index].count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center label */}
      <div className="relative -mt-48 pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-dark">{total}</p>
          <p className="text-sm text-gray-slate">Total Records</p>
        </div>
      </div>
    </div>
  );
}

