import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0b7e4b', '#d97706', '#dc2626', '#6b7280', '#3b82f6', '#8b5cf6'];

function PerformanceChart({ data, title = "📊 Performance Distribution" }) {
  // If no data or all values are 0, show a message
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div className="chart-container" style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <p style={{ fontSize: '16px' }}>📊 No data available</p>
          <p style={{ fontSize: '14px' }}>Data will appear once reports are submitted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ width: '100%', height: 300 }}>
      <h4 style={{ marginBottom: '8px' }}>{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceChart;