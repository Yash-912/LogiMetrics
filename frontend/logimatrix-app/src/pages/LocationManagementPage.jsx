import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MapPin,
    Plus,
    Search,
    Edit2,
    Trash2,
    ArrowLeft,
    Building2,
    Warehouse,
    Phone,
    Mail,
    Clock,
    MoreVertical,
    CheckCircle,
    XCircle,
    RefreshCw,
    Map,
    Navigation,
    Loader2,
} from 'lucide-react';
import { locationApi } from '@/api';

const LocationManagementPage = () => {
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        locationType: 'warehouse',
        contactPerson: '',
        phone: '',
        email: '',
        operatingHours: { open: '09:00', close: '18:00' },
        coordinates: { lat: '', lng: '' },
    });

    useEffect(() => {
        fetchLocations();
    }, [pagination.page, typeFilter]);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (typeFilter !== 'all') params.locationType = typeFilter;
            if (searchQuery) params.search = searchQuery;

            const response = await locationApi.getLocations(params);
            if (response.success) {
                setLocations(response.data.locations || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            // Mock data
            const mockLocations = [
                {
                    _id: '1',
                    name: 'Mumbai Central Hub',
                    address: '123 Logistics Park, Andheri East',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    zipCode: '400069',
                    country: 'India',
                    locationType: 'hub',
                    contactPerson: 'Rajesh Kumar',
                    phone: '+91 98765 43210',
                    email: 'mumbai@logimatrix.com',
                    operatingHours: { open: '06:00', close: '22:00' },
                    coordinates: { coordinates: [72.8777, 19.0760] },
                },
                {
                    _id: '2',
                    name: 'Delhi Distribution Center',
                    address: '456 Industrial Area, Okhla Phase 2',
                    city: 'New Delhi',
                    state: 'Delhi',
                    zipCode: '110020',
                    country: 'India',
                    locationType: 'distribution_center',
                    contactPerson: 'Amit Singh',
                    phone: '+91 98765 43211',
                    email: 'delhi@logimatrix.com',
                    operatingHours: { open: '07:00', close: '21:00' },
                    coordinates: { coordinates: [77.2090, 28.6139] },
                },
                {
                    _id: '3',
                    name: 'Bangalore Warehouse',
                    address: '789 Tech Park Road, Whitefield',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    zipCode: '560066',
                    country: 'India',
                    locationType: 'warehouse',
                    contactPerson: 'Priya Sharma',
                    phone: '+91 98765 43212',
                    email: 'bangalore@logimatrix.com',
                    operatingHours: { open: '08:00', close: '20:00' },
                    coordinates: { coordinates: [77.5946, 12.9716] },
                },
                {
                    _id: '4',
                    name: 'Chennai Pickup Point',
                    address: '321 Anna Nagar Main Road',
                    city: 'Chennai',
                    state: 'Tamil Nadu',
                    zipCode: '600040',
                    country: 'India',
                    locationType: 'pickup_point',
                    contactPerson: 'Venkat Rao',
                    phone: '+91 98765 43213',
                    email: 'chennai@logimatrix.com',
                    operatingHours: { open: '09:00', close: '18:00' },
                    coordinates: { coordinates: [80.2707, 13.0827] },
                },
                {
                    _id: '5',
                    name: 'Pune Delivery Hub',
                    address: '555 Hinjewadi IT Park',
                    city: 'Pune',
                    state: 'Maharashtra',
                    zipCode: '411057',
                    country: 'India',
                    locationType: 'delivery_point',
                    contactPerson: 'Manoj Patil',
                    phone: '+91 98765 43214',
                    email: 'pune@logimatrix.com',
                    operatingHours: { open: '08:00', close: '20:00' },
                    coordinates: { coordinates: [73.8567, 18.5204] },
                },
                {
                    _id: '6',
                    name: 'Hyderabad Warehouse',
                    address: '888 HITEC City, Madhapur',
                    city: 'Hyderabad',
                    state: 'Telangana',
                    zipCode: '500081',
                    country: 'India',
                    locationType: 'warehouse',
                    contactPerson: 'Srikanth Reddy',
                    phone: '+91 98765 43215',
                    email: 'hyderabad@logimatrix.com',
                    operatingHours: { open: '07:00', close: '21:00' },
                    coordinates: { coordinates: [78.4867, 17.3850] },
                },
            ];
            setLocations(mockLocations);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchLocations();
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        try {
            await locationApi.createLocation(formData);
            setShowCreateModal(false);
            resetForm();
            fetchLocations();
        } catch (error) {
            console.error('Error creating location:', error);
            // Add to local state for demo
            setLocations(prev => [...prev, { ...formData, _id: Date.now().toString() }]);
            setShowCreateModal(false);
            resetForm();
        }
    };

    const handleDelete = async (locationId) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            try {
                await locationApi.deleteLocation(locationId);
                fetchLocations();
            } catch (error) {
                console.error('Error deleting location:', error);
                setLocations(prev => prev.filter(l => l._id !== locationId));
            }
        }
        setShowActionMenu(null);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'India',
            locationType: 'warehouse',
            contactPerson: '',
            phone: '',
            email: '',
            operatingHours: { open: '09:00', close: '18:00' },
            coordinates: { lat: '', lng: '' },
        });
    };

    const getLocationTypeIcon = (type) => {
        const icons = {
            warehouse: <Warehouse className="w-5 h-5" />,
            distribution_center: <Building2 className="w-5 h-5" />,
            hub: <Navigation className="w-5 h-5" />,
            pickup_point: <MapPin className="w-5 h-5" />,
            delivery_point: <MapPin className="w-5 h-5" />,
        };
        return icons[type] || <MapPin className="w-5 h-5" />;
    };

    const getLocationTypeBadge = (type) => {
        const styles = {
            warehouse: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            distribution_center: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            hub: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            pickup_point: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            delivery_point: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        };
        const labels = {
            warehouse: 'Warehouse',
            distribution_center: 'Distribution Center',
            hub: 'Hub',
            pickup_point: 'Pickup Point',
            delivery_point: 'Delivery Point',
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[type] || styles.warehouse}`}>
                {getLocationTypeIcon(type)}
                {labels[type] || type}
            </span>
        );
    };

    const locationTypes = [
        { value: 'all', label: 'All Types' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'distribution_center', label: 'Distribution Center' },
        { value: 'hub', label: 'Hub' },
        { value: 'pickup_point', label: 'Pickup Point' },
        { value: 'delivery_point', label: 'Delivery Point' },
    ];

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
                                <h1 className="text-xl font-bold text-white">Location Management</h1>
                                <p className="text-sm text-slate-400">Manage warehouses, hubs, and delivery points</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                        >
                            <Plus className="w-4 h-4" />
                            Add Location
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20">
                                <MapPin className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total</p>
                                <p className="text-2xl font-bold text-white">{locations.length}</p>
                            </div>
                        </div>
                    </div>

                    {['warehouse', 'hub', 'distribution_center', 'pickup_point'].map((type) => (
                        <div key={type} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${type === 'warehouse' ? 'bg-blue-500/20' :
                                        type === 'hub' ? 'bg-cyan-500/20' :
                                            type === 'distribution_center' ? 'bg-purple-500/20' :
                                                'bg-emerald-500/20'
                                    }`}>
                                    {getLocationTypeIcon(type)}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 capitalize">{type.replace(/_/g, ' ')}</p>
                                    <p className="text-xl font-bold text-white">
                                        {locations.filter(l => l.locationType === type).length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, city, address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>
                    </form>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                    >
                        {locationTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={fetchLocations}
                        className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Locations Grid */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locations.map((location) => (
                            <div
                                key={location._id}
                                className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
                            >
                                {/* Card Header */}
                                <div className="p-5 border-b border-white/5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                                {location.name}
                                            </h3>
                                            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {location.city}, {location.state}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowActionMenu(showActionMenu === location._id ? null : location._id)}
                                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {showActionMenu === location._id && (
                                                <div className="absolute right-0 top-10 w-40 bg-slate-800 rounded-xl border border-white/10 shadow-2xl py-2 z-50">
                                                    <button
                                                        onClick={() => setSelectedLocation(location)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(location._id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {getLocationTypeBadge(location.locationType)}
                                </div>

                                {/* Card Body */}
                                <div className="p-5 space-y-3">
                                    <div className="text-sm text-slate-300">
                                        <p className="line-clamp-2">{location.address}</p>
                                        <p className="text-slate-500">{location.zipCode}, {location.country}</p>
                                    </div>

                                    {location.contactPerson && (
                                        <div className="pt-3 border-t border-white/5 space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Building2 className="w-4 h-4" />
                                                <span>{location.contactPerson}</span>
                                            </div>
                                            {location.phone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{location.phone}</span>
                                                </div>
                                            )}
                                            {location.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Mail className="w-4 h-4" />
                                                    <span className="truncate">{location.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {location.operatingHours && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Clock className="w-4 h-4" />
                                            <span>{location.operatingHours.open} - {location.operatingHours.close}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-3 bg-slate-900/30 border-t border-white/5 flex items-center justify-between">
                                    {location.coordinates?.coordinates && (
                                        <span className="text-xs text-slate-500 font-mono">
                                            {location.coordinates.coordinates[1]?.toFixed(4)}, {location.coordinates.coordinates[0]?.toFixed(4)}
                                        </span>
                                    )}
                                    <button className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                                        <Map className="w-4 h-4" />
                                        View Map
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-8">
                    <p className="text-sm text-slate-400">
                        Showing {locations.length} locations
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
                            disabled={locations.length < pagination.limit}
                            className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </main>

            {/* Create Location Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Add New Location</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLocation} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Location Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                        placeholder="e.g., Mumbai Central Hub"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Location Type</label>
                                    <select
                                        value={formData.locationType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, locationType: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    >
                                        <option value="warehouse">Warehouse</option>
                                        <option value="distribution_center">Distribution Center</option>
                                        <option value="hub">Hub</option>
                                        <option value="pickup_point">Pickup Point</option>
                                        <option value="delivery_point">Delivery Point</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                        placeholder="Street address"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">State</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.state}
                                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">ZIP Code</label>
                                    <input
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Country</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Person</label>
                                    <input
                                        type="text"
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Opening Time</label>
                                    <input
                                        type="time"
                                        value={formData.operatingHours.open}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            operatingHours: { ...prev.operatingHours, open: e.target.value }
                                        }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Closing Time</label>
                                    <input
                                        type="time"
                                        value={formData.operatingHours.close}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            operatingHours: { ...prev.operatingHours, close: e.target.value }
                                        }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
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
                                    Add Location
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationManagementPage;
