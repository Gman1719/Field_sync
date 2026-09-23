import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  FileText, 
  Eye 
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import Modal from '../../components/ui/Modal.tsx';
import AuditService, { AuditLogItem } from '../../services/auditService.ts';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await AuditService.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_LOGOUT':
        return <Badge variant="info" size="sm">{action}</Badge>;
      case 'USER_CREATED':
      case 'CITIZEN_REGISTERED':
        return <Badge variant="success" size="sm">{action}</Badge>;
      case 'DUPLICATE_RESOLVED':
        return <Badge variant="purple" size="sm">{action}</Badge>;
      case 'USER_DEACTIVATED':
        return <Badge variant="danger" size="sm">{action}</Badge>;
      case 'PASSWORD_CHANGED':
        return <Badge variant="warning" size="sm">{action}</Badge>;
      default:
        return <Badge variant="default" size="sm">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Audit Trail
            </h1>
            <Badge variant="purple" size="sm">
              Tamper-Evident Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological audit records of all user logins, citizen registrations, and status mutations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="CITIZEN_REGISTERED">CITIZEN_REGISTERED</option>
            <option value="DUPLICATE_RESOLVED">DUPLICATE_RESOLVED</option>
            <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card noPadding className="border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Personnel</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No audit logs found</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {log.actor?.fullName || 'System Automated'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {log.actor?.email ? `${log.actor.email} (${log.actor.role})` : 'Internal Process'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">{getActionBadge(log.action)}</td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-800">{log.entityType}</span>
                      <span className="text-[11px] text-slate-400 font-mono ml-2">
                        {log.entityId.substring(0, 8)}...
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {log.metadata ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View Payload
                        </Button>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Event Payload"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">{selectedLog.action}</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              {getActionBadge(selectedLog.action)}
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">JSON Metadata:</span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogsPage;
