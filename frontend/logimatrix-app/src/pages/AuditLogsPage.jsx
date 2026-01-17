import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Search,
    Filter,
    Download,
    ArrowLeft,
    Clock,
    User,
    Activity,
    Shield,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MoreVertical,
    RefreshCw,
    Calendar,
    Eye,
    ChevronDown,
    Loader2,
} from 'lucide-react';
import { adminApi } from '@/api';

const AuditLogsPage = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [selectedLog, setSelectedLog] = useState(null);
    const [expandedLog, setExpandedLog] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, actionFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (actionFilter !== 'all') params.action = actionFilter;
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            const response = await adminApi.getAuditLogs(params);
            if (response.success) {
                setLogs(response.data.logs || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            // Mock data
            const mockLogs = [
                {
                    _id: '1',
                    userId: 'user-001',
                    userEmail: 'admin@logimatrix.com',
                    userRole: 'admin',
                    action: 'login',
                    resource: 'auth',
                    description: 'User logged in successfully',
                    ipAddress: '192.168.1.100',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                    success: true,
                    timestamp: '2026-01-10T21:45:00Z',
                },
                {
                    _id: '2',
                    userId: 'user-002',
                    userEmail: 'manager@logimatrix.com',
                    userRole: 'manager',
                    action: 'create',
                    resource: 'shipment',
                    resourceId: 'SHP-2026-0042',
                    description: 'Created new shipment SHP-2026-0042',
                    ipAddress: '192.168.1.101',
                    success: true,
                    timestamp: '2026-01-10T21:30:00Z',
                },
                {
                    _id: '3',
                    userId: 'user-003',
                    userEmail: 'dispatcher@logimatrix.com',
                    userRole: 'dispatcher',
                    action: 'update',
                    resource: 'vehicle',
                    resourceId: 'VEH-001',
                    description: 'Updated vehicle status to active',
                    changes: [{ field: 'status', oldValue: 'inactive', newValue: 'active' }],
                    ipAddress: '192.168.1.102',
                    success: true,
                    timestamp: '2026-01-10T21:15:00Z',
                },
                {
                    _id: '4',
                    userId: 'user-001',
                    userEmail: 'admin@logimatrix.com',
                    userRole: 'admin',
                    action: 'delete',
                    resource: 'driver',
                    resourceId: 'DRV-005',
                    description: 'Deleted driver account DRV-005',
                    ipAddress: '192.168.1.100',
                    success: true,
                    timestamp: '2026-01-10T20:45:00Z',
                },
                {
                    _id: '5',
                    userId: 'user-004',
                    userEmail: 'unknown@test.com',
                    action: 'login_failed',
                    resource: 'auth',
                    description: 'Failed login attempt - invalid credentials',
                    ipAddress: '203.45.67.89',
                    success: false,
                    errorMessage: 'Invalid email or password',
                    timestamp: '2026-01-10T20:30:00Z',
                },
                {
                    _id: '6',
                    userId: 'user-002',
                    userEmail: 'manager@logimatrix.com',
                    userRole: 'manager',
                    action: 'export',
                    resource: 'shipment',
                    description: 'Exported shipment report (PDF)',
                    ipAddress: '192.168.1.101',
                    success: true,
                    timestamp: '2026-01-10T20:00:00Z',
                },
                {
                    _id: '7',
                    userId: 'user-001',
                    userEmail: 'admin@logimatrix.com',
                    userRole: 'admin',
                    action: 'permission_change',
                    resource: 'user',
                    resourceId: 'user-005',
                    description: 'Updated user role from dispatcher to manager',
                    changes: [{ field: 'role', oldValue: 'dispatcher', newValue: 'manager' }],
                    ipAddress: '192.168.1.100',
                    success: true,
                    timestamp: '2026-01-10T19:30:00Z',
                },
                {
                    _id: '8',
                    userId: 'system',
                    action: 'system_event',
                    resource: 'backup',
                    description: 'Automated database backup completed',
                    success: true,
                    timestamp: '2026-01-10T18:00:00Z',
                },
                {
                    _id: '9',
                    userId: 'user-002',
                    userEmail: 'manager@logimatrix.com',
                    userRole: 'manager',
                    action: 'payment',
                    resource: 'invoice',
                    resourceId: 'INV-2026-001',
                    description: 'Processed payment for invoice INV-2026-001',
                    metadata: { amount: 12500, method: 'bank_transfer' },
                    ipAddress: '192.168.1.101',
                    success: true,
                    timestamp: '2026-01-10T17:45:00Z',
                },
                {
                    _id: '10',
                    userId: 'user-001',
                    userEmail: 'admin@logimatrix.com',
                    userRole: 'admin',
                    action: 'settings_change',
                    resource: 'company',
                    description: 'Updated company notification settings',
                    changes: [{ field: 'autoInvoiceEnabled', oldValue: false, newValue: true }],
                    ipAddress: '192.168.1.100',
                    success: true,
                    timestamp: '2026-01-10T17:00:00Z',
                },
            ];
            setLogs(mockLogs);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Export logic - create CSV/JSON
        const csvContent = logs.map(log =>
            `${log.timestamp},${log.userEmail},${log.action},${log.resource},${log.description}`
        ).join('\n');

        const blob = new Blob([`Timestamp,User,Action,Resource,Description\n${csvContent}`], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getActionBadge = (action, success) => {
        const actionStyles = {
            login: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            logout: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
            login_failed: 'bg-red-500/20 text-red-400 border-red-500/30',
            create: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            read: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
            update: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            delete: 'bg-red-500/20 text-red-400 border-red-500/30',
            export: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            import: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            payment: 'bg-green-500/20 text-green-400 border-green-500/30',
            permission_change: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            settings_change: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            system_event: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        };

        const actionIcons = {
            login: <CheckCircle className="w-3.5 h-3.5" />,
            logout: <Activity className="w-3.5 h-3.5" />,
            login_failed: <XCircle className="w-3.5 h-3.5" />,
            create: <FileText className="w-3.5 h-3.5" />,
            update: <Activity className="w-3.5 h-3.5" />,
            delete: <XCircle className="w-3.5 h-3.5" />,
            export: <Download className="w-3.5 h-3.5" />,
            payment: <CheckCircle className="w-3.5 h-3.5" />,
            permission_change: <Shield className="w-3.5 h-3.5" />,
            settings_change: <Activity className="w-3.5 h-3.5" />,
            system_event: <Activity className="w-3.5 h-3.5" />,
        };

        const style = actionStyles[action] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        const icon = actionIcons[action] || <Activity className="w-3.5 h-3.5" />;

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
                {icon}
                {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
        );
    };

    const getResourceBadge = (resource) => {
        const resourceStyles = {
            auth: 'bg-purple-500/10 text-purple-300',
            user: 'bg-blue-500/10 text-blue-300',
            shipment: 'bg-cyan-500/10 text-cyan-300',
            vehicle: 'bg-emerald-500/10 text-emerald-300',
            driver: 'bg-amber-500/10 text-amber-300',
            invoice: 'bg-green-500/10 text-green-300',
            company: 'bg-indigo-500/10 text-indigo-300',
            backup: 'bg-slate-500/10 text-slate-300',
        };

        const style = resourceStyles[resource] || 'bg-slate-500/10 text-slate-300';

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
                {resource.charAt(0).toUpperCase() + resource.slice(1)}
            </span>
        );
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = (now - date) / 1000;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const actionOptions = [
        { value: 'all', label: 'All Actions' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'login_failed', label: 'Failed Login' },
        { value: 'create', label: 'Create' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'export', label: 'Export' },
        { value: 'payment', label: 'Payment' },
        { value: 'permission_change', label: 'Permission Change' },
        { value: 'settings_change', label: 'Settings Change' },
        { value: 'system_event', label: 'System Event' },
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
                                <h1 className="text-xl font-bold text-white">Audit Logs</h1>
                                <p className="text-sm text-slate-400">System activity and security events</p>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white hover:bg-slate-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20">
                                <Activity className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Events</p>
                                <p className="text-2xl font-bold text-white">{logs.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Successful</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {logs.filter(l => l.success).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-500/20">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Failed</p>
                                <p className="text-2xl font-bold text-red-400">
                                    {logs.filter(l => !l.success).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-yellow-500/20">
                                <Shield className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Security</p>
                                <p className="text-2xl font-bold text-white">
                                    {logs.filter(l => ['login', 'logout', 'login_failed', 'permission_change'].includes(l.action)).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs by user, description, IP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[160px]"
                    >
                        {actionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                        />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>

                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Logs List */}
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {logs.map((log) => {
                                const { date, time } = formatTimestamp(log.timestamp);
                                const isExpanded = expandedLog === log._id;

                                return (
                                    <div
                                        key={log._id}
                                        className={`p-4 hover:bg-white/[0.02] transition-colors ${!log.success ? 'border-l-2 border-red-500' : ''}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Status Icon */}
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${log.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                                }`}>
                                                {log.success ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>

                                            {/* Main Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            {getActionBadge(log.action, log.success)}
                                                            {getResourceBadge(log.resource)}
                                                            {log.resourceId && (
                                                                <span className="text-xs text-slate-400 font-mono">
                                                                    {log.resourceId}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-white">{log.description}</p>
                                                        {!log.success && log.errorMessage && (
                                                            <p className="text-sm text-red-400 mt-1">{log.errorMessage}</p>
                                                        )}
                                                    </div>

                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-sm text-slate-400">{formatTimeAgo(log.timestamp)}</p>
                                                        <p className="text-xs text-slate-500">{date} {time}</p>
                                                    </div>
                                                </div>

                                                {/* User Info */}
                                                <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                                                    {log.userEmail && (
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4" />
                                                            <span>{log.userEmail}</span>
                                                            {log.userRole && (
                                                                <span className="text-xs bg-slate-700/50 px-1.5 py-0.5 rounded">
                                                                    {log.userRole}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {log.ipAddress && (
                                                        <span className="font-mono text-xs">{log.ipAddress}</span>
                                                    )}
                                                </div>

                                                {/* Expandable Details */}
                                                {(log.changes || log.metadata) && (
                                                    <button
                                                        onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                                                        className="flex items-center gap-1 mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        {isExpanded ? 'Hide Details' : 'View Details'}
                                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                )}

                                                {isExpanded && (
                                                    <div className="mt-3 p-3 bg-slate-900/50 rounded-xl">
                                                        {log.changes && (
                                                            <div className="mb-3">
                                                                <p className="text-xs text-slate-400 mb-2">Changes:</p>
                                                                {log.changes.map((change, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                                                        <span className="text-slate-300">{change.field}:</span>
                                                                        <span className="text-red-400 line-through">{String(change.oldValue)}</span>
                                                                        <span className="text-slate-400">→</span>
                                                                        <span className="text-emerald-400">{String(change.newValue)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {log.metadata && (
                                                            <div>
                                                                <p className="text-xs text-slate-400 mb-2">Metadata:</p>
                                                                <pre className="text-xs text-slate-300 font-mono">
                                                                    {JSON.stringify(log.metadata, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.userAgent && (
                                                            <div className="mt-2">
                                                                <p className="text-xs text-slate-400 mb-1">User Agent:</p>
                                                                <p className="text-xs text-slate-500 font-mono break-all">{log.userAgent}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <p className="text-sm text-slate-400">
                            Showing {logs.length} events
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
                                disabled={logs.length < pagination.limit}
                                className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AuditLogsPage;
