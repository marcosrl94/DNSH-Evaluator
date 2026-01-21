import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Asset, HazardType, KeyBiodiversityArea, WaterRiskZone } from '../types';
import { getObjectiveStatusFromAsset } from '../utils/dnshCalculations';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue - only once globally
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch (error) {
    // Icons already initialized, ignore
  }
}

export interface ActiveLayer {
  hazard: HazardType;
  opacity: number;
}

interface MapViewerProps {
  assets: Asset[];
  activeLayers?: ActiveLayer[];
  theme?: 'light' | 'dark';
  onAssetClick?: (assetId: string) => void;
  focusedAssetId?: string | null;
  showControls?: boolean;
  onThemeToggle?: () => void;
  statusMeta?: {
    scenario?: string;
    horizon?: string;
    title?: string;
  };
  // Biodiversity layers
  showKBAs?: boolean;
  kbas?: KeyBiodiversityArea[];
  onKBAClick?: (kbaId: string) => void;
  // Water risk layers
  showWaterRisk?: boolean;
  waterRiskZones?: WaterRiskZone[];
  onWaterRiskClick?: (zoneId: string) => void;
}

export const hazardColorForId = (hazardId: string) => {
  const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
  const hash = hazardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const MapViewer: React.FC<MapViewerProps> = ({ 
  assets = [], 
  activeLayers = [], 
  theme = 'dark',
  onAssetClick,
  focusedAssetId,
  showControls = false,
  onThemeToggle,
  statusMeta,
  showKBAs = false,
  kbas = [],
  onKBAClick,
  showWaterRisk = false,
  waterRiskZones = [],
  onWaterRiskClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);
  const kbaLayersRef = useRef<(L.Polygon | L.Marker)[]>([]);
  const waterRiskLayersRef = useRef<(L.Polygon | L.Marker)[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const isDark = theme === 'dark';

  // Validate and filter assets with valid coordinates
  const validAssets = useMemo(() => {
    return assets.filter(asset => 
      asset && 
      typeof asset.lat === 'number' && 
      typeof asset.lng === 'number' &&
      !isNaN(asset.lat) && 
      !isNaN(asset.lng) &&
      asset.lat >= -90 && asset.lat <= 90 &&
      asset.lng >= -180 && asset.lng <= 180
    );
  }, [assets]);

  // Calculate initial center
  const initialCenter: [number, number] = useMemo(() => {
    if (validAssets.length > 0) {
      return [validAssets[0].lat, validAssets[0].lng];
    }
    return [40.4168, -3.7038]; // Default to Madrid, Spain
  }, [validAssets]);

  // Tile URL based on theme
  const TILE_URL = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  // Get asset color based on type
  const getAssetColor = (type: string) => {
    if (type.includes('Solar') || type.includes('Wind') || type.includes('Hydro') || type.includes('Geothermal') || type.includes('Biomass')) {
      return { hex: '#eab308', tailwind: 'bg-yellow-500' };
    }
    if (type.includes('Data Center') || type.includes('Telecommunications') || type.includes('Grid')) {
      return { hex: '#10b981', tailwind: 'bg-emerald-500' };
    }
    if (type.includes('Port') || type.includes('Airport') || type.includes('Railway') || type.includes('Highway')) {
      return { hex: '#3b82f6', tailwind: 'bg-blue-500' };
    }
    if (type.includes('Building') || type.includes('Warehouse') || type.includes('Residential') || type.includes('Commercial')) {
      return { hex: '#8b5cf6', tailwind: 'bg-purple-500' };
    }
    if (type.includes('Plant') || type.includes('Manufacturing')) {
      return { hex: '#f59e0b', tailwind: 'bg-amber-500' };
    }
    return { hex: '#64748b', tailwind: 'bg-slate-500' };
  };

  // Get DNSH status color for marker
  const getDnshStatusColor = (asset: Asset): string => {
    const evaluation = asset.dnshEvaluation;
    if (!evaluation) return 'slate';
    
    switch (evaluation.overallStatus) {
      case 'Compliant': return 'emerald';
      case 'Non-Compliant': return 'red';
      case 'Conditional': return 'amber';
      default: return 'slate';
    }
  };

  // Create marker icon
  const createMarkerIcon = (asset: Asset, isFocused: boolean): L.DivIcon => {
    const colors = getAssetColor(asset.assetType);
    const dnshStatus = getDnshStatusColor(asset);
    const evaluation = asset.dnshEvaluation;
    const dnshStatusText = evaluation?.overallStatus || 'N/A';
    
    // DNSH status indicator colors
    const dnshColors: Record<string, string> = {
      emerald: 'bg-emerald-500 border-emerald-400',
      red: 'bg-red-500 border-red-400',
      amber: 'bg-amber-500 border-amber-400',
      slate: 'bg-slate-500 border-slate-400'
    };
    
    const markerHtml = `
      <div class="relative flex items-center justify-center w-full h-full group transition-transform duration-300 ${isFocused ? 'scale-125' : 'hover:scale-110'}">
         ${isFocused ? `
           <span class="absolute inline-flex h-full w-full rounded-full opacity-30 animate-ping ${colors.tailwind}"></span>
           <span class="absolute inline-flex h-12 w-12 rounded-full border border-white/30 opacity-50"></span>
         ` : ''}
         <span class="relative inline-flex rounded-full h-3 w-3 ${colors.tailwind} shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 ${dnshColors[dnshStatus]}"></span>
         
         <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <div class="bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-slate-700 shadow-xl">
               <div>${asset.name}</div>
               <div class="text-[9px] mt-0.5 opacity-75">DNSH: ${dnshStatusText}</div>
            </div>
         </div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent border-0',
      html: markerHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  // Get hazard polygon coordinates
  const getHazardPolygon = (hazardId: string): [number, number][] => {
    const hash = hazardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latShift = (hash % 10) * 0.2;
    const lngShift = (hash % 8) * 0.2;
    const size = 1 + (hash % 5) * 0.5;

    return [
      [38.0 + latShift, -5.0 + lngShift],
      [38.0 + latShift + size, -5.0 + lngShift - (size/2)],
      [38.0 + latShift + size/2, -5.0 + lngShift + size],
      [37.0 + latShift, -4.0 + lngShift]
    ] as [number, number][];
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return; // Already initialized or no container
    }

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    // Add tile layer
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add zoom control
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Set ready state when map is ready
    map.whenReady(() => {
      setIsMapReady(true);
      // Multiple invalidateSize calls to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    });

    // Cleanup function
    return () => {
      // Remove all markers
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current = [];

      // Remove all polygons
      polygonsRef.current.forEach(polygon => {
        map.removeLayer(polygon);
      });
      polygonsRef.current = [];

      // Remove all KBA layers
      kbaLayersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      kbaLayersRef.current = [];

      // Remove all water risk layers
      waterRiskLayersRef.current.forEach(layer => {
        map.removeLayer(layer);
      });
      waterRiskLayersRef.current = [];

      // Remove map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update map theme
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove old tile layer
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add new tile layer with new theme
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstanceRef.current);
  }, [theme, TILE_URL]);

  // Update markers when assets change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Remove old markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    validAssets.forEach(asset => {
      const isFocused = focusedAssetId === asset.id;
      const icon = createMarkerIcon(asset, isFocused);
      
      const marker = L.marker([asset.lat, asset.lng], { icon })
        .addTo(mapInstanceRef.current!);

      marker.on('click', () => {
        if (onAssetClick) {
          onAssetClick(asset.id);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([asset.lat, asset.lng], 10, {
            duration: 1.5
          });
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have assets
    if (validAssets.length > 0) {
      setTimeout(() => {
        if (mapInstanceRef.current && focusedAssetId) {
          const asset = validAssets.find(a => a.id === focusedAssetId);
          if (asset) {
            mapInstanceRef.current.flyTo([asset.lat, asset.lng], 12, { duration: 2 });
          }
        } else if (mapInstanceRef.current) {
          const bounds = L.latLngBounds(
            validAssets.map(a => [a.lat, a.lng] as [number, number])
          );
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
        }
      }, 200);
    }
  }, [validAssets, focusedAssetId, onAssetClick, isMapReady]);

  // Update polygons when active layers change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Remove old polygons
    polygonsRef.current.forEach(polygon => {
      mapInstanceRef.current?.removeLayer(polygon);
    });
    polygonsRef.current = [];

    // Add new polygons
    activeLayers.forEach((layer) => {
      const color = hazardColorForId(layer.hazard.id);
      const coords = getHazardPolygon(layer.hazard.id);

      const polygon = L.polygon(coords, {
        color: color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: layer.opacity * 0.4,
        dashArray: '5, 10',
      }).addTo(mapInstanceRef.current!);

      polygon.bindTooltip(layer.hazard.name, {
        permanent: false,
        className: 'bg-transparent border-0 shadow-none text-white',
        direction: 'top'
      });

      polygonsRef.current.push(polygon);
    });
  }, [activeLayers, isMapReady]);

  // Update KBA layers when showKBAs or kbas change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Remove old KBA layers
    kbaLayersRef.current.forEach(layer => {
      mapInstanceRef.current?.removeLayer(layer);
    });
    kbaLayersRef.current = [];

    // Add new KBA layers if enabled
    if (showKBAs && kbas && kbas.length > 0) {
      kbas.forEach(kba => {
        // Create KBA polygon
        if (kba.polygon && kba.polygon.length > 0) {
          const polygon = L.polygon(
            kba.polygon.map(coord => [coord[0], coord[1]] as [number, number]),
            {
              color: '#10b981', // Emerald green for biodiversity
              weight: 2,
              opacity: 0.9,
              fillColor: '#10b981',
              fillOpacity: 0.25,
              dashArray: '8, 4',
            }
          ).addTo(mapInstanceRef.current!);

          // Tooltip with KBA info
          const tooltipContent = `
            <div style="text-align: left; min-width: 200px;">
              <div style="font-weight: bold; color: #059669; margin-bottom: 4px;">${kba.name}</div>
              <div style="font-size: 11px; color: #475569;">
                <div>Designation: ${kba.designation}</div>
                <div>Area: ${kba.areaKm2.toFixed(1)} km²</div>
                ${kba.protectedStatus ? `<div>Status: ${kba.protectedStatus}</div>` : ''}
                ${kba.distanceFromAssetKm ? `<div style="font-weight: 600; color: #059669; margin-top: 4px;">Distance: ${kba.distanceFromAssetKm.toFixed(1)} km</div>` : ''}
              </div>
            </div>
          `;

          polygon.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'auto',
            className: 'kba-tooltip',
            interactive: true,
          });

          polygon.on('click', () => {
            if (onKBAClick) onKBAClick(kba.id);
          });

          kbaLayersRef.current.push(polygon);
        }

        // Add marker at center
        const kbaIcon = L.divIcon({
          className: 'bg-transparent border-0',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; display: inline-flex; border-radius: 9999px; height: 16px; width: 16px; background-color: #10b981; opacity: 0.75; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; display: inline-flex; border-radius: 9999px; height: 12px; width: 12px; background-color: #059669; border: 2px solid white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);"></div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([kba.centerLat, kba.centerLng], { icon: kbaIcon })
          .addTo(mapInstanceRef.current!);
        
        marker.bindTooltip(kba.name, {
          permanent: false,
          className: 'bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded border border-emerald-700 shadow-lg',
        });
        
        marker.on('click', () => {
          if (onKBAClick) onKBAClick(kba.id);
        });
        
        kbaLayersRef.current.push(marker);
      });
    }
  }, [showKBAs, kbas, onKBAClick, isMapReady]);

  // Invalidate map size when layers change or container size changes
  useEffect(() => {
    if (mapInstanceRef.current && isMapReady) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showKBAs, showWaterRisk, kbas?.length, waterRiskZones?.length, isMapReady]);

  const fitToAssets = () => {
    if (!mapInstanceRef.current || validAssets.length === 0) return;
    try {
      const bounds = L.latLngBounds(
        validAssets.map(a => [a.lat, a.lng] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } catch (error) {
      console.error('Error fitting bounds:', error);
    }
  };

  // Early return if no valid assets
  if (validAssets.length === 0 && assets.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full transition-colors ${
        isDark ? 'bg-black text-[#c0c0c0]' : 'bg-gray-50 text-gray-700'
      }`} style={{ height: '100%', minHeight: '400px' }}>
        <div className="text-center">
          <p className={`text-lg mb-2 transition-colors ${
            isDark ? 'text-[#c0c0c0]' : 'text-gray-700'
          }`}>No hay activos disponibles</p>
          <p className={`text-sm transition-colors ${
            isDark ? 'text-[#999999]' : 'text-gray-600'
          }`}>Por favor, añade operaciones con activos para visualizarlos en el mapa.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-full overflow-hidden transition-colors ${
        isDark ? 'bg-black' : 'bg-gray-50'
      }`} 
      style={{ height: '100%', width: '100%', position: 'relative', minHeight: '180px' }}
    >
      {/* Global Leaflet CSS Overrides */}
      <style>{`
        .leaflet-container {
          background: ${isDark ? '#09090b' : '#f8fafc'} !important;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          height: 100% !important;
          width: 100% !important;
          z-index: 0;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background-color: ${isDark ? 'rgba(30, 41, 59, 0.9)' : 'white'} !important;
          color: ${isDark ? 'white' : 'black'} !important;
          border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#eee'} !important;
          backdrop-filter: blur(4px);
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: ${isDark ? '#334155' : '#f1f5f9'} !important;
        }
        .leaflet-tooltip {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #e2e8f0;
          border-radius: 4px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          font-size: 11px;
          padding: 4px 8px;
        }
        .kba-tooltip {
          background: white !important;
          border: 2px solid #10b981 !important;
          color: #1e293b !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          font-size: 12px !important;
          padding: 8px !important;
          min-width: 200px !important;
        }
        .kba-tooltip:before {
          border-top-color: #10b981 !important;
        }
        .water-risk-tooltip {
          background: white !important;
          border: 2px solid #3b82f6 !important;
          color: #1e293b !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          font-size: 12px !important;
          padding: 8px !important;
          min-width: 220px !important;
        }
        .water-risk-tooltip:before {
          border-top-color: #3b82f6 !important;
        }
      `}</style>

      {/* Loading State */}
      {!isMapReady && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-colors ${
          isDark ? 'bg-black/50' : 'bg-white/50'
        }`}>
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 transition-colors ${
              isDark ? 'border-[#00ff88]' : 'border-[#0066cc]'
            }`}></div>
            <p className={`text-sm font-medium transition-colors ${
              isDark ? 'text-[#c0c0c0]' : 'text-gray-700'
            }`}>Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      />

      {/* Toolbar */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <div className="flex gap-2">
            <button 
              onClick={fitToAssets}
              className={`px-3 py-2 rounded-lg backdrop-blur-sm border shadow-sm text-xs font-semibold transition-all ${
                isDark 
                  ? 'bg-[#0a0a0a]/90 text-[#c0c0c0] border-[#1a1a1a] hover:bg-[#111111] hover:text-white' 
                  : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'
              }`}
              title="Reajustar vista"
            >
              Reset view
            </button>
            {onThemeToggle && (
              <button 
                onClick={onThemeToggle}
                className={`px-3 py-2 rounded-lg backdrop-blur-sm border shadow-sm text-xs font-semibold transition-all ${
                isDark 
                  ? 'bg-[#0a0a0a]/90 text-[#c0c0c0] border-[#1a1a1a] hover:bg-[#111111] hover:text-white' 
                  : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'
              }`}
              >
                {isDark ? 'Light' : 'Dark'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Status bar */}
      {statusMeta && (
        <div className={`absolute left-3 bottom-3 z-[1000] backdrop-blur-sm border rounded-xl px-3 py-2 shadow-lg flex flex-col gap-1 text-xs transition-colors ${
          isDark 
            ? 'bg-[#0a0a0a]/80 text-[#c0c0c0] border-[#1a1a1a]' 
            : 'bg-white/80 text-gray-700 border-gray-200'
        }`}>
          {statusMeta.title && <span className={`font-semibold text-[11px] transition-colors ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>{statusMeta.title}</span>}
          <div className="flex items-center gap-3">
            <span className={`transition-colors ${
              isDark ? 'text-[#c0c0c0]' : 'text-gray-600'
            }`}>Assets: <span className={`font-semibold transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>{validAssets.length}</span></span>
            <span className={`transition-colors ${
              isDark ? 'text-[#c0c0c0]' : 'text-gray-600'
            }`}>Layers: <span className={`font-semibold transition-colors ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>{activeLayers.length}</span></span>
          </div>
          {(statusMeta.scenario || statusMeta.horizon) && (
            <div className="flex items-center gap-2">
              {statusMeta.scenario && <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-100 border border-blue-400/40">{statusMeta.scenario}</span>}
              {statusMeta.horizon && <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-100 border border-emerald-400/40">Horizon {statusMeta.horizon}</span>}
            </div>
          )}
        </div>
      )}
      
      {/* Decorative Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]" 
        style={{ 
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />
    </div>
  );
};

export default MapViewer;
