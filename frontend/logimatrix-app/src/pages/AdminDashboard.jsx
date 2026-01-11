import React, { useState } from 'react';
import {
    Home, Package, Truck, Users, CreditCard, FileText,
    TrendingUp, Activity, MapPin, AlertTriangle, Search, Filter,
    CheckCircle, Plus, Calendar, MoreVertical, Bell, LogOut,
    BarChart2, Brain, RefreshCw, Download, Settings, Gauge,
    Shield, XCircle, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { driverApi, shipmentApi } from '@/api';

// Import Dashboard Widgets
import {
    KPICard,
    FleetOverviewWidget,
    RevenueWidget,
    ShipmentVolumeWidget,
    DriverPerformanceWidget,
    LiveFleetTrackingWidget,
    ETAPredictionWidget,
    DemandForecastWidget,
    AnomalyDetectionWidget,
    PricingInsightsWidget
} from '@/components/dashboard';

// Import Audit Logs Page for embedding
import AuditLogsPage from './AuditLogsPage';

// Import mock data
import { kpiSummary } from '@/data/dashboardMockData';

// Icon mapping for KPI cards
const iconMap = {
    Activity: Activity,
    Truck: Truck,
    Package: Package,
    Gauge: Gauge,
    AlertTriangle: AlertTriangle
};

import { useDashboardStats } from '@/hooks/useDashboard';

const AdminDashboard = ({ onLogout }) => {
    const { user } = useAuth();
    const isFleetRole = user?.role === 'transport' || user?.role === 'fleet_owner' || user?.role === 'manager';
    const [activeTab, setActiveTab] = useState(isFleetRole ? 'fleet' : 'overview');
    const navigate = useNavigate();

    // Fetch dashboard stats
    const {
        data: statsData,
        isLoading: statsLoading,
        refetch: refetchStats,
        isRefetching: statsRefetching
    } = useDashboardStats();

    // Handle refresh
    const handleRefresh = async () => {
        await refetchStats();
        // You would also trigger refetches for other widgets here if you passed a prop down
        // For now, widgets manage their own data fetching or we can coordinate via queryClient
    };

    // Transform API data to KPI format or use default/mock if loading/error
    const kpiData = React.useMemo(() => {
        if (!statsData || !statsData.overview) return kpiSummary;

        const overview = statsData.overview || {};
        const shipments = overview.shipments || { active: 0 };
        const vehicles = overview.vehicles || { utilization: 0 };
        const revenue = overview.revenue || { total: 0 };
        const performance = overview.performance || { onTimeDeliveryRate: 0 };

        return [
            {
                id: 1,
                label: 'Total Revenue',
                value: `$${(revenue.total / 1000).toFixed(1)}k`,
                trend: '+12.5%',
                color: 'blue',
                icon: 'Activity'
            },
            {
                id: 2,
                label: 'Active Shipments',
                value: (shipments.active || 0).toString(),
                trend: '+5',
                color: 'cyan',
                icon: 'Package'
            },
            {
                id: 3,
                label: 'Fleet Utilization',
                value: `${vehicles.utilization || 0}%`,
                trend: '+2.4%',
                color: 'purple',
                icon: 'Truck'
            },
            {
                id: 4,
                label: 'On-Time Delivery',
                value: `${performance.onTimeDeliveryRate || 0}%`,
                trend: '+1.2%',
                color: 'emerald',
                icon: 'CheckCircle'
            },
            {
                id: 5,
                label: 'Active Alerts',
                value: '3',
                trend: '-2',
                color: 'amber',
                icon: 'AlertTriangle'
            }
        ];
    }, [statsData]);

    // Sidebar navigation items
    const allNavItems = [
        { id: 'overview', icon: <Home className="w-5 h-5" />, label: 'Overview' },
        { id: 'analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { id: 'ml-insights', icon: <Brain className="w-5 h-5" />, label: 'ML Insights' },
        { id: 'users', icon: <Users className="w-5 h-5" />, label: 'User Management' }, // New
        { id: 'shipments', icon: <Package className="w-5 h-5" />, label: 'Shipments' },
        { id: 'fleet', icon: <Truck className="w-5 h-5" />, label: 'Fleet' },
        { id: 'drivers', icon: <Users className="w-5 h-5" />, label: 'Drivers' }, // Consider rename if conflict with User Management
        { id: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
        { id: 'disputes', icon: <AlertTriangle className="w-5 h-5" />, label: 'Disputes' }, // New
        { id: 'platform-settings', icon: <Settings className="w-5 h-5" />, label: 'Platform Settings' }, // New
        { id: 'audit-logs', icon: <FileText className="w-5 h-5" />, label: 'Audit Logs' }, // New
    ];

    const navItems = isFleetRole
        ? allNavItems.filter(item => item.id === 'fleet')
        : allNavItems;

    // Sidebar Component
    const Sidebar = () => (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col z-40">
            <div className="h-20 flex items-center px-6 border-b border-slate-800">
                <div className="text-2xl font-black tracking-tighter">
                    <span className="text-white">Logi</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                </div>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${activeTab === item.id
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                        {user?.firstName ? user.firstName.charAt(0) : (user?.email?.charAt(0) || 'U')}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">
                            {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (user?.role || 'User')}
                        </p>
                        <p className="text-xs text-slate-400 truncate" title={user?.email}>
                            {user?.email || ''}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-500/20"
                    onClick={onLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                </Button>
            </div>
        </aside>
    );

    // Header Component
    const Header = () => (
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-white">
                    {activeTab === 'overview' && 'System Overview'}
                    {activeTab === 'analytics' && 'Analytics Dashboard'}
                    {activeTab === 'ml-insights' && 'ML Insights'}
                    {activeTab === 'users' && 'User Management'}
                    {activeTab === 'shipments' && 'Global Shipments'}
                    {activeTab === 'fleet' && 'Fleet Management'}
                    {activeTab === 'drivers' && 'Driver Network'}
                    {activeTab === 'billing' && 'Billing & Revenue'}
                    {activeTab === 'disputes' && 'Dispute Resolution'}
                    {activeTab === 'platform-settings' && 'Platform Settings'}
                    {activeTab === 'audit-logs' && 'System Audit Logs'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={statsRefetching}
                    className="border-slate-700"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${statsRefetching ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700">
                    <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700 relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
                </Button>
            </div>
        </header>
    );

    // --- Views ---

    // User Management View (Onboarding Approvals)
    const UserManagementView = () => (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/20 rounded-lg">
                            <Users className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Pending Approvals</p>
                            <p className="text-2xl font-bold text-white">12</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <Package className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total Businesses</p>
                            <p className="text-2xl font-bold text-white">1,245</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Truck className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Total Transporters</p>
                            <p className="text-2xl font-bold text-white">450</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Approvals Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-white">Pending Onboarding Requests</h3>
                    <Button size="sm" variant="outline" className="border-slate-700">View All</Button>
                </div>
                <div className="divide-y divide-slate-800">
                    {[
                        { id: 1, name: "FastTrack Logistics", type: "Transporter", date: "2 mins ago", status: "pending" },
                        { id: 2, name: "PhoneCase Pro Ltd", type: "Business", date: "1 hour ago", status: "pending" },
                        { id: 3, name: "Global Freight Solutions", type: "Transporter", date: "3 hours ago", status: "pending" }
                    ].map(user => (
                        <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.type === 'Transporter' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {user.type === 'Transporter' ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-medium text-white">{user.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <span>{user.type}</span>
                                        <span>•</span>
                                        <span>{user.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/10">
                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Disputes View
    const DisputesView = () => (
        <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Dispute Resolution Center</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                    Manage and resolve disputes between shippers and transporters.
                </p>
                <Button className="bg-amber-500 text-black hover:bg-amber-600">
                    View All Active Disputes
                </Button>
            </div>
        </div>
    );

    // Platform Settings View (Commission & Pricing)
    const PlatformSettingsView = () => (
        <div className="max-w-4xl space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Commission & Pricing Rules
                </h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Platform Commission Rate (%)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white w-32"
                                defaultValue={10}
                            />
                            <span className="text-sm text-slate-500">Applied to all transactions</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Dynamic Pricing Multiplier</label>
                        <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <div>
                                <p className="text-white font-medium">Demand Surge Pricing</p>
                                <p className="text-xs text-slate-400">Automatically adjust prices during high demand</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-6 bg-cyan-600 rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button>Save Changes</Button>
                </div>
            </div>
        </div>
    );

    // Overview Tab Content
    const OverviewContent = () => (
        <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiData.map(kpi => {
                    const IconComponent = iconMap[kpi.icon] || Activity;
                    return (
                        <KPICard
                            key={kpi.id}
                            icon={IconComponent}
                            label={kpi.label}
                            value={kpi.value}
                            trend={kpi.trend}
                            color={kpi.color}
                        />
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueWidget />
                <DemandForecastWidget />
            </div>

            {/* Live Fleet Tracking - Full Width */}
            <LiveFleetTrackingWidget height={350} />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FleetOverviewWidget />
                <ShipmentVolumeWidget />
                <DriverPerformanceWidget />
            </div>
        </div>
    );

    // Analytics Tab Content
    const AnalyticsContent = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueWidget />
                <ShipmentVolumeWidget />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FleetOverviewWidget />
                <DriverPerformanceWidget />
                <div className="lg:col-span-1">
                    <DemandForecastWidget />
                </div>
            </div>
        </div>
    );

    // ML Insights Tab Content
    const MLInsightsContent = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ETAPredictionWidget />
                <DemandForecastWidget />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnomalyDetectionWidget />
                <PricingInsightsWidget />
            </div>
        </div>
    );

    // Fleet Tab Content
    const FleetContent = () => (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-6">
            <div className="flex-none">
                <FleetOverviewWidget />
            </div>
            <div className="flex-1 min-h-[600px] bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative">
                <LiveFleetTrackingWidget height="100%" />
            </div>
        </div>
    );

    // Drivers View
    const DriversView = () => {
        const [drivers, setDrivers] = useState([]);
        const [loading, setLoading] = useState(true);

        React.useEffect(() => {
            const fetchDrivers = async () => {
                try {
                    const response = await driverApi.getDrivers();
                    if (response.success) setDrivers(response.data || []);
                } catch (error) {
                    console.error("Failed to load drivers", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchDrivers();
        }, []);

        return (
            <div className="space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-white">Driver Network</h3>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Add Driver</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-800/50 text-slate-200 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">License</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Shipments</th>
                                    <th className="px-4 py-3">Distance</th>
                                    <th className="px-4 py-3">Rating</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-4 text-center">Loading...</td></tr>
                                ) : drivers.length === 0 ? (
                                    <tr><td colSpan="8" className="p-4 text-center">No drivers found</td></tr>
                                ) : drivers.map(driver => {
                                    const userId = driver.userId || {};
                                    const name = `${driver.firstname || driver.firstName || userId.firstName || 'Driver'} ${driver.lastname || driver.lastName || userId.lastName || ''}`;
                                    return (
                                        <tr key={driver.id || driver._id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                        {name.charAt(0)}
                                                    </div>
                                                    {name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs ${driver.status === 'available' ? 'bg-green-500/20 text-green-400' :
                                                    driver.status === 'on_duty' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {driver.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300">{driver.licenseNumber || 'N/A'}</span>
                                                    <span className="text-xs opacity-50">{driver.licenseType || 'Std'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{driver.phone || userId.email || 'N/A'}</td>
                                            <td className="px-4 py-3 font-mono">{driver.totalShipments || 0}</td>
                                            <td className="px-4 py-3 font-mono">{driver.totalDistance ? (driver.totalDistance / 1000).toFixed(1) + 'k' : '0'} km</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-yellow-400 font-medium">
                                                    <span>★</span> {driver.rating || 0}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Shipments View
    const ShipmentsView = () => {
        const [shipments, setShipments] = useState([]);
        const [loading, setLoading] = useState(true);

        React.useEffect(() => {
            const fetchShipments = async () => {
                try {
                    const response = await shipmentApi.getShipments();
                    // Handle both paginated and non-paginated structures
                    const list = response.data?.shipments || response.data || [];
                    setShipments(list);
                } catch (error) {
                    console.error("Failed to load shipments", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchShipments();
        }, []);

        return (
            <div className="space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-white">Global Shipments</h3>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Create Shipment</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-800/50 text-slate-200 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Shipment #</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Origin</th>
                                    <th className="px-4 py-3">Destination</th>
                                    <th className="px-4 py-3">Recipient</th>
                                    <th className="px-4 py-3">Items</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-4 text-center">Loading...</td></tr>
                                ) : shipments.length === 0 ? (
                                    <tr><td colSpan="8" className="p-4 text-center">No shipments found</td></tr>
                                ) : shipments.map(shipment => (
                                    <tr key={shipment._id || shipment.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white font-mono">
                                            {shipment.shipmentNumber || shipment.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs capitalized ${shipment.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                shipment.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                                                    shipment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {shipment.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={shipment.sourceAddress}>
                                            {shipment.sourceAddress || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 max-w-[150px] truncate" title={shipment.destinationAddress}>
                                            {shipment.destinationAddress || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">{shipment.recipientName || 'N/A'}</td>
                                        <td className="px-4 py-3">{shipment.items?.length || 0}</td>
                                        <td className="px-4 py-3">
                                            {new Date(shipment.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Placeholder Content
    const PlaceholderContent = ({ title }) => (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 rounded-xl border border-slate-800">
            <Package className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-400">{title}</h3>
            <p className="text-sm text-slate-500 mt-2">This section is under development</p>
        </div>
    );

    // Content View Router
    const ContentView = () => {
        switch (activeTab) {
            case 'overview': return <OverviewContent />;
            case 'analytics': return <AnalyticsContent />;
            case 'ml-insights': return <MLInsightsContent />;
            case 'users': return <UserManagementView />;
            case 'shipments': return <ShipmentsView />;
            case 'fleet': return <FleetContent />;
            case 'drivers': return <DriversView />;
            case 'billing': return <PlaceholderContent title="Billing & Invoices" />;
            case 'disputes': return <DisputesView />;
            case 'platform-settings': return <PlatformSettingsView />;
            case 'audit-logs': return (
                // Embed AuditLogsPage but control its layout if possible, or just wrap it
                // Since AuditLogsPage has its own full structure, it might look slightly doubled up,
                // but it Functionally works.
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/20">
                    <AuditLogsPage />
                </div>
            );
            default: return <OverviewContent />;
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex font-sans">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <Header />
                <ContentView />
            </main>
        </div>
    );
};

export default AdminDashboard;
