/**
 * Driver Management Page
 * Manage fleet drivers with CRUD operations
 */

import { useState, useEffect } from 'react';
import {
    Users, Search, Plus, Edit, Trash2, Phone, Mail, MapPin,
    RefreshCw, AlertCircle, CheckCircle, Clock, X, User,
    ChevronLeft, ChevronRight, Star, Truck, Calendar
} from 'lucide-react';

// Driver status configuration
const STATUS_CONFIG = {
    available: { label: 'Available', color: 'bg-green-500/20 text-green-400' },
    on_duty: { label: 'On Duty', color: 'bg-blue-500/20 text-blue-400' },
    off_duty: { label: 'Off Duty', color: 'bg-gray-500/20 text-gray-400' },
    on_leave: { label: 'On Leave', color: 'bg-yellow-500/20 text-yellow-400' }
};

// Mock driver data
const MOCK_DRIVERS = [
    { id: 'DRV001', firstName: 'Rajesh', lastName: 'Kumar', phone: '9876543210', email: 'rajesh@fleet.com', licenseNumber: 'DL-1234567890', status: 'available', rating: 4.8, completedTrips: 156, joinedAt: '2024-01-15' },
    { id: 'DRV002', firstName: 'Amit', lastName: 'Singh', phone: '9876543211', email: 'amit@fleet.com', licenseNumber: 'DL-9876543210', status: 'on_duty', rating: 4.5, completedTrips: 89, joinedAt: '2024-03-20' },
    { id: 'DRV003', firstName: 'Suresh', lastName: 'Patel', phone: '9876543212', email: 'suresh@fleet.com', licenseNumber: 'DL-5678901234', status: 'off_duty', rating: 4.9, completedTrips: 234, joinedAt: '2023-08-10' },
    { id: 'DRV004', firstName: 'Vikram', lastName: 'Sharma', phone: '9876543213', email: 'vikram@fleet.com', licenseNumber: 'DL-3456789012', status: 'on_leave', rating: 4.2, completedTrips: 45, joinedAt: '2024-06-01' },
];

export default function DriverManagementPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', status: 'available'
    });

    // Load drivers
    useEffect(() => {
        const loadDrivers = async () => {
            setLoading(true);
            // Simulate API call
            await new Promise(r => setTimeout(r, 500));
            const stored = localStorage.getItem('mock_drivers');
            if (stored) {
                setDrivers(JSON.parse(stored));
            } else {
                setDrivers(MOCK_DRIVERS);
                localStorage.setItem('mock_drivers', JSON.stringify(MOCK_DRIVERS));
            }
            setLoading(false);
        };
        loadDrivers();
    }, []);

    // Filter drivers
    const filteredDrivers = drivers.filter(driver => {
        const matchesSearch = `${driver.firstName} ${driver.lastName} ${driver.phone} ${driver.email}`
            .toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || driver.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        let updatedDrivers;

        if (editingDriver) {
            updatedDrivers = drivers.map(d => d.id === editingDriver.id ? { ...d, ...formData } : d);
        } else {
            const newDriver = {
                ...formData,
                id: 'DRV' + Date.now(),
                rating: 0,
                completedTrips: 0,
                joinedAt: new Date().toISOString().split('T')[0]
            };
            updatedDrivers = [...drivers, newDriver];
        }

        setDrivers(updatedDrivers);
        localStorage.setItem('mock_drivers', JSON.stringify(updatedDrivers));
        setShowAddModal(false);
        setEditingDriver(null);
        setFormData({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', status: 'available' });
    };

    // Handle delete
    const handleDelete = (id) => {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        const updatedDrivers = drivers.filter(d => d.id !== id);
        setDrivers(updatedDrivers);
        localStorage.setItem('mock_drivers', JSON.stringify(updatedDrivers));
    };

    // Handle edit
    const handleEdit = (driver) => {
        setEditingDriver(driver);
        setFormData({
            firstName: driver.firstName,
            lastName: driver.lastName,
            phone: driver.phone,
            email: driver.email,
            licenseNumber: driver.licenseNumber,
            status: driver.status
        });
        setShowAddModal(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-emerald-400" />
                            Driver Management
                        </h1>
                        <p className="text-gray-400 mt-1">Manage your fleet drivers</p>
                    </div>
                    <button
                        onClick={() => { setEditingDriver(null); setFormData({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', status: 'available' }); setShowAddModal(true); }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        Add Driver
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Drivers', value: drivers.length, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Available', value: drivers.filter(d => d.status === 'available').length, color: 'from-green-500 to-emerald-500' },
                        { label: 'On Duty', value: drivers.filter(d => d.status === 'on_duty').length, color: 'from-purple-500 to-pink-500' },
                        { label: 'Off Duty', value: drivers.filter(d => d.status === 'off_duty' || d.status === 'on_leave').length, color: 'from-gray-500 to-slate-500' }
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
                                placeholder="Search drivers by name, phone, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Drivers Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    </div>
                ) : filteredDrivers.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700/50">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No drivers found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                        >
                            Add First Driver
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDrivers.map(driver => {
                            const status = STATUS_CONFIG[driver.status] || STATUS_CONFIG.available;
                            return (
                                <div key={driver.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50 hover:border-emerald-500/50 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                                                {driver.firstName[0]}{driver.lastName[0]}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">{driver.firstName} {driver.lastName}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(driver)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(driver.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Phone className="w-4 h-4" />
                                            <span>{driver.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Mail className="w-4 h-4" />
                                            <span>{driver.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Truck className="w-4 h-4" />
                                            <span>License: {driver.licenseNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-white font-medium">{driver.rating}</span>
                                        </div>
                                        <span className="text-gray-400 text-sm">{driver.completedTrips} trips</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(f => ({ ...f, firstName: e.target.value }))}
                                        required
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(f => ({ ...f, lastName: e.target.value }))}
                                        required
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">License Number</label>
                                <input
                                    type="text"
                                    value={formData.licenseNumber}
                                    onChange={(e) => setFormData(f => ({ ...f, licenseNumber: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(f => ({ ...f, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                        <option key={key} value={key}>{val.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                                >
                                    {editingDriver ? 'Save Changes' : 'Add Driver'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
