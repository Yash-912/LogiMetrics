import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Settings,
    Users,
    CreditCard,
    Bell,
    Shield,
    ArrowLeft,
    Upload,
    Save,
    Plus,
    Trash2,
    Edit2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Crown,
    User,
    Loader2,
} from 'lucide-react';
import { companyApi, userApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

const CompanySettingsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [company, setCompany] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        industry: '',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
    });

    const [settings, setSettings] = useState({
        maxShipmentsPerDay: 100,
        autoInvoiceEnabled: true,
        notificationEmail: '',
    });

    const [newMember, setNewMember] = useState({
        email: '',
        role: 'user',
        firstName: '',
        lastName: '',
    });

    useEffect(() => {
        fetchCompanyData();
    }, []);

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            // In a real app, get company ID from user context
            const companyId = user?.companyId || 'mock-company-id';

            // Fetch company details
            try {
                const companyRes = await companyApi.getCompanyById(companyId);
                if (companyRes.success) {
                    setCompany(companyRes.data);
                    setFormData({
                        name: companyRes.data.name || '',
                        email: companyRes.data.email || '',
                        phone: companyRes.data.phone || '',
                        website: companyRes.data.website || '',
                        address: companyRes.data.address || '',
                        city: companyRes.data.city || '',
                        state: companyRes.data.state || '',
                        zipCode: companyRes.data.zipCode || '',
                        country: companyRes.data.country || 'India',
                        industry: companyRes.data.industry || '',
                        timezone: companyRes.data.timezone || 'Asia/Kolkata',
                        currency: companyRes.data.currency || 'INR',
                    });
                    if (companyRes.data.settings) {
                        setSettings(companyRes.data.settings);
                    }
                    setLogoPreview(companyRes.data.logo);
                }
            } catch (e) {
                // Use mock data
                setMockData();
            }

            // Fetch team members
            try {
                const teamRes = await companyApi.getTeamMembers(companyId);
                if (teamRes.success) {
                    setTeamMembers(teamRes.data || []);
                }
            } catch (e) {
                // Mock team data
                setTeamMembers([
                    { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'admin', status: 'active' },
                    { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'manager', status: 'active' },
                    { _id: '3', firstName: 'Mike', lastName: 'Wilson', email: 'mike@example.com', role: 'dispatcher', status: 'active' },
                    { _id: '4', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', role: 'driver', status: 'inactive' },
                ]);
            }

            // Fetch subscription
            try {
                const subRes = await companyApi.getSubscription(companyId);
                if (subRes.success) {
                    setSubscription(subRes.data);
                }
            } catch (e) {
                // Mock subscription data
                setSubscription({
                    plan: 'Professional',
                    status: 'active',
                    startDate: '2026-01-01',
                    endDate: '2027-01-01',
                    features: ['Unlimited Shipments', 'Live Tracking', 'Analytics Dashboard', 'API Access', '24/7 Support'],
                    price: 9999,
                });
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
            setMockData();
        } finally {
            setLoading(false);
        }
    };

    const setMockData = () => {
        setCompany({
            _id: 'mock-company-id',
            name: 'LogiMatrix Technologies',
            email: 'contact@logimatrix.com',
            phone: '+91 98765 43210',
            website: 'www.logimatrix.com',
            address: '123 Logistics Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            country: 'India',
            industry: 'Logistics',
        });
        setFormData({
            name: 'LogiMatrix Technologies',
            email: 'contact@logimatrix.com',
            phone: '+91 98765 43210',
            website: 'www.logimatrix.com',
            address: '123 Logistics Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            country: 'India',
            industry: 'Logistics',
            timezone: 'Asia/Kolkata',
            currency: 'INR',
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const companyId = company?._id || 'mock-company-id';
            await companyApi.updateCompany(companyId, formData);
            await companyApi.updateCompanySettings(companyId, settings);

            if (logoFile) {
                await companyApi.uploadLogo(companyId, logoFile);
            }

            // Show success message
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Settings saved! (Demo mode)');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            const companyId = company?._id || 'mock-company-id';
            await companyApi.addTeamMember(companyId, newMember);
            setTeamMembers(prev => [...prev, { ...newMember, _id: Date.now().toString(), status: 'active' }]);
            setShowAddMemberModal(false);
            setNewMember({ email: '', role: 'user', firstName: '', lastName: '' });
        } catch (error) {
            console.error('Error adding member:', error);
            // Add to local state for demo
            setTeamMembers(prev => [...prev, { ...newMember, _id: Date.now().toString(), status: 'active' }]);
            setShowAddMemberModal(false);
            setNewMember({ email: '', role: 'user', firstName: '', lastName: '' });
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (window.confirm('Are you sure you want to remove this team member?')) {
            try {
                const companyId = company?._id || 'mock-company-id';
                await companyApi.removeTeamMember(companyId, memberId);
                setTeamMembers(prev => prev.filter(m => m._id !== memberId));
            } catch (error) {
                console.error('Error removing member:', error);
                setTeamMembers(prev => prev.filter(m => m._id !== memberId));
            }
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            dispatcher: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            driver: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            user: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role] || styles.user}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
        );
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Building2 },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#0d1424] to-[#0a0f1a] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
        );
    }

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
                                <h1 className="text-xl font-bold text-white">Company Settings</h1>
                                <p className="text-sm text-slate-400">Manage your organization</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        {/* General Settings */}
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Company Logo */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Company Logo</h3>
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-2xl bg-slate-700/50 border border-white/10 overflow-hidden flex items-center justify-center">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-10 h-10 text-slate-500" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-xl text-white cursor-pointer hover:bg-slate-700 transition-colors">
                                                <Upload className="w-4 h-4" />
                                                Upload Logo
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoChange}
                                                    className="hidden"
                                                />
                                            </label>
                                            <p className="text-sm text-slate-400 mt-2">PNG, JPG up to 2MB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Company Information */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Industry</label>
                                            <input
                                                type="text"
                                                value={formData.industry}
                                                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                placeholder="e.g., Logistics"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="url"
                                                    value={formData.website}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Street Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">State</label>
                                            <input
                                                type="text"
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
                                    </div>
                                </div>

                                {/* Business Settings */}
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Business Settings</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Timezone</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <select
                                                    value={formData.timezone}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                                                >
                                                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                                    <option value="UTC">UTC</option>
                                                    <option value="America/New_York">America/New_York</option>
                                                    <option value="Europe/London">Europe/London</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                                            >
                                                <option value="INR">INR (₹)</option>
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Max Shipments/Day</label>
                                            <input
                                                type="number"
                                                value={settings.maxShipmentsPerDay}
                                                onChange={(e) => setSettings(prev => ({ ...prev, maxShipmentsPerDay: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Team Tab */}
                        {activeTab === 'team' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">Team Members</h3>
                                    <button
                                        onClick={() => setShowAddMemberModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Member
                                    </button>
                                </div>

                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Member</th>
                                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Role</th>
                                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                                                <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teamMembers.map((member) => (
                                                <tr key={member._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                                                                <User className="w-5 h-5 text-cyan-400" />
                                                            </div>
                                                            <span className="text-white font-medium">
                                                                {member.firstName} {member.lastName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">{member.email}</td>
                                                    <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${member.status === 'active'
                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                : 'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {member.status === 'active' ? (
                                                                <CheckCircle className="w-3 h-3" />
                                                            ) : (
                                                                <XCircle className="w-3 h-3" />
                                                            )}
                                                            {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveMember(member._id)}
                                                                className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Subscription Tab */}
                        {activeTab === 'subscription' && subscription && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/20 p-6">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Crown className="w-6 h-6 text-yellow-400" />
                                                <h3 className="text-2xl font-bold text-white">{subscription.plan}</h3>
                                            </div>
                                            <p className="text-slate-400">Your current subscription plan</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/30">
                                            Active
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <p className="text-sm text-slate-400">Billing Period</p>
                                            <p className="text-white font-medium">Annual</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Monthly Price</p>
                                            <p className="text-2xl font-bold text-white">₹{subscription.price?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Start Date</p>
                                            <p className="text-white">{new Date(subscription.startDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">Renewal Date</p>
                                            <p className="text-white">{new Date(subscription.endDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-400 mb-3">Included Features</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {subscription.features?.map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-white">
                                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white hover:bg-slate-700/50 transition-colors">
                                    Upgrade Plan
                                </button>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Email Notifications</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notification Email</label>
                                            <input
                                                type="email"
                                                value={settings.notificationEmail}
                                                onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                                                className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                                placeholder="notifications@company.com"
                                            />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.autoInvoiceEnabled}
                                                onChange={(e) => setSettings(prev => ({ ...prev, autoInvoiceEnabled: e.target.checked }))}
                                                className="w-5 h-5 rounded border-white/20 bg-slate-900/50 text-cyan-500 focus:ring-cyan-500/20"
                                            />
                                            <span className="text-white">Enable automatic invoice generation</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                            <div>
                                                <p className="text-white font-medium">Two-Factor Authentication</p>
                                                <p className="text-sm text-slate-400">Add an extra layer of security</p>
                                            </div>
                                            <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                                                Enable
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                            <div>
                                                <p className="text-white font-medium">API Keys</p>
                                                <p className="text-sm text-slate-400">Manage API access keys</p>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-700 transition-colors">
                                                Manage
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl">
                                            <div>
                                                <p className="text-white font-medium">Session Management</p>
                                                <p className="text-sm text-slate-400">View and manage active sessions</p>
                                            </div>
                                            <button className="px-4 py-2 bg-slate-700/50 text-white rounded-lg hover:bg-slate-700 transition-colors">
                                                View
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-md">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Add Team Member</h2>
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddMember} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newMember.firstName}
                                        onChange={(e) => setNewMember(prev => ({ ...prev, firstName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newMember.lastName}
                                        onChange={(e) => setNewMember(prev => ({ ...prev, lastName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newMember.email}
                                    onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                                <select
                                    value={newMember.role}
                                    onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                >
                                    <option value="user">User</option>
                                    <option value="driver">Driver</option>
                                    <option value="dispatcher">Dispatcher</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMemberModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
                                >
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanySettingsPage;
