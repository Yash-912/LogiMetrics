/**
 * Transporter/Fleet Owner Dashboard
 * For users with role: dispatcher
 * Focus: Manage fleet, assign drivers, track vehicles, view earnings
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Truck, Users, Package, MapPin, Fuel, Wrench,
    TrendingUp, Calendar, Bell, LogOut, Menu, X,
    CheckCircle, Clock, AlertTriangle, DollarSign,
    Navigation, Activity, BarChart3
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { vehicleApi, driverApi, shipmentApi } from '@/api';

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm mb-1">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

// Vehicle Status Card
const VehicleCard = ({ vehicle }) => {
    const statusColors = {
        available: 'bg-green-500',
        in_transit: 'bg-blue-500',
        maintenance: 'bg-orange-500',
        offline: 'bg-gray-500',
    };

    return (
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <p className="text-white font-medium">{vehicle.vehicleNumber}</p>
                        <p className="text-gray-500 text-xs">{vehicle.vehicleType}</p>
                    </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${statusColors[vehicle.status] || 'bg-gray-500'}`} />
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Driver:</span>
                <span className="text-white">{vehicle.driverName || 'Unassigned'}</span>
            </div>
        </div>
    );
};

// Active Shipment Card
const ActiveShipmentCard = ({ shipment }) => (
    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
        <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 font-mono text-sm">{shipment.trackingNumber}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                {shipment.status?.replace('_', ' ')}
            </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{shipment.pickupCity} → {shipment.deliveryCity}</span>
        </div>
    </div>
);

export default function TransporterDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        totalVehicles: 0,
        activeDrivers: 0,
        activeShipments: 0,
        totalEarnings: 0
    });
    const [vehicles, setVehicles] = useState([]);
    const [activeShipments, setActiveShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Load vehicles
            const vehiclesResponse = await vehicleApi.getVehicles({ limit: 6 });
            const vehiclesList = vehiclesResponse?.data?.vehicles || [];
            setVehicles(vehiclesList);

            // Load drivers
            const driversResponse = await driverApi.getDrivers({ limit: 10 });
            const driversList = driversResponse?.data?.drivers || [];

            // Load active shipments
            const shipmentsResponse = await shipmentApi.getShipments({ status: 'in_transit', limit: 5 });
            const shipmentsList = shipmentsResponse?.data?.shipments || [];
            setActiveShipments(shipmentsList);

            setStats({
                totalVehicles: vehiclesResponse?.data?.pagination?.total || vehiclesList.length,
                activeDrivers: driversList.filter(d => d.status === 'available' || d.status === 'on_trip').length,
                activeShipments: shipmentsList.length,
                totalEarnings: 125000 // Demo value - would come from transaction API
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const menuItems = [
        { icon: BarChart3, label: 'Dashboard', path: '/transporter', active: true },
        { icon: Truck, label: 'Vehicles', path: '/vehicles' },
        { icon: Users, label: 'Drivers', path: '/drivers' },
        { icon: Package, label: 'Shipments', path: '/shipments' },
        { icon: Navigation, label: 'Routes', path: '/routes' },
        { icon: MapPin, label: 'Live Tracking', path: '/tracking/live' },
        { icon: DollarSign, label: 'Earnings', path: '/transactions' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6">
                    <Link to="/" className="block">
                        <span className="text-2xl font-black">
                            <span className="text-white">Logi</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Matrix</span>
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Fleet Manager</p>
                    </Link>
                </div>

                <nav className="px-4 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${item.active
                                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center">
                            <span className="text-white font-bold">{user?.firstName?.[0] || 'T'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-gray-500 text-xs truncate">Fleet Manager</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-400 hover:text-red-400"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 text-gray-400 hover:text-white"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white">Fleet Overview</h1>
                                <p className="text-gray-400 text-sm">Monitor your vehicles and drivers</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-gray-400 hover:text-white relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                            <Button onClick={() => navigate('/tracking/live')} className="bg-orange-500 hover:bg-orange-600">
                                <Navigation className="w-4 h-4 mr-2" />
                                Live Map
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Vehicles"
                            value={stats.totalVehicles}
                            icon={Truck}
                            color="bg-gradient-to-br from-orange-500 to-amber-600"
                            subtitle="Fleet size"
                        />
                        <StatCard
                            title="Active Drivers"
                            value={stats.activeDrivers}
                            icon={Users}
                            color="bg-gradient-to-br from-green-500 to-emerald-600"
                            subtitle="On duty"
                        />
                        <StatCard
                            title="Active Shipments"
                            value={stats.activeShipments}
                            icon={Package}
                            color="bg-gradient-to-br from-blue-500 to-cyan-600"
                            subtitle="In transit"
                        />
                        <StatCard
                            title="This Month"
                            value={`₹${(stats.totalEarnings / 1000).toFixed(0)}K`}
                            icon={TrendingUp}
                            color="bg-gradient-to-br from-purple-500 to-violet-600"
                            subtitle="Total earnings"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Vehicle Status */}
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-white">Vehicle Status</h2>
                                <Link to="/vehicles" className="text-orange-400 hover:text-orange-300 text-sm">
                                    View All →
                                </Link>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-gray-400">Loading...</div>
                            ) : vehicles.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {vehicles.slice(0, 6).map((vehicle) => (
                                        <VehicleCard key={vehicle._id || vehicle.id} vehicle={vehicle} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No vehicles registered</p>
                                    <Button
                                        onClick={() => navigate('/vehicles')}
                                        className="mt-4 bg-orange-500 hover:bg-orange-600"
                                    >
                                        Add Vehicle
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Active Shipments */}
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-white">Active Shipments</h2>
                                <Link to="/shipments" className="text-orange-400 hover:text-orange-300 text-sm">
                                    View All →
                                </Link>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-gray-400">Loading...</div>
                            ) : activeShipments.length > 0 ? (
                                <div className="space-y-4">
                                    {activeShipments.map((shipment) => (
                                        <ActiveShipmentCard key={shipment._id || shipment.id} shipment={shipment} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">No active shipments</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <Button
                            onClick={() => navigate('/vehicles')}
                            variant="outline"
                            className="h-auto py-4 flex-col gap-2 border-slate-700 hover:bg-slate-800"
                        >
                            <Truck className="w-6 h-6 text-orange-400" />
                            <span className="text-gray-300">Manage Vehicles</span>
                        </Button>
                        <Button
                            onClick={() => navigate('/drivers')}
                            variant="outline"
                            className="h-auto py-4 flex-col gap-2 border-slate-700 hover:bg-slate-800"
                        >
                            <Users className="w-6 h-6 text-green-400" />
                            <span className="text-gray-300">Manage Drivers</span>
                        </Button>
                        <Button
                            onClick={() => navigate('/routes')}
                            variant="outline"
                            className="h-auto py-4 flex-col gap-2 border-slate-700 hover:bg-slate-800"
                        >
                            <Navigation className="w-6 h-6 text-blue-400" />
                            <span className="text-gray-300">Route Planning</span>
                        </Button>
                        <Button
                            onClick={() => navigate('/transactions')}
                            variant="outline"
                            className="h-auto py-4 flex-col gap-2 border-slate-700 hover:bg-slate-800"
                        >
                            <DollarSign className="w-6 h-6 text-purple-400" />
                            <span className="text-gray-300">View Earnings</span>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
