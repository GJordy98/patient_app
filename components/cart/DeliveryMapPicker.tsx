"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/google-maps-loader';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PickedLocation {
  lat: string;
  lng: string;
  label: string;
}

interface DeliveryMapPickerProps {
  onLocationChange: (location: PickedLocation | null) => void;
}

/* -------------------------------------------------------------------------- */
/*  SVG marker                                                                 */
/* -------------------------------------------------------------------------- */

const DELIVERY_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="rgba(22,163,74,0.25)"/>
  <circle cx="20" cy="20" r="13" fill="#16a34a" stroke="white" stroke-width="2.5"/>
  <path d="M20 12 C15.59 12 12 15.59 12 20 C12 25.5 20 32 20 32 C20 32 28 25.5 28 20 C28 15.59 24.41 12 20 12Z" fill="white" opacity="0.9"/>
  <circle cx="20" cy="19.5" r="3" fill="#16a34a"/>
</svg>`;

function svgToUrl(svg: string) {
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({ onLocationChange }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [pickedLabel, setPickedLabel] = useState('');
  const [markerCoords, setMarkerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load Google Maps ── */
  useEffect(() => {
    loadGoogleMaps().then(() => {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      setMapsReady(true);
    });
  }, []);

  /* ── Init map quand visible ── */
  useEffect(() => {
    if (!mapVisible || !mapsReady || !mapContainerRef.current || mapRef.current) return;

    const defaultCenter = markerCoords
      ? { lat: markerCoords.lat, lng: markerCoords.lng }
      : { lat: 3.8667, lng: 11.5167 };

    const map = new google.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapRef.current = map;
    placesServiceRef.current = new google.maps.places.PlacesService(map);

    // Marqueur draggable
    const marker = new google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      title: 'Faites glisser pour ajuster',
      icon: {
        url: svgToUrl(DELIVERY_MARKER_SVG),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      },
    });
    markerRef.current = marker;

    const updateFromLatLng = (lat: number, lng: number) => {
      setMarkerCoords({ lat, lng });
      onLocationChange({
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        label: pickedLabel || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    };

    marker.addListener('dragend', () => {
      const pos = marker.getPosition()!;
      updateFromLatLng(pos.lat(), pos.lng());
    });

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      updateFromLatLng(e.latLng.lat(), e.latLng.lng());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVisible, mapsReady]);

  /* ── Mettre à jour la vue + marqueur quand les coords changent ── */
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !markerCoords) return;
    const pos = { lat: markerCoords.lat, lng: markerCoords.lng };
    mapRef.current.panTo(pos);
    markerRef.current.setPosition(pos);
  }, [markerCoords]);

  /* ── Autocomplete Places ── */
  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) return;
    setSearching(true);
    setSearchError('');
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input,
        sessionToken: sessionTokenRef.current ?? undefined,
        componentRestrictions: { country: ['cm', 'ci', 'sn', 'mg', 'cd', 'ga', 'cg', 'gn'] },
        types: ['geocode', 'establishment'],
      },
      (predictions, status) => {
        setSearching(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
          setSearchError('Aucun résultat. Essayez avec un autre nom de quartier ou adresse.');
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSuggestions([]);
    setSearchError('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.trim().length >= 2) {
      searchTimeout.current = setTimeout(() => fetchSuggestions(val), 350);
    }
  };

  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    setSuggestions([]);
    setQuery(prediction.structured_formatting.main_text);
    setSearching(true);

    // Renew session token after selection
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

    // Géocode le lieu
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      setSearching(false);
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        const label = results[0].formatted_address;

        setPickedLabel(label);
        setMarkerCoords({ lat, lng });
        setMapVisible(true);
        onLocationChange({ lat: lat.toFixed(6), lng: lng.toFixed(6), label });
      }
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setSearchError('');
    setMapVisible(false);
    setMarkerCoords(null);
    setPickedLabel('');
    mapRef.current = null;
    markerRef.current = null;
    onLocationChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Ex: Akwa Douala, Bastos Yaoundé…"
            disabled={!mapsReady}
            className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
          {searching && (
            <Loader2 size={13} className="absolute right-8 top-1/2 -translate-y-1/2 text-primary animate-spin" />
          )}
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((pred) => (
              <button
                key={pred.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(pred)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors text-[12px] text-gray-700 border-b border-gray-100 last:border-0"
              >
                <MapPin size={13} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium block">{pred.structured_formatting.main_text}</span>
                  <span className="text-gray-400 text-[11px]">{pred.structured_formatting.secondary_text}</span>
                </div>
              </button>
            ))}
            <div className="flex items-center justify-end px-3 py-1.5 bg-gray-50 border-t border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Erreur */}
      {searchError && (
        <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
          <span className="text-[11px] text-amber-700">{searchError}</span>
        </div>
      )}

      {/* Map */}
      {mapVisible && (
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="bg-primary/5 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
            <MapPin size={11} className="text-primary" />
            <span className="text-[11px] text-gray-600 font-medium">
              Cliquez sur la carte ou faites glisser le marqueur pour ajuster le point de livraison
            </span>
          </div>
          <div ref={mapContainerRef} style={{ height: '380px', width: '100%' }} />
        </div>
      )}

      {/* Coordonnées confirmées */}
      {markerCoords && (
        <div className="flex items-start gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle size={13} className="text-green-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-[11px] text-green-700 font-semibold block">
              {pickedLabel || 'Point de livraison confirmé'}
            </span>
            <span className="text-[10px] text-green-600">
              {markerCoords.lat.toFixed(5)}, {markerCoords.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {!mapVisible && (
        <p className="text-[11px] text-gray-400 italic">
          Recherchez un quartier ou une adresse pour afficher la carte et ajuster le point de livraison.
        </p>
      )}
    </div>
  );
};

export default DeliveryMapPicker;
