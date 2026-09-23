// src/components/audit/AuditLog.jsx – Enterprise System Audit Trail & Compliance

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Search, Download, Trash2, RefreshCw,
  Clock, User, Activity, AlertTriangle, Filter,
  FileSpreadsheet, FileCode
} from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../../services/database';
import { exportCSV, exportJSON } from '../../utils/helpers';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import StatCard from '../ui/StatCard';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function AuditLog({ auditLog, setAuditLog }) {
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [localLogs, setLocalLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  // Logs source
  const logs = auditLog && auditLog.length > 0 ? auditLog : localLogs;

  // Fallback to IndexedDB on mount
  useEffect(() => {
    const fetchLogs = async () => {
      if (!auditLog || auditLog.length === 0) {
        try {
          const data = await db.audit.toArray();
          setLocalLogs(data);
          if (setAuditLog && typeof setAuditLog === 'function') {
            setAuditLog(data);
          }
        } catch (err) {
          console.error('Error reading audit logs:', err);
        }
      }
    };
    fetchLogs();
  }, [auditLog, setAuditLog]);

  // Refresh from server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/audit`);
      if (response.ok) {
        const serverLogs = await response.json();
        for (const log of serverLogs) {
          const existing = await db.audit.get(log.id);
          if (!existing) {
            await db.audit.add({
              id: log.id,
              userId: log.user_id,
              userName: log.user_name,
              action: log.action,
              details: log.details,
              timestamp: log.timestamp,
              ip: log.ip
            });
          }
        }
        const updated = await db.audit.toArray();
        setLocalLogs(updated);
        if (setAuditLog && typeof setAuditLog === 'function') {
          setAuditLog(updated);
        }
        toast.success(`Synchronized ${serverLogs.length} audit records from server`);
      } else {
        toast.error('Failed to retrieve audit trail from server');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Error connecting to audit service');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clear audit log
  const handleConfirmClear = async () => {
    setIsClearing(true);
    setShowClearConfirm(false);
    try {
      await db.audit.clear();
      setLocalLogs([]);
      if (setAuditLog && typeof setAuditLog === 'function') {
        setAuditLog([]);
      }
      toast.success('Local audit log records purged');
    } catch (error) {
      console.error('Error clearing audit log:', error);
      toast.error('Failed to clear audit log: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Exports
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    const exportData = filteredLogs.map(log => ({
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'User': log.userName || 'System',
      'Action': log.action,
      'Details': typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '',
      'IP Address': log.ip || 'N/A'
    }));
    exportCSV(exportData, 'audit_trail');
    toast.success(`Exported ${exportData.length} audit records to CSV`);
  };

  const handleExportJSON = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    exportJSON(filteredLogs, 'audit_trail');
    toast.success(`Exported ${filteredLogs.length} audit records to JSON`);
  };

  // Distinct actions
  const uniqueActions = useMemo(() => {
    const set = new Set((logs || []).map(l => l.action).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let list = (logs || []).slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (selectedAction !== 'ALL') {
      list = list.filter(l => l.action === selectedAction);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.userName?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        (typeof l.details === 'string' && l.details.toLowerCase().includes(q)) ||
        (typeof l.details === 'object' && JSON.stringify(l.details).toLowerCase().includes(q))
      );
    }

    return list;
  }, [logs, selectedAction, searchTerm]);

  // Action badge color helper
  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'LOGIN': return 'success';
      case 'LOGOUT': return 'neutral';
      case 'CREATE_USER': return 'primary';
      case 'DELETE_USER': return 'error';
      case 'SUBMIT_REPORT': return 'info';
      case 'REGISTER_CITIZEN': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1E3A8A]" />
            System Audit Trail & Compliance Log
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable tracking of user authentication, citizen registrations, and database mutations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin text-[#1E3A8A]' : 'text-slate-600'}`} />
            {isRefreshing ? 'Syncing...' : 'Sync Server Trail'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearing || !logs || logs.length === 0}
            className="text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Purge Local Logs
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Recorded Events"
          value={logs?.length || 0}
          subtitle="Lifetime operations"
          icon={Activity}
          variant="primary"
        />
        <StatCard
          title="Filtered Events"
          value={filteredLogs.length}
          subtitle="Matching criteria"
          icon={Filter}
          variant="default"
        />
        <StatCard
          title="Unique Actions"
          value={Math.max(0, uniqueActions.length - 1)}
          subtitle="Operation categories"
          icon={ShieldCheck}
          variant="info"
        />
        <StatCard
          title="Latest Timestamp"
          value={filteredLogs.length > 0 ? new Date(filteredLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
          subtitle={filteredLogs.length > 0 ? new Date(filteredLogs[0].timestamp).toLocaleDateString() : 'No entries'}
          icon={Clock}
          variant="neutral"
        />
      </div>

      {/* Table Card */}
      <Card>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              Audit Event Log ({filteredLogs.length})
            </h3>
            <p className="text-xs text-slate-500">
              Filter by user identity, system action, or search payload details
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!logs || logs.length === 0}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={!logs || logs.length === 0}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600" /> Export JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              placeholder="Search user, action, payload details..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm"
            />
          </div>

          <div>
            <Select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="w-full text-xs sm:text-sm"
            >
              {uniqueActions.map(act => (
                <option key={act} value={act}>
                  {act === 'ALL' ? 'All System Action Types' : `Action: ${act}`}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">User Identity</th>
                  <th className="py-3 px-4 font-semibold">Action Performed</th>
                  <th className="py-3 px-4 font-semibold">Activity Details / Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400">
                      <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No audit events match filters</p>
                      <p className="text-xs text-slate-400 mt-1">Click "Sync Server Trail" to retrieve server logs</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const detailString = typeof log.details === 'object'
                      ? JSON.stringify(log.details)
                      : String(log.details || '');

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString()}
                          <div className="text-[10px] text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {log.userName || 'System Service'}
                          </div>
                          {log.userId && (
                            <div className="text-[10px] text-slate-400 font-mono font-normal pl-5">
                              ID: {log.userId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-md truncate">
                          {detailString || <span className="text-slate-400 italic">No additional payload</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing {filteredLogs.length} of {logs?.length || 0} audit log records
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Oldest: {logs && logs.length > 0 ? new Date(logs[logs.length - 1]?.timestamp).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Clear Confirmation Modal */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleConfirmClear}
        title="Purge Local Audit Log Records?"
        description="Are you sure you want to permanently clear all local audit records from this browser? This action cannot be undone."
        confirmText="Yes, Purge Records"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}