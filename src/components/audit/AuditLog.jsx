// src/components/audit/AuditLog.jsx – Enterprise System Audit Trail & Compliance
// Persistent, immutable audit records for Manager (National) and Supervisor (Zone-Scoped)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Search, Download, RefreshCw, Clock, User,
  Activity, AlertTriangle, Filter, FileSpreadsheet, FileCode,
  Eye, Calendar, ChevronLeft, ChevronRight, X, ArrowRight,
  Database, UserCog, FileText, CheckCircle2, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

import { API_BASE } from '../../config/api';
import { exportCSV, exportJSON } from '../../utils/helpers';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

export default function AuditLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [availableActions, setAvailableActions] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'SUPERVISOR';
  const isManager = user?.role === 'manager' || user?.role === 'MANAGER';

  // 1. Fetch Distinct Actions for Dropdown
  useEffect(() => {
    const fetchActions = async () => {
      try {
        const token = localStorage.getItem('fieldsync_token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/audit-logs/actions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setAvailableActions(json.data);
          }
        }
      } catch (e) {
        console.warn('Failed to load audit actions:', e.message);
      }
    };
    fetchActions();
  }, []);

  // 2. Fetch Audit Logs from Backend
  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const token = localStorage.getItem('fieldsync_token');
      if (!token) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedAction !== 'ALL') params.append('action', selectedAction);
      if (selectedEntity !== 'ALL') params.append('entityType', selectedEntity);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setLogs(json.data || []);
          setPagination(json.pagination || { total: json.data?.length || 0, page, limit: 15, totalPages: 1 });
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
      toast.error('Network error loading audit logs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, searchTerm, selectedRole, selectedAction, selectedEntity, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedRole('ALL');
    setSelectedAction('ALL');
    setSelectedEntity('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // 3. Export Handlers
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    const exportData = logs.map(l => ({
      'Log ID': l.id,
      'Timestamp': new Date(l.createdAt).toLocaleString(),
      'Actor Name': l.actorName || 'System',
      'Actor Role': l.actorRole || 'SYSTEM',
      'Actor Email': l.actorEmail || 'N/A',
      'Action': l.action,
      'Entity Type': l.entityType,
      'Entity ID': l.entityId,
      'Zone': l.zoneName || 'N/A',
      'Summary': l.summary || '',
      'IP Address': l.ipAddress || 'N/A',
    }));
    exportCSV(exportData, `fieldsync_audit_logs_${new Date().toISOString().split('T')[0]}`);
    toast.success('Audit trail exported as CSV');
  };

  const handleExportJSON = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    exportJSON(logs, `fieldsync_audit_logs_${new Date().toISOString().split('T')[0]}`);
    toast.success('Audit trail exported as JSON');
  };

  // Color helper for actions
  const getActionBadgeColor = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('PROVISION') || act.includes('APPROVE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('DELETE') || act.includes('DEACTIVATE') || act.includes('REJECT')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('UPDATE') || act.includes('ASSIGN') || act.includes('RESET')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('RESOLV') || act.includes('REVIEW')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getEntityIcon = (entity = '') => {
    const e = entity.toLowerCase();
    if (e.includes('user')) return <User className="w-4 h-4 text-blue-600" />;
    if (e.includes('citizen')) return <Database className="w-4 h-4 text-emerald-600" />;
    if (e.includes('report')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (e.includes('duplicate')) return <ShieldCheck className="w-4 h-4 text-purple-600" />;
    return <Activity className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200/90 dark:border-slate-700 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-[#1E3A8A] dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                {isSupervisor ? 'Zone Audit Trail & Compliance' : 'System-Wide Audit Trail & Security Logs'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSupervisor
                  ? `Immutable activity log for operations within your assigned Zone (${user?.zoneName || 'Assigned Zone'})`
                  : 'Immutable, tamper-proof activity records for organization-wide administrative and operational actions'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#0F172A]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1E3A8A] dark:text-blue-400' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-[#0F172A]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-[#0F172A]"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>JSON</span>
          </Button>
        </div>
      </div>

      {/* Scope Pill Banner for Supervisor */}
      {isSupervisor && (
        <div className="p-3.5 bg-blue-50/70 dark:bg-[#0F172A] border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
            <span>Zone Access Boundary: Showing events strictly associated with your supervisory jurisdiction.</span>
          </div>
          <span className="font-semibold px-2 py-0.5 bg-white dark:bg-[#1E293B] border border-blue-200 dark:border-blue-900 rounded-md text-[#1E3A8A] dark:text-blue-400">
            Zone ID: {user?.zoneId || 'Assigned'}
          </span>
        </div>
      )}

      {/* Filter Console */}
      <Card className="border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search user, action, summary..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:bg-white dark:focus:bg-[#0F172A]"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={selectedRole}
                onChange={(e) => { setSelectedRole(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:bg-white dark:focus:bg-[#0F172A]"
              >
                <option value="ALL">All Roles</option>
                {isManager && <option value="MANAGER">Manager</option>}
                <option value="SUPERVISOR">Supervisor</option>
                <option value="FIELD_OFFICER">Field Officer</option>
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:bg-white dark:focus:bg-[#0F172A]"
              >
                <option value="ALL">All Action Types</option>
                {availableActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <select
                value={selectedEntity}
                onChange={(e) => { setSelectedEntity(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A] focus:bg-white dark:focus:bg-[#0F172A]"
              >
                <option value="ALL">All Entities</option>
                <option value="User">User Account</option>
                <option value="Citizen">Citizen Record</option>
                <option value="DailyWorkReport">Daily Work Report</option>
                <option value="DuplicateReview">Duplicate Review</option>
                <option value="Assignment">Task Assignment</option>
              </select>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
                title="From Date"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-1/2 px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#1E3A8A]"
                title="To Date"
              />
            </div>
          </div>

          {(searchTerm || selectedRole !== 'ALL' || selectedAction !== 'ALL' || selectedEntity !== 'ALL' || startDate || endDate) && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#334155] text-xs text-slate-500 dark:text-slate-400">
              <span>Active filters applied</span>
              <button
                onClick={handleResetFilters}
                className="text-[#2563EB] dark:text-[#60A5FA] font-semibold hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Audit Records Table */}
      <Card className="border border-slate-200/90 dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-[#0F172A] border-b border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#334155] text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2563EB] dark:text-[#60A5FA]" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No audit records found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div>{new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-white">{log.actorName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {log.actorRole?.replace('_', ' ')}
                        </span>
                        {log.zoneName && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">· {log.zoneName}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(log.entityType)}
                        <span className="font-medium text-slate-800 dark:text-slate-200">{log.entityType}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[120px] block mt-0.5">
                        #{log.entityId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{log.summary}</p>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setSelectedEvent(log); setIsModalOpen(true); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#2563EB] dark:hover:text-[#60A5FA] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title="View Full Action Audit Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/60 dark:bg-[#182234] border-t border-slate-100 dark:border-[#334155] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing <span className="font-medium text-slate-800 dark:text-slate-200">{(page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{pagination.total}</span> records
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 text-xs font-medium text-slate-700 dark:text-slate-300">Page {page} of {pagination.totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-2 py-1 text-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Details Modal */}
      {isModalOpen && selectedEvent && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
          title="Audit Event Details"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Action Banner */}
            <div className="p-4 bg-slate-50 dark:bg-[#0F172A] rounded-xl border border-slate-200/80 dark:border-[#334155] space-y-2">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-xs border ${getActionBadgeColor(selectedEvent.action)}`}>
                  {selectedEvent.action}
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {new Date(selectedEvent.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                {selectedEvent.summary}
              </p>
            </div>

            {/* Event Context Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Acting User</span>
                <span className="font-semibold text-slate-800 dark:text-white">{selectedEvent.actorName}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{selectedEvent.actorRole}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Affected Record</span>
                <span className="font-semibold text-slate-800 dark:text-white">{selectedEvent.entityType}</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">#{selectedEvent.entityId}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">IP Address</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedEvent.ipAddress || 'Internal Loopback'}</span>
              </div>
            </div>

            {/* Previous vs New Values (State Change Diff) */}
            {(selectedEvent.previousValues || selectedEvent.newValues) && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  State Change Comparison
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedEvent.previousValues && (
                    <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                        <span>Previous State</span>
                      </span>
                      <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap p-2 bg-white/80 dark:bg-[#0F172A] rounded border border-rose-100 dark:border-rose-900/40">
                        {JSON.stringify(selectedEvent.previousValues, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedEvent.newValues && (
                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <span>Applied State (New)</span>
                      </span>
                      <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap p-2 bg-white/80 dark:bg-[#0F172A] rounded border border-emerald-100 dark:border-emerald-900/40">
                        {JSON.stringify(selectedEvent.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Metadata */}
            {selectedEvent.metadata && (
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Event Metadata & Telemetry
                </span>
                <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0F172A] p-3 rounded-xl border border-slate-200 dark:border-[#334155] overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}