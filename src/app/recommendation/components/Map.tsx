import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { Loader2, Star, Navigation } from 'lucide-react';

const MAP_LIBRARIES: ('marker')[] = ['marker'];

interface Recommendation {
    id: string;
    name: string;
    type: string;
    category: string;
    lat: number;
    lng: number;
    score: number;
    image?: string;
}

interface MapProps {
    recommendations: Recommendation[];
    className?: string;
}

const defaultContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const center = {
    lat: 13.8196, // Default center (Nakhon Pathom approx)
    lng: 100.0443
};

const mapStyles: google.maps.MapTypeStyle[] = [
        {
            "elementType": "geometry",
            "stylers": [{ "color": "#242f3e" }]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#242f3e" }]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#746855" }]
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#d59563" }]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#d59563" }]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{ "color": "#263c3f" }]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#6b9a76" }]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{ "color": "#38414e" }]
        },
        {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#212a37" }]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#9ca5b3" }]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{ "color": "#746855" }]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{ "color": "#1f2835" }]
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#f3d19c" }]
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [{ "color": "#2f3948" }]
        },
        {
            "featureType": "transit.station",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#d59563" }]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#17263c" }]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#515c6d" }]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#17263c" }]
        }
    ];

const toNumber = (value: unknown): number | null => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
};

const isValidLatLng = (lat: number, lng: number): boolean => {
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    // Treat (0, 0) as invalid app data in this project.
    if (lat === 0 && lng === 0) return false;
    return true;
};

const Map: React.FC<MapProps> = ({ recommendations, className }) => {
    const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
    const mapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || '').trim() || 'DEMO_MAP_ID';

    const mapOptions = useMemo<google.maps.MapOptions>(() => {
        const baseOptions: google.maps.MapOptions = {
            disableDefaultUI: true,
            zoomControl: true,
        };

        if (mapId) {
            return {
                ...baseOptions,
                mapId,
            };
        }

        return {
            ...baseOptions,
            styles: mapStyles,
        };
    }, [mapId]);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: MAP_LIBRARIES,
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);
    const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

    const markerPoints = useMemo(() => recommendations
        .map((place) => {
            const lat = toNumber(place.lat);
            const lng = toNumber(place.lng);
            if (lat === null || lng === null || !isValidLatLng(lat, lng)) {
                return null;
            }
            return {
                ...place,
                lat,
                lng,
            };
        })
        .filter((item): item is Recommendation => item !== null), [recommendations]);

    const onLoad = useCallback((map: google.maps.Map) => {
        const bounds = new window.google.maps.LatLngBounds();
        if (markerPoints.length > 0) {
            markerPoints.forEach(place => {
                bounds.extend({ lat: place.lat, lng: place.lng });
            });
            if (markerPoints.length === 1) {
                map.setCenter({ lat: markerPoints[0].lat, lng: markerPoints[0].lng });
                map.setZoom(15);
            } else {
                map.fitBounds(bounds);
            }
        } else {
            map.setCenter(center);
            map.setZoom(10);
        }
        setMap(map);
    }, [markerPoints]);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    useEffect(() => {
        if (!isLoaded || !map || !window.google?.maps?.marker?.AdvancedMarkerElement) {
            return;
        }

        const markerInstances: google.maps.marker.AdvancedMarkerElement[] = [];
        const markerListeners: google.maps.MapsEventListener[] = [];

        markerPoints.forEach((place) => {
            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat: place.lat, lng: place.lng },
                title: place.name,
            });

            const clickListener = marker.addListener('click', () => {
                setSelectedPlace(place);
            });

            markerInstances.push(marker);
            markerListeners.push(clickListener);
        });

        return () => {
            markerListeners.forEach((listener) => listener.remove());
            markerInstances.forEach((marker) => {
                marker.map = null;
            });
        };
    }, [isLoaded, map, markerPoints]);

    if (loadError) {
        return (
            <div className={`w-full h-[500px] flex items-center justify-center bg-black/40 rounded-[1.5rem] border border-red-400/40 p-6 text-center ${className}`}>
                <p className="text-sm text-red-200 font-semibold">
                    โหลด Google Maps ไม่สำเร็จ กรุณาตรวจสอบ API key, API restrictions และเปิดใช้ Maps JavaScript API
                </p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className={`w-full h-[500px] flex items-center justify-center bg-black/40 rounded-[1.5rem] border border-white/10 ${className}`}>
                <Loader2 className="animate-spin text-faith-gold" size={48} />
            </div>
        );
    }

    return (
        <div className={`relative w-full ${className || "h-[500px]"}`}>
            {!apiKey && (
                <div className="absolute top-0 left-0 w-full z-50 bg-red-900/80 text-white p-2 text-center text-xs font-bold rounded-t-[1.5rem]">
                    คำเตือน: ไม่พบ VITE_GOOGLE_MAPS_API_KEY ในไฟล์ .env
                </div>
            )}
            {apiKey && recommendations.length > 0 && markerPoints.length === 0 && (
                <div className="absolute top-0 left-0 w-full z-50 bg-amber-900/80 text-white p-2 text-center text-xs font-bold rounded-t-[1.5rem]">
                    ไม่พบพิกัดที่ถูกต้องสำหรับปักหมุดจากข้อมูลที่ได้รับ
                </div>
            )}
            <GoogleMap
                mapContainerStyle={{ ...defaultContainerStyle, height: '100%' }}
                center={center}
                zoom={10}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {selectedPlace && (
                    <InfoWindow
                        position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                        onCloseClick={() => setSelectedPlace(null)}
                        options={{
                            pixelOffset: new window.google.maps.Size(0, -30),
                            // maxWidth: 300 // Can control width if needed
                        }}
                    >
                        <div className="p-2 min-w-[200px] text-[#1A0404]">
                            {selectedPlace.image && !brokenImageIds.has(selectedPlace.id) ? (
                                <img
                                    src={selectedPlace.image}
                                    alt={selectedPlace.name}
                                    className="w-full h-28 object-cover rounded-md mb-2"
                                    onError={() => {
                                        setBrokenImageIds((prev) => {
                                            const next = new Set(prev);
                                            next.add(selectedPlace.id);
                                            return next;
                                        });
                                    }}
                                />
                            ) : (
                                <div className="w-full h-28 rounded-md mb-2 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-sm font-semibold">
                                    No Image
                                </div>
                            )}
                            <h3 className="text-lg font-black mb-1">{selectedPlace.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-faith-gold/20 text-xs font-bold rounded text-[#8B7500]">{selectedPlace.type}</span>
                                <div className="flex items-center gap-1 text-amber-600">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-xs font-bold">{selectedPlace.score.toFixed(2)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">{selectedPlace.category}</p>

                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full bg-[#1A0404] text-faith-gold py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors"
                            >
                                <Navigation size={14} />
                                นำทาง
                            </a>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div >
    );
};

export default Map;
