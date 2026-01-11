/**
 * Public Tracking Page
 * Track shipments by tracking number (no login required)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Package, MapPin, Truck, CheckCircle, Clock,
    AlertCircle, ArrowRight, Calendar, Phone, User
} from 'lucide-react';
import { shipmentApi } from '@/api';

// Status timeline configuration
const STATUS_TIMELINE = [
    { status: 'pending', label: 'Order Placed', icon: Package },
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { status: 'picked_up', label: 'Picked Up', icon: Package },
    { status: 'in_transit', label: 'In Transit', icon: Truck },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: MapPin },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle }
];

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-500' },
    confirmed: { label: 'Confirmed', color: 'text-blue-400', bg: 'bg-blue-500' },
    picked_up: { label: 'Picked Up', color: 'text-indigo-400', bg: 'bg-indigo-500' },
    in_transit: { label: 'In Transit', color: 'text-cyan-400', bg: 'bg-cyan-500' },
    out_for_delivery: { label: 'Out for Delivery', color: 'text-orange-400', bg: 'bg-orange-500' },
    delivered: { label: 'Delivered', color: 'text-green-400', bg: 'bg-green-500' },
    cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500' }
};

export default function TrackingPage() {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!trackingNumber.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            // Simulate API call - check localStorage for mock shipments
            const data = await shipmentApi.trackShipment(trackingNumber);
            setResult(data);
        } catch (err) {
            console.error(err);
            setError('No shipment found with this tracking number. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIndex = (status) => {
        const index = STATUS_TIMELINE.findIndex(s => s.status === status);
        return index >= 0 ? index : 0;
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2">
                            <span className="text-2xl font-black">
                                <span className="text-white">Logi</span>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                            </span>
                        </Link>
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/25">
                        <MapPin className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Track Your Shipment
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Enter your tracking number to get real-time updates on your delivery
                    </p>
                </div>

                {/* Search Box */}
                <form onSubmit={handleTrack} className="mb-12">
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number (e.g., TRK123ABC)"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !trackingNumber.trim()}
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/25"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Tracking...
                                    </>
                                ) : (
                                    <>
                                        Track
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        {/* Shipment Info Card */}
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">Tracking Number</p>
                                    <p className="text-2xl font-bold text-cyan-400 font-mono">
                                        {result.trackingNumber}
                                    </p>
                                </div>
                                <div className={`px-4 py-2 rounded-full ${STATUS_CONFIG[result.status]?.bg || 'bg-gray-500'} bg-opacity-20`}>
                                    <span className={STATUS_CONFIG[result.status]?.color || 'text-gray-400'}>
                                        {STATUS_CONFIG[result.status]?.label || result.status}
                                    </span>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="p-6">
                                <h3 className="text-white font-semibold mb-6">Shipment Progress</h3>
                                <div className="relative">
                                    <div className="flex justify-between">
                                        {STATUS_TIMELINE.map((step, index) => {
                                            const currentIndex = getStatusIndex(result.status);
                                            const isCompleted = index <= currentIndex;
                                            const isCurrent = index === currentIndex;
                                            const Icon = step.icon;

                                            return (
                                                <div key={step.status} className="flex-1 flex flex-col items-center relative">
                                                    {/* Connector line */}
                                                    {index < STATUS_TIMELINE.length - 1 && (
                                                        <div className={`absolute top-5 left-1/2 w-full h-1 ${isCompleted ? 'bg-cyan-500' : 'bg-slate-700'}`} />
                                                    )}

                                                    {/* Icon */}
                                                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'bg-slate-700 text-gray-500'
                                                        } ${isCurrent ? 'ring-4 ring-cyan-500/30' : ''}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>

                                                    {/* Label */}
                                                    <p className={`mt-3 text-xs text-center ${isCompleted ? 'text-cyan-400' : 'text-gray-500'}`}>
                                                        {step.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Pickup */}
                            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50">
                                <h4 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Pickup Details
                                </h4>
                                <p className="text-white font-medium">{result.pickupAddress || 'Address not specified'}</p>
                                <p className="text-gray-400 text-sm">{result.pickupCity}, {result.pickupState}</p>
                                {result.pickupContactName && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <p className="text-sm text-gray-400 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            {result.pickupContactName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Delivery */}
                            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50">
                                <h4 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Delivery Details
                                </h4>
                                <p className="text-white font-medium">{result.deliveryAddress || 'Address not specified'}</p>
                                <p className="text-gray-400 text-sm">{result.deliveryCity}, {result.deliveryState}</p>
                                {result.deliveryContactName && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <p className="text-sm text-gray-400 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            {result.deliveryContactName}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-gray-400 text-xs">Created</p>
                                        <p className="text-white">{formatDate(result.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-gray-400 text-xs">Last Updated</p>
                                        <p className="text-white">{formatDate(result.updatedAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {!result && !error && (
                    <div className="text-center text-gray-500 text-sm">
                        <p>Need help? Contact our support team</p>
                        <p className="mt-1">support@logimatrix.com | +91 1800-123-4567</p>
                    </div>
                )}
            </main>
        </div>
    );
}
