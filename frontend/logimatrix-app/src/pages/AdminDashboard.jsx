import React, { useState } from 'react';
import {
    Home, Package, Truck, Users, CreditCard, FileText,
    TrendingUp, Activity, MapPin, AlertTriangle, Search, Filter,
    CheckCircle, Plus, Calendar, MoreVertical, Bell, LogOut,
    BarChart2, Brain, RefreshCw, Download, Settings, Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // Handle refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        // Simulate API refresh
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
    };

    // Sidebar navigation items
    const navItems = [
        { id: 'overview', icon: <Home className="w-5 h-5" />, label: 'Overview' },
        { id: 'analytics', icon: <BarChart2 className="w-5 h-5" />, label: 'Analytics' },
        { id: 'ml-insights', icon: <Brain className="w-5 h-5" />, label: 'ML Insights' },
        { id: 'shipments', icon: <Package className="w-5 h-5" />, label: 'Shipments' },
        { id: 'fleet', icon: <Truck className="w-5 h-5" />, label: 'Fleet' },
        { id: 'drivers', icon: <Users className="w-5 h-5" />, label: 'Drivers' },
        { id: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
    ];

    // Sidebar Component
    const Sidebar = () => (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col z-40">
            <div className="h-20 flex items-center px-6 border-b border-slate-800">
                <div className="text-2xl font-black tracking-tighter">
                    <span className="text-white">Logi</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                </div>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">AD</div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Admin User</p>
                        <p className="text-xs text-slate-400">admin@logi.com</p>
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
                    {activeTab === 'overview' && 'Fleet Overview'}
                    {activeTab === 'analytics' && 'Analytics Dashboard'}
                    {activeTab === 'ml-insights' && 'ML Insights'}
                    {activeTab === 'shipments' && 'Shipments'}
                    {activeTab === 'fleet' && 'Fleet Management'}
                    {activeTab === 'drivers' && 'Drivers'}
                    {activeTab === 'billing' && 'Billing'}
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
                    className="border-slate-700"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700">
                    <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700 relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">3</span>
                </Button>
                <Button size="sm" variant="outline" className="border-slate-700">
                    <Settings className="w-4 h-4" />
                </Button>
            </div>
        </header>
    );

    // Overview Tab Content
    const OverviewContent = () => (
        <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiSummary.map(kpi => {
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
                <RevenueWidget onRefresh={handleRefresh} />
                <DemandForecastWidget onRefresh={handleRefresh} />
            </div>

            {/* Live Fleet Tracking - Full Width */}
            <LiveFleetTrackingWidget height={350} onRefresh={handleRefresh} />

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FleetOverviewWidget onRefresh={handleRefresh} />
                <ShipmentVolumeWidget onRefresh={handleRefresh} />
                <DriverPerformanceWidget onRefresh={handleRefresh} />
            </div>
        </div>
    );

    // Analytics Tab Content
    const AnalyticsContent = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueWidget onRefresh={handleRefresh} />
                <ShipmentVolumeWidget onRefresh={handleRefresh} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FleetOverviewWidget onRefresh={handleRefresh} />
                <DriverPerformanceWidget onRefresh={handleRefresh} />
                <div className="lg:col-span-1">
                    <DemandForecastWidget onRefresh={handleRefresh} />
                </div>
            </div>
        </div>
    );

    // ML Insights Tab Content
    const MLInsightsContent = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ETAPredictionWidget onRefresh={handleRefresh} />
                <DemandForecastWidget onRefresh={handleRefresh} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnomalyDetectionWidget onRefresh={handleRefresh} />
                <PricingInsightsWidget onRefresh={handleRefresh} />
            </div>
        </div>
    );

    // Fleet Tab Content
    const FleetContent = () => (
        <div className="space-y-6">
            <LiveFleetTrackingWidget height={500} onRefresh={handleRefresh} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FleetOverviewWidget onRefresh={handleRefresh} />
                <DriverPerformanceWidget onRefresh={handleRefresh} />
            </div>
        </div>
    );

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
            case 'fleet': return <FleetContent />;
            case 'shipments': return <PlaceholderContent title="Shipments Management" />;
            case 'drivers': return <PlaceholderContent title="Driver Management" />;
            case 'billing': return <PlaceholderContent title="Billing & Invoices" />;
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
