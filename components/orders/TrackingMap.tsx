"use client";

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Clock } from 'lucide-react';

interface TrackingMapProps {
  pharmacyLat: number;
  pharmacyLng: number;
  patientLat: number;
  patientLng: number;
  status: string;
}

const TrackingMap: React.FC<TrackingMapProps> = ({
  pharmacyLat,
  pharmacyLng,
  patientLat,
  patientLng,
  status,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  // ─── Icons ───
  const pharmacyIcon = useMemo(() => L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
        <path fill="#2E8B57" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91c4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14h-2v-2H7v-2h2v-2h2v2h2v2h-2v2z"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  }), []);

  const patientIcon = useMemo(() => L.divIcon({
    className: 'patient-marker',
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.15);animation:pulse-ring 2s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:14px;line-height:1;">📍</span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  }), []);

  const driverIcon = useMemo(() => L.divIcon({
    className: 'driver-marker',
    html: `
      <div style="position:relative;width:48px;height:48px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(245,158,11,0.2);animation:pulse-ring 1.5s ease-out infinite;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="font-size:20px;line-height:1;">🛵</span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  }), []);

  // ─── Generate simple route waypoints between two points ───
  const routePoints = useMemo((): L.LatLngExpression[] => {
    const steps = 20;
    const points: L.LatLngExpression[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = pharmacyLat + (patientLat - pharmacyLat) * t;
      const lng = pharmacyLng + (patientLng - pharmacyLng) * t;
      // Add slight curve for realism
      const offset = Math.sin(t * Math.PI) * 0.002;
      points.push([lat + offset, lng - offset]);
    }
    return points;
  }, [pharmacyLat, pharmacyLng, patientLat, patientLng]);

  // ─── Interpolate position along route ───
  const getPositionAlongRoute = useCallback((progress: number): [number, number] => {
    const pts = routePoints as [number, number][];
    const totalSegments = pts.length - 1;
    const segmentFloat = progress * totalSegments;
    const segIdx = Math.min(Math.floor(segmentFloat), totalSegments - 1);
    const t = segmentFloat - segIdx;
    const [lat1, lng1] = pts[segIdx];
    const [lat2, lng2] = pts[segIdx + 1];
    return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
  }, [routePoints]);

  // ─── Initialize map ───
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Pharmacy marker
    L.marker([pharmacyLat, pharmacyLng], { icon: pharmacyIcon })
      .addTo(map)
      .bindPopup('<b>Pharmacie</b><br/>Point de départ');

    // Patient marker
    L.marker([patientLat, patientLng], { icon: patientIcon })
      .addTo(map)
      .bindPopup('<b>Votre adresse</b><br/>Point de livraison');

    // Route polyline
    routeLineRef.current = L.polyline(routePoints, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '10 6',
    }).addTo(map);

    // Fit bounds
    const bounds = L.latLngBounds([
      [pharmacyLat, pharmacyLng],
      [patientLat, patientLng],
    ]);
    map.fitBounds(bounds.pad(0.3));

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Animate driver for active delivery statuses ───
  useEffect(() => {
    const isDelivery = ['DELIVERY', 'IN_PICKUP', 'ARRIVED'].includes(status?.toUpperCase());
    if (!isDelivery || !mapRef.current) {
      // Remove driver marker if not in delivery
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }

    // Create driver marker if it doesn't exist
    if (!driverMarkerRef.current) {
      const startPos = getPositionAlongRoute(progressRef.current);
      driverMarkerRef.current = L.marker(startPos, { icon: driverIcon })
        .addTo(mapRef.current)
        .bindPopup('<b>🛵 Livreur</b><br/>En route vers vous');
    }

    // Animate
    let lastTime = performance.now();
    const speed = 0.015; // progress per second (~67s for full route)

    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      progressRef.current = Math.min(progressRef.current + speed * dt, 1);

      if (progressRef.current >= 1) {
        progressRef.current = 0; // Loop for simulation
      }

      const pos = getPositionAlongRoute(progressRef.current);
      driverMarkerRef.current?.setLatLng(pos);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, driverIcon, getPositionAlongRoute]);

  // Compute estimated time
  const isDeliveryActive = ['DELIVERY', 'IN_PICKUP', 'ARRIVED'].includes(status?.toUpperCase());
  const etaMinutes = isDeliveryActive ? Math.max(3, Math.round((1 - progressRef.current) * 25)) : null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* ETA Badge */}
      {isDeliveryActive && (
        <div className="absolute top-4 left-4 z-1000 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <Clock size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Temps estimé</p>
              <p className="text-lg font-black text-gray-900 leading-tight">
                ~{etaMinutes} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-100">
        <div className="flex flex-col gap-1.5 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary"></span>
            <span className="text-gray-600">Pharmacie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Votre adresse</span>
          </div>
          {isDeliveryActive && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600">Livreur</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-[350px] md:h-[400px]" />

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .patient-marker, .driver-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default TrackingMap;
