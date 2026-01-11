import { useState, useEffect } from 'react';
import {
    Users, Search, Plus, Edit, Trash2, Phone, Mail, MapPin,
    RefreshCw, AlertCircle, CheckCircle, Clock, X, User,
    ChevronLeft, ChevronRight, Star, Truck, Calendar, FileText,
    Activity, Gauge, Package
} from 'lucide-react';
import { driverApi } from '@/api';
import { toast } from 'sonner';

// Driver status configuration
const STATUS_CONFIG = {
    available: { label: 'Available', color: 'bg-green-500/20 text-green-400' },
    on_duty: { label: 'On Duty', color: 'bg-blue-500/20 text-blue-400' },
    off_duty: { label: 'Off Duty', color: 'bg-gray-500/20 text-gray-400' },
    on_leave: { label: 'On Leave', color: 'bg-yellow-500/20 text-yellow-400' }
};

export default function DriverManagementPage() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '', email: '',
        licenseNumber: '', licenseType: '', status: 'available'
    });

    // Load drivers
    const loadDrivers = async () => {
        try {
            setLoading(true);
            const response = await driverApi.getDrivers();
            if (response.success) {
                setDrivers(response.data || []);
            } else {
                toast.error('Failed to load drivers');
            }
        } catch (error) {
            console.error('Error loading drivers:', error);
            toast.error('Failed to load drivers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDrivers();
    }, []);

    // Filter drivers
    const filteredDrivers = drivers.filter(driver => {
        const userId = driver.userId || {};
        const fName = driver.firstname || driver.firstName || userId.firstName || '';
        const lName = driver.lastname || driver.lastName || userId.lastName || '';
        const email = driver.email || userId.email || '';

        const matchesSearch = `${fName} ${lName} ${driver.phone || ''} ${email}`
            .toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || driver.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await driverApi.updateDriver(editingDriver._id || editingDriver.id, formData);
                toast.success('Driver updated successfully');
            } else {
                await driverApi.createDriver(formData);
                toast.success('Driver added successfully');
            }
            setShowAddModal(false);
            setEditingDriver(null);
            setFormData({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', licenseType: '', status: 'available' });
            loadDrivers();
        } catch (error) {
            console.error('Error saving driver:', error);
            toast.error(error.response?.data?.message || 'Failed to save driver');
        }
    };

    // Handle delete
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this driver?')) return;
        try {
            await driverApi.deleteDriver(id);
            toast.success('Driver deleted successfully');
            loadDrivers();
        } catch (error) {
            console.error('Error deleting driver:', error);
            toast.error('Failed to delete driver');
        }
    };

    // Handle edit
    const handleEdit = (driver) => {
        setEditingDriver(driver);
        const userId = driver.userId || {};
        const fName = driver.firstname || driver.firstName || userId.firstName || '';
        const lName = driver.lastname || driver.lastName || userId.lastName || '';
        const email = driver.email || userId.email || '';

        setFormData({
            firstName: fName,
            lastName: lName,
            phone: driver.phone || '',
            email: email,
            licenseNumber: driver.licenseNumber || '',
            licenseType: driver.licenseType || '',
            status: driver.status || 'available'
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
                        onClick={() => { setEditingDriver(null); setFormData({ firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', licenseType: '', status: 'available' }); setShowAddModal(true); }}
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
                            const userId = driver.userId || {};
                            const fName = driver.firstname || driver.firstName || userId.firstName || 'Driver';
                            const lName = driver.lastname || driver.lastName || userId.lastName || '';
                            const email = driver.email || userId.email || 'N/A';
                            const driverId = driver._id || driver.id;

                            return (
                                <div key={driverId} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50 hover:border-emerald-500/50 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                                                {fName[0]}{lName[0] || ''}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">{fName} {lName}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(driver)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(driverId)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Phone className="w-4 h-4" />
                                            <span>{driver.phone || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Mail className="w-4 h-4" />
                                            <span>{email}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FileText className="w-4 h-4" />
                                            <span>Type: {driver.licenseType || 'Standard'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Truck className="w-4 h-4" />
                                            <span>Lic: {driver.licenseNumber || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700/50">
                                        <div className="bg-slate-700/30 p-2 rounded text-center">
                                            <p className="text-xs text-gray-400 mb-1">Shipments</p>
                                            <div className="flex items-center justify-center gap-1 text-white font-medium">
                                                <Package className="w-3 h-3 text-blue-400" />
                                                {driver.totalShipments || 0}
                                            </div>
                                        </div>
                                        <div className="bg-slate-700/30 p-2 rounded text-center">
                                            <p className="text-xs text-gray-400 mb-1">Distance</p>
                                            <div className="flex items-center justify-center gap-1 text-white font-medium">
                                                <Gauge className="w-3 h-3 text-purple-400" />
                                                {driver.totalDistance ? (driver.totalDistance / 1000).toFixed(1) + 'k' : '0'} km
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-white font-medium">{driver.rating || 0}</span>
                                            <span className="text-xs text-gray-500">/ 5.0</span>
                                        </div>
                                        <span className="text-xs text-gray-500">Joined: {new Date(driver.createdAt).toLocaleDateString()}</span>
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
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
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
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="block text-sm text-gray-400 mb-1">License Type</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. HMV"
                                        value={formData.licenseType}
                                        onChange={(e) => setFormData(f => ({ ...f, licenseType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
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
