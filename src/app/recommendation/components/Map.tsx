import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Loader2, Star, Navigation } from 'lucide-react';

interface Recommendation {
    id: string;
    name: string;
    type: string;
    category: string;
    lat: number;
    lng: number;
    score: number;
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

const options = {
    styles: [
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
    ],
    disableDefaultUI: true,
    zoomControl: true,
};

const Map: React.FC<MapProps> = ({ recommendations, className }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const [, setMap] = useState<google.maps.Map | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Recommendation | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        const bounds = new window.google.maps.LatLngBounds();
        if (recommendations.length > 0) {
            recommendations.forEach(place => {
                if (place.lat && place.lng) {
                    bounds.extend({ lat: place.lat, lng: place.lng });
                }
            });
            if (recommendations.length === 1) {
                map.setCenter({ lat: recommendations[0].lat, lng: recommendations[0].lng });
                map.setZoom(15);
            } else {
                map.fitBounds(bounds);
            }
        } else {
            map.setCenter(center);
            map.setZoom(10);
        }
        setMap(map);
    }, [recommendations]);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    if (!isLoaded) {
        return (
            <div className={`w-full h-[500px] flex items-center justify-center bg-black/40 rounded-[1.5rem] border border-white/10 ${className}`}>
                <Loader2 className="animate-spin text-faith-gold" size={48} />
            </div>
        );
    }

    return (
        <div className={`relative w-full ${className || "h-[500px]"}`}>
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                <div className="absolute top-0 left-0 w-full z-50 bg-red-900/80 text-white p-2 text-center text-xs font-bold rounded-t-[1.5rem]">
                    คำเตือน: ไม่พบ VITE_GOOGLE_MAPS_API_KEY ในไฟล์ .env
                </div>
            )}
            <GoogleMap
                mapContainerStyle={{ ...defaultContainerStyle, height: '100%' }}
                center={center}
                zoom={10}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={options}
            >
                {recommendations.map((place) => (
                    place.lat && place.lng ? (
                        <Marker
                            key={place.id}
                            position={{ lat: place.lat, lng: place.lng }}
                            onClick={() => setSelectedPlace(place)}
                            // icon={{
                            //   path: google.maps.SymbolPath.CIRCLE,
                            //   scale: 10,
                            //   fillColor: "#D4AF37",
                            //   fillOpacity: 1,
                            //   strokeWeight: 2,
                            //   strokeColor: "#FFFFFF",
                            // }}
                            animation={window.google.maps.Animation.DROP}
                        />
                    ) : null
                ))}

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
