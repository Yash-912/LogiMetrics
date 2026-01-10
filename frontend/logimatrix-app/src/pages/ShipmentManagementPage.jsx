/**
 * Shipment Management Page
 * Comprehensive shipment CRUD with all backend features
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Filter, Plus, Download, Upload, RefreshCw,
    Eye, Edit, Trash2, MapPin, Truck, User, Calendar, Clock,
    ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle,
    FileText, Camera, Navigation, MoreVertical
} from 'lucide-react';
import { getShipments, updateShipmentStatus, deleteShipment, trackShipment } from '../api/shipment.api';

// Status configuration
const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
    assigned: { label: 'Assigned', color: 'bg-purple-500/20 text-purple-400', icon: User },
    picked_up: { label: 'Picked Up', color: 'bg-indigo-500/20 text-indigo-400', icon: Package },
    in_transit: { label: 'In Transit', color: 'bg-cyan-500/20 text-cyan-400', icon: Truck },
    out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-500/20 text-orange-400', icon: Navigation },
    delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: X },
    delayed: { label: 'Delayed', color: 'bg-amber-500/20 text-amber-400', icon: AlertCircle },
    failed_delivery: { label: 'Failed', color: 'bg-red-500/20 text-red-400', icon: AlertCircle }
};

const PRIORITY_CONFIG = {
    low: { label: 'Low', color: 'text-gray-400' },
    standard: { label: 'Standard', color: 'text-blue-400' },
    high: { label: 'High', color: 'text-orange-400' },
    urgent: { label: 'Urgent', color: 'text-red-400' }
};

export default function ShipmentManagementPage() {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        priority: '',
        startDate: '',
        endDate: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Modals
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingResult, setTrackingResult] = useState(null);

    // Fetch shipments
    const fetchShipments = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit,
                ...(filters.search && { search: filters.search }),
                ...(filters.status && { status: filters.status }),
                ...(filters.priority && { priority: filters.priority }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate })
            };

            const response = await getShipments(params);
            setShipments(response.data?.shipments || []);
            setTotalItems(response.data?.pagination?.total || 0);
            setTotalPages(Math.ceil((response.data?.pagination?.total || 0) / limit));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch shipments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, [currentPage, filters.status, filters.priority]);

    // Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (filters.search !== undefined) {
                setCurrentPage(1);
                fetchShipments();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.search]);

    // Handle tracking
    const handleTrackShipment = async () => {
        if (!trackingNumber.trim()) return;
        try {
            const result = await trackShipment(trackingNumber);
            setTrackingResult(result);
        } catch (err) {
            setTrackingResult({ error: 'Shipment not found' });
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this shipment?')) return;
        try {
            await deleteShipment(id);
            fetchShipments();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Package className="w-8 h-8 text-cyan-400" />
                            Shipment Management
                        </h1>
                        <p className="text-gray-400 mt-1">Manage and track all your shipments</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowTrackingModal(true)}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <MapPin className="w-4 h-4" />
                            Track
                        </button>
                        <button
                            onClick={() => navigate('/shipments/new')}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25"
                        >
                            <Plus className="w-4 h-4" />
                            New Shipment
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Total', value: totalItems, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Pending', value: shipments.filter(s => s.status === 'pending').length, color: 'from-yellow-500 to-orange-500' },
                        { label: 'In Transit', value: shipments.filter(s => s.status === 'in_transit').length, color: 'from-cyan-500 to-blue-500' },
                        { label: 'Delivered', value: shipments.filter(s => s.status === 'delivered').length, color: 'from-green-500 to-emerald-500' },
                        { label: 'Cancelled', value: shipments.filter(s => s.status === 'cancelled').length, color: 'from-red-500 to-pink-500' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
                            <p className="text-gray-400 text-sm">{stat.label}</p>
                            <p className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Search & Filters */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-4 mb-6 border border-slate-700/50">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by tracking or reference number..."
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                        </div>

                        <select
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                            className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                            className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">All Priority</option>
                            {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>

                        <button
                            onClick={fetchShipments}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Shipments Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Loading shipments...</p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
                            <p className="text-red-400">{error}</p>
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">No shipments found</p>
                            <button
                                onClick={() => navigate('/shipments/new')}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
                            >
                                Create First Shipment
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tracking #</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Priority</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Pickup</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Delivery</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {shipments.map((shipment) => {
                                        const status = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.pending;
                                        const priority = PRIORITY_CONFIG[shipment.priority] || PRIORITY_CONFIG.standard;
                                        const StatusIcon = status.icon;

                                        return (
                                            <tr key={shipment.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-4">
                                                    <span className="font-mono text-cyan-400 font-medium">
                                                        {shipment.trackingNumber}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-sm font-medium ${priority.color}`}>
                                                        {priority.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-white text-sm">{shipment.pickupCity || '-'}</p>
                                                    <p className="text-gray-400 text-xs">{shipment.pickupState}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-white text-sm">{shipment.deliveryCity || '-'}</p>
                                                    <p className="text-gray-400 text-xs">{shipment.deliveryState}</p>
                                                </td>
                                                <td className="px-4 py-4 text-gray-400 text-sm">
                                                    {formatDate(shipment.createdAt)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedShipment(shipment); setShowDetailModal(true); }}
                                                            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/shipments/${shipment.id}/edit`)}
                                                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(shipment.id)}
                                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
                            <p className="text-sm text-gray-400">
                                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalItems)} of {totalItems}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-white">{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tracking Modal */}
            {showTrackingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Track Shipment</h3>
                            <button onClick={() => { setShowTrackingModal(false); setTrackingResult(null); }} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Enter tracking number"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            />
                            <button onClick={handleTrackShipment} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">
                                Track
                            </button>
                        </div>

                        {trackingResult && (
                            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                                {trackingResult.error ? (
                                    <p className="text-red-400">{trackingResult.error}</p>
                                ) : (
                                    <div>
                                        <p className="text-white font-medium">{trackingResult.trackingNumber}</p>
                                        <p className="text-cyan-400">{STATUS_CONFIG[trackingResult.status]?.label || trackingResult.status}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedShipment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Shipment Details</h3>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Tracking Number</p>
                                    <p className="text-cyan-400 font-mono">{selectedShipment.trackingNumber}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Status</p>
                                    <p className="text-white">{STATUS_CONFIG[selectedShipment.status]?.label}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Pickup Location</p>
                                    <p className="text-white">{selectedShipment.pickupCity}, {selectedShipment.pickupState}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Delivery Location</p>
                                    <p className="text-white">{selectedShipment.deliveryCity}, {selectedShipment.deliveryState}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => { setShowDetailModal(false); setShowStatusModal(true); }}
                                    className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
                                >
                                    Update Status
                                </button>
                                <button
                                    onClick={() => navigate(`/shipments/${selectedShipment.id}/edit`)}
                                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                >
                                    Edit Shipment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
