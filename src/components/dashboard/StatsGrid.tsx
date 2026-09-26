import React from 'react';

function StatsGrid({ 
  totalReports, totalRegistrations, fieldOfficers, attendanceRate,
  pendingLeaves, pendingPermissions, teamMembers, teamReports,
  teamRegistrations, myReports, myRegistrations 
}) {
  const stats = [];

  if (totalReports !== undefined && fieldOfficers !== undefined) {
    stats.push(
      { icon: '📋', value: totalReports, label: 'Total Reports' },
      { icon: '🆔', value: totalRegistrations, label: 'Citizens Registered' },
      { icon: '👥', value: fieldOfficers, label: 'Field Officers' },
      { icon: '⚡', value: attendanceRate + '%', label: 'Attendance Rate' },
      { icon: '📅', value: pendingLeaves, label: 'Pending Leaves' },
      { icon: '📋', value: pendingPermissions, label: 'Pending Permissions' }
    );
  } else if (teamMembers !== undefined) {
    stats.push(
      { icon: '👥', value: teamMembers, label: 'Team Members' },
      { icon: '📋', value: teamReports, label: 'Team Reports' },
      { icon: '🆔', value: teamRegistrations, label: 'Team Registrations' },
      { icon: '📅', value: pendingLeaves, label: 'Pending Leaves' }
    );
  } else if (myReports !== undefined) {
    stats.push(
      { icon: '📋', value: myReports, label: 'My Reports' },
      { icon: '🆔', value: myRegistrations, label: 'Citizens Registered' },
      { icon: '📅', value: pendingLeaves, label: 'Pending Leaves' },
      { icon: '📋', value: pendingPermissions, label: 'Pending Permissions' }
    );
  }

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-info">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;