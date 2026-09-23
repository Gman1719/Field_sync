import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RefreshCw, 
  Users, 
  PieChart as PieIcon, 
  BarChart as BarIcon, 
  Building2
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import StatsService, { DemographicsData } from '../../services/statsService.ts';
import api from '../../services/api.ts';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<DemographicsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const res = await StatsService.getDemographics();
      setData(res);
    } catch (err) {
      console.error('Failed to load report analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportFullCSV = async () => {
    try {
      setIsExporting(true);
      const res = await api.get<{ success: boolean; data: any[] }>('/citizens');
      const citizens = res.data.data;

      if (citizens.length === 0) {
        alert('No citizens recorded to export.');
        return;
      }

      const headers = [
        'ID',
        'Client Record ID',
        'Full Name',
        'Date of Birth',
        'Gender',
        'Phone Number',
        'Address',
        'Region',
        'Zone',
        'Woreda',
        'Kebele',
        'Sync Status',
        'Registered By',
        'Created At',
      ];

      const rows = citizens.map((c) => [
        `"${c.id}"`,
        `"${c.clientRecordId}"`,
        `"${c.fullName}"`,
        `"${c.dateOfBirth}"`,
        `"${c.gender}"`,
        `"${c.phoneNumber || ''}"`,
        `"${c.address}"`,
        `"${c.region?.name || ''}"`,
        `"${c.zone?.name || ''}"`,
        `"${c.woreda?.name || ''}"`,
        `"${c.kebele?.name || ''}"`,
        `"${c.syncStatus}"`,
        `"${c.registeredBy?.fullName || ''}"`,
        `"${c.createdAt}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `fieldsync_national_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reports &amp; Demographic Analytics
            </h1>
            <Badge variant="success" size="sm">
              Operational Export
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyze citizen demographic distributions, regional breakdowns, and export authorized registries
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportFullCSV}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export All Registrations (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Registered Population"
          value={data?.total || 0}
          subtitle="Confirmed on central database"
          icon={<Users className="w-5 h-5" />}
        />
        <StatsCard
          title="Gender Balance"
          value={`${
            data?.total
              ? Math.round(
                  (((data.genderDistribution.find((g) => g.name === 'FEMALE')?.value || 0)) /
                    data.total) *
                    100
                )
              : 0
          }% Female`}
          subtitle="Proportion of registered citizens"
          icon={<PieIcon className="w-5 h-5" />}
        />
        <StatsCard
          title="Geographic Stations"
          value={data?.regionalDistribution.length || 0}
          subtitle="Reporting districts & woredas"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Analytical Visual Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Breakdown Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Gender Distribution
            </h2>
            <Badge variant="default" size="sm">Demographic Ratio</Badge>
          </div>

          <div className="space-y-3">
            {data?.genderDistribution.map((g) => {
              const pct = data.total > 0 ? Math.round((g.value / data.total) * 100) : 0;
              return (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{g.name}</span>
                    <span className="text-slate-500">
                      {g.value} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        g.name === 'FEMALE'
                          ? 'bg-purple-500'
                          : g.name === 'MALE'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Age Groups Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarIcon className="w-4 h-4 text-blue-600" />
              Age Category Distribution
            </h2>
            <Badge variant="default" size="sm">Demographic Cohorts</Badge>
          </div>

          <div className="space-y-3">
            {data?.ageBrackets.map((bracket) => {
              const pct = data.total > 0 ? Math.round((bracket.count / data.total) * 100) : 0;
              return (
                <div key={bracket.bracket} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Age {bracket.bracket}
                    </span>
                    <span className="text-slate-500">
                      {bracket.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Regional Table */}
      <Card noPadding className="border-slate-200">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-800">
          Jurisdictional Registry Density
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {data?.regionalDistribution.map((r) => (
            <div key={r.name} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">{r.name}</span>
              </div>
              <Badge variant="info" size="sm">{r.value} citizens registered</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
