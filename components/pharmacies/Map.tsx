"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Pharmacy } from "@/types/common";

interface MapProps {
  pharmacies: Pharmacy[];
  userLat?: number;
  userLng?: number;
  /** Marqueur rouge de livraison personnalisée */
  deliveryLat?: number;
  deliveryLng?: number;
  /** ID de la pharmacie à mettre en évidence (hover depuis la liste) */
  highlightedPharmacyId?: string | null;
  /** Callback quand l'utilisateur clique sur la carte (mode "pointer") */
  onMapClick?: (lat: number, lng: number) => void;
}

const Map: React.FC<MapProps> = ({
  pharmacies,
  userLat,
  userLng,
  deliveryLat,
  deliveryLng,
  highlightedPharmacyId,
  onMapClick,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map<string, L.Marker>());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const deliveryMarkerRef = useRef<L.Marker | null>(null);

  /* ── Icons ── */
  const pharmacyIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;background:#22C55E;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(34,197,94,0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="transform:rotate(45deg);color:white;font-size:14px;font-weight:bold;">+</div>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -38],
      }),
    []
  );

  const pharmacyHighlightIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width:42px;height:42px;background:#16A34A;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(34,197,94,0.6);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="transform:rotate(45deg);color:white;font-size:16px;font-weight:bold;">+</div>
        </div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
        popupAnchor: [0, -44],
      }),
    []
  );

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: "user-location-marker",
        html: `<div class="user-pulse-ring"></div><div class="user-dot"></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      }),
    []
  );

  const deliveryIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
          width:32px;height:32px;background:#EF4444;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,0.4);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      }),
    []
  );

  /* ── Init map ── */
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) return;

    const lat = userLat ?? 3.8667;
    const lng = userLng ?? 11.5167;
    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([lat, lng], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // User position marker
    if (userLat && userLng) {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<b>Votre position</b>");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Map click handler ── */
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handler = (e: L.LeafletMouseEvent) => {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  /* ── Update cursor style when in pointer mode ── */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.style.cursor = onMapClick ? "crosshair" : "grab";
  }, [onMapClick]);

  /* ── Update pharmacy markers ── */
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const validMarkers: L.Marker[] = [];

    pharmacies.forEach((pharmacy) => {
      const p = pharmacy as unknown as Record<string, unknown>;
      const lat = parseFloat(String(pharmacy.latitude ?? p.lat ?? 0));
      const lng = parseFloat(String(pharmacy.longitude ?? p.lng ?? 0));
      if (isNaN(lat) || isNaN(lng) || lat === 0) return;

      const name = pharmacy.name || pharmacy.officine_name || "Pharmacie";
      const address = pharmacy.quartier || pharmacy.location || pharmacy.address || "";

      const isHighlighted = highlightedPharmacyId === String(pharmacy.id);

      const marker = L.marker([lat, lng], { icon: isHighlighted ? pharmacyHighlightIcon : pharmacyIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="padding:12px;min-width:180px;font-family:Inter,sans-serif;">
            <p style="font-weight:700;color:#1E293B;font-size:14px;margin:0 0 4px">${name}</p>
            ${address ? `<p style="color:#94A3B8;font-size:12px;margin:0 0 10px">${address}</p>` : ""}
            <button
              onclick="window.location.href='/pharmacies/${pharmacy.id}'"
              style="width:100%;padding:8px;background:#22C55E;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;"
            >
              Commander ici
            </button>
          </div>
        `);

      markersRef.current.set(String(pharmacy.id), marker);
      validMarkers.push(marker);
    });

    // Fit bounds
    if (validMarkers.length > 0 && mapRef.current) {
      try {
        const group = L.featureGroup(validMarkers);
        mapRef.current.fitBounds(group.getBounds().pad(0.15), { maxZoom: 15 });
      } catch {
        // silent
      }
    }
  }, [pharmacies, pharmacyIcon, pharmacyHighlightIcon, highlightedPharmacyId]);

  /* ── Update highlighted marker icon ── */
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(id === highlightedPharmacyId ? pharmacyHighlightIcon : pharmacyIcon);
      if (id === highlightedPharmacyId && mapRef.current) {
        const latlng = marker.getLatLng();
        mapRef.current.panTo(latlng, { animate: true, duration: 0.5 });
        marker.openPopup();
      }
    });
  }, [highlightedPharmacyId, pharmacyIcon, pharmacyHighlightIcon]);

  /* ── Delivery marker ── */
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old delivery marker
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
      deliveryMarkerRef.current = null;
    }

    if (deliveryLat && deliveryLng) {
      deliveryMarkerRef.current = L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
        .addTo(mapRef.current)
        .bindPopup("<b style='color:#EF4444'>Adresse de livraison</b>")
        .openPopup();
    }
  }, [deliveryLat, deliveryLng, deliveryIcon]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      <style>{`
        .user-location-marker {
          position: relative;
          width: 44px;
          height: 44px;
        }
        .user-pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.2);
          animation: userPulse 2s ease-out infinite;
        }
        .user-dot {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 18px; height: 18px;
          background: #3B82F6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
        }
        @keyframes userPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 0 !important;
          box-shadow: 0 4px 20px rgba(30,41,59,0.12) !important;
          border: 1px solid #E2E8F0 !important;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
};

export default Map;
