import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Ficha, Coordination } from '../types';
import {
  MapPin,
  Filter,
  Maximize2,
  Minimize2,
  RotateCcw,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface MapaFichasViewProps {
  fichas: Ficha[];
  coordenacoes?: Coordination[];
  className?: string;
}

// Known coordinates for Angola neighborhoods/cities
const KNOWN_COORDS: Record<string, [number, number]> = {
  '15 de março': [-11.2010, 13.8410],
  'chingo': [-11.2220, 13.8500],
  'quissala': [-11.2350, 13.8580],
  'aeroporto': [-11.1920, 13.8480],
  'bumba': [-11.1850, 13.8390],
  'litoral': [-11.2080, 13.8320],
  'bairro novo': [-11.2150, 13.8450],
  'kassokala': [-11.1980, 13.8520],
  'salinas': [-11.2400, 13.8350],
  'cambamba': [-11.2500, 13.8600],
  'comandante cow-boy': [-11.1880, 13.8430],
  'cidade alta': [-11.1950, 13.8410],
  'sumbe': [-11.2052, 13.8431],
  'porto amboim': [-10.7300, 13.7600],
  'gabela': [-10.8500, 14.3600],
  'quibala': [-10.7330, 14.9830],
  'waku kungo': [-11.3570, 15.1170],
  'luanda': [-8.8383, 13.2344],
  'benguela': [-12.5763, 13.4055],
  'huambo': [-12.7761, 15.7392],
  'lubango': [-14.9172, 13.4925],
};

function getCoordsForFicha(f: Ficha, index: number): [number, number] {
  // Check if ficha already has gps property with lat/lng
  const gpsStr = (f as { gps?: string }).gps;
  if (gpsStr) {
    const parts = gpsStr.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  }

  const bKey = (f.bairro || '').toLowerCase().trim();
  const mKey = (f.municipio || '').toLowerCase().trim();

  let base: [number, number] = [-11.2052, 13.8431]; // Default Sumbe center

  if (KNOWN_COORDS[bKey]) {
    base = KNOWN_COORDS[bKey];
  } else if (KNOWN_COORDS[mKey]) {
    base = KNOWN_COORDS[mKey];
  } else {
    // Hash string to deterministic offset
    const str = `${f.id}-${f.bairro || f.municipio || 'default'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const angle = Math.abs(hash % 360) * (Math.PI / 180);
    const radius = (Math.abs(hash % 100) / 100) * 0.025;
    return [base[0] + Math.sin(angle) * radius, base[1] + Math.cos(angle) * radius];
  }

  // Slight jitter for overlapping points in same neighborhood
  const jitterLat = ((index % 5) - 2) * 0.0022;
  const jitterLng = (((index * 3) % 5) - 2) * 0.0022;

  return [base[0] + jitterLat, base[1] + jitterLng];
}

export const MapaFichasView: React.FC<MapaFichasViewProps> = ({
  fichas,
  coordenacoes = [],
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [coordFilter, setCoordFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mapMode, setMapMode] = useState<'pins' | 'circles'>('pins');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filtered Fichas
  const filteredFichas = useMemo(() => {
    return fichas.filter((f) => {
      if (coordFilter !== 'todos' && String(f.coordId) !== coordFilter) {
        return false;
      }
      if (statusFilter !== 'todos' && f.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchBairro = (f.bairro || '').toLowerCase().includes(q);
        const matchMob = (f.mobilizador || '').toLowerCase().includes(q);
        const matchMun = (f.municipio || '').toLowerCase().includes(q);
        const matchCoord = (f.coordNome || '').toLowerCase().includes(q);
        if (!matchBairro && !matchMob && !matchMun && !matchCoord) return false;
      }
      return true;
    });
  }, [fichas, coordFilter, statusFilter, searchTerm]);

  // Map Stats
  const totalPessoasMapeadas = useMemo(
    () => filteredFichas.reduce((acc, f) => acc + (f.totalPessoas || 0), 0),
    [filteredFichas]
  );
  const totalLocaisMapeados = useMemo(
    () => filteredFichas.reduce((acc, f) => acc + (f.totalLocais || 0), 0),
    [filteredFichas]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-11.2052, 13.8431],
      zoom: 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark / Light tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when filteredFichas or mapMode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (filteredFichas.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredFichas.forEach((f, idx) => {
      const coords = getCoordsForFicha(f, idx);
      bounds.extend(coords);

      const isAprovado = f.status === 'aprovado' || f.status === 'validado';
      const isRecusado = f.status === 'recusado' || f.status === 'rejeitado';

      const colorClass = isAprovado
        ? 'bg-emerald-500 border-emerald-200 text-white'
        : isRecusado
        ? 'bg-red-500 border-red-200 text-white'
        : 'bg-amber-500 border-amber-200 text-white';

      const badgeColor = isAprovado
        ? '#10b981'
        : isRecusado
        ? '#ef4444'
        : '#f59e0b';

      if (mapMode === 'pins') {
        const customHtml = `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background-color: ${badgeColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            cursor: pointer;
            transition: transform 0.2s ease;
          " class="marker-pin-item">
            <span>${f.totalPessoas > 999 ? '1k+' : f.totalPessoas || f.totalLocais || '•'}</span>
            <div style="
              position: absolute;
              bottom: -6px;
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 6px solid ${badgeColor};
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: customHtml,
          className: 'custom-map-marker',
          iconSize: [32, 38],
          iconAnchor: [16, 38],
          popupAnchor: [0, -34],
        });

        const marker = L.marker(coords, { icon: customIcon });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 200px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                ${f.bairro || f.municipio || 'Bairro'}
              </span>
              <span style="font-size: 10px; color: #64748b;">${f.data || ''}</span>
            </div>
            
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #0f172a;">
              ${f.coordNome || 'Coordenação'}
            </h4>
            
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569;">
              <strong>Mobilizador:</strong> ${f.mobilizador || 'N/A'}<br/>
              <strong>Ronda:</strong> ${f.ronda || '1ª Ronda'}
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; padding: 6px; border-radius: 6px; text-align: center; margin-bottom: 6px;">
              <div>
                <div style="font-size: 13px; font-weight: 900; color: #0284c7;">${f.totalPessoas || 0}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 700;">PESSOAS</div>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 900; color: #16a34a;">${f.totalLocais || 0}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 700;">LOCAIS</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #475569; border-top: 1px solid #f1f5f9; pt-4px; margin-top: 4px;">
              <span>Aceitação SIM: <strong>${f.sim || 0}</strong></span>
              <span style="
                background: ${isAprovado ? '#dcfce7' : isRecusado ? '#fee2e2' : '#fef3c7'};
                color: ${isAprovado ? '#15803d' : isRecusado ? '#b91c1c' : '#b45309'};
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 800;
                text-transform: capitalize;
              ">
                ${f.status}
              </span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        layerGroup.addLayer(marker);
      } else {
        // Density Circles mode
        const radius = Math.max(12, Math.min(45, (f.totalPessoas || 10) / 12));
        const circle = L.circleMarker(coords, {
          radius,
          fillColor: badgeColor,
          color: '#ffffff',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.55,
        });

        circle.bindTooltip(
          `<strong>${f.bairro || f.municipio}</strong><br/>${f.totalPessoas || 0} Pessoas Alcançadas`,
          { permanent: false, direction: 'top' }
        );

        layerGroup.addLayer(circle);
      }
    });

    // Fit map bounds smoothly
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredFichas, mapMode]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || filteredFichas.length === 0) return;
    const bounds = L.latLngBounds([]);
    filteredFichas.forEach((f, idx) => {
      bounds.extend(getCoordsForFicha(f, idx));
    });
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
          : className
      }`}
    >
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Mapa de Distribuição Geográfica de Fichas</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Tempo Real
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Mapeamento territorial de brigadas e vacinação por bairros e coordenações
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-blue-500" />
            <span>{filteredFichas.length} Fichas No Mapa</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            <span>{totalPessoasMapeadas.toLocaleString()} Pessoas</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-700 dark:text-slate-200 font-bold shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-sky-500" />
            <span>{totalLocaisMapeados.toLocaleString()} Locais</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[160px] max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Procurar bairro, mobilizador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Coordenação Filter */}
          <select
            value={coordFilter}
            onChange={(e) => setCoordFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todas Coordenações</option>
            {coordenacoes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nome}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovados</option>
            <option value="recusado">Recusados</option>
          </select>
        </div>

        {/* View Mode Toggle & Recenter */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMapMode('pins')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                mapMode === 'pins'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Marcadores Padrão"
            >
              <MapPin className="h-3 w-3" />
              <span>Pins</span>
            </button>
            <button
              onClick={() => setMapMode('circles')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                mapMode === 'circles'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="Círculos de Densidade"
            >
              <Layers className="h-3 w-3" />
              <span>Densidade</span>
            </button>
          </div>

          <button
            onClick={handleRecenter}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title="Recentralizar Visão do Mapa"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            title={isFullscreen ? 'Sair de Ecrã Inteiro' : 'Ecrã Inteiro'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 min-h-[380px] w-full">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-10 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-2.5 text-[11px] shadow-md space-y-1.5 max-w-[200px]">
          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[10px] uppercase tracking-wider">
            Legenda de Status
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Aprovado / Validado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Recusado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
