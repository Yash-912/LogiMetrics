import React, { useState } from 'react';
import {
    Home, Package, Truck, Users, CreditCard, FileText,
    TrendingUp, Activity, MapPin, AlertTriangle, Search, Filter,
    CheckCircle, Plus, Calendar, MoreVertical, Bell, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Mock Data
const SHIPMENTS = [
    { id: 'SH-2024-001', origin: 'Mumbai', dest: 'Delhi', status: 'In Transit', customer: 'Amazon Seller', amount: '₹12,000' },
    { id: 'SH-2024-002', origin: 'Bangalore', dest: 'Chennai', status: 'Pending', customer: 'Flipkart Logistics', amount: '₹8,500' },
    { id: 'SH-2024-003', origin: 'Pune', dest: 'Hyderabad', status: 'Delivered', customer: 'Reliance Retail', amount: '₹15,200' },
    { id: 'SH-2024-004', origin: 'Ahmedabad', dest: 'Surat', status: 'In Transit', customer: 'Local Vendor', amount: '₹3,000' },
    { id: 'SH-2024-005', origin: 'Kolkata', dest: 'Patna', status: 'Cancelled', customer: 'Tata Croma', amount: '₹9,800' },
];

const DRIVERS = [
    { id: 'DR-101', name: 'Raju Kumar', vehicle: 'Tata Ace', status: 'On Trip', rating: 4.8 },
    { id: 'DR-102', name: 'Vikram Singh', vehicle: 'Eicher Pro', status: 'Available', rating: 4.5 },
    { id: 'DR-103', name: 'Amit Sharma', vehicle: 'Bolero Pickup', status: 'Offline', rating: 4.9 },
    { id: 'DR-104', name: 'Suresh Patil', vehicle: 'Ashok Leyland', status: 'On Trip', rating: 4.7 },
];

const StatCard = ({ icon, label, value, trend, color }) => (
    <Card className="p-6 border-slate-800 bg-slate-900/50">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
                <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
                <p className={`text-xs flex items-center ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <TrendingUp className="w-3 h-3 mr-1" /> {Math.abs(trend)}% vs last month
                </p>
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
                {icon}
            </div>
        </div>
    </Card>
);

const StatusBadge = ({ status }) => {
    const styles = {
        'In Transit': 'bg-blue-500/20 text-blue-400',
        'Pending': 'bg-yellow-500/20 text-yellow-400',
        'Delivered': 'bg-green-500/20 text-green-400',
        'Cancelled': 'bg-red-500/20 text-red-400',
        'On Trip': 'bg-blue-500/20 text-blue-400',
        'Available': 'bg-green-500/20 text-green-400',
        'Offline': 'bg-slate-500/20 text-slate-400',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles['Pending']}`}>
            {status}
        </span>
    );
};

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Sidebar
    const Sidebar = () => (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col z-40">
            <div className="h-20 flex items-center px-6 border-b border-slate-800">
                <div className="text-2xl font-black tracking-tighter">
                    <span className="text-white">Logi</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                </div>
            </div>
            <nav className="p-4 space-y-1 flex-1">
                {[
                    { id: 'dashboard', icon: <Home className="w-5 h-5" />, label: 'Overview' },
                    { id: 'shipments', icon: <Package className="w-5 h-5" />, label: 'Shipments' },
                    { id: 'fleet', icon: <Truck className="w-5 h-5" />, label: 'Fleet' },
                    { id: 'users', icon: <Users className="w-5 h-5" />, label: 'Users' },
                    { id: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${activeTab === item.id
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-white">AD</div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Admin User</p>
                        <p className="text-xs text-slate-400">admin@logi.com</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-500/20"
                    onClick={onLogout}
                >
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                </Button>
            </div>
        </aside>
    );

    // Dashboard View
    const DashboardView = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Activity className="w-6 h-6 text-blue-400" />} label="Total Revenue" value="₹4.2M" trend={12.5} color="bg-blue-500" />
                <StatCard icon={<Truck className="w-6 h-6 text-cyan-400" />} label="Active Trips" value="142" trend={8.2} color="bg-cyan-500" />
                <StatCard icon={<Package className="w-6 h-6 text-purple-400" />} label="Delivered" value="8,520" trend={-2.4} color="bg-purple-500" />
                <StatCard icon={<Users className="w-6 h-6 text-orange-400" />} label="New Drivers" value="24" trend={5.0} color="bg-orange-500" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 bg-slate-900 border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Recent Shipments</h3>
                        <Button size="sm" variant="outline">View All</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                                    <th className="pb-3 pl-4">ID</th>
                                    <th className="pb-3">Route</th>
                                    <th className="pb-3">Customer</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SHIPMENTS.slice(0, 4).map(row => (
                                    <tr key={row.id} className="border-b border-slate-800/50 text-sm text-slate-300 hover:bg-slate-800/20">
                                        <td className="py-4 pl-4 font-mono text-cyan-400">{row.id}</td>
                                        <td className="py-4">{row.origin} <span className="text-slate-600 px-1">→</span> {row.dest}</td>
                                        <td className="py-4">{row.customer}</td>
                                        <td className="py-4"><StatusBadge status={row.status} /></td>
                                        <td className="py-4 font-medium text-white">{row.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6 bg-slate-900 border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Fleet Status</h3>
                        <MoreVertical className="w-5 h-5 text-slate-500 cursor-pointer" />
                    </div>
                    <div className="space-y-4">
                        {DRIVERS.map(driver => (
                            <div key={driver.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">{driver.name.charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{driver.name}</p>
                                        <p className="text-xs text-slate-500">{driver.vehicle}</p>
                                    </div>
                                </div>
                                <StatusBadge status={driver.status} />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );

    // Shipments View
    const ShipmentsView = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">All Shipments</h2>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" placeholder="Search shipping ID..." className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none" />
                    </div>
                    <Button size="sm" variant="primary"><Plus className="w-4 h-4 mr-2" /> New Shipment</Button>
                </div>
            </div>
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50">
                        <tr className="border-b border-slate-700 text-xs uppercase text-slate-400 font-semibold">
                            <th className="py-4 pl-6">Shipment ID</th>
                            <th className="py-4">Origin / Destination</th>
                            <th className="py-4">Customer</th>
                            <th className="py-4">Status</th>
                            <th className="py-4">Drivers</th>
                            <th className="py-4 pr-6 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SHIPMENTS.map(row => (
                            <tr key={row.id} className="border-b border-slate-800 hover:bg-slate-800/20 text-sm">
                                <td className="py-4 pl-6 font-mono text-cyan-400 hover:underline cursor-pointer">{row.id}</td>
                                <td className="py-4 text-slate-300">
                                    <div>{row.origin}</div>
                                    <div className="text-xs text-slate-500">to {row.dest}</div>
                                </td>
                                <td className="py-4 text-white font-medium">{row.customer}</td>
                                <td className="py-4"><StatusBadge status={row.status} /></td>
                                <td className="py-4 text-slate-400">---</td>
                                <td className="py-4 pr-6 text-right font-medium text-white">{row.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );

    const ContentView = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'shipments': return <ShipmentsView />;
            case 'fleet': return <div className="text-slate-400">Fleet Management Module (Coming Soon)</div>;
            default: return <div className="text-slate-400">Section Under Development</div>;
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex font-sans">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-xl font-medium text-slate-400">Welcome back, Admin</h1>
                    </div>
                    <div className="flex gap-4">
                        <Button size="sm" variant="outline"><Bell className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline">Help</Button>
                    </div>
                </header>
                <ContentView />
            </main>
        </div>
    );
};

export default AdminDashboard;
