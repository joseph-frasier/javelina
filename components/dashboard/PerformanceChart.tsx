'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSettingsStore } from '@/lib/settings-store';

// Generate mock data for the last 7 days
const generateMockData = () => {
  const data = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    data.push({
      day: days[i],
      cpu: Math.floor(Math.random() * 30) + 45, // 45-75%
      memory: Math.floor(Math.random() * 25) + 55, // 55-80%
      responseTime: Math.floor(Math.random() * 50) + 100, // 100-150ms
      requests: Math.floor(Math.random() * 2000) + 3000, // 3000-5000
      errorRate: (Math.random() * 2).toFixed(2), // 0-2%
    });
  }
  
  return data;
};

export function PerformanceChart() {
  const [data] = useState(generateMockData());
  const { general } = useSettingsStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(general.theme === 'dark');
  }, [general.theme]);

  // Theme-aware colors
  const colors = {
    text: isDark ? '#f2f2f2' : '#0b0c0d',
    grid: isDark ? '#374151' : '#e5e7eb',
    cpu: '#ff6b35',
    memory: '#4ade80',
    responseTime: '#60a5fa',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-light dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-orange-dark mb-2">{payload[0].payload.day}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name === 'Response Time' ? 'ms' : entry.name === 'Error Rate' ? '%' : entry.name === 'Requests' ? '' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-6 h-64 [&_*:focus]:outline-none [&_*:focus-visible]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis 
            dataKey="day" 
            stroke={colors.text}
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke={colors.text}
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              fontSize: '12px',
              color: colors.text
            }}
          />
          <Line 
            type="monotone" 
            dataKey="cpu" 
            name="CPU Usage" 
            stroke={colors.cpu} 
            strokeWidth={2}
            dot={{ fill: colors.cpu, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="memory" 
            name="Memory Usage" 
            stroke={colors.memory} 
            strokeWidth={2}
            dot={{ fill: colors.memory, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="responseTime" 
            name="Response Time" 
            stroke={colors.responseTime} 
            strokeWidth={2}
            dot={{ fill: colors.responseTime, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

