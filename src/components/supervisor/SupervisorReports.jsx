// src/components/supervisor/SupervisorReports.jsx – Enterprise Supervisor Evaluation & Reporting

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileSpreadsheet, UserCheck, RefreshCw, Star, Award,
  CheckCircle2, AlertCircle, Plus, Calendar, User, FileText
} from 'lucide-react';
import { getToday, uid } from '../../utils/helpers';
import { db, syncQueue, checkRealInternet, pullSupervisorReportsFromServer } from '../../services/database';
import { API_URL } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';

export default function SupervisorReports({
  supervisorReports = [],
  users = [],
  user,
  teamMembers = [],
  setSupervisorReports
}) {
  const [showOfficerReport, setShowOfficerReport] = useState(false);
  const [showSelfReport, setShowSelfReport] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [localReports, setLocalReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [form, setForm] = useState({
    officerId: '',
    reportDate: getToday(),
    performance: 'good',
    attendance: 'good',
    quality: 'good',
    punctuality: 'good',
    teamwork: 'good',
    communication: 'good',
    comments: '',
    recommendations: '',
    overallRating: 3
  });

  const [selfForm, setSelfForm] = useState({
    reportDate: getToday(),
    region: user?.region || '',
    siteVisits: 0,
    issuesResolved: 0,
    challenges: '',
    achievements: '',
    teamMorale: 'good',
    resourceStatus: 'adequate',
    recommendations: '',
    overallStatus: 'good'
  });

  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
      setPendingCount(syncQueue.count());
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 5000);

    const handleQueueUpdate = () => {
      setPendingCount(syncQueue.count());
    };

    window.addEventListener('sync-queue-updated', handleQueueUpdate);
    window.addEventListener('sync-complete', handleQueueUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-queue-updated', handleQueueUpdate);
      window.removeEventListener('sync-complete', handleQueueUpdate);
    };
  }, []);

  const loadReportsFromDB = useCallback(async () => {
    try {
      const all = await db.supervisor_reports.toArray();
      const filtered = all.filter(r => r.supervisorId === user?.id);
      setLocalReports(filtered);
      return filtered;
    } catch (error) {
      console.error('Error loading reports from DB:', error);
      return [];
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        await pullSupervisorReportsFromServer();
      }
      const loaded = await loadReportsFromDB();
      if (setSupervisorReports) {
        setSupervisorReports(loaded);
      }
      toast.success('Reports updated');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, loadReportsFromDB, setSupervisorReports]);

  useEffect(() => {
    loadReportsFromDB();
  }, [loadReportsFromDB]);

  const officerUsers = useMemo(() => {
    return users.filter(u => u.supervisorId === user?.id && u.role === 'field_officer');
  }, [users, user]);

  const handleOfficerReportSubmit = async (e) => {
    e.preventDefault();
    const officer = users.find(u => u.id === form.officerId);
    if (!officer) {
      toast.error('Please select an officer');
      return;
    }

    const online = await checkRealInternet();
    setIsOnline(online);

    try {
      const report = {
        id: uid(),
        supervisorId: user.id,
        supervisorName: user.name,
        officerId: officer.id,
        officerName: officer.name,
        officerRegion: officer.region,
        reportDate: form.reportDate,
        performance: form.performance,
        attendance: form.attendance,
        quality: form.quality,
        punctuality: form.punctuality,
        teamwork: form.teamwork,
        communication: form.communication,
        comments: form.comments?.trim() || '',
        recommendations: form.recommendations?.trim() || '',
        overallRating: Number(form.overallRating),
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        region: officer.region,
        type: 'officer_report',
        synced: false
      };

      await db.supervisor_reports.add(report);
      setLocalReports(prev => [report, ...prev]);
      if (setSupervisorReports) {
        setSupervisorReports(prev => [report, ...prev]);
      }

      if (online) {
        try {
          const response = await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'supervisor_report', data: report })
          });

          if (response.ok) {
            await db.supervisor_reports.update(report.id, { synced: true });
            setLocalReports(prev => prev.map(r => r.id === report.id ? { ...r, synced: true } : r));
            if (setSupervisorReports) {
              setSupervisorReports(prev => prev.map(r => r.id === report.id ? { ...r, synced: true } : r));
            }
            toast.success('Officer evaluation submitted and synced!');
          } else {
            throw new Error('Server error');
          }
        } catch (err) {
          syncQueue.add({ type: 'supervisor_report', id: report.id, data: report });
          setPendingCount(syncQueue.count());
          toast('Evaluation saved locally. Queued for sync.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'supervisor_report', id: report.id, data: report });
        setPendingCount(syncQueue.count());
        toast('Evaluation saved offline! Will sync when connected.', { icon: '💾' });
      }

      setShowOfficerReport(false);
      setForm({
        officerId: '',
        reportDate: getToday(),
        performance: 'good',
        attendance: 'good',
        quality: 'good',
        punctuality: 'good',
        teamwork: 'good',
        communication: 'good',
        comments: '',
        recommendations: '',
        overallRating: 3
      });
    } catch (error) {
      console.error('Error submitting officer report:', error);
      toast.error('Error submitting report: ' + error.message);
    }
  };

  const handleSelfReportSubmit = async (e) => {
    e.preventDefault();

    const online = await checkRealInternet();
    setIsOnline(online);

    try {
      const report = {
        id: uid(),
        supervisorId: user.id,
        supervisorName: user.name,
        reportDate: selfForm.reportDate,
        region: selfForm.region || user.region,
        siteVisits: Number(selfForm.siteVisits) || 0,
        issuesResolved: Number(selfForm.issuesResolved) || 0,
        challenges: selfForm.challenges?.trim() || '',
        achievements: selfForm.achievements?.trim() || '',
        teamMorale: selfForm.teamMorale,
        resourceStatus: selfForm.resourceStatus,
        recommendations: selfForm.recommendations?.trim() || '',
        overallStatus: selfForm.overallStatus,
        submittedAt: new Date().toISOString(),
        type: 'self_report',
        synced: false
      };

      await db.supervisor_reports.add(report);
      setLocalReports(prev => [report, ...prev]);
      if (setSupervisorReports) {
        setSupervisorReports(prev => [report, ...prev]);
      }

      if (online) {
        try {
          const response = await fetch(`${API_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'supervisor_report', data: report })
          });

          if (response.ok) {
            await db.supervisor_reports.update(report.id, { synced: true });
            setLocalReports(prev => prev.map(r => r.id === report.id ? { ...r, synced: true } : r));
            if (setSupervisorReports) {
              setSupervisorReports(prev => prev.map(r => r.id === report.id ? { ...r, synced: true } : r));
            }
            toast.success('Self report submitted and synced!');
          } else {
            throw new Error('Server error');
          }
        } catch (err) {
          syncQueue.add({ type: 'supervisor_report', id: report.id, data: report });
          setPendingCount(syncQueue.count());
          toast('Report saved locally. Queued for sync.', { icon: '💾' });
        }
      } else {
        syncQueue.add({ type: 'supervisor_report', id: report.id, data: report });
        setPendingCount(syncQueue.count());
        toast('Report saved offline! Will sync when connected.', { icon: '💾' });
      }

      setShowSelfReport(false);
      setSelfForm({
        reportDate: getToday(),
        region: user?.region || '',
        siteVisits: 0,
        issuesResolved: 0,
        challenges: '',
        achievements: '',
        teamMorale: 'good',
        resourceStatus: 'adequate',
        recommendations: '',
        overallStatus: 'good'
      });
    } catch (error) {
      console.error('Error submitting self report:', error);
      toast.error('Error submitting self report: ' + error.message);
    }
  };

  const filteredReportsList = useMemo(() => {
    if (activeTab === 'officer') return localReports.filter(r => r.type === 'officer_report');
    if (activeTab === 'self') return localReports.filter(r => r.type === 'self_report');
    return localReports;
  }, [localReports, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#1E3A8A]" />
            Supervisor Evaluations & Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit performance evaluations for field officers and operational self-assessments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSelfReport(true)}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Self Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowOfficerReport(true)}
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
            Evaluate Officer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'All Evaluations', count: localReports.length },
          { id: 'officer', label: 'Officer Assessments', count: localReports.filter(r => r.type === 'officer_report').length },
          { id: 'self', label: 'Supervisor Self-Reports', count: localReports.filter(r => r.type === 'self_report').length }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reports List Card */}
      <Card>
        <CardContent className="p-0">
          {filteredReportsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No supervisor reports recorded yet</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 pl-6">Report Type</th>
                    <th className="py-3.5 px-4">Subject / Region</th>
                    <th className="py-3.5 px-4">Report Date</th>
                    <th className="py-3.5 px-4">Rating / Status</th>
                    <th className="py-3.5 px-4">Summary</th>
                    <th className="py-3.5 pr-6 text-right">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportsList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 pl-6">
                        <Badge variant={item.type === 'officer_report' ? 'primary' : 'info'}>
                          {item.type === 'officer_report' ? 'Officer Assessment' : 'Supervisor Self-Report'}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {item.officerName || item.region || 'General'}
                      </td>

                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {item.reportDate}
                      </td>

                      <td className="py-4 px-4">
                        {item.type === 'officer_report' ? (
                          <div className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{item.overallRating} / 5</span>
                          </div>
                        ) : (
                          <Badge variant="success" className="capitalize">
                            {item.overallStatus || 'Good'}
                          </Badge>
                        )}
                      </td>

                      <td className="py-4 px-4 max-w-xs text-slate-600 truncate">
                        {item.comments || item.achievements || item.challenges || '--'}
                      </td>

                      <td className="py-4 pr-6 text-right">
                        <Badge variant={item.synced ? 'success' : 'warning'} dot>
                          {item.synced ? 'Synced' : 'Pending Sync'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluate Officer Modal */}
      <Modal
        isOpen={showOfficerReport}
        onClose={() => setShowOfficerReport(false)}
        title="Submit Officer Evaluation"
        size="lg"
      >
        <form onSubmit={handleOfficerReportSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Select Officer"
              value={form.officerId}
              onChange={(e) => setForm(prev => ({ ...prev, officerId: e.target.value }))}
              required
            >
              <option value="">Choose Assigned Officer</option>
              {officerUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
              ))}
            </Select>

            <Input
              label="Evaluation Date"
              type="date"
              value={form.reportDate}
              onChange={(e) => setForm(prev => ({ ...prev, reportDate: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select
              label="Registration Quality"
              value={form.quality}
              onChange={(e) => setForm(prev => ({ ...prev, quality: e.target.value }))}
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="poor">Poor</option>
            </Select>

            <Select
              label="Shift Punctuality"
              value={form.punctuality}
              onChange={(e) => setForm(prev => ({ ...prev, punctuality: e.target.value }))}
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="poor">Poor</option>
            </Select>

            <Select
              label="Teamwork & Morale"
              value={form.teamwork}
              onChange={(e) => setForm(prev => ({ ...prev, teamwork: e.target.value }))}
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="poor">Poor</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Overall Rating (1 - 5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, overallRating: val }))}
                  className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                    form.overallRating === val
                      ? 'bg-[#1E3A8A] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Supervisory Observations"
            value={form.comments}
            onChange={(e) => setForm(prev => ({ ...prev, comments: e.target.value }))}
            placeholder="Feedback on target progress, citizen engagement, attention to detail..."
            rows={2}
          />

          <Textarea
            label="Recommendations & Training"
            value={form.recommendations}
            onChange={(e) => setForm(prev => ({ ...prev, recommendations: e.target.value }))}
            placeholder="Recommendations for improvement or commendation..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOfficerReport(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Save Officer Assessment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supervisor Self-Report Modal */}
      <Modal
        isOpen={showSelfReport}
        onClose={() => setShowSelfReport(false)}
        title="Submit Supervisor Operations Report"
        size="lg"
      >
        <form onSubmit={handleSelfReportSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Report Date"
              type="date"
              value={selfForm.reportDate}
              onChange={(e) => setSelfForm(prev => ({ ...prev, reportDate: e.target.value }))}
              required
            />

            <Input
              label="Site Visits Conducted"
              type="number"
              min="0"
              value={selfForm.siteVisits}
              onChange={(e) => setSelfForm(prev => ({ ...prev, siteVisits: e.target.value }))}
              required
            />

            <Input
              label="Issues Resolved"
              type="number"
              min="0"
              value={selfForm.issuesResolved}
              onChange={(e) => setSelfForm(prev => ({ ...prev, issuesResolved: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Textarea
              label="Key Operational Achievements"
              value={selfForm.achievements}
              onChange={(e) => setSelfForm(prev => ({ ...prev, achievements: e.target.value }))}
              placeholder="Milestones reached, coverage milestones..."
              rows={2}
            />

            <Textarea
              label="Team Bottlenecks & Challenges"
              value={selfForm.challenges}
              onChange={(e) => setSelfForm(prev => ({ ...prev, challenges: e.target.value }))}
              placeholder="Logistics, connectivity, device supply..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSelfReport(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Submit Operations Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}