import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Route as RouteIcon,
    Plus,
    Search,
    MapPin,
    Navigation,
    Clock,
    ArrowLeft,
    Edit2,
    Trash2,
    Copy,
    Zap,
    Map,
    MoreVertical,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Play,
    ArrowRight,
    Layers,
} from 'lucide-react';
import { routeApi } from '@/api';

const RouteManagementPage = () => {
    const navigate = useNavigate();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [optimizing, setOptimizing] = useState(null);

    // Form state for creating new route
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sourceAddress: '',
        destinationAddress: '',
        frequency: 'daily',
        costPerKm: '',
    });

    useEffect(() => {
        fetchRoutes();
    }, [pagination.page, statusFilter]);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;

            const response = await routeApi.getRoutes(params);
            if (response.success) {
                setRoutes(response.data.routes || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
            // Mock data for display
            const mockRoutes = [
                {
                    _id: '1',
                    name: 'Mumbai - Pune Express',
                    description: 'Daily express route between Mumbai and Pune',
                    status: 'active',
                    distance: 150,
                    estimatedTime: 180, // minutes
                    stops: [
                        { locationId: '1', sequenceNumber: 1 },
                        { locationId: '2', sequenceNumber: 2 },
                    ],
                    frequency: 'daily',
                    costPerKm: 12,
                    createdAt: '2026-01-05T10:00:00Z',
                },
                {
                    _id: '2',
                    name: 'Delhi - Jaipur Corridor',
                    description: 'Premium freight corridor',
                    status: 'active',
                    distance: 280,
                    estimatedTime: 300,
                    stops: [
                        { locationId: '3', sequenceNumber: 1 },
                        { locationId: '4', sequenceNumber: 2 },
                        { locationId: '5', sequenceNumber: 3 },
                    ],
                    frequency: 'daily',
                    costPerKm: 15,
                    createdAt: '2026-01-03T14:30:00Z',
                },
                {
                    _id: '3',
                    name: 'Bangalore - Chennai Route',
                    description: 'Weekly bulk transport',
                    status: 'active',
                    distance: 350,
                    estimatedTime: 420,
                    stops: [],
                    frequency: 'weekly',
                    costPerKm: 10,
                    createdAt: '2026-01-01T09:15:00Z',
                },
                {
                    _id: '4',
                    name: 'Hyderabad Circle',
                    description: 'Local distribution network',
                    status: 'inactive',
                    distance: 85,
                    estimatedTime: 120,
                    stops: [
                        { locationId: '6', sequenceNumber: 1 },
                        { locationId: '7', sequenceNumber: 2 },
                        { locationId: '8', sequenceNumber: 3 },
                        { locationId: '9', sequenceNumber: 4 },
                    ],
                    frequency: 'daily',
                    costPerKm: 8,
                    createdAt: '2025-12-28T11:45:00Z',
                },
                {
                    _id: '5',
                    name: 'Kolkata Metro Link',
                    description: 'City center connections',
                    status: 'active',
                    distance: 45,
                    estimatedTime: 90,
                    stops: [{ locationId: '10', sequenceNumber: 1 }],
                    frequency: 'daily',
                    costPerKm: 18,
                    createdAt: '2025-12-25T16:20:00Z',
                },
            ];
            setRoutes(mockRoutes);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchRoutes();
    };

    const handleOptimize = async (routeId) => {
        setOptimizing(routeId);
        try {
            await routeApi.optimizeRoute(routeId);
            fetchRoutes();
        } catch (error) {
            console.error('Error optimizing route:', error);
        } finally {
            setOptimizing(null);
        }
        setShowActionMenu(null);
    };

    const handleClone = async (routeId) => {
        try {
            await routeApi.cloneRoute(routeId);
            fetchRoutes();
        } catch (error) {
            console.error('Error cloning route:', error);
        }
        setShowActionMenu(null);
    };

    const handleDelete = async (routeId) => {
        if (window.confirm('Are you sure you want to delete this route?')) {
            try {
                await routeApi.deleteRoute(routeId);
                fetchRoutes();
            } catch (error) {
                console.error('Error deleting route:', error);
            }
        }
        setShowActionMenu(null);
    };

    const handleStatusToggle = async (routeId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await routeApi.updateRouteStatus(routeId, newStatus);
            fetchRoutes();
        } catch (error) {
            console.error('Error updating status:', error);
        }
        setShowActionMenu(null);
    };

    const handleCreateRoute = async (e) => {
        e.preventDefault();
        try {
            await routeApi.createRoute(formData);
            setShowCreateModal(false);
            setFormData({
                name: '',
                description: '',
                sourceAddress: '',
                destinationAddress: '',
                frequency: 'daily',
                costPerKm: '',
            });
            fetchRoutes();
        } catch (error) {
            console.error('Error creating route:', error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
        const icons = {
            active: <CheckCircle className="w-3.5 h-3.5" />,
            inactive: <XCircle className="w-3.5 h-3.5" />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.inactive}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDuration = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatDistance = (km) => {
        return `${km} km`;
    };

    const getFrequencyBadge = (frequency) => {
        const colors = {
            daily: 'bg-blue-500/20 text-blue-400',
            weekly: 'bg-purple-500/20 text-purple-400',
            monthly: 'bg-amber-500/20 text-amber-400',
            custom: 'bg-cyan-500/20 text-cyan-400',
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[frequency] || colors.custom}`}>
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1424] to-[#0a0f1a]">
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0d1424]/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white">Route Management</h1>
                                <p className="text-sm text-slate-400">Plan and optimize delivery routes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                        >
                            <Plus className="w-4 h-4" />
                            Create Route
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                                <Layers className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Routes</p>
                                <p className="text-2xl font-bold text-white">{routes.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Active Routes</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {routes.filter(r => r.status === 'active').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-purple-500/20">
                                <Navigation className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Distance</p>
                                <p className="text-2xl font-bold text-white">
                                    {routes.reduce((acc, r) => acc + (r.distance || 0), 0)} km
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/20">
                                <MapPin className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Stops</p>
                                <p className="text-2xl font-bold text-white">
                                    {routes.reduce((acc, r) => acc + (r.stops?.length || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search routes by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            />
                        </div>
                    </form>

                    <div className="flex gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <button
                            onClick={fetchRoutes}
                            className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Routes Grid */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {routes.map((route) => (
                            <div
                                key={route._id}
                                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
                            >
                                {/* Card Header */}
                                <div className="p-5 border-b border-white/5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                                {route.name}
                                            </h3>
                                            <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                                                {route.description || 'No description'}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowActionMenu(showActionMenu === route._id ? null : route._id)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {showActionMenu === route._id && (
                                                <div className="absolute right-0 top-10 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-2xl py-2 z-50">
                                                    <button
                                                        onClick={() => handleOptimize(route._id)}
                                                        disabled={optimizing === route._id}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
                                                    >
                                                        <Zap className="w-4 h-4 text-yellow-400" />
                                                        {optimizing === route._id ? 'Optimizing...' : 'AI Optimize'}
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedRoute(route)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit Route
                                                    </button>
                                                    <button
                                                        onClick={() => handleClone(route._id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusToggle(route._id, route.status)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                    >
                                                        {route.status === 'active' ? (
                                                            <>
                                                                <XCircle className="w-4 h-4 text-slate-400" />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                                Activate
                                                            </>
                                                        )}
                                                    </button>
                                                    <hr className="my-2 border-white/10" />
                                                    <button
                                                        onClick={() => handleDelete(route._id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(route.status)}
                                        {getFrequencyBadge(route.frequency)}
                                    </div>
                                </div>

                                {/* Route Visual */}
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                            <Play className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div className="flex-1 h-1 bg-gradient-to-r from-emerald-500/50 via-cyan-500/50 to-blue-500/50 rounded relative">
                                            {route.stops?.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full"
                                                    style={{ left: `${((idx + 1) / (route.stops.length + 1)) * 100}%` }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-blue-400" />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                                                <Navigation className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-sm font-semibold text-white">{formatDistance(route.distance)}</p>
                                            <p className="text-xs text-slate-500">Distance</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                                                <Clock className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-sm font-semibold text-white">{formatDuration(route.estimatedTime)}</p>
                                            <p className="text-xs text-slate-500">Duration</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-sm font-semibold text-white">{route.stops?.length || 0}</p>
                                            <p className="text-xs text-slate-500">Stops</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-3 bg-slate-900/30 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-sm text-slate-400">
                                        ₹{route.costPerKm}/km
                                    </span>
                                    <button
                                        onClick={() => setSelectedRoute(route)}
                                        className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        View Details
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-8">
                    <p className="text-sm text-slate-400">
                        Showing {routes.length} routes
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={routes.length < pagination.limit}
                            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </main>

            {/* Create Route Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-lg">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Create New Route</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateRoute} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Route Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                    placeholder="e.g., Mumbai - Pune Express"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                                    rows={2}
                                    placeholder="Brief description of the route"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Frequency</label>
                                    <select
                                        value={formData.frequency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Cost per KM (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.costPerKm}
                                        onChange={(e) => setFormData(prev => ({ ...prev, costPerKm: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                                        placeholder="12"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
                                >
                                    Create Route
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Route Detail Modal */}
            {selectedRoute && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedRoute.name}</h2>
                                <p className="text-slate-400">{selectedRoute.description}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRoute(null)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedRoute.status)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Frequency</p>
                                    <div className="mt-1">{getFrequencyBadge(selectedRoute.frequency)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Total Distance</p>
                                    <p className="text-xl font-bold text-white mt-1">{formatDistance(selectedRoute.distance)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Estimated Time</p>
                                    <p className="text-xl font-bold text-white mt-1">{formatDuration(selectedRoute.estimatedTime)}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Route Stops ({selectedRoute.stops?.length || 0})</h3>
                                <div className="space-y-2">
                                    {selectedRoute.stops?.length > 0 ? (
                                        selectedRoute.stops.map((stop, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-medium text-sm">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-slate-300">Stop {stop.sequenceNumber}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 text-center py-4">No intermediate stops</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => handleOptimize(selectedRoute._id)}
                                    disabled={optimizing === selectedRoute._id}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                                >
                                    <Zap className="w-4 h-4" />
                                    {optimizing === selectedRoute._id ? 'Optimizing...' : 'AI Optimize'}
                                </button>
                                <button
                                    onClick={() => setSelectedRoute(null)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
                                >
                                    <Map className="w-4 h-4" />
                                    View on Map
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RouteManagementPage;
