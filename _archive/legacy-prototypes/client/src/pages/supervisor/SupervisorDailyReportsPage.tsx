import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Calendar,
  Search,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import DailyReportService from '../../services/dailyReportService.ts';
import { DailyWorkReportItem } from '../../types/index.ts';

export const SupervisorDailyReportsPage: React.FC = () => {
  const [reports, setReports] = useState<DailyWorkReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<DailyWorkReportItem | null>(null);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (dateFilter) params.reportDate = dateFilter;
      const data = await DailyReportService.fetchServerReports(params);
      setReports(data);
    } catch (err) {
      console.error('Failed to load daily reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFilter]);

  const filteredReports = reports.filter((r: DailyWorkReportItem) => {
    const officerName = r.officer?.fullName || '';
    const matchesSearch =
      officerName.toLowerCase().includes(search.toLowerCase()) ||
      r.reportDate.includes(search);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-emerald-600" />
              <span>Field Officer Daily Reports Review</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review synchronized daily performance summaries, screen-time metrics, and citizen registrations submitted by your field officers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh Reports
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by officer name or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
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

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Loading daily reports...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No daily reports found matching your criteria.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-6 py-3.5">Officer & Station</th>
                  <th className="px-6 py-3.5">Report Date</th>
                  <th className="px-6 py-3.5">Citizens Registered</th>
                  <th className="px-6 py-3.5">Screen Time</th>
                  <th className="px-6 py-3.5">Sessions</th>
                  <th className="px-6 py-3.5">Server Sync Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredReports.map((report: DailyWorkReportItem) => (
                  <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {report.officer?.fullName || 'Field Officer'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {report.officer?.woreda?.name || 'Woreda'} • {report.officer?.kebele?.name || 'Kebele'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700 font-medium">
                      {report.reportDate}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        {report.citizenCountLocal} local
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        ({report.citizenCountServerConfirmed} server confirmed)
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {DailyReportService.formatScreenTime(report.screenTimeSeconds)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {report.sessionCount} sessions
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="success">Verified On Server</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                        leftIcon={<Eye className="h-3 w-3" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daily Work Report Details
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted for date {selectedReport.reportDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500">Field Officer:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedReport.officer?.fullName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {selectedReport.officer?.email}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <span className="text-slate-500">Jurisdiction:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedReport.officer?.woreda?.name} • {selectedReport.officer?.kebele?.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  Region: {selectedReport.officer?.region?.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg border border-slate-200 p-3">
                <span className="text-slate-500 block">Citizens Today</span>
                <strong className="text-base font-bold text-slate-900">
                  {selectedReport.citizenCountLocal}
                </strong>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <span className="text-slate-500 block">Screen Time</span>
                <strong className="text-base font-bold text-slate-900">
                  {DailyReportService.formatScreenTime(selectedReport.screenTimeSeconds)}
                </strong>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <span className="text-slate-500 block">Sessions</span>
                <strong className="text-base font-bold text-slate-900">
                  {selectedReport.sessionCount}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700">Officer Comments & Field Observations</span>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 italic leading-relaxed">
                {selectedReport.comments || 'No officer comments provided.'}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Submitted: {new Date(selectedReport.submittedAt).toLocaleString()}</span>
              {selectedReport.serverReceivedAt && (
                <span className="text-emerald-600 font-medium">
                  Received by Server: {new Date(selectedReport.serverReceivedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDailyReportsPage;
