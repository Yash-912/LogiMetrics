import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    Plus,
    Search,
    Filter,
    Download,
    Send,
    Eye,
    Trash2,
    Copy,
    MoreVertical,
    DollarSign,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    Calendar,
    TrendingUp,
    RefreshCw,
} from 'lucide-react';
import { invoiceApi } from '@/api';

const InvoiceManagementPage = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showActionMenu, setShowActionMenu] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
    });

    useEffect(() => {
        fetchInvoices();
    }, [pagination.page, statusFilter, sortBy, sortOrder]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                sortBy,
                sortOrder,
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;

            const response = await invoiceApi.getInvoices(params);
            if (response.success) {
                setInvoices(response.data.invoices || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
                calculateStats(response.data.invoices || []);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            // Mock data for display
            const mockInvoices = [
                {
                    _id: '1',
                    invoiceNumber: 'INV-2026-001',
                    customerName: 'Tech Corp Ltd',
                    customerEmail: 'billing@techcorp.com',
                    totalAmount: 12500.00,
                    status: 'paid',
                    dueDate: '2026-01-15',
                    createdAt: '2026-01-01T10:00:00Z',
                    items: [{ description: 'Shipping Services', quantity: 5, unitPrice: 2500 }],
                },
                {
                    _id: '2',
                    invoiceNumber: 'INV-2026-002',
                    customerName: 'Global Logistics Inc',
                    customerEmail: 'accounts@globallogistics.com',
                    totalAmount: 8750.00,
                    status: 'pending',
                    dueDate: '2026-01-20',
                    createdAt: '2026-01-05T14:30:00Z',
                    items: [{ description: 'Express Delivery', quantity: 7, unitPrice: 1250 }],
                },
                {
                    _id: '3',
                    invoiceNumber: 'INV-2026-003',
                    customerName: 'Metro Distributors',
                    customerEmail: 'finance@metrodist.com',
                    totalAmount: 15000.00,
                    status: 'overdue',
                    dueDate: '2026-01-05',
                    createdAt: '2025-12-28T09:15:00Z',
                    items: [{ description: 'Bulk Transport', quantity: 10, unitPrice: 1500 }],
                },
                {
                    _id: '4',
                    invoiceNumber: 'INV-2026-004',
                    customerName: 'Quick Mart',
                    customerEmail: 'pay@quickmart.com',
                    totalAmount: 5500.00,
                    status: 'sent',
                    dueDate: '2026-01-25',
                    createdAt: '2026-01-08T11:45:00Z',
                    items: [{ description: 'Same Day Delivery', quantity: 11, unitPrice: 500 }],
                },
                {
                    _id: '5',
                    invoiceNumber: 'INV-2026-005',
                    customerName: 'Prime Supplies',
                    customerEmail: 'billing@primesupplies.com',
                    totalAmount: 22000.00,
                    status: 'draft',
                    dueDate: '2026-02-01',
                    createdAt: '2026-01-10T16:20:00Z',
                    items: [{ description: 'Premium Freight', quantity: 4, unitPrice: 5500 }],
                },
            ];
            setInvoices(mockInvoices);
            calculateStats(mockInvoices);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (invoiceList) => {
        const stats = invoiceList.reduce(
            (acc, inv) => {
                acc.total++;
                acc.totalAmount += inv.totalAmount || 0;
                if (inv.status === 'paid') acc.paid++;
                else if (inv.status === 'pending' || inv.status === 'sent' || inv.status === 'draft') acc.pending++;
                else if (inv.status === 'overdue') acc.overdue++;
                return acc;
            },
            { total: 0, paid: 0, pending: 0, overdue: 0, totalAmount: 0 }
        );
        setStats(stats);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchInvoices();
    };

    const handleSendInvoice = async (invoiceId) => {
        try {
            await invoiceApi.sendInvoice(invoiceId);
            fetchInvoices();
        } catch (error) {
            console.error('Error sending invoice:', error);
        }
        setShowActionMenu(null);
    };

    const handleDownloadPDF = async (invoiceId) => {
        try {
            const blob = await invoiceApi.downloadInvoicePDF(invoiceId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceId}.pdf`;
            a.click();
        } catch (error) {
            console.error('Error downloading PDF:', error);
        }
        setShowActionMenu(null);
    };

    const handleDuplicate = async (invoiceId) => {
        try {
            await invoiceApi.duplicateInvoice(invoiceId);
            fetchInvoices();
        } catch (error) {
            console.error('Error duplicating invoice:', error);
        }
        setShowActionMenu(null);
    };

    const handleDelete = async (invoiceId) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
            try {
                await invoiceApi.deleteInvoice(invoiceId);
                fetchInvoices();
            } catch (error) {
                console.error('Error deleting invoice:', error);
            }
        }
        setShowActionMenu(null);
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
            sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            viewed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
            cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        const icons = {
            draft: <FileText className="w-3.5 h-3.5" />,
            sent: <Send className="w-3.5 h-3.5" />,
            viewed: <Eye className="w-3.5 h-3.5" />,
            pending: <Clock className="w-3.5 h-3.5" />,
            paid: <CheckCircle className="w-3.5 h-3.5" />,
            overdue: <AlertCircle className="w-3.5 h-3.5" />,
            cancelled: <XCircle className="w-3.5 h-3.5" />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
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
                                <h1 className="text-xl font-bold text-white">Invoice Management</h1>
                                <p className="text-sm text-slate-400">Manage billing and payments</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                        >
                            <Plus className="w-4 h-4" />
                            New Invoice
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20">
                                <FileText className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Invoices</p>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Paid</p>
                                <p className="text-2xl font-bold text-emerald-400">{stats.paid}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-yellow-500/20">
                                <Clock className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Pending</p>
                                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-500/20">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Overdue</p>
                                <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/20">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Value</p>
                                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalAmount)}</p>
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
                                placeholder="Search by invoice number, customer..."
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
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>

                        <button
                            onClick={fetchInvoices}
                            className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Invoice Table */}
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Invoice</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Amount</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Due Date</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Created</th>
                                        <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr
                                            key={invoice._id}
                                            className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-white">{invoice.invoiceNumber}</p>
                                                    <p className="text-sm text-slate-400">{invoice.items?.length || 0} items</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-white">{invoice.customerName}</p>
                                                    <p className="text-sm text-slate-400">{invoice.customerEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-lg font-semibold text-white">
                                                    {formatCurrency(invoice.totalAmount)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    {formatDate(invoice.dueDate)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {formatDate(invoice.createdAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 relative">
                                                    <button
                                                        onClick={() => setSelectedInvoice(invoice)}
                                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPDF(invoice._id)}
                                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-emerald-400 transition-colors"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowActionMenu(showActionMenu === invoice._id ? null : invoice._id)}
                                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {showActionMenu === invoice._id && (
                                                        <div className="absolute right-0 top-10 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-2xl py-2 z-50">
                                                            <button
                                                                onClick={() => handleSendInvoice(invoice._id)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                Send to Customer
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(invoice._id)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                                Duplicate
                                                            </button>
                                                            <hr className="my-2 border-white/10" />
                                                            <button
                                                                onClick={() => handleDelete(invoice._id)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <p className="text-sm text-slate-400">
                            Showing {invoices.length} of {pagination.total || invoices.length} invoices
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
                                disabled={invoices.length < pagination.limit}
                                className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedInvoice.invoiceNumber}</h2>
                                <p className="text-slate-400">{selectedInvoice.customerName}</p>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Total Amount</p>
                                    <p className="text-2xl font-bold text-white mt-1">
                                        {formatCurrency(selectedInvoice.totalAmount)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Due Date</p>
                                    <p className="text-white mt-1">{formatDate(selectedInvoice.dueDate)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Created</p>
                                    <p className="text-white mt-1">{formatDate(selectedInvoice.createdAt)}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Line Items</h3>
                                <div className="bg-slate-900/50 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Description</th>
                                                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Qty</th>
                                                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Price</th>
                                                <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedInvoice.items?.map((item, idx) => (
                                                <tr key={idx} className="border-b border-white/5">
                                                    <td className="px-4 py-3 text-white">{item.description}</td>
                                                    <td className="px-4 py-3 text-slate-300 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-slate-300 text-right">{formatCurrency(item.unitPrice)}</td>
                                                    <td className="px-4 py-3 text-white text-right font-medium">
                                                        {formatCurrency(item.quantity * item.unitPrice)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => handleDownloadPDF(selectedInvoice._id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white hover:bg-slate-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => handleSendInvoice(selectedInvoice._id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                    Send Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagementPage;
