"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, MapPin, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PickedLocation {
    lat: string;
    lng: string;
    label: string;
}

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

interface DeliveryMapPickerProps {
    onLocationChange: (location: PickedLocation | null) => void;
}

/* -------------------------------------------------------------------------- */
/*  Inner map component (loaded client-side only)                              */
/* -------------------------------------------------------------------------- */

interface LeafletMapProps {
    center: [number, number];
    onMarkerMove: (lat: number, lng: number) => void;
}

// ⚠️ This sub-component is dynamically imported below to avoid SSR issues with Leaflet
const LeafletMap: React.FC<LeafletMapProps> = ({ center, onMarkerMove }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // cancelled flag — prevents the async Leaflet import callback from running
        // after React StrictMode unmounts + remounts the component (double-invoke).
        let cancelled = false;

        import('leaflet').then((L) => {
            // Bail out if the effect was already cleaned up before the import resolved
            if (cancelled || !mapRef.current) return;
            // Also bail if the container was already registered by a previous run
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((mapRef.current as any)._leaflet_id) return;

            // Fix default marker icons (Webpack / Next.js breaks the default URL)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current!, {
                center,
                zoom: 15,
                zoomControl: true,
            });
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            // Custom pulsing icon for delivery
            const deliveryIcon = L.divIcon({
                html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
          ">
            <div style="
              position: absolute;
              inset: 0;
              background: rgba(22, 163, 74, 0.3);
              border-radius: 50%;
              animation: pulse 2s ease-in-out infinite;
            "></div>
            <div style="
              position: absolute;
              inset: 6px;
              background: #16a34a;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(22,163,74,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.5); opacity: 0; }
            }
          </style>
        `,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
            });

            const marker = L.marker(center, {
                draggable: true,
                icon: deliveryIcon,
            }).addTo(map);
            markerRef.current = marker;

            marker.bindTooltip('Faites glisser pour ajuster', { permanent: false, direction: 'top' });

            // Update coordinates when marker is dragged
            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                onMarkerMove(pos.lat, pos.lng);
            });

            // Click on map moves marker
            map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
                marker.setLatLng([e.latlng.lat, e.latlng.lng]);
                onMarkerMove(e.latlng.lat, e.latlng.lng);
            });
        });

        return () => {
            // Signal the pending async import to abort initialisation
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update map view and marker position when center prop changes
    useEffect(() => {
        if (!mapInstanceRef.current || !markerRef.current) return;
        mapInstanceRef.current.setView(center, 15, { animate: true });
        markerRef.current.setLatLng(center);
    }, [center]);

    return (
        <div
            ref={mapRef}
            style={{ height: '450px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
        />
    );
};

// Dynamic import — avoids SSR crash (Leaflet uses `window`)
const LeafletMapDynamic = dynamic(() => Promise.resolve(LeafletMap), {
    ssr: false,
    loading: () => (
        <div
            style={{ height: '450px' }}
            className="w-full rounded-xl bg-gray-100 flex flex-col items-center justify-center"
        >
            <Loader2 size={24} className="text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500">Chargement de la carte…</span>
        </div>
    ),
});

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({ onLocationChange }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const [pickedLabel, setPickedLabel] = useState('');
    const [markerCoords, setMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchPlace = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchError('');
        setSuggestions([]);
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=0`;
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'fr', 'User-Agent': 'eDoctor-Patient-App/1.0' },
            });
            if (!res.ok) throw new Error('Erreur réseau');
            const data: NominatimResult[] = await res.json();
            if (data.length === 0) {
                setSearchError('Aucun résultat trouvé. Essayez avec un autre nom.');
            } else {
                setSuggestions(data);
            }
        } catch {
            setSearchError('Impossible de rechercher ce lieu. Vérifiez votre connexion.');
        } finally {
            setSearching(false);
        }
    }, []);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setSuggestions([]);
        setSearchError('');
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        // Lancer la recherche automatiquement après 400ms de pause
        if (val.trim().length >= 3) {
            searchTimeout.current = setTimeout(() => {
                searchPlace(val);
            }, 400);
        }
    };

    const handleSelectSuggestion = (result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setMapCenter([lat, lng]);
        setMarkerCoords({ lat, lng });
        setPickedLabel(result.display_name);
        setSuggestions([]);
        setQuery(result.display_name.split(',')[0]);
        onLocationChange({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            label: result.display_name,
        });
    };

    const handleMarkerMove = useCallback((lat: number, lng: number) => {
        setMarkerCoords({ lat, lng });
        onLocationChange({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            label: pickedLabel || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
    }, [onLocationChange, pickedLabel]);

    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setSearchError('');
        setMapCenter(null);
        setMarkerCoords(null);
        setPickedLabel('');
        onLocationChange(null);
    };

    // Leaflet CSS
    useEffect(() => {
        const id = 'leaflet-css';
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
            document.head.appendChild(link);
        }
    }, []);

    return (
        <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={query}
                            onChange={handleQueryChange}
                            onKeyDown={(e) => e.key === 'Enter' && searchPlace(query)}
                            placeholder="Ex: Akwa Douala, Bastos Yaoundé…"
                            className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {query && (
                            <button
                                onClick={handleClear}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => searchPlace(query)}
                        disabled={searching || !query.trim()}
                        className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-green-700 transition-all disabled:opacity-50 shrink-0"
                    >
                        {searching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                        Rechercher
                    </button>
                </div>

                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {suggestions.map((result) => (
                            <button
                                key={result.place_id}
                                type="button"
                                onClick={() => handleSelectSuggestion(result)}
                                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors text-[12px] text-gray-700 border-b border-gray-100 last:border-0"
                            >
                                <MapPin size={13} className="text-primary mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{result.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search error */}
            {searchError && (
                <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-amber-700">{searchError}</span>
                </div>
            )}

            {/* Map */}
            {mapCenter && (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-primary/5 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                        <MapPin size={11} className="text-primary" />
                        <span className="text-[11px] text-gray-600 font-medium">
                            Cliquez sur la carte ou faites glisser le marqueur pour ajuster le point de livraison
                        </span>
                    </div>
                    <LeafletMapDynamic center={mapCenter} onMarkerMove={handleMarkerMove} />
                </div>
            )}

            {/* Confirmed coordinates */}
            {markerCoords && (
                <div className="flex items-start gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle size={13} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-[11px] text-green-700 font-semibold block">
                            Point de livraison confirmé
                        </span>
                        <span className="text-[10px] text-green-600">
                            {markerCoords.lat.toFixed(5)}, {markerCoords.lng.toFixed(5)}
                        </span>
                    </div>
                </div>
            )}

            {!mapCenter && (
                <p className="text-[11px] text-gray-400 italic">
                    Recherchez un quartier ou une adresse, puis affinez le point sur la carte.
                </p>
            )}
        </div>
    );
};

export default DeliveryMapPicker;
