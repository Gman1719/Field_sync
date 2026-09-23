import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function RegistrationChart({ data }) {
  return (
    <div className="chart-container" style={{ width: '100%', height: 300 }}>
      <h4>📊 Daily Registrations</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="registrations" fill="#1e3a5f" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RegistrationChart;