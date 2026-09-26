import React, { useMemo } from 'react';

function TrendChart({ reports }) {
  const chartData = useMemo(() => {
    const today = new Date();
    const dates = [];
    const registrations = [];
    let maxTrend = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dates.push(dateStr);

      const dailyTotal = reports
        .filter(r => r.reportDate === dateStr)
        .reduce((sum, r) => sum + (r.registrations || 0), 0);
      registrations.push(dailyTotal);
      if (dailyTotal > maxTrend) maxTrend = dailyTotal;
    }

    if (maxTrend === 0) maxTrend = 1;
    return { dates, registrations, maxTrend };
  }, [reports]);

  return (
    <div className="trend-chart-card">
      <div className="chart-header">
        <div>
          <h3>📈 Registration Trend (Last 7 Days)</h3>
          <p>Daily citizen registration trends</p>
        </div>
      </div>
      <div className="chart-container">
        <div className="css-trend-chart">
          <div className="css-trend-labels">
            {chartData.dates.map((date, i) => (
              <div key={i} className="css-trend-label">{date}</div>
            ))}
          </div>
          <div className="css-trend-bars">
            {chartData.registrations.map((value, i) => (
              <div key={i} className="css-trend-bar-wrapper">
                <div 
                  className="css-trend-bar"
                  style={{ 
                    height: `${(value / chartData.maxTrend) * 100}%`,
                    background: value > 0 ? '#1e3a5f' : '#E5E7EB'
                  }}
                >
                  <span className="css-trend-value">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrendChart;