/**
 * Live Tracking Page
 * Real-time map visualization of fleet using Leaflet
 */

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import {
    Truck, Navigation, Clock, MapPin, Search, Filter,
    Maximize2, RefreshCw, AlertTriangle, Layers, User
} from 'lucide-react';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const truckIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2554/2554936.png', // Placeholder URL - replaced below with SVG if needed
    iconSize: [38, 38],
    className: 'truck-marker-icon'
});

// Component to handle map flying to location
function FlyToLocation({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 13, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
}

export default function LiveTrackingPage() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('all'); // all, active, delayed

    // Mock Data - Simulating backend response
    useEffect(() => {
        const loadMockData = () => {
            setIsRefreshing(true);

            // In real app: const res = await axios.get('/api/tracking/live');
            const mockData = [
                {
                    id: 'TRK-001',
                    driver: 'Rajesh Kumar',
                    status: 'moving', // moving, stopped, idle
                    speed: 45,
                    location: [19.0760, 72.8777], // Mumbai
                    destination: [18.5204, 73.8567], // Pune
                    route: [[19.0760, 72.8777], [18.9000, 73.0000], [18.7000, 73.4000], [18.5204, 73.8567]],
                    lastUpdate: new Date().toISOString(),
                    temp: 24, // for reefer trucks
                    battery: 85
                },
                {
                    id: 'TRK-002',
                    driver: 'Vikram Singh',
                    status: 'stopped',
                    speed: 0,
                    location: [28.7041, 77.1025], // Delhi
                    destination: [26.9124, 75.7873], // Jaipur
                    route: [[28.7041, 77.1025], [28.0000, 76.5000], [27.5000, 76.0000], [26.9124, 75.7873]],
                    lastUpdate: new Date().toISOString(),
                    temp: null,
                    battery: 12
                },
                {
                    id: 'TRK-003',
                    driver: 'Amit Patel',
                    status: 'moving',
                    speed: 62,
                    location: [12.9716, 77.5946], // Bangalore
                    destination: [13.0827, 80.2707], // Chennai
                    route: [[12.9716, 77.5946], [12.9000, 78.5000], [13.0000, 79.5000], [13.0827, 80.2707]],
                    lastUpdate: new Date().toISOString(),
                    temp: 18,
                    battery: 92
                }
            ];

            setVehicles(mockData);
            setTimeout(() => setIsRefreshing(false), 800);
        };

        loadMockData();
        const interval = setInterval(loadMockData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    // Filter logic
    const filteredVehicles = vehicles.filter(v =>
        (v.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.driver.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (viewMode === 'all' ||
            (viewMode === 'active' && v.status === 'moving') ||
            (viewMode === 'delayed' && v.speed === 0))
    );

    // Map starting center (Center of India roughly)
    const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
    const [zoom, setZoom] = useState(5);

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
        setMapCenter(vehicle.location);
        setZoom(12);
    };

    return (
        <div className="flex bg-slate-900 h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar List */}
            <div className="w-96 bg-slate-800/50 border-r border-slate-700 md:flex flex-col hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Navigation className="text-cyan-400" /> Live Fleet</span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">{vehicles.length} Active</span>
                    </h2>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search vehicle or driver..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        {['all', 'active', 'delayed'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${viewMode === mode
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredVehicles.map(vehicle => (
                        <div
                            key={vehicle.id}
                            onClick={() => handleVehicleSelect(vehicle)}
                            className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${selectedVehicle?.id === vehicle.id ? 'bg-cyan-500/10 border-l-4 border-l-cyan-500' : ''
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-white font-bold">{vehicle.id}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <User className="w-3 h-3" /> {vehicle.driver}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${vehicle.status === 'moving' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {vehicle.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                <div className="bg-slate-900/50 p-1.5 rounded flex items-center gap-2 text-slate-300">
                                    <Clock className="w-3 h-3 text-cyan-400" />
                                    {vehicle.speed} km/h
                                </div>
                                <div className="bg-slate-900/50 p-1.5 rounded flex items-center gap-2 text-slate-300">
                                    <AlertTriangle className={`w-3 h-3 ${vehicle.battery < 20 ? 'text-red-400' : 'text-green-400'}`} />
                                    {vehicle.battery}% Batt
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredVehicles.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No vehicles found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Map Area */}
            <div className="flex-1 relative bg-slate-900">
                {/* Map Toolbar */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <button
                        onClick={() => { setMapCenter([20.5937, 78.9629]); setZoom(5); setSelectedVehicle(null); }}
                        className="bg-slate-800 p-2 rounded-lg text-white shadow-lg border border-slate-600 hover:bg-slate-700"
                        title="Reset View"
                    >
                        <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                        className="bg-slate-800 p-2 rounded-lg text-white shadow-lg border border-slate-600 hover:bg-slate-700"
                        title="Toggle Layers"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                    {isRefreshing && (
                        <div className="bg-slate-800 p-2 rounded-lg text-cyan-400 shadow-lg border border-slate-600 animate-spin">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                    )}
                </div>

                <MapContainer
                    center={mapCenter}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <FlyToLocation center={selectedVehicle?.location || mapCenter} zoom={selectedVehicle ? 12 : 5} />

                    {/* Dark Mode Map Style - CartoDB Dark Matter */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    {/* Vehicle Markers */}
                    {filteredVehicles.map(vehicle => (
                        <Marker
                            key={vehicle.id}
                            position={vehicle.location}
                        >
                            <Popup className="custom-popup">
                                <div className="p-2">
                                    <h3 className="font-bold text-gray-900">{vehicle.id}</h3>
                                    <p className="text-sm text-gray-600">{vehicle.driver}</p>
                                    <div className="mt-2 flex gap-2 text-xs">
                                        <span className="font-bold">{vehicle.speed} km/h</span> |
                                        <span className={vehicle.status === 'moving' ? 'text-green-600' : 'text-red-600'}>
                                            {vehicle.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <button className="mt-2 w-full bg-cyan-600 text-white text-xs py-1 rounded hover:bg-cyan-700">
                                        View Full Details
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Route Line for Selected Vehicle */}
                    {selectedVehicle && (
                        <Polyline
                            positions={selectedVehicle.route}
                            pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.7 }}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
