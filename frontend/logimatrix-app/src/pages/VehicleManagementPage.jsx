/**
 * Vehicle Management Page
 * Manage fleet vehicles with CRUD operations
 */

import { useState, useEffect } from 'react';
import {
    Truck, Search, Plus, Edit, Trash2, MapPin, Fuel, Calendar,
    RefreshCw, AlertCircle, CheckCircle, X, Settings, Gauge,
    Package, Clock
} from 'lucide-react';

// Vehicle status configuration
const STATUS_CONFIG = {
    available: { label: 'Available', color: 'bg-green-500/20 text-green-400' },
    in_use: { label: 'In Use', color: 'bg-blue-500/20 text-blue-400' },
    maintenance: { label: 'Maintenance', color: 'bg-yellow-500/20 text-yellow-400' },
    out_of_service: { label: 'Out of Service', color: 'bg-red-500/20 text-red-400' }
};

// Vehicle types
const VEHICLE_TYPES = [
    { id: 'truck', label: 'Truck', icon: '🚛' },
    { id: 'van', label: 'Van', icon: '🚐' },
    { id: 'pickup', label: 'Pickup', icon: '🛻' },
    { id: 'trailer', label: 'Trailer', icon: '🚚' }
];

// Mock vehicle data
const MOCK_VEHICLES = [
    { id: 'VEH001', licensePlate: 'DL-01-AB-1234', type: 'truck', make: 'Tata', model: 'Prima', year: 2022, status: 'available', fuelType: 'diesel', capacity: '16 Ton', mileage: 45000, lastService: '2024-11-15', nextService: '2025-02-15' },
    { id: 'VEH002', licensePlate: 'DL-01-CD-5678', type: 'van', make: 'Mahindra', model: 'Supro', year: 2023, status: 'in_use', fuelType: 'diesel', capacity: '1 Ton', mileage: 12000, lastService: '2024-12-01', nextService: '2025-03-01' },
    { id: 'VEH003', licensePlate: 'MH-02-EF-9012', type: 'truck', make: 'Ashok Leyland', model: 'Dost', year: 2021, status: 'maintenance', fuelType: 'diesel', capacity: '3 Ton', mileage: 78000, lastService: '2024-10-20', nextService: '2025-01-20' },
    { id: 'VEH004', licensePlate: 'KA-03-GH-3456', type: 'pickup', make: 'Tata', model: 'Ace', year: 2024, status: 'available', fuelType: 'cng', capacity: '750 Kg', mileage: 5000, lastService: '2024-12-10', nextService: '2025-06-10' },
];

export default function VehicleManagementPage() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [formData, setFormData] = useState({
        licensePlate: '', type: 'truck', make: '', model: '', year: new Date().getFullYear(),
        status: 'available', fuelType: 'diesel', capacity: ''
    });

    // Load vehicles
    useEffect(() => {
        const loadVehicles = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 500));
            const stored = localStorage.getItem('mock_vehicles');
            if (stored) {
                setVehicles(JSON.parse(stored));
            } else {
                setVehicles(MOCK_VEHICLES);
                localStorage.setItem('mock_vehicles', JSON.stringify(MOCK_VEHICLES));
            }
            setLoading(false);
        };
        loadVehicles();
    }, []);

    // Filter vehicles
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch = `${vehicle.licensePlate} ${vehicle.make} ${vehicle.model}`
            .toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || vehicle.status === statusFilter;
        const matchesType = !typeFilter || vehicle.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    // Handle form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        let updatedVehicles;

        if (editingVehicle) {
            updatedVehicles = vehicles.map(v => v.id === editingVehicle.id ? { ...v, ...formData } : v);
        } else {
            const newVehicle = {
                ...formData,
                id: 'VEH' + Date.now(),
                mileage: 0,
                lastService: new Date().toISOString().split('T')[0],
                nextService: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            updatedVehicles = [...vehicles, newVehicle];
        }

        setVehicles(updatedVehicles);
        localStorage.setItem('mock_vehicles', JSON.stringify(updatedVehicles));
        setShowAddModal(false);
        setEditingVehicle(null);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            licensePlate: '', type: 'truck', make: '', model: '', year: new Date().getFullYear(),
            status: 'available', fuelType: 'diesel', capacity: ''
        });
    };

    // Handle delete
    const handleDelete = (id) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        const updatedVehicles = vehicles.filter(v => v.id !== id);
        setVehicles(updatedVehicles);
        localStorage.setItem('mock_vehicles', JSON.stringify(updatedVehicles));
    };

    // Handle edit
    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            licensePlate: vehicle.licensePlate,
            type: vehicle.type,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            status: vehicle.status,
            fuelType: vehicle.fuelType,
            capacity: vehicle.capacity
        });
        setShowAddModal(true);
    };

    // Get type icon
    const getTypeIcon = (type) => {
        const t = VEHICLE_TYPES.find(v => v.id === type);
        return t ? t.icon : '🚗';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Truck className="w-8 h-8 text-orange-400" />
                            Vehicle Management
                        </h1>
                        <p className="text-gray-400 mt-1">Manage your fleet vehicles</p>
                    </div>
                    <button
                        onClick={() => { setEditingVehicle(null); resetForm(); setShowAddModal(true); }}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-orange-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        Add Vehicle
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Total Vehicles', value: vehicles.length, color: 'from-blue-500 to-cyan-500' },
                        { label: 'Available', value: vehicles.filter(v => v.status === 'available').length, color: 'from-green-500 to-emerald-500' },
                        { label: 'In Use', value: vehicles.filter(v => v.status === 'in_use').length, color: 'from-purple-500 to-pink-500' },
                        { label: 'Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length, color: 'from-yellow-500 to-orange-500' }
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
                                placeholder="Search by license plate, make, or model..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Types</option>
                            {VEHICLE_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Vehicles Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
                    </div>
                ) : filteredVehicles.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700/50">
                        <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 mb-4">No vehicles found</p>
                        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                            Add First Vehicle
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVehicles.map(vehicle => {
                            const status = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.available;
                            return (
                                <div key={vehicle.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-5 border border-slate-700/50 hover:border-orange-500/50 transition-all group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-2xl">
                                                {getTypeIcon(vehicle.type)}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold font-mono">{vehicle.licensePlate}</h3>
                                                <p className="text-gray-400 text-sm">{vehicle.make} {vehicle.model}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(vehicle)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-slate-700 rounded">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-xs text-gray-400">{vehicle.year}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Package className="w-4 h-4" />
                                            <span>{vehicle.capacity}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Fuel className="w-4 h-4" />
                                            <span className="capitalize">{vehicle.fuelType}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Gauge className="w-4 h-4" />
                                            <span>{vehicle.mileage?.toLocaleString()} km</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Settings className="w-4 h-4" />
                                            <span>{vehicle.nextService}</span>
                                        </div>
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
                                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">License Plate</label>
                                <input
                                    type="text"
                                    value={formData.licensePlate}
                                    onChange={(e) => setFormData(f => ({ ...f, licensePlate: e.target.value.toUpperCase() }))}
                                    required
                                    placeholder="DL-01-AB-1234"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(f => ({ ...f, type: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    >
                                        {VEHICLE_TYPES.map(t => (
                                            <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Year</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData(f => ({ ...f, year: parseInt(e.target.value) }))}
                                        min="2000"
                                        max={new Date().getFullYear() + 1}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Make</label>
                                    <input
                                        type="text"
                                        value={formData.make}
                                        onChange={(e) => setFormData(f => ({ ...f, make: e.target.value }))}
                                        required
                                        placeholder="Tata"
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Model</label>
                                    <input
                                        type="text"
                                        value={formData.model}
                                        onChange={(e) => setFormData(f => ({ ...f, model: e.target.value }))}
                                        required
                                        placeholder="Prima"
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Fuel Type</label>
                                    <select
                                        value={formData.fuelType}
                                        onChange={(e) => setFormData(f => ({ ...f, fuelType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                    >
                                        <option value="diesel">Diesel</option>
                                        <option value="petrol">Petrol</option>
                                        <option value="cng">CNG</option>
                                        <option value="electric">Electric</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Capacity</label>
                                    <input
                                        type="text"
                                        value={formData.capacity}
                                        onChange={(e) => setFormData(f => ({ ...f, capacity: e.target.value }))}
                                        required
                                        placeholder="16 Ton"
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
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                                    {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
