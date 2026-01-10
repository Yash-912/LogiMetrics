import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    ArrowLeft,
    Search,
    Filter,
    Download,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    DollarSign,
    TrendingUp,
    Wallet,
    Receipt,
    MoreVertical,
    Eye,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { transactionApi } from '@/api';

const TransactionsPage = () => {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [stats, setStats] = useState({
        totalReceived: 0,
        totalPending: 0,
        totalRefunded: 0,
        transactionCount: 0,
    });

    useEffect(() => {
        fetchTransactions();
    }, [pagination.page, statusFilter, typeFilter]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
            };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (typeFilter !== 'all') params.type = typeFilter;
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            const response = await transactionApi.getTransactions(params);
            if (response.success) {
                setTransactions(response.data.transactions || []);
                setPagination(prev => ({ ...prev, total: response.data.total || 0 }));
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            // Mock data
            const mockTransactions = [
                {
                    _id: '1',
                    transactionNumber: 'TXN-2026-0001',
                    type: 'payment',
                    amount: 25000,
                    currency: 'INR',
                    status: 'completed',
                    paymentMethod: 'bank_transfer',
                    invoiceId: 'INV-2026-001',
                    invoiceNumber: 'INV-2026-001',
                    customerName: 'ABC Logistics Pvt Ltd',
                    description: 'Payment for invoice INV-2026-001',
                    reference: 'IMPS/123456789',
                    createdAt: '2026-01-10T15:30:00Z',
                },
                {
                    _id: '2',
                    transactionNumber: 'TXN-2026-0002',
                    type: 'payment',
                    amount: 45000,
                    currency: 'INR',
                    status: 'completed',
                    paymentMethod: 'upi',
                    invoiceId: 'INV-2026-002',
                    invoiceNumber: 'INV-2026-002',
                    customerName: 'XYZ Transport Co',
                    description: 'Payment for invoice INV-2026-002',
                    reference: 'UPI/9876543210',
                    createdAt: '2026-01-09T11:20:00Z',
                },
                {
                    _id: '3',
                    transactionNumber: 'TXN-2026-0003',
                    type: 'payment',
                    amount: 18500,
                    currency: 'INR',
                    status: 'pending',
                    paymentMethod: 'credit_card',
                    invoiceId: 'INV-2026-003',
                    invoiceNumber: 'INV-2026-003',
                    customerName: 'Metro Movers Ltd',
                    description: 'Pending payment for invoice INV-2026-003',
                    createdAt: '2026-01-08T09:45:00Z',
                },
                {
                    _id: '4',
                    transactionNumber: 'TXN-2026-0004',
                    type: 'refund',
                    amount: 5000,
                    currency: 'INR',
                    status: 'completed',
                    paymentMethod: 'bank_transfer',
                    invoiceId: 'INV-2026-001',
                    invoiceNumber: 'INV-2026-001',
                    customerName: 'ABC Logistics Pvt Ltd',
                    description: 'Partial refund for damaged goods',
                    reference: 'REF/567890123',
                    createdAt: '2026-01-07T14:10:00Z',
                },
                {
                    _id: '5',
                    transactionNumber: 'TXN-2026-0005',
                    type: 'payment',
                    amount: 72000,
                    currency: 'INR',
                    status: 'failed',
                    paymentMethod: 'credit_card',
                    invoiceId: 'INV-2026-005',
                    invoiceNumber: 'INV-2026-005',
                    customerName: 'Global Freight Inc',
                    description: 'Failed payment - Card declined',
                    errorMessage: 'Card declined by issuer',
                    createdAt: '2026-01-06T16:50:00Z',
                },
                {
                    _id: '6',
                    transactionNumber: 'TXN-2026-0006',
                    type: 'payment',
                    amount: 33500,
                    currency: 'INR',
                    status: 'completed',
                    paymentMethod: 'net_banking',
                    invoiceId: 'INV-2026-006',
                    invoiceNumber: 'INV-2026-006',
                    customerName: 'Quick Ship Solutions',
                    description: 'Payment for invoice INV-2026-006',
                    reference: 'NB/345678901',
                    createdAt: '2026-01-05T10:30:00Z',
                },
                {
                    _id: '7',
                    transactionNumber: 'TXN-2026-0007',
                    type: 'payment',
                    amount: 15000,
                    currency: 'INR',
                    status: 'processing',
                    paymentMethod: 'upi',
                    invoiceId: 'INV-2026-007',
                    invoiceNumber: 'INV-2026-007',
                    customerName: 'Fast Track Logistics',
                    description: 'Payment processing',
                    createdAt: '2026-01-10T18:00:00Z',
                },
            ];
            setTransactions(mockTransactions);

            // Calculate stats
            const completed = mockTransactions.filter(t => t.status === 'completed' && t.type === 'payment');
            const pending = mockTransactions.filter(t => t.status === 'pending' || t.status === 'processing');
            const refunded = mockTransactions.filter(t => t.type === 'refund' && t.status === 'completed');

            setStats({
                totalReceived: completed.reduce((acc, t) => acc + t.amount, 0),
                totalPending: pending.reduce((acc, t) => acc + t.amount, 0),
                totalRefunded: refunded.reduce((acc, t) => acc + t.amount, 0),
                transactionCount: mockTransactions.length,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csvContent = transactions.map(t =>
            `${t.transactionNumber},${t.type},${t.amount},${t.status},${t.customerName},${t.createdAt}`
        ).join('\n');

        const blob = new Blob([`Transaction ID,Type,Amount,Status,Customer,Date\n${csvContent}`], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getStatusBadge = (status) => {
        const styles = {
            completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            failed: 'bg-red-500/20 text-red-400 border-red-500/30',
            refunded: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        };
        const icons = {
            completed: <CheckCircle className="w-3.5 h-3.5" />,
            pending: <Clock className="w-3.5 h-3.5" />,
            processing: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
            failed: <XCircle className="w-3.5 h-3.5" />,
            refunded: <ArrowDownLeft className="w-3.5 h-3.5" />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const isRefund = type === 'refund';
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isRefund ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
                }`}>
                {isRefund ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
        );
    };

    const getPaymentMethodIcon = (method) => {
        const icons = {
            bank_transfer: 'IMPS',
            upi: 'UPI',
            credit_card: 'Card',
            debit_card: 'Card',
            net_banking: 'Net',
            wallet: 'Wallet',
            cash: 'Cash',
        };
        return icons[method] || method;
    };

    const formatAmount = (amount, type) => {
        const prefix = type === 'refund' ? '-' : '+';
        return `${prefix}₹${amount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
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
                                <h1 className="text-xl font-bold text-white">Transactions</h1>
                                <p className="text-sm text-slate-400">Payment history and transactions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white hover:bg-slate-700 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                            <button
                                onClick={() => navigate('/invoices')}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25"
                            >
                                <Plus className="w-4 h-4" />
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 rounded-2xl p-5 border border-emerald-500/20 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/20">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Total Received</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    ₹{stats.totalReceived.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500/10 to-amber-900/10 rounded-2xl p-5 border border-amber-500/20 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/20">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Pending</p>
                                <p className="text-2xl font-bold text-amber-400">
                                    ₹{stats.totalPending.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-500/10 to-red-900/10 rounded-2xl p-5 border border-red-500/20 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-red-500/20">
                                <ArrowDownLeft className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Refunded</p>
                                <p className="text-2xl font-bold text-red-400">
                                    ₹{stats.totalRefunded.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-5 border border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/20">
                                <Receipt className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Transactions</p>
                                <p className="text-2xl font-bold text-white">{stats.transactionCount}</p>
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
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[140px]"
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[120px]"
                    >
                        <option value="all">All Types</option>
                        <option value="payment">Payments</option>
                        <option value="refund">Refunds</option>
                    </select>

                    <button
                        onClick={fetchTransactions}
                        className="p-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Transactions Table */}
                <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-white/5 backdrop-blur-xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Transaction</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Type</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Amount</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Method</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                                        <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => {
                                        const { date, time } = formatDate(transaction.createdAt);
                                        return (
                                            <tr
                                                key={transaction._id}
                                                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-white font-medium font-mono text-sm">
                                                            {transaction.transactionNumber}
                                                        </p>
                                                        {transaction.invoiceNumber && (
                                                            <p className="text-xs text-slate-500">{transaction.invoiceNumber}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">{transaction.customerName}</td>
                                                <td className="px-6 py-4">{getTypeBadge(transaction.type)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-medium ${transaction.type === 'refund' ? 'text-red-400' : 'text-emerald-400'
                                                        }`}>
                                                        {formatAmount(transaction.amount, transaction.type)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300 font-medium">
                                                        {getPaymentMethodIcon(transaction.paymentMethod)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm text-white">{date}</p>
                                                        <p className="text-xs text-slate-500">{time}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setSelectedTransaction(transaction)}
                                                            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                        <p className="text-sm text-slate-400">
                            Showing {transactions.length} transactions
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
                                disabled={transactions.length < pagination.limit}
                                className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10 w-full max-w-lg">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedTransaction.transactionNumber}</h2>
                                <p className="text-slate-400">{selectedTransaction.description}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-center py-4 border-b border-white/10">
                                <span className={`text-3xl font-bold ${selectedTransaction.type === 'refund' ? 'text-red-400' : 'text-emerald-400'
                                    }`}>
                                    {formatAmount(selectedTransaction.amount, selectedTransaction.type)}
                                </span>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    {getStatusBadge(selectedTransaction.status)}
                                    {getTypeBadge(selectedTransaction.type)}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400">Customer</p>
                                    <p className="text-white font-medium">{selectedTransaction.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Invoice</p>
                                    <p className="text-white font-medium font-mono">{selectedTransaction.invoiceNumber || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Payment Method</p>
                                    <p className="text-white font-medium capitalize">{selectedTransaction.paymentMethod?.replace(/_/g, ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Reference</p>
                                    <p className="text-white font-mono text-sm">{selectedTransaction.reference || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-400">Date & Time</p>
                                    <p className="text-white font-medium">
                                        {new Date(selectedTransaction.createdAt).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>

                            {selectedTransaction.status === 'failed' && selectedTransaction.errorMessage && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-medium">Error</p>
                                    </div>
                                    <p className="text-sm text-red-300 mt-1">{selectedTransaction.errorMessage}</p>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="w-full py-2.5 bg-slate-700/50 border border-white/10 rounded-xl text-white hover:bg-slate-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;
