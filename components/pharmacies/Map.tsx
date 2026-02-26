"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pharmacy } from '@/types/common';

interface MapProps {
  pharmacies: Pharmacy[];
  userLat?: number;
  userLng?: number;
}

const Map: React.FC<MapProps> = ({ pharmacies, userLat, userLng }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Icons from legacy project
  const pharmacyIcon = useMemo(() => L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24">
        <path fill="#2E8B57" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91c4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14h-2v-2H7v-2h2v-2h2v2h2v2h-2v2z"/>
      </svg>
    `),
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [0, -35]
  }), []);

  const userIcon = useMemo(() => L.divIcon({
    className: 'user-marker-container',
    html: `
      <div class="user-marker-pulse"></div>
      <div class="user-marker-pulse-delayed"></div>
      <div class="user-marker-outer"></div>
      <div class="user-marker-inner"></div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30]
  }), []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const defaultLat = userLat || 4.051;
    const defaultLng = userLng || 9.768;

    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Geolocation
    map.locate({ setView: false, maxZoom: 16 });

    map.on('locationfound', (e) => {
      // Check if map still exists (prevent 'locationfound' on removed map)
      if (mapRef.current && map === mapRef.current) {
        // Set view manually since we set setView: false
        map.setView(e.latlng, 16);
        
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(e.latlng);
        } else {
          userMarkerRef.current = L.marker(e.latlng, { icon: userIcon })
            .addTo(map)
            .bindPopup("<b>Vous êtes ici</b>")
            .openPopup();
        }
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userIcon, userLat, userLng]);

  // Update markers when pharmacies change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    pharmacies.forEach(pharmacy => {
      const latVal = pharmacy.latitude || (pharmacy as { lat?: string | number }).lat || '0';
      const lngVal = pharmacy.longitude || (pharmacy as { lng?: string | number }).lng || '0';
      
      const lat = parseFloat(String(latVal));
      const lng = parseFloat(String(lngVal));

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        const marker = L.marker([lat, lng], { icon: pharmacyIcon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold text-primary">${pharmacy.name || (pharmacy as { officine_name?: string }).officine_name}</h3>
              <p class="text-xs text-gray-600">${pharmacy.quartier || (pharmacy as { location?: string }).location || ''}</p>
              <button 
                onclick="window.location.href='/pharmacies/${pharmacy.id}'"
                class="mt-2 w-full px-3 py-1 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors"
              >
                Voir les détails
              </button>
            </div>
          `);
        markersRef.current.push(marker);
      }
    });

    if (markersRef.current.length > 0 && mapRef.current) {
        try {
          const group = L.featureGroup(markersRef.current);
          mapRef.current.fitBounds(group.getBounds().pad(0.1));
        } catch (err) {
          console.warn('Map fitBounds failed:', err);
        }
    }
  }, [pharmacies, pharmacyIcon]);

  return (
    <div className="relative w-full h-full border-none">
      <div ref={mapContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
      
      {/* CSS for user marker pulse */}
      <style jsx global>{`
        .user-marker-container {
          position: relative;
          width: 60px;
          height: 60px;
        }
        .user-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background: rgba(46, 139, 87, 0.25);
          border-radius: 50%;
          animation: userPulseExpand 2s ease-out infinite;
        }
        .user-marker-pulse-delayed {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background: rgba(46, 139, 87, 0.2);
          border-radius: 50%;
          animation: userPulseExpand 2s ease-out infinite 0.5s;
        }
        .user-marker-outer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #2e8b57 0%, #246b43 100%);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 15px rgba(46, 139, 87, 0.5);
          z-index: 2;
        }
        .user-marker-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          z-index: 3;
        }
        @keyframes userPulseExpand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 150px;
        }
      `}</style>
    </div>
  );
};

export default Map;
