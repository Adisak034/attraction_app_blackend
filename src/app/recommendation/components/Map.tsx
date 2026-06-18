// =============================================================================
// components/Map.tsx
// =============================================================================
// Component สำหรับแสดงแผนที่ Google Maps แบบฝัง (Embedded) พร้อมการปักหมุด
// 
// ความสามารถหลัก:
// - โหลดและแสดง Google Maps ด้วย API Key และ Map ID (เพื่อรองรับ Advanced Markers)
// - ปักหมุด (Marker) สถานที่สายมูที่ได้รับการแนะนำลงบนแผนที่
// - ปรับมุมมองแผนที่ (Zoom/Center) ให้เห็นทุกหมุดโดยอัตโนมัติ (Fit Bounds)
// - คลิกที่หมุดเพื่อเปิด InfoWindow แสดงรายละเอียดสถานที่แบบย่อ
// - กดปุ่ม "นำทาง" ใน InfoWindow เพื่อพยายามเปิดแอป Google Maps บนมือถือ
//   หรือเปิดเวอร์ชันเว็บหากไม่มีแอป
// =============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { Loader2, Star, Navigation } from 'lucide-react';
import { resolveImageUrl } from '@/lib/apiClient';

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

const openGoogleMapsNavigation = (lat: number, lng: number, placeName: string) => {
    // Try to open native Google Maps app with deep linking
    const appUrl = `comgooglemaps://?daddr=${lat},${lng}&center=${lat},${lng}&q=${encodeURIComponent(placeName)}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Try to open the app
    const appLink = document.createElement('a');
    appLink.href = appUrl;
    appLink.style.display = 'none';
    document.body.appendChild(appLink);
    appLink.click();
    document.body.removeChild(appLink);

    // Set a timeout to open web version as fallback
    // If the app is installed, it will open before the timeout
    setTimeout(() => {
        // Check if app was opened by checking window visibility
        const hidden = document.hidden;
        if (!hidden) {
            // Window is still visible, app likely not installed, open web version
            window.open(webUrl, '_blank');
        }
    }, 500);
};

const Map: React.FC<MapProps> = ({ recommendations, className }) => {
    // ดึงค่า API Key และ Map ID จาก Environment Variables
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

    // โหลด Google Maps JavaScript API
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: MAP_LIBRARIES,
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);
    const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());

    // กรองและแปลงข้อมูลสถานที่เพื่อเตรียมสร้างหมุด (Markers)
    const markerPoints = useMemo(() => {
        return recommendations
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
            .filter((item): item is Recommendation => item !== null);
    }, [recommendations]);

    // เมื่อแผนที่โหลดเสร็จ ให้ปรับมุมมอง (Fit Bounds) ให้เห็นทุกหมุดพร้อมกัน
    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        const bounds = new window.google.maps.LatLngBounds();
        if (markerPoints.length > 0) {
            markerPoints.forEach(place => {
                bounds.extend({ lat: place.lat, lng: place.lng });
            });
            if (markerPoints.length === 1) {
                mapInstance.setCenter({ lat: markerPoints[0].lat, lng: markerPoints[0].lng });
                mapInstance.setZoom(15);
            } else {
                mapInstance.fitBounds(bounds);
            }
        } else {
            mapInstance.setCenter(center);
            mapInstance.setZoom(10);
        }
        setMap(mapInstance);
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

    // แสดงหน้าโหลด หากไม่มี API Key หรือกำลังโหลดสคริปต์
    if (!apiKey) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-[#1A0404] rounded-2xl border border-white/10 ${className}`}>
                <div className="text-center text-red-400 p-4">
                    <p className="font-bold mb-1">Missing Google Maps API Key</p>
                    <p className="text-sm">Please set VITE_GOOGLE_MAPS_API_KEY in .env file</p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return <div className={`flex items-center justify-center bg-[#1A0404] rounded-2xl ${className || ''}`}>Error loading maps</div>;
    }

    if (!isLoaded) {
        return (
            <div className={`flex flex-col items-center justify-center bg-[#1A0404] rounded-2xl border border-white/10 ${className || ''}`}>
                <Loader2 className="w-8 h-8 text-faith-gold animate-spin mb-4" />
                <p className="text-sm text-gray-400 font-medium">กำลังโหลดแผนที่...</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full rounded-2xl overflow-hidden ${className || ''}`}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={center}
                zoom={10}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
            >
                {/* หน้าต่างป๊อปอัป (InfoWindow) เมื่อคลิกที่หมุด */}
                {selectedPlace && (
                    <InfoWindow
                        position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                        onCloseClick={() => setSelectedPlace(null)}
                        options={{
                            pixelOffset: new window.google.maps.Size(0, -30),
                        }}
                    >
                        <div className="p-2 min-w-[200px] text-[#1A0404]">
                            {selectedPlace.image && !brokenImageIds.has(selectedPlace.id) ? (
                                <img
                                    src={resolveImageUrl(selectedPlace.image)}
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
                                onClick={(e) => {
                                    e.preventDefault();
                                    openGoogleMapsNavigation(selectedPlace.lat, selectedPlace.lng, selectedPlace.name);
                                }}
                                href="#"
                                className="flex items-center justify-center gap-2 w-full bg-[#1A0404] text-faith-gold py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer"
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
