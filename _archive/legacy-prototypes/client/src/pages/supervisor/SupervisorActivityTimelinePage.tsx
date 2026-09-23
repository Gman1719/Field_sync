import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  User,
  Clock,
  Smartphone,
  Server,
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import { api } from '../../services/api.ts';
import UserService from '../../services/userService.ts';
import { User as UserType } from '../../types/index.ts';

export const SupervisorActivityTimelinePage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [officers, setOfficers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchOfficers = async () => {
    try {
      const users = await UserService.getUsers({ role: 'FIELD_OFFICER' });
      setOfficers(users);
    } catch (err) {
      console.error('Failed to load officers:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedOfficer) params.officerId = selectedOfficer;
      if (filterType !== 'ALL') params.eventType = filterType;
      if (dateFilter) params.startDate = `${dateFilter}T00:00:00.000Z`;

      const res = await api.get('/activity-logs', { params });
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load synchronized activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedOfficer, filterType, dateFilter]);

  const filteredLogs = logs.filter((l) => {
    const officerName = l.officer?.fullName || '';
    const matchesSearch =
      officerName.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-emerald-600" />
              <span>Officer Activity Timeline & Audit Feed</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time audit log stream of synchronized fieldwork events, offline saves, and reporting actions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh Feed
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Field Officers</option>
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="CITIZEN_REGISTRATION_SAVED_OFFLINE">Registration Saved Offline</option>
              <option value="DAILY_REPORT_SUBMITTED">Daily Report Submitted</option>
              <option value="ASSIGNMENT_STARTED">Assignment Started</option>
              <option value="ASSIGNMENT_COMPLETED">Assignment Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Feed List */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Loading synchronized audit feed...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No synchronized events recorded for the selected criteria.
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-4 space-y-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-600 shadow-sm" />

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          {log.officer?.fullName || 'Field Officer'}
                        </strong>
                        <Badge variant="default">{log.eventType}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(log.deviceTimestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {log.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono text-slate-500">
                          <Smartphone className="h-3 w-3" />
                          <span>UUID: {log.id.slice(0, 8)}...</span>
                        </span>
                        {log.serverReceivedAt && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <Server className="h-3 w-3" />
                            <span>Server Ingested: {new Date(log.serverReceivedAt).toLocaleTimeString()}</span>
                          </span>
                        )}
                      </div>

                      <Badge variant="success">Synchronized</Badge>
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

export default SupervisorActivityTimelinePage;
