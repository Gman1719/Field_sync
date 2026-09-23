import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  ChevronRight, 
  RefreshCw, 
  Layers, 
  Compass
} from 'lucide-react';
import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Badge from '../../components/ui/Badge.tsx';
import StatsCard from '../../components/ui/StatsCard.tsx';
import GeographicService from '../../services/geographicService.ts';
import { Region, Zone, Woreda, Kebele } from '../../types/index.ts';

export const RegionManagementPage: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);
  const [kebeles, setKebeles] = useState<Kebele[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedWoreda, setSelectedWoreda] = useState<Woreda | null>(null);

  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isLoadingWoredas, setIsLoadingWoredas] = useState(false);
  const [isLoadingKebeles, setIsLoadingKebeles] = useState(false);

  // 1. Initial Load of Regions
  const fetchRegions = async () => {
    try {
      setIsLoadingRegions(true);
      const data = await GeographicService.getRegions();
      setRegions(data);
      if (data.length > 0 && !selectedRegion) {
        handleSelectRegion(data[0]);
      }
    } catch (err) {
      console.error('Failed to load regions:', err);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  // 2. Select Region -> Fetch Zones
  const handleSelectRegion = async (region: Region) => {
    setSelectedRegion(region);
    setSelectedZone(null);
    setSelectedWoreda(null);
    setWoredas([]);
    setKebeles([]);

    try {
      setIsLoadingZones(true);
      const loadedZones = await GeographicService.getZonesByRegion(region.id);
      setZones(loadedZones);
      if (loadedZones.length > 0) {
        handleSelectZone(loadedZones[0]);
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setIsLoadingZones(false);
    }
  };

  // 3. Select Zone -> Fetch Woredas
  const handleSelectZone = async (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedWoreda(null);
    setKebeles([]);

    try {
      setIsLoadingWoredas(true);
      const loadedWoredas = await GeographicService.getWoredasByZone(zone.id);
      setWoredas(loadedWoredas);
      if (loadedWoredas.length > 0) {
        handleSelectWoreda(loadedWoredas[0]);
      }
    } catch (err) {
      console.error('Failed to load woredas:', err);
    } finally {
      setIsLoadingWoredas(false);
    }
  };

  // 4. Select Woreda -> Fetch Kebeles
  const handleSelectWoreda = async (woreda: Woreda) => {
    setSelectedWoreda(woreda);

    try {
      setIsLoadingKebeles(true);
      const loadedKebeles = await GeographicService.getKebelesByWoreda(woreda.id);
      setKebeles(loadedKebeles);
    } catch (err) {
      console.error('Failed to load kebeles:', err);
    } finally {
      setIsLoadingKebeles(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Ethiopian Geographic Hierarchy
            </h1>
            <Badge variant="purple" size="sm">
              4-Tier Architecture
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explore administrative boundary structure: Region &rarr; Zone &rarr; Woreda &rarr; Kebele
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchRegions}
          isLoading={isLoadingRegions}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh Hierarchy
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Level 1: Regions"
          value={regions.length}
          subtitle="Autonomous States & Cities"
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatsCard
          title="Level 2: Zones / Sub-Cities"
          value={zones.length}
          subtitle={`Under ${selectedRegion?.name || 'Region'}`}
          icon={<Layers className="w-5 h-5" />}
        />
        <StatsCard
          title="Level 3: Woredas"
          value={woredas.length}
          subtitle="Supervisory Stations"
          icon={<Compass className="w-5 h-5" />}
        />
        <StatsCard
          title="Level 4: Kebeles"
          value={kebeles.length}
          subtitle="Field Officer Stations"
          icon={<MapPin className="w-5 h-5" />}
        />
      </div>

      {/* Interactive 4-Column Geographic Tree */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Column 1: Regions */}
        <Card noPadding className="border-slate-200">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>1. Regions ({regions.length})</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto text-xs">
            {regions.map((reg) => {
              const isSelected = selectedRegion?.id === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => handleSelectRegion(reg)}
                  className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-purple-50 text-purple-900 font-bold border-l-4 border-purple-600'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">{reg.name}</span>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </Card>

        {/* Column 2: Zones */}
        <Card noPadding className="border-slate-200">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>2. Zones ({zones.length})</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto text-xs">
            {isLoadingZones ? (
              <div className="p-6 text-center text-slate-400">Loading zones...</div>
            ) : zones.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No zones recorded</div>
            ) : (
              zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <button
                    key={zone.id}
                    onClick={() => handleSelectZone(zone)}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{zone.name}</span>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Column 3: Woredas */}
        <Card noPadding className="border-slate-200">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>3. Woredas ({woredas.length})</span>
            <Compass className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto text-xs">
            {isLoadingWoredas ? (
              <div className="p-6 text-center text-slate-400">Loading woredas...</div>
            ) : woredas.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No woredas in zone</div>
            ) : (
              woredas.map((woreda) => {
                const isSelected = selectedWoreda?.id === woreda.id;
                return (
                  <button
                    key={woreda.id}
                    onClick={() => handleSelectWoreda(woreda)}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{woreda.name}</span>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Column 4: Kebeles */}
        <Card noPadding className="border-slate-200">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>4. Kebeles ({kebeles.length})</span>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto text-xs">
            {isLoadingKebeles ? (
              <div className="p-6 text-center text-slate-400">Loading kebeles...</div>
            ) : kebeles.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No kebeles in woreda</div>
            ) : (
              kebeles.map((kebele) => (
                <div key={kebele.id} className="p-3 hover:bg-slate-50 transition-colors">
                  <div className="font-semibold text-slate-900">{kebele.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {kebele.code}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegionManagementPage;
