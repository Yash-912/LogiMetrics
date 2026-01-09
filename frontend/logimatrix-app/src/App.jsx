import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Truck, Package, DollarSign, BarChart3, Zap, CheckCircle, Menu, X, 
  User, LogOut, Bell, Settings, MapPin, Clock, TrendingUp, AlertTriangle,
  Home, Users, FileText, CreditCard, Calendar, ChevronDown, Search,
  Filter, Download, Upload, Eye, Edit, Trash2, Plus, Star, Shield,
  Target, ArrowRight
} from 'lucide-react';



const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const Button = ({ children, variant = 'primary', size = 'md', onClick, className = '', icon, disabled }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    outline: 'border-2 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white',
    yellow: 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold shadow-lg shadow-yellow-400/30',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variants[variant] + ' ' + sizes[size] + ' rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center gap-2 ' + (disabled ? 'opacity-50 cursor-not-allowed' : '') + ' ' + className}
    >
      {icon && icon}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', gradient = false }) => {
  const baseClass = gradient ? 'bg-gradient-to-br from-slate-800/80 to-blue-900/40' : 'bg-slate-800/60';
  return (
    <div className={baseClass + ' backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all ' + className}>
      {children}
    </div>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-600 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-slate-900',
    danger: 'bg-red-500 text-white',
    info: 'bg-cyan-500 text-white'
  };

  return (
    <span className={variants[variant] + ' px-3 py-1 rounded-full text-xs font-semibold'}>
      {children}
    </span>
  );
};

const Table = ({ columns, data, onRowClick }) => {
  const [sortConfig, setSortConfig] = useState(null);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => col.sortable && requestSort(col.key)}
                className={'px-4 py-3 text-left text-sm font-semibold text-gray-300 ' + (col.sortable ? 'cursor-pointer hover:text-blue-400' : '')}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick && onRowClick(row)}
              className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors cursor-pointer"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-4 py-3 text-sm text-gray-200">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Toast = ({ message, type = 'info', onClose }) => {
  const types = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={types[type] + ' fixed bottom-4 right-4 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3'}>
      <CheckCircle className="w-5 h-5" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const LandingPage = ({ onLogin }) => {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [weight, setWeight] = useState('');

  const features = [
    {
      icon: <MapPin className="w-12 h-12" />,
      title: '700+ Destinations',
      description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nullam non mauris velit.'
    },
    {
      icon: <DollarSign className="w-12 h-12" />,
      title: 'Competitive Pricing',
      bg: 'from-yellow-400 to-yellow-500',
      description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nullam non mauris velit.'
    },
    {
      icon: <Truck className="w-12 h-12" />,
      title: 'GPS Enabled Trucks',
      description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nullam non mauris velit.'
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: 'Pre-Insured Trips',
      description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nullam non mauris velit.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-lg z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-black">
                <span className="text-white">Logi</span>
                <span className="text-yellow-400">Matrix</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Home</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Movers & Packers</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Truck Partners</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">For Enterprise</a>
            </div>

            <Button variant="yellow" size="sm" onClick={onLogin}>
              Log In
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
                  Largest <span className="text-yellow-400">Marketplace</span>
                  <br />
                  For Intracity Logistics
                </h1>
                <p className="text-xl text-gray-300">
                  Online Transport & Shipping Services at Your Place
                </p>
              </div>

              <Card className="bg-slate-800/80 border-slate-700">
                <h3 className="text-xl font-bold mb-6">Book your truck</h3>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">From</label>
                    <input
                      type="text"
                      placeholder="Select your location"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">To</label>
                    <input
                      type="text"
                      placeholder="Select your location"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Vehicle type</label>
                    <input
                      type="text"
                      placeholder="Select your vehicle"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Material Weight</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-400">Kg</span>
                    </div>
                  </div>
                </div>

                <Button variant="yellow" size="lg" className="w-full justify-center">
                  Book your truck
                </Button>
              </Card>

              <Card className="bg-slate-800/60 border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-2xl">G</span>
                    </div>
                    <div>
                      <p className="font-semibold">Google Review</p>
                      <p className="text-sm text-gray-400">More than 10,000+ customers trust logistics</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-400">4.7 (86+ Ratings | 20+ Review )</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
              <div className="relative">
                <svg className="w-full h-auto" viewBox="0 0 600 400" fill="none">
                  <rect x="150" y="180" width="300" height="120" fill="#374151" rx="10"/>
                  <rect x="150" y="220" width="300" height="80" fill="#4B5563" rx="8"/>
                  <rect x="200" y="160" width="200" height="40" fill="#1F2937" rx="8"/>
                  <path d="M 150 180 L 150 220 L 200 220 L 220 180 Z" fill="#1F2937"/>
                  <rect x="160" y="190" width="30" height="20" fill="#3B82F6" rx="2"/>
                  <circle cx="220" cy="310" r="25" fill="#1F2937"/>
                  <circle cx="220" cy="310" r="15" fill="#374151"/>
                  <circle cx="380" cy="310" r="25" fill="#1F2937"/>
                  <circle cx="380" cy="310" r="15" fill="#374151"/>
                  <rect x="250" y="240" width="150" height="40" fill="#60A5FA" opacity="0.3" rx="4"/>
                </svg>

                <div className="absolute bottom-0 right-0 bg-slate-800/90 backdrop-blur-lg rounded-2xl p-4 border border-slate-700">
                  <p className="text-sm text-gray-400 mb-3">Trusted Partners:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {['Logoipsum', 'Logoipsum', 'Logoipsum', 'LOGS'].map((logo, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-lg px-3 py-2 text-xs font-semibold text-center">
                        {logo}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16">
            Right Trucking Partner for Your Business
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className={idx === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900' : ''}
              >
                <div className={'w-16 h-16 rounded-xl flex items-center justify-center mb-4 ' + (idx === 1 ? 'bg-yellow-600' : 'bg-blue-500/20')}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className={idx === 1 ? 'text-slate-800' : 'text-gray-400'}>
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          {/* <p>© 2024 TransPort. All rights reserved.</p> */}
        </div>
      </footer>
    </div>
  );
};

const Navbar = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-slate-900/90 backdrop-blur-lg z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-black">
              <span className="text-white">Logi</span>
              <span className="text-yellow-400">Matrix</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">{user && user.name ? user.name[0] : 'U'}</span>
                </div>
                <span className="text-sm font-medium hidden sm:block">{user ? user.name : 'User'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
                  <a href="#" className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 transition-colors">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </a>
                  <a href="#" className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </a>
                  <hr className="my-2 border-slate-700" />
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 transition-colors w-full text-left text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'shipments', label: 'Shipments', icon: <Package className="w-5 h-5" /> },
    { id: 'fleet', label: 'Fleet', icon: <Truck className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> }
  ];

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-slate-900/90 backdrop-blur-lg border-r border-slate-800 p-4 overflow-y-auto">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ' + (activeTab === item.id ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg' : 'text-gray-400 hover:bg-slate-800 hover:text-white')}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

const AdminDashboard = () => {
  const [toast, setToast] = useState(null);

  const stats = [
    { label: 'Total Shipments', value: '1,234', change: '+12%', icon: <Package className="w-8 h-8" />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Active Vehicles', value: '89', change: '+5%', icon: <Truck className="w-8 h-8" />, color: 'from-cyan-500 to-blue-600' },
    { label: 'Total Revenue', value: '$456K', change: '+23%', icon: <DollarSign className="w-8 h-8" />, color: 'from-green-500 to-emerald-500' },
    { label: 'On-Time Delivery', value: '94%', change: '+2%', icon: <TrendingUp className="w-8 h-8" />, color: 'from-blue-400 to-cyan-400' }
  ];

  const recentShipments = [
    { id: 'SH-001', origin: 'Mumbai', destination: 'Delhi', status: 'In Transit', driver: 'John Doe', eta: '2 hours' },
    { id: 'SH-002', origin: 'Bangalore', destination: 'Chennai', status: 'Delivered', driver: 'Jane Smith', eta: 'Completed' },
    { id: 'SH-003', origin: 'Pune', destination: 'Hyderabad', status: 'Pending', driver: 'Mike Johnson', eta: '5 hours' }
  ];

  const columns = [
    { key: 'id', label: 'Shipment ID', sortable: true },
    { key: 'origin', label: 'Origin', sortable: true },
    { key: 'destination', label: 'Destination', sortable: true },
    { 
      key: 'status', 
      label: 'Status',
      render: (row) => {
        const statusColors = {
          'In Transit': 'info',
          'Delivered': 'success',
          'Pending': 'warning'
        };
        return <Badge variant={statusColors[row.status]}>{row.status}</Badge>;
      }
    },
    { key: 'driver', label: 'Driver' },
    { key: 'eta', label: 'ETA' }
  ];

  const handleRowClick = (row) => {
    setToast({ message: 'Viewing ' + row.id, type: 'info' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
          New Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="relative overflow-hidden">
            <div className={'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ' + stat.color + ' opacity-10 rounded-full -mr-16 -mt-16'}></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={'w-14 h-14 bg-gradient-to-br ' + stat.color + ' rounded-xl flex items-center justify-center'}>
                  {stat.icon}
                </div>
                <span className="text-green-400 text-sm font-semibold">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card gradient>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-cyan-400" />
          Live Fleet Tracking
        </h2>
        <div className="bg-slate-900/50 rounded-lg h-96 flex items-center justify-center relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 400">
            <defs>
              <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => (
              <line key={'h' + i} x1="0" y1={i * 20} x2="800" y2={i * 20} stroke="currentColor" strokeWidth="0.5" className="text-slate-700" />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39].map((i) => (
              <line key={'v' + i} x1={i * 20} y1="0" x2={i * 20} y2="400" stroke="currentColor" strokeWidth="0.5" className="text-slate-700" />
            ))}
            
            <path d="M 100 200 Q 250 100 400 200 T 700 150" fill="none" stroke="url(#mapGrad)" strokeWidth="3" strokeDasharray="5,5" opacity="0.6" />
            
            <circle cx="100" cy="200" r="8" fill="#3B82F6" />
            <circle cx="400" cy="200" r="8" fill="#06B6D4" />
            <circle cx="700" cy="150" r="8" fill="#10b981" />
          </svg>
          
          <div className="relative z-10 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-bounce" />
            <p className="text-xl font-semibold mb-2">Interactive Map View</p>
            <p className="text-gray-400">Real-time vehicle tracking with GPS integration</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Recent Shipments</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        </div>
        <Table 
          columns={columns} 
          data={recentShipments}
          onRowClick={handleRowClick}
        />
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage onLogin={() => login({ email: 'admin@transport.com', role: 'admin', name: 'Admin User' })} />;
  }

  const mockUser = { email: 'admin@transport.com', role: 'admin', name: 'Admin User' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Navbar user={mockUser} onLogout={logout} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-64 pt-16 p-8">
        <AdminDashboard />
      </main>
    </div>
  );
};

const AppWrapper = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWrapper;