import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  Clock,
  Smartphone,
  Server,
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import db from '../../db/index.ts';
import { api } from '../../services/api.ts';
import { ActivityLogItem } from '../../types/index.ts';

export const ActivityLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      if (user?.role === 'FIELD_OFFICER') {
        // Field Officer: Load from local IndexedDB for complete offline transparency
        const localLogs = await db.activityLogs
          .where('officerId')
          .equals(user.id)
          .reverse()
          .sortBy('deviceTimestamp');
        setLogs(localLogs);
      } else {
        // Supervisor or Manager: Load synchronized logs from server
        const params: any = {};
        if (filterType !== 'ALL') params.eventType = filterType;
        if (dateFilter) params.startDate = `${dateFilter}T00:00:00.000Z`;

        const res = await api.get('/activity-logs', { params });
        setLogs(res.data?.data || []);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.id, filterType, dateFilter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.eventType.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || log.eventType === filterType;
    const matchesDate = !dateFilter || log.deviceTimestamp.startsWith(dateFilter);
    return matchesSearch && matchesType && matchesDate;
  });

  const getEventBadge = (type: string) => {
    if (type.includes('COMPLETED') || type.includes('SUCCEEDED')) {
      return <Badge variant="success">{type}</Badge>;
    }
    if (type.includes('STARTED') || type.includes('RESUMED')) {
      return <Badge variant="info">{type}</Badge>;
    }
    if (type.includes('PAUSED') || type.includes('DRAFTED')) {
      return <Badge variant="warning">{type}</Badge>;
    }
    if (type.includes('FAILED')) {
      return <Badge variant="danger">{type}</Badge>;
    }
    return <Badge variant="default">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-emerald-600" />
              <span>Field Activity Logs Timeline</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Automated chronological audit trail of fieldwork events, registration actions, and synchronization history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh Logs
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search descriptions or events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="CITIZEN_REGISTRATION_SAVED_OFFLINE">Registration Saved Offline</option>
              <option value="CITIZEN_REGISTRATION_COMPLETED">Registration Completed</option>
              <option value="DAILY_REPORT_SUBMITTED">Daily Report Submitted</option>
              <option value="ASSIGNMENT_STARTED">Assignment Started</option>
              <option value="ASSIGNMENT_PAUSED">Assignment Paused</option>
              <option value="ASSIGNMENT_COMPLETED">Assignment Completed</option>
              <option value="SYNC_COMPLETED">Sync Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Loading activity logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No activity logs found matching the selected filters.
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-4 space-y-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-600 shadow-sm" />

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getEventBadge(log.eventType)}
                        <span className="text-xs font-semibold text-slate-800">
                          {log.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.deviceTimestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3 text-slate-400" />
                          <span>Device UUID: <code className="font-mono text-slate-600">{log.id.slice(0, 8)}...</code></span>
                        </span>
                        {log.serverReceivedAt && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <Server className="h-3 w-3" />
                            <span>Server Verified: {new Date(log.serverReceivedAt).toLocaleTimeString()}</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <Badge variant={log.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                          {log.syncStatus === 'SYNCED' ? 'Server Confirmed' : 'Pending Upload'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ActivityLogsPage;
