/**
 * Business/Shipper Dashboard
 * For users with role: manager, user
 * Focus: Create shipments, track orders, view invoices, make payments
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Package, Truck, FileText, CreditCard, Plus, Search,
    MapPin, Clock, CheckCircle, AlertCircle, ArrowRight,
    TrendingUp, Calendar, Bell, LogOut, User, Menu, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { shipmentApi, invoiceApi } from '@/api';

// Quick Stats Card Component
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm mb-1">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
                {trend && (
                    <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trend > 0 ? '+' : ''}{trend}% from last month
                    </p>
                )}
            </div>
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </div>
);

// Recent Shipment Row
const ShipmentRow = ({ shipment }) => {
    const statusColors = {
        pending: 'bg-yellow-500/20 text-yellow-400',
        confirmed: 'bg-blue-500/20 text-blue-400',
        in_transit: 'bg-cyan-500/20 text-cyan-400',
        delivered: 'bg-green-500/20 text-green-400',
        cancelled: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-700/50 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <p className="text-white font-medium">{shipment.trackingNumber}</p>
                    <p className="text-gray-400 text-sm">{shipment.deliveryCity}</p>
                </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[shipment.status] || 'bg-gray-500/20 text-gray-400'}`}>
                {shipment.status?.replace('_', ' ')}
            </div>
        </div>
    );
};

export default function BusinessDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        totalShipments: 0,
        inTransit: 0,
        delivered: 0,
        pendingPayments: 0
    });
    const [recentShipments, setRecentShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Load shipments
            const shipmentsResponse = await shipmentApi.getShipments({ limit: 5 });
            const shipments = shipmentsResponse?.data?.shipments || [];
            setRecentShipments(shipments);

            // Calculate stats
            const allShipments = shipmentsResponse?.data?.pagination?.total || shipments.length;
            const inTransit = shipments.filter(s => s.status === 'in_transit').length;
            const delivered = shipments.filter(s => s.status === 'delivered').length;

            setStats({
                totalShipments: allShipments,
                inTransit,
                delivered,
                pendingPayments: shipments.filter(s => s.invoiceId?.status !== 'paid').length
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
        { icon: Package, label: 'Dashboard', path: '/business', active: true },
        { icon: Plus, label: 'Create Shipment', path: '/shipments/new' },
        { icon: Truck, label: 'My Shipments', path: '/shipments' },
        { icon: MapPin, label: 'Track Order', path: '/track' },
        { icon: FileText, label: 'Invoices', path: '/invoices' },
        { icon: CreditCard, label: 'Payments', path: '/transactions' },
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
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                        </span>
                        <p className="text-xs text-gray-500 mt-1">Business Portal</p>
                    </Link>
                </div>

                <nav className="px-4 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${item.active
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold">{user?.firstName?.[0] || 'U'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
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
                                <h1 className="text-xl font-bold text-white">Welcome back, {user?.firstName}!</h1>
                                <p className="text-gray-400 text-sm">Here's what's happening with your shipments</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-gray-400 hover:text-white relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                            <Button onClick={() => navigate('/shipments/new')} className="bg-cyan-500 hover:bg-cyan-600">
                                <Plus className="w-4 h-4 mr-2" />
                                New Shipment
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="p-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Total Shipments"
                            value={stats.totalShipments}
                            icon={Package}
                            color="bg-gradient-to-br from-cyan-500 to-blue-600"
                            trend={12}
                        />
                        <StatCard
                            title="In Transit"
                            value={stats.inTransit}
                            icon={Truck}
                            color="bg-gradient-to-br from-orange-500 to-amber-600"
                        />
                        <StatCard
                            title="Delivered"
                            value={stats.delivered}
                            icon={CheckCircle}
                            color="bg-gradient-to-br from-green-500 to-emerald-600"
                            trend={8}
                        />
                        <StatCard
                            title="Pending Payments"
                            value={stats.pendingPayments}
                            icon={CreditCard}
                            color="bg-gradient-to-br from-purple-500 to-violet-600"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div
                            onClick={() => navigate('/shipments/new')}
                            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6 cursor-pointer hover:border-cyan-500/40 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Create Shipment</h3>
                            <p className="text-gray-400 text-sm">Book a new delivery</p>
                        </div>

                        <div
                            onClick={() => navigate('/track')}
                            className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-6 cursor-pointer hover:border-orange-500/40 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Search className="w-6 h-6 text-orange-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Track Order</h3>
                            <p className="text-gray-400 text-sm">Check shipment status</p>
                        </div>

                        <div
                            onClick={() => navigate('/invoices')}
                            className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl p-6 cursor-pointer hover:border-purple-500/40 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileText className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">View Invoices</h3>
                            <p className="text-gray-400 text-sm">Manage payments</p>
                        </div>
                    </div>

                    {/* Recent Shipments */}
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white">Recent Shipments</h2>
                            <Link to="/shipments" className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-gray-400">Loading...</div>
                        ) : recentShipments.length > 0 ? (
                            <div>
                                {recentShipments.map((shipment) => (
                                    <ShipmentRow key={shipment._id || shipment.id} shipment={shipment} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No shipments yet</p>
                                <Button
                                    onClick={() => navigate('/shipments/new')}
                                    className="mt-4 bg-cyan-500 hover:bg-cyan-600"
                                >
                                    Create Your First Shipment
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
