import React, { useEffect } from 'react';

function NotificationBell({ 
  notifications, 
  unreadCount, 
  onToggle, 
  onMarkRead, 
  onMarkAllRead, 
  isOpen,
  user,
  addNotification
}) {

  // ============================================================
  // TRACK ALL USER ACTIONS (EXCEPT LOGOUT)
  // ============================================================
  useEffect(() => {
    if (!user || !addNotification) return;

    // Track page visits
    const trackPageVisit = () => {
      const page = window.location.pathname.split('/').pop() || 'dashboard';
      addNotification(
        user.id,
        `📄 Page View`,
        `You visited the ${page} page`,
        'info'
      );
    };

    // Track time spent on page (every 5 minutes)
    let timeInterval = setInterval(() => {
      const page = window.location.pathname.split('/').pop() || 'dashboard';
      addNotification(
        user.id,
        `⏱️ Session Update`,
        `You've been on the ${page} page for 5 minutes`,
        'info'
      );
    }, 5 * 60 * 1000);

    // Track tab visibility (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const page = window.location.pathname.split('/').pop() || 'dashboard';
        addNotification(
          user.id,
          `👋 Welcome Back`,
          `You returned to the ${page} page`,
          'info'
        );
      }
    };

    // Track online/offline status
    const handleOnline = () => {
      addNotification(
        user.id,
        `🟢 Online`,
        `You are back online`,
        'success'
      );
    };

    const handleOffline = () => {
      addNotification(
        user.id,
        `🔴 Offline`,
        `You are offline. Some features may be limited.`,
        'warning'
      );
    };

    // Track window focus
    const handleFocus = () => {
      const page = window.location.pathname.split('/').pop() || 'dashboard';
      addNotification(
        user.id,
        `👀 Active`,
        `You are active on ${page}`,
        'info'
      );
    };

    // Track window blur (when user leaves the tab)
    const handleBlur = () => {
      const page = window.location.pathname.split('/').pop() || 'dashboard';
      addNotification(
        user.id,
        `💤 Away`,
        `You stepped away from ${page}`,
        'info'
      );
    };

    // Track scroll depth (when user scrolls to 50% of page)
    let scrollTriggered = false;
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 50 && !scrollTriggered) {
        scrollTriggered = true;
        const page = window.location.pathname.split('/').pop() || 'dashboard';
        addNotification(
          user.id,
          `📜 Scrolled`,
          `You've scrolled through 50% of the ${page} page`,
          'info'
        );
        setTimeout(() => { scrollTriggered = false; }, 5000);
      }
    };

    // Track clicks (every 20 clicks)
    let clickCount = 0;
    const handleClick = () => {
      clickCount++;
      if (clickCount % 20 === 0) {
        const page = window.location.pathname.split('/').pop() || 'dashboard';
        addNotification(
          user.id,
          `🖱️ Activity`,
          `You've performed ${clickCount} clicks on ${page}`,
          'info'
        );
      }
    };

    // Track key presses (every 100 key presses)
    let keyCount = 0;
    const handleKeyPress = () => {
      keyCount++;
      if (keyCount % 100 === 0) {
        const page = window.location.pathname.split('/').pop() || 'dashboard';
        addNotification(
          user.id,
          `⌨️ Typing`,
          `You've typed ${keyCount} characters on ${page}`,
          'info'
        );
      }
    };

    // Track form submissions
    const handleFormSubmit = (e) => {
      const form = e.target;
      const formName = form.id || form.className || 'form';
      addNotification(
        user.id,
        `📋 Form Submitted`,
        `You submitted a ${formName}`,
        'success'
      );
    };

    // Track data changes (when reports, citizens, etc. are updated)
    const handleDataChange = (action, entity) => {
      addNotification(
        user.id,
        `📊 Data Updated`,
        `You ${action} a ${entity}`,
        'info'
      );
    };

    // Track errors
    const handleError = (error) => {
      addNotification(
        user.id,
        `❌ Error`,
        `An error occurred: ${error.message || 'Unknown error'}`,
        'error'
      );
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClick);
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('submit', handleFormSubmit);
    window.addEventListener('error', handleError);

    // Return cleanup function
    return () => {
      clearInterval(timeInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('submit', handleFormSubmit);
      window.removeEventListener('error', handleError);
    };
  }, [user, addNotification]);

  // ============================================================
  // TRACK SPECIFIC ACTIONS (EXCEPT LOGOUT)
  // ============================================================
  
  // These functions can be called from parent components
  const trackAction = (action, entity, details = '') => {
    if (!user || !addNotification) return;
    
    const actionMap = {
      'create': `🆕 Created`,
      'update': `✏️ Updated`,
      'delete': `🗑️ Deleted`,
      'view': `👁️ Viewed`,
      'submit': `📤 Submitted`,
      'approve': `✅ Approved`,
      'reject': `❌ Rejected`,
      'login': `🔐 Login`,
      'register': `📝 Registered`,
      'export': `📊 Exported`,
      'sync': `🔄 Synced`,
      'assign': `📋 Assigned`,
      'complete': `✅ Completed`,
      'start': `▶️ Started`,
      'pause': `⏸️ Paused`,
      'resume': `▶️ Resumed`,
      'cancel': `❌ Cancelled`,
      'save': `💾 Saved`,
      'print': `🖨️ Printed`,
      'share': `📤 Shared`,
      'upload': `📤 Uploaded`,
      'download': `📥 Downloaded`
    };

    const actionLabel = actionMap[action] || `🔄 ${action}`;
    
    addNotification(
      user.id,
      `${actionLabel} ${entity}`,
      details || `You ${action} a ${entity}`,
      action === 'delete' || action === 'reject' || action === 'cancel' ? 'error' : 
      action === 'approve' || action === 'complete' || action === 'success' ? 'success' : 
      'info'
    );
  };

  // Track report actions
  const trackReportAction = (action, reportName) => {
    trackAction(action, 'Report', `${action} report: ${reportName}`);
  };

  // Track citizen actions
  const trackCitizenAction = (action, citizenName) => {
    trackAction(action, 'Citizen', `${action} citizen: ${citizenName}`);
  };

  // Track leave actions
  const trackLeaveAction = (action, leaveType) => {
    trackAction(action, 'Leave', `${action} leave: ${leaveType}`);
  };

  // Track permission actions
  const trackPermissionAction = (action, permissionType) => {
    trackAction(action, 'Permission', `${action} permission: ${permissionType}`);
  };

  // Track task actions
  const trackTaskAction = (action, taskTitle) => {
    trackAction(action, 'Task', `${action} task: ${taskTitle}`);
  };

  // Track attendance actions
  const trackAttendanceAction = (action, officerName) => {
    trackAction(action, 'Attendance', `${action} attendance for: ${officerName}`);
  };

  // Track user actions
  const trackUserAction = (action, userName) => {
    trackAction(action, 'User', `${action} user: ${userName}`);
  };

  // Track sync actions
  const trackSyncAction = (action, count) => {
    trackAction(action, 'Sync', `${action} ${count} items`);
  };

  // Track export actions
  const trackExportAction = (format, count) => {
    trackAction('export', `${format} Export`, `Exported ${count} records as ${format}`);
  };

  // Track navigation
  const trackNavigation = (from, to) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `🧭 Navigation`,
      `You navigated from ${from} to ${to}`,
      'info'
    );
  };

  // Track time on page
  const trackTimeOnPage = (page, timeInSeconds) => {
    if (!user || !addNotification) return;
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    addNotification(
      user.id,
      `⏱️ Time Spent`,
      `You spent ${minutes}m ${seconds}s on ${page}`,
      'info'
    );
  };

  // Track search
  const trackSearch = (query, results) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `🔍 Search`,
      `Search for "${query}" returned ${results} results`,
      'info'
    );
  };

  // Track filter
  const trackFilter = (filterName, filterValue) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `🔍 Filter Applied`,
      `Applied filter: ${filterName} = ${filterValue}`,
      'info'
    );
  };

  // Track sort
  const trackSort = (sortBy, order) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `📊 Sorted`,
      `Sorted by ${sortBy} (${order})`,
      'info'
    );
  };

  // Track view change (table/list view)
  const trackViewChange = (view) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `👁️ View Changed`,
      `Switched to ${view} view`,
      'info'
    );
  };

  // Track bulk action
  const trackBulkAction = (action, count) => {
    if (!user || !addNotification) return;
    addNotification(
      user.id,
      `📋 Bulk Action`,
      `${action} ${count} items`,
      'info'
    );
  };

  return (
    <div className="notification-container">
      <button 
        className="notification-btn" 
        onClick={onToggle}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>Notifications ({unreadCount} unread)</span>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          
          <div className="notification-dropdown-body">
            {notifications.length === 0 && (
              <div className="notification-empty">No notifications</div>
            )}
            
            {notifications.slice(0, 15).map(n => (
              <div 
                key={n.id} 
                className={`notification-item ${n.type} ${!n.read ? 'unread' : ''}`}
                onClick={() => onMarkRead(n.id)}
              >
                <div className="notification-message">{n.title}</div>
                <div className="notification-detail">{n.message}</div>
                <div className="notification-time">
                  {new Date(n.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;