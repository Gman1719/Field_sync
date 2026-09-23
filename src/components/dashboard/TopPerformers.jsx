import React from 'react';

function TopPerformers({ performers, title = 'Top Performing Officers' }) {
  if (!performers || performers.length === 0) {
    return (
      <div className="top-performers">
        <h3>🏆 {title}</h3>
        <div className="empty-state" style={{padding: '20px'}}>
          <div>No performance data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="top-performers">
      <h3>🏆 {title}</h3>
      <div className="performer-list">
        {performers.map((emp, i) => (
          <div key={emp.employeeId} className="performer-item">
            <span className="performer-rank">#{i + 1}</span>
            <span className="performer-name">{emp.employeeName}</span>
            <span className="performer-region">{emp.region}</span>
            <span className="performer-stats">🆔 {emp.totalRegistrations} citizens</span>
            <span className="performer-efficiency">{emp.avgEfficiency}%</span>
            <span className="performer-attendance">📊 {Math.round(emp.attendanceRate)}%</span>
            <span className="performer-trust">🎯 {emp.trustScore || 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopPerformers;