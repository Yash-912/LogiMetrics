/**
 * Driver Portal Page
 * simplified dashboard for drivers to view assigned shipments and update status
 */

import { useState, useEffect } from 'react';
import {
    Truck, MapPin, CheckCircle, Clock, Navigation,
    Phone, Package, User, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Use mock API for now - in real app would fetch from backend filtered by driverId
import { getShipments, updateShipmentStatus } from '../api/shipment.api';

const STATUS_COLORS = {
    assigned: 'bg-blue-500/20 text-blue-400',
    picked_up: 'bg-indigo-500/20 text-indigo-400',
    in_transit: 'bg-cyan-500/20 text-cyan-400',
    out_for_delivery: 'bg-orange-500/20 text-orange-400',
    delivered: 'bg-green-500/20 text-green-400'
};

export default function DriverPortalPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeShipment, setActiveShipment] = useState(null);
    const [assignedShipments, setAssignedShipments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDriverShipments();
    }, []);

    const loadDriverShipments = async () => {
        setLoading(true);
        try {
            // Simulate fetching assigned shipments for this driver
            // querying assignments for "current driver"
            const response = await getShipments();
            const allShipments = response.data?.shipments || [];

            // Filter shipments that are "assigned" or in progress
            // For mock demo, we'll just take the first few 'pending' or 'in_transit' ones
            const relevant = allShipments.filter(s =>
                ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)
            );

            if (relevant.length > 0) {
                setActiveShipment(relevant[0]); // Pick the first active one
                setAssignedShipments(relevant.slice(1));
            }
        } catch (err) {
            console.error('Failed to load active shipments', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status) => {
        if (!activeShipment) return;
        try {
            await updateShipmentStatus(activeShipment.id, status, 'Driver update via portal');
            // Refresh
            loadDriverShipments();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Mobile Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center font-bold text-lg">
                            {user?.firstName?.[0] || 'D'}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Hi, {user?.firstName || 'Driver'}</h1>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white">
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Active Job Card */}
                {activeShipment ? (
                    <div className="space-y-4">
                        <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Current Job</h2>
                        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-slate-400">Tracking ID</p>
                                    <p className="font-mono text-cyan-400 font-bold text-lg">
                                        {activeShipment.trackingNumber}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[activeShipment.status] || 'bg-slate-800 text-slate-400'}`}>
                                    {activeShipment.status.replace(/_/g, ' ')}
                                </span>
                            </div>

                            {/* Route Visualization */}
                            <div className="relative pl-8 space-y-8 mb-6">
                                {/* Vertical Line */}
                                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-800"></div>

                                {/* Pickup */}
                                <div className="relative">
                                    <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Pickup from</p>
                                        <p className="font-medium text-white">{activeShipment.pickupCity}, {activeShipment.pickupState}</p>
                                        <p className="text-sm text-slate-400 mt-1">{activeShipment.pickupAddress}</p>
                                    </div>
                                </div>

                                {/* Delivery */}
                                <div className="relative">
                                    <div className="absolute -left-8 top-0 w-6 h-6 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center animate-pulse">
                                        <MapPin className="w-3 h-3 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase">Deliver to</p>
                                        <p className="font-medium text-white">{activeShipment.deliveryCity}, {activeShipment.deliveryState}</p>
                                        <p className="text-sm text-slate-400 mt-1">{activeShipment.deliveryAddress}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl border border-slate-700 transition-colors">
                                    <Phone className="w-4 h-4" />
                                    <span>Call</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl border border-slate-700 transition-colors">
                                    <Navigation className="w-4 h-4" />
                                    <span>Map</span>
                                </button>
                            </div>

                            {/* Status Update Slider */}
                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <p className="text-center text-slate-400 text-sm mb-3">Update Status</p>
                                <div className="flex gap-2 justify-center">
                                    {activeShipment.status === 'assigned' && (
                                        <button onClick={() => handleStatusUpdate('picked_up')} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-900/50">
                                            Confirm Pickup
                                        </button>
                                    )}
                                    {activeShipment.status === 'picked_up' && (
                                        <button onClick={() => handleStatusUpdate('in_transit')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/50">
                                            Start Journey
                                        </button>
                                    )}
                                    {activeShipment.status === 'in_transit' && (
                                        <button onClick={() => handleStatusUpdate('out_for_delivery')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/50">
                                            Arrived & Out for Delivery
                                        </button>
                                    )}
                                    {activeShipment.status === 'out_for_delivery' && (
                                        <button onClick={() => handleStatusUpdate('delivered')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/50">
                                            Confirm Delivery (POD)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                            <Truck className="w-10 h-10 text-slate-600" />
                        </div>
                        <h3 className="text-white font-medium text-lg">No Active Jobs</h3>
                        <p className="text-slate-500 mt-2">You don't have any assigned shipments right now.</p>
                        <button onClick={loadDriverShipments} className="mt-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mx-auto text-sm font-bold">
                            Refresh <Clock className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Upcoming / Other Shipments */}
                {assignedShipments.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Queue ({assignedShipments.length})</h2>
                        {assignedShipments.map(shipment => (
                            <div key={shipment.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-slate-700 transition-all">
                                <div>
                                    <p className="text-white font-medium">{shipment.deliveryCity}</p>
                                    <p className="text-xs text-slate-500">From: {shipment.pickupCity}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white" />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
