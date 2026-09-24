// src/services/notificationApi.js
// Client API Service for Role-Based In-App Notifications with Offline Fallback

import { API_BASE } from '../config/api';
import offlineDb from '../db/offlineDb';

function getAuthHeaders() {
  const token = localStorage.getItem('fieldsync_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch paginated & filtered notifications from PostgreSQL server with offline fallback
 */
export async function fetchNotifications({
  page = 1,
  limit = 20,
  status = 'all',
  priority = '',
  category = '',
  search = '',
} = {}) {
  try {
    const query = new URLSearchParams();
    if (page) query.append('page', String(page));
    if (limit) query.append('limit', String(limit));
    if (status && status !== 'all') query.append('status', status);
    if (priority && priority !== 'ALL') query.append('priority', priority);
    if (category && category !== 'ALL') query.append('category', category);
    if (search && search.trim()) query.append('search', search.trim());

    const res = await fetch(`${API_BASE}/notifications?${query.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        // Cache in offlineDb in background
        try {
          await offlineDb.notifications.bulkPut(json.data);
        } catch (_err) {
          // Ignore offline DB caching error
        }
        return {
          success: true,
          notifications: json.data,
          pagination: json.pagination || { total: json.data.length, page, limit, totalPages: 1 },
        };
      }
    }
  } catch (netErr) {
    console.warn('Network offline or error fetching notifications, reading local store:', netErr.message);
  }

  // Offline fallback: query Dexie
  try {
    let items = await offlineDb.notifications.toArray();
    if (status === 'unread') items = items.filter(n => !n.isRead);
    if (status === 'read') items = items.filter(n => n.isRead);
    if (priority && priority !== 'ALL') items = items.filter(n => n.priority === priority);
    if (category && category !== 'ALL') items = items.filter(n => n.type === category);
    if (search && search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return {
      success: true,
      notifications: paginated,
      pagination: {
        total: items.length,
        page,
        limit,
        totalPages: Math.ceil(items.length / limit) || 1,
      },
    };
  } catch {
    return {
      success: true,
      notifications: [],
      pagination: { total: 0, page: 1, limit, totalPages: 1 },
    };
  }
}

/**
 * Fetch live unread count
 */
export async function fetchUnreadCount() {
  try {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      return json.unreadCount || 0;
    }
  } catch (err) {
    console.warn('Failed to fetch unread count online:', err.message);
  }

  try {
    return await offlineDb.notifications.where('isRead').equals(0).count();
  } catch (_err) {
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id) {
  try {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      try {
        await offlineDb.notifications.update(id, { isRead: true, readAt: new Date().toISOString() });
      } catch (_e) {
        // Ignore offline DB caching error
      }
      return json.data;
    }
  } catch (_err) {
    // Network error, fall back to offline DB
  }

  try {
    await offlineDb.notifications.update(id, { isRead: true, readAt: new Date().toISOString() });
  } catch (_e) {
    // Ignore offline DB caching error
  }
  return null;
}

/**
 * Mark notification as unread
 */
export async function markNotificationUnread(id) {
  try {
    const res = await fetch(`${API_BASE}/notifications/${id}/unread`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      try {
        await offlineDb.notifications.update(id, { isRead: false, readAt: null });
      } catch (_e) {
        // Ignore offline DB caching error
      }
      return json.data;
    }
  } catch (_err) {
    // Network error, fall back to offline DB
  }

  try {
    await offlineDb.notifications.update(id, { isRead: false, readAt: null });
  } catch (_e) {
    // Ignore offline DB caching error
  }
  return null;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  try {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const json = await res.json();
      try {
        const all = await offlineDb.notifications.toArray();
        for (const item of all) {
          if (!item.isRead) {
            await offlineDb.notifications.update(item.id, { isRead: true, readAt: new Date().toISOString() });
          }
        }
      } catch (_e) {
        // Ignore offline DB caching error
      }
      return json.markedCount ?? json.data?.count ?? 0;
    }
  } catch (_err) {
    // Network error, fall back to offline DB
  }

  try {
    const all = await offlineDb.notifications.toArray();
    for (const item of all) {
      if (!item.isRead) {
        await offlineDb.notifications.update(item.id, { isRead: true, readAt: new Date().toISOString() });
      }
    }
  } catch (_e) {
    // Ignore offline DB caching error
  }
  return 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(id) {
  try {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      try {
        await offlineDb.notifications.delete(id);
      } catch (_e) {
        // Ignore offline DB caching error
      }
      return true;
    }
  } catch (_err) {
    // Network error, fall back to offline DB
  }

  try {
    await offlineDb.notifications.delete(id);
    return true;
  } catch (_e) {
    return false;
  }
}
