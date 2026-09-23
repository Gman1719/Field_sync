import React, { useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Check 
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';

interface LocalNotification {
  id: string;
  title: string;
  message: string;
  type: 'sync' | 'duplicate' | 'system' | 'auth';
  isRead: boolean;
  createdAt: string;
}

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<LocalNotification[]>([
    {
      id: 'n1',
      title: 'Offline Database Ready',
      message: 'IndexedDB storage initialized. All registrations are locally preserved before sync.',
      type: 'system',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'n2',
      title: 'Geographic Hierarchy Active',
      message: 'Authentic 4-Tier Ethiopian administrative dataset (Region -> Zone -> Woreda -> Kebele) loaded.',
      type: 'system',
      isRead: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'n3',
      title: 'Background Sync Engine',
      message: 'Sync worker actively monitoring device queue for automatic server ingestion.',
      type: 'sync',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.isRead : true));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: LocalNotification['type']) => {
    switch (type) {
      case 'sync':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'duplicate':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <Badge variant="warning" size="sm">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System announcements, sync events, and administrative alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No notifications to display</p>
          </Card>
        ) : (
          filtered.map((item) => (
            <Card
              key={item.id}
              className={`p-4 transition-all hover:border-slate-300 cursor-pointer ${
                !item.isRead ? 'bg-emerald-50/30 border-emerald-200' : ''
              }`}
              onClick={() => handleToggleRead(item.id)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{item.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
