"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { Pharmacy } from "@/types/common";

interface MapProps {
  pharmacies: Pharmacy[];
  userLat?: number;
  userLng?: number;
  /** Marqueur rouge de livraison personnalisée */
  deliveryLat?: number;
  deliveryLng?: number;
  /** ID de la pharmacie à mettre en évidence */
  highlightedPharmacyId?: string | null;
  /** Callback quand l'utilisateur clique sur la carte */
  onMapClick?: (lat: number, lng: number) => void;
}

/* ── SVG icons ── */
const PHARMACY_ICON_SVG = (highlighted: boolean) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${highlighted ? 44 : 36}" height="${highlighted ? 44 : 36}" viewBox="0 0 36 36">
  <circle cx="18" cy="18" r="18" fill="${highlighted ? '#16A34A' : '#22C55E'}" />
  <rect x="11" y="16" width="14" height="4" rx="2" fill="white"/>
  <rect x="16" y="11" width="4" height="14" rx="2" fill="white"/>
  ${highlighted ? '<circle cx="18" cy="18" r="16" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>' : ''}
</svg>`;

const USER_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
  <circle cx="11" cy="11" r="11" fill="rgba(59,130,246,0.2)"/>
  <circle cx="11" cy="11" r="7" fill="#3B82F6" stroke="white" stroke-width="2"/>
</svg>`;

const DELIVERY_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z" fill="#EF4444"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
  <circle cx="16" cy="16" r="4" fill="#EF4444"/>
</svg>`;

function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, google.maps.Marker>>(new globalThis.Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const defaultCenter = useMemo(() => ({
    lat: userLat ?? 3.8667,
    lng: userLng ?? 11.5167,
  }), [userLat, userLng]);

  /* ── Init map ── */
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      const map = new google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });

      mapRef.current = map;
      infoWindowRef.current = new google.maps.InfoWindow();
      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: { strokeColor: "#22C55E", strokeWeight: 4, strokeOpacity: 0.8 },
      });
      directionsRendererRef.current.setMap(map);

      // User position marker
      if (userLat && userLng) {
        userMarkerRef.current = new google.maps.Marker({
          position: { lat: userLat, lng: userLng },
          map,
          icon: { url: svgToDataUrl(USER_ICON_SVG), scaledSize: new google.maps.Size(22, 22), anchor: new google.maps.Point(11, 11) },
          title: "Votre position",
          zIndex: 999,
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Map click handler ── */
  useEffect(() => {
    if (!mapRef.current) return;
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    if (onMapClick) {
      clickListenerRef.current = mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
      });
    }
    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [onMapClick]);

  /* ── Cursor quand mode pointeur ── */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.style.cursor = onMapClick ? "crosshair" : "";
  }, [onMapClick]);

  /* ── Marqueurs pharmacies ── */
  useEffect(() => {
    if (!mapRef.current || typeof google === "undefined") return;

    // Remove old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarker = false;

    pharmacies.forEach((pharmacy) => {
      const p = pharmacy as unknown as Record<string, unknown>;
      const lat = parseFloat(String(pharmacy.latitude ?? p.lat ?? 0));
      const lng = parseFloat(String(pharmacy.longitude ?? p.lng ?? 0));
      if (isNaN(lat) || isNaN(lng) || lat === 0) return;

      const name = pharmacy.name || pharmacy.officine_name || "Pharmacie";
      const address = pharmacy.quartier || pharmacy.location || pharmacy.address || "";
      const isHighlighted = highlightedPharmacyId === String(pharmacy.id);

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: mapRef.current!,
        title: name,
        icon: {
          url: svgToDataUrl(PHARMACY_ICON_SVG(isHighlighted)),
          scaledSize: new google.maps.Size(isHighlighted ? 44 : 36, isHighlighted ? 44 : 36),
          anchor: new google.maps.Point(isHighlighted ? 22 : 18, isHighlighted ? 44 : 36),
        },
        zIndex: isHighlighted ? 100 : 1,
      });

      const infoContent = `
        <div style="padding:12px;min-width:180px;font-family:Inter,sans-serif;">
          <p style="font-weight:700;color:#1E293B;font-size:14px;margin:0 0 4px">${name}</p>
          ${address ? `<p style="color:#94A3B8;font-size:12px;margin:0 0 10px">${address}</p>` : ""}
          <button
            onclick="window.location.href='/pharmacies/${pharmacy.id}'"
            style="width:100%;padding:8px;background:#22C55E;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;"
          >
            Commander ici
          </button>
        </div>`;

      marker.addListener("click", () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open(mapRef.current!, marker);
        }
      });

      markersRef.current.set(String(pharmacy.id), marker);
      bounds.extend({ lat, lng });
      hasValidMarker = true;
    });

    if (hasValidMarker && mapRef.current) {
      try {
        mapRef.current.fitBounds(bounds, 60);
        const listener = mapRef.current.addListener("idle", () => {
          const zoom = mapRef.current?.getZoom() ?? 13;
          if (zoom > 15) mapRef.current?.setZoom(15);
          google.maps.event.removeListener(listener);
        });
      } catch {
        // silent
      }
    }
  }, [pharmacies, highlightedPharmacyId]);

  /* ── Highlighted marker ── */
  useEffect(() => {
    if (typeof google === "undefined") return;
    markersRef.current.forEach((marker, id) => {
      const isHighlighted = id === highlightedPharmacyId;
      marker.setIcon({
        url: svgToDataUrl(PHARMACY_ICON_SVG(isHighlighted)),
        scaledSize: new google.maps.Size(isHighlighted ? 44 : 36, isHighlighted ? 44 : 36),
        anchor: new google.maps.Point(isHighlighted ? 22 : 18, isHighlighted ? 44 : 36),
      });
      marker.setZIndex(isHighlighted ? 100 : 1);

      if (isHighlighted && mapRef.current) {
        mapRef.current.panTo(marker.getPosition()!);
        // Itinéraire depuis la position utilisateur
        if (userLat && userLng) {
          const pos = marker.getPosition()!;
          const directionsService = new google.maps.DirectionsService();
          directionsService.route(
            {
              origin: { lat: userLat, lng: userLng },
              destination: pos,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === "OK" && directionsRendererRef.current) {
                directionsRendererRef.current.setDirections(result);
              }
            }
          );
        }
      }
    });

    // Clear itinéraire si aucune sélection
    if (!highlightedPharmacyId && directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    }
  }, [highlightedPharmacyId, userLat, userLng]);

  /* ── Marqueur livraison ── */
  useEffect(() => {
    if (!mapRef.current || typeof google === "undefined") return;

    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setMap(null);
      deliveryMarkerRef.current = null;
    }

    if (deliveryLat && deliveryLng) {
      deliveryMarkerRef.current = new google.maps.Marker({
        position: { lat: deliveryLat, lng: deliveryLng },
        map: mapRef.current,
        title: "Adresse de livraison",
        icon: {
          url: svgToDataUrl(DELIVERY_ICON_SVG),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
        zIndex: 998,
      });

      const infoContent = `<div style="padding:8px;font-family:Inter,sans-serif;font-weight:600;color:#EF4444;font-size:13px;">📍 Adresse de livraison</div>`;
      deliveryMarkerRef.current.addListener("click", () => {
        infoWindowRef.current?.setContent(infoContent);
        infoWindowRef.current?.open(mapRef.current!, deliveryMarkerRef.current!);
      });
    }
  }, [deliveryLat, deliveryLng]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full rounded-none" />
    </div>
  );
};

export default Map;
