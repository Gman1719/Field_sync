// src/components/reports/ReportForm.jsx – Enterprise Daily Work Report Submission

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FileText, CheckCircle2, AlertCircle, Wifi, WifiOff,
  MapPin, Clock, Calendar, Users, Wrench, CloudSun,
  MessageSquare, AlertTriangle, Layers, Send
} from 'lucide-react';
import { db, syncQueue, checkRealInternet } from '../../services/database';
import { uid, getToday } from '../../utils/helpers';
import { API_BASE } from '../../config/api';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ReportForm({
  form: externalForm,
  setForm: externalSetForm,
  handleSubmit,
  user,
  isOfficer,
  isSupervisor,
  addNotification,
  users
}) {
  const [internalForm, setInternalForm] = useState({
    reportDate: getToday(),
    region: user?.region || '',
    siteName: '',
    registrations: 0,
    operationalStatus: 'Active',
    attendance: 'present',
    workHours: 8,
    issues: '',
    comments: '',
    challenges: '',
    activities: '',
    equipmentStatus: 'operational',
    materialsUsed: '',
    teamMembers: '',
    weatherConditions: '',
    communityFeedback: ''
  });

  const form = externalForm || internalForm;
  const setForm = externalSetForm || setInternalForm;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [customSite, setCustomSite] = useState('');

  const predefinedSites = ['Site A', 'Site B', 'Site C', 'Site D', 'Site E'];

  useEffect(() => {
    const checkStatus = async () => {
      const online = await checkRealInternet();
      setIsOnline(online);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const validateField = (name, value, allFormValues = null) => {
    const formData = allFormValues || form;
    switch (name) {
      case 'reportDate':
        if (!value) return 'Report date is required';
        const todayStr = new Date().toISOString().slice(0, 10);
        if (value > todayStr) return 'Report date cannot be in the future';
        if (value < todayStr) return 'Report date cannot be in the past (only today allowed)';
        return '';
      case 'siteName':
        const selectedValue = formData.siteName;
        if (!selectedValue || !selectedValue.trim()) {
          if (formData._siteSelection === 'Other' && (!customSite || !customSite.trim())) {
            return 'Please enter a custom site name';
          }
          return 'Site name is required';
        }
        return '';
      case 'registrations':
        const num = Number(value);
        if (isNaN(num) || num < 0) return 'Registrations must be a non-negative number';
        return '';
      case 'attendance':
        if (!value) return 'Attendance status is required';
        return '';
      case 'workHours':
        const hours = Number(value);
        if (isNaN(hours) || hours < 0 || hours > 24) return 'Work hours must be between 0 and 24';
        return '';
      case 'operationalStatus':
        if (!value) return 'Operational status is required';
        return '';
      case 'activities':
        if (!value || !value.trim()) return 'Activities performed is required';
        return '';
      case 'equipmentStatus':
        if (!value) return 'Equipment status is required';
        return '';
      case 'materialsUsed':
        if (!value || !value.trim()) return 'Materials used is required';
        return '';
      case 'teamMembers':
        if (!value || !value.trim()) return 'Team members is required';
        return '';
      case 'weatherConditions':
        if (!value || !value.trim()) return 'Weather conditions is required';
        return '';
      case 'communityFeedback':
        if (!value || !value.trim()) return 'Community feedback is required';
        return '';
      case 'challenges':
        if (!value || !value.trim()) return 'Challenges is required';
        return '';
      case 'issues':
        if (!value || !value.trim()) return 'Issues encountered is required';
        return '';
      case 'comments':
        if (!value || !value.trim()) return 'Comments is required';
        return '';
      default:
        return '';
    }
  };

  const validateAll = () => {
    const newErrors = {};
    const fields = [
      'reportDate', 'siteName', 'registrations', 'attendance', 'workHours',
      'operationalStatus', 'activities', 'equipmentStatus',
      'materialsUsed', 'teamMembers', 'weatherConditions',
      'communityFeedback', 'challenges', 'issues', 'comments'
    ];
    fields.forEach(f => {
      const error = validateField(f, form[f]);
      if (error) newErrors[f] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (name === 'siteName' && form._siteSelection === 'Other') {
      const error = customSite && customSite.trim() ? '' : 'Please enter a custom site name';
      setErrors(prev => ({ ...prev, siteName: error }));
      return;
    }
    const error = validateField(name, form[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSiteChange = (e) => {
    const value = e.target.value;
    if (value === 'Other') {
      setForm(prev => ({ ...prev, siteName: '', _siteSelection: 'Other' }));
      setCustomSite('');
      setErrors(prev => ({ ...prev, siteName: '' }));
    } else {
      setForm(prev => ({ ...prev, siteName: value, _siteSelection: value }));
      setCustomSite('');
      setTouched(prev => ({ ...prev, siteName: true }));
      const error = validateField('siteName', value);
      setErrors(prev => ({ ...prev, siteName: error }));
    }
  };

  const handleCustomSiteChange = (e) => {
    const value = e.target.value;
    setCustomSite(value);
    setForm(prev => ({ ...prev, siteName: value, _siteSelection: 'Other' }));
    setTouched(prev => ({ ...prev, siteName: true }));
    const error = value && value.trim() ? '' : 'Please enter a custom site name';
    setErrors(prev => ({ ...prev, siteName: error }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: newValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    if (name !== 'siteName') {
      const error = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login first to submit reports');
      return;
    }

    if (form._siteSelection === 'Other' && (!customSite || !customSite.trim())) {
      setErrors(prev => ({ ...prev, siteName: 'Please enter a custom site name' }));
      setTouched(prev => ({ ...prev, siteName: true }));
      toast.error('Please enter a custom site name.');
      return;
    }

    const isValid = validateAll();
    if (!isValid) {
      toast.error('Please complete all required fields correctly before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const online = await checkRealInternet();
      setIsOnline(online);

      const newReport = {
        id: uid(),
        reportId: `RPT-${Date.now()}`,
        reportDate: form.reportDate,
        region: form.region || user.region,
        siteName: form.siteName.trim(),
        employeeId: user.employeeId,
        employeeName: user.name,
        supervisorId: user.supervisorId || '',
        registrations: Number(form.registrations) || 0,
        registrationEfficiency: Math.round((Number(form.registrations) / 100) * 100),
        operationalStatus: form.operationalStatus,
        attendance: form.attendance,
        workHours: Number(form.workHours),
        issues: form.issues?.trim() || '',
        comments: form.comments?.trim() || '',
        challenges: form.challenges?.trim() || '',
        activities: form.activities?.trim() || '',
        equipmentStatus: form.equipmentStatus || 'operational',
        materialsUsed: form.materialsUsed?.trim() || '',
        teamMembers: form.teamMembers?.trim() || '',
        weatherConditions: form.weatherConditions?.trim() || '',
        communityFeedback: form.communityFeedback?.trim() || '',
        submittedAt: new Date().toISOString(),
        synced: false,
        syncAttempts: 0,
        syncError: null,
        reviewed: false,
        reviewedBy: null,
        offlineSaved: false
      };

      await db.reports.add(newReport);

      let syncSuccess = false;
      if (online) {
        try {
          const response = await fetch(`${API_BASE}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'report',
              data: newReport
            })
          });

          if (response.ok) {
            await db.reports.update(newReport.id, {
              synced: true,
              syncedAt: new Date().toISOString()
            });
            syncSuccess = true;
          } else {
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (syncError) {
          console.warn('Sync failed, queueing report:', syncError.message);
          await db.reports.update(newReport.id, {
            synced: false,
            syncError: syncError.message,
            lastSyncAttempt: Date.now()
          });
          syncQueue.add({
            type: 'report',
            id: newReport.id,
            data: newReport
          });
          if (addNotification) {
            await addNotification(
              user.id,
              'Report Queued for Sync',
              `Report for ${form.siteName} saved locally. Will sync automatically.`,
              'warning'
            );
          }
          toast('Report saved locally. Will sync when online.', { icon: '💾' });
        }
      } else {
        await db.reports.update(newReport.id, {
          synced: false,
          offlineSaved: true
        });
        syncQueue.add({
          type: 'report',
          id: newReport.id,
          data: newReport
        });
        if (addNotification) {
          await addNotification(
            user.id,
            'Report Saved Offline',
            `Report for ${form.siteName} saved offline. Will sync automatically.`,
            'warning'
          );
        }
        toast('Report saved offline. Will sync automatically when connected.', { icon: '💾' });
      }

      if (syncSuccess) {
        if (isOfficer && user) {
          const supervisor = users?.find(u => u.id === user.supervisorId);
          if (supervisor && addNotification) {
            await addNotification(
              supervisor.id,
              'Report Submitted',
              `${user.name} submitted report for ${form.siteName}`,
              'success'
            );
          }
          const manager = users?.find(u => u.role === 'manager');
          if (manager && addNotification) {
            await addNotification(
              manager.id,
              'Report Submitted',
              `${user.name} submitted report for ${form.siteName}`,
              'info'
            );
          }
        } else if (isSupervisor && user) {
          const manager = users?.find(u => u.role === 'manager');
          if (manager && addNotification) {
            await addNotification(
              manager.id,
              'Report Submitted',
              `${user.name} submitted report for ${form.siteName}`,
              'info'
            );
          }
        }
        toast.success('Report submitted and synchronized successfully!');
      }

      // Reset form
      setForm({
        reportDate: form.reportDate,
        region: form.region || user.region,
        siteName: '',
        registrations: 0,
        operationalStatus: 'Active',
        attendance: 'present',
        workHours: 8,
        issues: '',
        comments: '',
        challenges: '',
        activities: '',
        equipmentStatus: 'operational',
        materialsUsed: '',
        teamMembers: '',
        weatherConditions: '',
        communityFeedback: ''
      });
      setCustomSite('');
      setErrors({});
      setTouched({});

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Error submitting report: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1E3A8A]" />
            Submit Daily Work Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSupervisor ? 'Submit supervisor site and team inspection report' : 'Record daily registration stats and operational log'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'success' : 'error'} dot>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant="primary">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
        {/* SECTION 1: Site & Operation */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#1E3A8A]" />
                1. Site & Operations
              </CardTitle>
              <CardDescription>Reporting jurisdiction and current operational conditions</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Report Date"
                type="date"
                name="reportDate"
                value={form.reportDate}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
                error={touched.reportDate ? errors.reportDate : ''}
              />

              <Input
                label="Region"
                name="region"
                value={form.region || user?.region || ''}
                readOnly
                disabled
                helperText="Auto-assigned from user profile"
              />

              <Select
                label="Operational Status"
                name="operationalStatus"
                value={form.operationalStatus}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Closed">Closed</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Site Name"
                  value={form._siteSelection || (predefinedSites.includes(form.siteName) ? form.siteName : form.siteName ? 'Other' : '')}
                  onChange={handleSiteChange}
                  onBlur={handleBlur}
                  required
                  error={touched.siteName && !form.siteName ? errors.siteName : ''}
                >
                  <option value="">Select Field Site</option>
                  {predefinedSites.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Other">Other (Custom Site)</option>
                </Select>
              </div>

              {form._siteSelection === 'Other' && (
                <div>
                  <Input
                    label="Custom Site Name"
                    value={customSite}
                    onChange={handleCustomSiteChange}
                    onBlur={handleBlur}
                    placeholder="Enter site name"
                    required
                    error={touched.siteName ? errors.siteName : ''}
                  />
                </div>
              )}

              <Input
                label="Weather Conditions"
                name="weatherConditions"
                value={form.weatherConditions}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="e.g., Sunny, Rainy, Heavy wind"
                required
                error={touched.weatherConditions ? errors.weatherConditions : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Work Statistics & Attendance */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E3A8A]" />
                2. Work Statistics & Shift Log
              </CardTitle>
              <CardDescription>Citizens registered and time spent on duty</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Input
                label="Citizens Registered"
                type="number"
                name="registrations"
                value={form.registrations}
                onChange={handleInputChange}
                onBlur={handleBlur}
                min="0"
                required
                error={touched.registrations ? errors.registrations : ''}
              />

              <Select
                label="Attendance Status"
                name="attendance"
                value={form.attendance}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
              </Select>

              <Input
                label="Work Hours"
                type="number"
                name="workHours"
                value={form.workHours}
                onChange={handleInputChange}
                onBlur={handleBlur}
                min="0"
                max="24"
                step="0.5"
                required
                error={touched.workHours ? errors.workHours : ''}
              />

              <Select
                label="Equipment Status"
                name="equipmentStatus"
                value={form.equipmentStatus}
                onChange={handleInputChange}
                onBlur={handleBlur}
                required
              >
                <option value="operational">Operational</option>
                <option value="faulty">Faulty</option>
                <option value="missing">Missing Parts</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Activities & Team Operations */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1E3A8A]" />
                3. Activities, Materials & Team Log
              </CardTitle>
              <CardDescription>Field operations conducted during the work session</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Textarea
              label="Activities Performed"
              name="activities"
              value={form.activities}
              onChange={handleInputChange}
              onBlur={handleBlur}
              rows={3}
              placeholder="Describe registration outreach, biometric collection, community briefings..."
              required
              error={touched.activities ? errors.activities : ''}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Materials Used"
                name="materialsUsed"
                value={form.materialsUsed}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="e.g., 200 Paper forms, 2 scanner cartridges"
                required
                error={touched.materialsUsed ? errors.materialsUsed : ''}
              />

              <Input
                label="Team Members Present"
                name="teamMembers"
                value={form.teamMembers}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Names or staff IDs on duty"
                required
                error={touched.teamMembers ? errors.teamMembers : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Challenges & Community Feedback */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#1E3A8A]" />
                4. Challenges, Feedback & Observations
              </CardTitle>
              <CardDescription>Field bottlenecks and feedback for supervisor review</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Field Challenges"
                name="challenges"
                value={form.challenges}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={2}
                placeholder="Network coverage, device power, road access..."
                required
                error={touched.challenges ? errors.challenges : ''}
              />

              <Textarea
                label="Issues Encountered"
                name="issues"
                value={form.issues}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={2}
                placeholder="Device freezes, rejected biometrics, discrepancies..."
                required
                error={touched.issues ? errors.issues : ''}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Community Feedback"
                name="communityFeedback"
                value={form.communityFeedback}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={2}
                placeholder="Beneficiary feedback, elder recommendations..."
                required
                error={touched.communityFeedback ? errors.communityFeedback : ''}
              />

              <Textarea
                label="General Comments"
                name="comments"
                value={form.comments}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={2}
                placeholder="Additional notes for management..."
                required
                error={touched.comments ? errors.comments : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Action */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full sm:w-auto px-10"
          >
            <Send className="w-4 h-4 mr-2" />
            {isOnline ? 'Submit Daily Report' : 'Save Report Offline'}
          </Button>
        </div>
      </form>
    </div>
  );
}