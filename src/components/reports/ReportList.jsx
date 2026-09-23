// src/components/reports/ReportList.jsx – Enterprise Report History

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Search, Filter, Calendar, MapPin,
  CheckCircle2, Clock, XCircle, User, ChevronRight,
  TrendingUp, AlertTriangle, Layers
} from 'lucide-react';
import { syncQueue, checkRealInternet } from '../../services/database';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';

export default function ReportList({
  reports = [],
  user,
  isOfficer,
  isSupervisor,
  addNotification
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      const count = syncQueue.count();
      setPendingCount(count);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };
    window.addEventListener('sync-queue-updated', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports
      .filter(r => {
        if (isOfficer && user) {
          return r.employeeId === user.employeeId;
        }
        return true;
      })
      .filter(r => {
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return r.siteName?.toLowerCase().includes(q) ||
                 r.employeeName?.toLowerCase().includes(q);
        }
        return true;
      })
      .filter(r => {
        if (selectedRegion !== 'All') {
          return r.region === selectedRegion;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.submittedAt || a.createdAt || a.reportDate;
        const dateB = b.submittedAt || b.createdAt || b.reportDate;
        return new Date(dateB) - new Date(dateA);
      });
  }, [reports, isOfficer, user, searchTerm, selectedRegion]);

  const regions = ['All', 'North', 'South', 'East', 'West', 'Central'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1E3A8A]" />
            Daily Work Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isOfficer ? 'History of your submitted daily logs and field deliverables' : 'Review submitted daily logs from assigned field teams'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="warning">
              {pendingCount} offline reports queued
            </Badge>
          )}
          <Badge variant="primary">
            {filteredReports.length} Total Reports
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reports by site name or officer..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:border-[#1E3A8A] transition-all"
              />
            </div>

            <Select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="h-10 text-xs"
            >
              {regions.map(r => (
                <option key={r} value={r}>Region: {r}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No reports found matching your filter criteria</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Report ID & Date</th>
                    <th className="py-3.5 px-4">Site Name</th>
                    <th className="py-3.5 px-4">Officer</th>
                    <th className="py-3.5 px-4 text-right">Registrations</th>
                    <th className="py-3.5 px-4">Shift Hours</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6">
                        <p className="font-semibold text-slate-900">{report.reportDate}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{report.reportId || report.id.slice(0, 8)}</p>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {report.siteName}
                        <span className="text-[11px] text-slate-400 block font-normal">{report.region}</span>
                      </td>

                      <td className="py-4 px-4 text-slate-700">
                        <p className="font-medium">{report.employeeName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{report.employeeId}</p>
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                        {report.registrations || 0}
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-600">
                        {report.workHours || 0} hrs
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          variant={report.reviewed ? 'success' : report.status === 'rejected' ? 'error' : 'warning'}
                          dot
                        >
                          {report.reviewed ? 'REVIEWED' : report.status === 'rejected' ? 'REJECTED' : 'PENDING'}
                        </Badge>
                      </td>

                      <td className="py-4 pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                          className="h-8 text-xs text-[#1E3A8A]"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Report Details — ${selectedReport.siteName}` : 'Report Detail'}
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Report Date</span>
                <span className="font-semibold text-slate-900">{selectedReport.reportDate}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Officer</span>
                <span className="font-semibold text-slate-900">{selectedReport.employeeName}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Registrations</span>
                <span className="font-bold text-slate-900 font-mono">{selectedReport.registrations}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Work Hours</span>
                <span className="font-bold text-slate-900 font-mono">{selectedReport.workHours} hrs</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Activities Performed</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedReport.activities || 'None specified'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Materials Used</span>
                <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedReport.materialsUsed || 'None'}</p>
              </div>

              {selectedReport.challenges && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Challenges & Constraints</span>
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedReport.challenges}</p>
                </div>
              )}

              {selectedReport.communityFeedback && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Community Feedback</span>
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed">{selectedReport.communityFeedback}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}