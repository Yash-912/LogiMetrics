import { useEffect, useRef, useState } from "react";

export default function LeafletHeatmap() {
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const socketRef = useRef(null);
    const vehicleMarkersRef = useRef(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
    const [debugLogs, setDebugLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [accidentZones, setAccidentZones] = useState([]);
    const [useLocalSimulation, setUseLocalSimulation] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const simulationIntervalRef = useRef(null);
    const trucksRef = useRef([]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setDebugLogs((prev) => [...prev.slice(-15), `[${time}] ${msg}`]);
        console.log(`[${time}] ${msg}`);
    };

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Check if truck is near any accident zone
    const checkAccidentZones = (vehicleId, lat, lng) => {
        if (accidentZones.length === 0) return;

        accidentZones.forEach((zone) => {
            const [zoneLng, zoneLat] = zone.location.coordinates;
            const distance = calculateDistance(lat, lng, zoneLat, zoneLng);

            if (distance <= 1000) {
                const existingAlert = alerts.find(
                    (a) =>
                        a.vehicleId === vehicleId && a.zoneId === zone._id && !a.dismissed
                );

                if (!existingAlert) {
                    const newAlert = {
                        id: `${vehicleId}-${zone._id}-${Date.now()}`,
                        vehicleId,
                        zoneId: zone._id,
                        distance: Math.round(distance),
                        severity: zone.severity,
                        accidentCount: zone.accidentCount,
                        timestamp: new Date(),
                        dismissed: false,
                    };

                    setAlerts((prev) => [...prev, newAlert]);
                    addLog(
                        `🚨 ${zone.severity.toUpperCase()} ALERT! ${vehicleId} - ${Math.round(
                            distance
                        )}m from zone (${zone.accidentCount} accidents)`
                    );

                    const marker = vehicleMarkersRef.current.get(vehicleId);
                    if (marker) {
                        flashMarkerRed(marker, vehicleId);
                    }

                    setTimeout(() => {
                        setAlerts((prev) =>
                            prev.map((a) =>
                                a.id === newAlert.id ? { ...a, dismissed: true } : a
                            )
                        );
                    }, 10000);
                }
            }
        });
    };

    const flashMarkerRed = (marker, vehicleId) => {
        const L = window.L;
        const alertIcon = L.divIcon({
            className: "alert-vehicle-icon",
            html: `
        <div style="
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #ff0000, #cc0000);
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 30px rgba(255,0,0,1), 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          animation: alert-pulse 0.5s infinite;
        ">⚠️</div>
      `,
            iconSize: [60, 60],
            iconAnchor: [30, 30],
        });

        marker.setIcon(alertIcon);

        setTimeout(() => {
            const truck = trucksRef.current.find((t) => t.id === vehicleId);
            if (truck) {
                marker.setIcon(createVehicleIcon(truck.heading || 0));
            }
        }, 5000);
    };

    const createVehicleIcon = (rotation = 0) => {
        const L = window.L;
        return L.divIcon({
            className: "custom-vehicle-icon",
            html: `
        <div style="
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #00ff00, #00cc00);
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 20px rgba(0,255,0,0.8), 0 4px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transform: rotate(${rotation}deg);
          animation: vehicle-pulse 2s infinite;
        ">🚛</div>
      `,
            iconSize: [50, 50],
            iconAnchor: [25, 25],
        });
    };

    const startLocalSimulation = () => {
        if (simulationIntervalRef.current) return;

        addLog("🚀 Starting realistic route simulation");
        setUseLocalSimulation(true);

        if (accidentZones.length > 0) {
            const targets = accidentZones.slice(0, 3);

            trucksRef.current = targets.map((zone, idx) => {
                const [zoneLng, zoneLat] = zone.location.coordinates;
                const startLat = zoneLat - 0.045;
                const startLng = zoneLng - 0.045;

                return {
                    id: `TRUCK-${String(idx + 1).padStart(3, "0")}`,
                    lat: startLat,
                    lng: startLng,
                    targetLat: zoneLat,
                    targetLng: zoneLng,
                    speed: 50 + Math.random() * 30,
                    heading: 0,
                    step: 0,
                    maxSteps: 100,
                };
            });
        } else {
            trucksRef.current = [
                {
                    id: "TRUCK-001",
                    lat: 18.47,
                    lng: 73.82,
                    targetLat: 18.5204,
                    targetLng: 73.8589,
                    speed: 60,
                    heading: 45,
                    step: 0,
                    maxSteps: 100,
                },
                {
                    id: "TRUCK-002",
                    lat: 18.49,
                    lng: 73.84,
                    targetLat: 18.54,
                    targetLng: 73.87,
                    speed: 55,
                    heading: 90,
                    step: 0,
                    maxSteps: 100,
                },
                {
                    id: "TRUCK-003",
                    lat: 18.52,
                    lng: 73.9,
                    targetLat: 18.58,
                    targetLng: 73.91,
                    speed: 70,
                    heading: 180,
                    step: 0,
                    maxSteps: 100,
                },
            ];
        }

        addLog(
            `📍 ${trucksRef.current.length} trucks created with routes to accident zones`
        );

        simulationIntervalRef.current = setInterval(() => {
            trucksRef.current.forEach((truck) => {
                if (truck.step >= truck.maxSteps) {
                    truck.step = 0;
                    const startLat = truck.targetLat - 0.045;
                    const startLng = truck.targetLng - 0.045;
                    truck.lat = startLat;
                    truck.lng = startLng;
                }

                const latDiff = truck.targetLat - truck.lat;
                const lngDiff = truck.targetLng - truck.lng;

                truck.lat += latDiff / (truck.maxSteps - truck.step);
                truck.lng += lngDiff / (truck.maxSteps - truck.step);

                truck.heading = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
                truck.step++;

                updateVehicleMarker({
                    vehicleId: truck.id,
                    latitude: truck.lat,
                    longitude: truck.lng,
                    speed: truck.speed + Math.random() * 5 - 2.5,
                    heading: truck.heading,
                });

                checkAccidentZones(truck.id, truck.lat, truck.lng);
            });
        }, 2000);
    };

    const stopLocalSimulation = () => {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
            trucksRef.current = [];
            addLog("⛔ Stopped simulation");
            setUseLocalSimulation(false);
        }
    };

    useEffect(() => {
        if (mapRef.current) return;
        if (!mapContainerRef.current) return;

        addLog("Loading map components...");

        const loadScripts = async () => {
            if (!document.getElementById("leaflet-css")) {
                const css = document.createElement("link");
                css.id = "leaflet-css";
                css.rel = "stylesheet";
                css.href =
                    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
                document.head.appendChild(css);
            }

            if (!window.L) {
                await new Promise((resolve) => {
                    const script = document.createElement("script");
                    script.src =
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            if (!window.L.heatLayer) {
                await new Promise((resolve) => {
                    const script = document.createElement("script");
                    script.src =
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js";
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            if (!window.io) {
                await new Promise((resolve) => {
                    const script = document.createElement("script");
                    script.src =
                        "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.4/socket.io.min.js";
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            return window.L;
        };

        loadScripts().then((L) => {
            addLog("✅ Libraries loaded");

            if (mapContainerRef.current._leaflet_id) {
                mapContainerRef.current._leaflet_id = undefined;
            }

            const map = L.map(mapContainerRef.current).setView(
                [18.5204, 73.8567],
                12
            );
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap",
            }).addTo(map);

            addLog("✅ Map created");

            // Load accident zones - IMPROVED ERROR HANDLING
            fetch("http://localhost:3000/api/v1/accidents/heatmap")
                .then((res) => {
                    addLog(`📡 Response status: ${res.status}`);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    addLog(`📦 Received data: ${JSON.stringify(data).substring(0, 100)}...`);

                    if (data?.success && data?.data?.length > 0) {
                        setAccidentZones(data.data);

                        const points = data.data.map((z) => [
                            z.location.coordinates[1],
                            z.location.coordinates[0],
                            z.accidentCount,
                        ]);

                        L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 }).addTo(
                            map
                        );
                        addLog(`✅ Loaded ${data.data.length} accident zones`);

                        data.data.forEach((zone) => {
                            const [lng, lat] = zone.location.coordinates;
                            const color =
                                zone.severity === "high"
                                    ? "#ff0000"
                                    : zone.severity === "medium"
                                        ? "#ff9800"
                                        : "#ffeb3b";

                            L.circle([lat, lng], {
                                radius: 1000,
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.2,
                                weight: 2,
                            })
                                .bindPopup(
                                    `
                  <div style="min-width: 150px;">
                    <strong style="color: ${color};">⚠️ ${zone.severity.toUpperCase()} RISK ZONE</strong><br/>
                    <strong>Accidents:</strong> ${zone.accidentCount}<br/>
                    <small>Stay alert in this area</small>
                  </div>
                `
                                )
                                .addTo(map);
                        });

                        addLog(`✅ Added ${data.data.length} zone markers`);
                    } else {
                        addLog("⚠️ No accident zones in database");
                        setLoadError("No accident zones found in database");
                    }
                    setIsLoading(false);
                })
                .catch((err) => {
                    addLog(`❌ Error loading zones: ${err.message}`);
                    setLoadError(err.message);
                    setIsLoading(false);
                });

            // Socket.io connection
            try {
                const socket = window.io("http://localhost:3000", {
                    reconnection: true,
                    reconnectionAttempts: 3,
                    timeout: 5000,
                });

                socketRef.current = socket;

                socket.on("connect", () => {
                    addLog("✅ WebSocket connected");
                    setConnectionStatus("Connected");
                    socket.emit("join:room", { room: "fleet" });
                    socket.emit("tracking:subscribe:fleet");
                });

                socket.on("fleet:location", (data) => {
                    addLog(`📍 Backend: ${data.vehicleId}`);
                    updateVehicleMarker(data);
                    checkAccidentZones(data.vehicleId, data.latitude, data.longitude);
                });

                socket.on("vehicle:accident-zone-alert", (alertData) => {
                    addLog(`🚨 Backend alert: ${alertData.vehicleId}`);
                });

                socket.on("connect_error", () => {
                    setConnectionStatus("Backend Offline");
                    addLog("⚠️ Backend offline");
                });
            } catch (err) {
                setConnectionStatus("Offline Mode");
            }
        });

        return () => {
            stopLocalSimulation();
            if (socketRef.current) socketRef.current.disconnect();
            if (mapRef.current) mapRef.current.remove();
            mapRef.current = null;
        };
    }, []);

    const updateVehicleMarker = (data) => {
        if (!mapRef.current) return;
        if (!data.vehicleId || !data.latitude || !data.longitude) return;

        const L = window.L;
        const { vehicleId, latitude, longitude, speed, heading } = data;

        setVehicles((prev) => {
            const exists = prev.find((v) => v.id === vehicleId);
            if (exists) {
                return prev.map((v) =>
                    v.id === vehicleId
                        ? { id: vehicleId, lat: latitude, lng: longitude, speed, heading }
                        : v
                );
            }
            return [
                ...prev,
                { id: vehicleId, lat: latitude, lng: longitude, speed, heading },
            ];
        });

        let marker = vehicleMarkersRef.current.get(vehicleId);

        if (!marker) {
            marker = L.marker([latitude, longitude], {
                icon: createVehicleIcon(heading || 0),
                zIndexOffset: 1000,
            })
                .bindPopup(
                    `
          <div style="min-width: 180px; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #00cc00;">🚛 ${vehicleId}</h3>
            <div style="font-size: 13px;">
              <strong>Speed:</strong> ${Math.round(speed || 0)} km/h<br>
              <strong>Heading:</strong> ${Math.round(heading || 0)}°<br>
              <strong>Position:</strong> ${latitude.toFixed(
                        4
                    )}, ${longitude.toFixed(4)}<br>
              <small style="color: #666;">Updated: ${new Date().toLocaleTimeString()}</small>
            </div>
          </div>
        `
                )
                .addTo(mapRef.current);

            vehicleMarkersRef.current.set(vehicleId, marker);
            addLog(`✅ Created ${vehicleId}`);
        } else {
            marker.setLatLng([latitude, longitude]);
            marker.setIcon(createVehicleIcon(heading || 0));
            marker.setPopupContent(`
        <div style="min-width: 180px; font-family: sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #00cc00;">🚛 ${vehicleId}</h3>
          <div style="font-size: 13px;">
            <strong>Speed:</strong> ${Math.round(speed || 0)} km/h<br>
            <strong>Heading:</strong> ${Math.round(heading || 0)}°<br>
            <strong>Position:</strong> ${latitude.toFixed(
                4
            )}, ${longitude.toFixed(4)}<br>
            <small style="color: #666;">Updated: ${new Date().toLocaleTimeString()}</small>
          </div>
        </div>
      `);
        }
    };

    const activeAlerts = alerts.filter((a) => !a.dismissed);

    return (
        <div className="w-full h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-3 shadow-lg">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">
                        🚛 Live Fleet Tracking & Accident Zone Alerts
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-black bg-opacity-30 px-3 py-1 rounded">
                            <div
                                className={`w-3 h-3 rounded-full ${connectionStatus === "Connected"
                                    ? "bg-green-400 animate-pulse"
                                    : "bg-yellow-400"
                                    }`}
                            />
                            <span className="text-xs">{connectionStatus}</span>
                        </div>
                        <div className="bg-black bg-opacity-30 px-3 py-1 rounded text-xs">
                            Zones: {accidentZones.length}
                        </div>
                        <div className="bg-black bg-opacity-30 px-3 py-1 rounded text-xs">
                            Vehicles: {vehicles.length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {loadError && (
                <div className="bg-red-600 text-white p-2 text-center text-sm">
                    ⚠️ {loadError} - Check backend connection and database
                </div>
            )}

            {/* Controls */}
            <div className="bg-gray-800 border-b border-gray-700 p-3 flex gap-3 items-center">
                <button
                    onClick={
                        useLocalSimulation ? stopLocalSimulation : startLocalSimulation
                    }
                    className={`px-4 py-2 rounded font-bold transition-colors ${useLocalSimulation
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                        } text-white`}
                >
                    {useLocalSimulation ? "" : " "}
                </button>

                <span className="text-gray-400 text-sm">
                    {useLocalSimulation
                        ? "🟢 Trucks moving toward accident zones"
                        : "⚪ Click Start to begin"}
                </span>

                {activeAlerts.length > 0 && (
                    <div className="ml-auto bg-red-600 text-white px-4 py-2 rounded font-bold animate-pulse">
                        🚨 {activeAlerts.length} Active Alert
                        {activeAlerts.length > 1 ? "s" : ""}
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
                        <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4" />
                            <p>Loading accident zones...</p>
                        </div>
                    </div>
                )}
                <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* Alerts Panel */}
            {activeAlerts.length > 0 && (
                <div className="bg-yellow-900 border-t-4 border-red-600 p-3">
                    <h3 className="text-white font-bold mb-2">
                        🚨 ACTIVE ACCIDENT ZONE ALERTS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                className="bg-red-800 text-white p-3 rounded-lg border-2 border-red-400 shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <strong className="text-lg">⚠️ {alert.vehicleId}</strong>
                                    <button
                                        onClick={() =>
                                            setAlerts((prev) =>
                                                prev.map((a) =>
                                                    a.id === alert.id ? { ...a, dismissed: true } : a
                                                )
                                            )
                                        }
                                        className="text-xs bg-red-950 px-2 py-1 rounded hover:bg-red-900"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                                <div className="text-sm space-y-1">
                                    <div
                                        className={`font-bold ${alert.severity === "high"
                                            ? "text-red-300"
                                            : alert.severity === "medium"
                                                ? "text-orange-300"
                                                : "text-yellow-300"
                                            }`}
                                    >
                                        {alert.severity.toUpperCase()} SEVERITY ZONE
                                    </div>
                                    <div>
                                        Distance: <strong>{alert.distance}m</strong> away
                                    </div>
                                    <div>
                                        Accidents: <strong>{alert.accidentCount}</strong> recorded
                                    </div>
                                    <div className="text-xs text-gray-300 mt-2">
                                        {alert.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Debug Console */}
            <div className="bg-black text-green-400 p-3 h-40 overflow-y-auto font-mono text-xs border-t border-green-600">
                <div className="flex justify-between mb-2 sticky top-0 bg-black">
                    <strong className="text-green-300">Debug Log</strong>
                    <button
                        onClick={() => setDebugLogs([])}
                        className="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded"
                    >
                        Clear
                    </button>
                </div>
                {debugLogs.map((log, i) => (
                    <div
                        key={i}
                        className={
                            log.includes("✅")
                                ? "text-green-400"
                                : log.includes("❌")
                                    ? "text-red-400"
                                    : log.includes("🚨")
                                        ? "text-red-300 font-bold"
                                        : log.includes("📍")
                                            ? "text-blue-400"
                                            : log.includes("⚠️")
                                                ? "text-yellow-400"
                                                : "text-gray-300"
                        }
                    >
                        {log}
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes vehicle-pulse {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(0,255,0,0.8), 0 4px 8px rgba(0,0,0,0.3);
          }
          50% { 
            box-shadow: 0 0 30px rgba(0,255,0,1), 0 6px 12px rgba(0,0,0,0.4);
          }
        }
        @keyframes alert-pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 30px rgba(255,0,0,1), 0 4px 10px rgba(0,0,0,0.5);
          }
          50% { 
            transform: scale(1.15);
            box-shadow: 0 0 50px rgba(255,0,0,1), 0 6px 14px rgba(0,0,0,0.6);
          }
        }
        .leaflet-container { background: #1a1a1a; }
      `}</style>
        </div>
    );
}