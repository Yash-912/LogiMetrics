import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Icons
import { Menu, X, Loader2 } from 'lucide-react';

// Context
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Pages
import LandingPage from '@/pages/LandingPage';
import MoversPackers from '@/pages/MoversPackers';
import TruckPartners from '@/pages/TruckPartners';
import Enterprise from '@/pages/Enterprise';
import AdminDashboard from '@/pages/AdminDashboard';
import BusinessDashboard from '@/pages/BusinessDashboard';
import TransporterDashboard from '@/pages/TransporterDashboard';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import CreateShipmentPage from '@/pages/CreateShipmentPage';
import ShipmentManagementPage from '@/pages/ShipmentManagementPage';
import DriverManagementPage from '@/pages/DriverManagementPage';
import DriverPortalPage from '@/pages/DriverPortalPage';
import VehicleManagementPage from '@/pages/VehicleManagementPage';
import TrackingPage from '@/pages/TrackingPage';
import LiveTrackingPage from '@/pages/LiveTrackingPage';
import InvoiceManagementPage from '@/pages/InvoiceManagementPage';
import RouteManagementPage from '@/pages/RouteManagementPage';
import CompanySettingsPage from '@/pages/CompanySettingsPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import LocationManagementPage from '@/pages/LocationManagementPage';
import TransactionsPage from '@/pages/TransactionsPage';
import AccidentHeatmap from '@/pages/AccidentHeatmap';
import DriverMonitoringPage from '@/pages/DriverMonitoringPage';

// Role-Based Dashboard Router
const RoleBasedDashboard = ({ onLogout }) => {
  const { user } = useAuth();
  const role = user?.role;

  // Route to appropriate dashboard based on role
  switch (role) {
    // Admin roles -> Full Admin Dashboard
    case 'super_admin':
    case 'admin':
      return <AdminDashboard onLogout={onLogout} />;

    // Fleet Owner / Transporter roles -> Transporter Dashboard
    case 'dispatcher':
    case 'transporter':
      return <TransporterDashboard />;

    // Driver role -> Driver Portal
    case 'driver':
      return <DriverPortalPage />;

    // Business / Shipper roles -> Business Dashboard
    case 'manager':
    case 'shipper':
    case 'user':
    case 'customer':
    default:
      return <BusinessDashboard />;
  }
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Public Navbar with scroll color change
const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isActive = (path) => location.pathname === path;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  return (
    <nav
      className={`fixed top-0 w-full backdrop-blur-xl z-50 border-b transition-all duration-500 ${scrolled
        ? 'bg-[#F2F8FF] border-slate-200 shadow-md'
        : 'bg-[#020617]/80 border-white/5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-black tracking-tighter">
              <span className={scrolled ? 'text-slate-800' : 'text-white'}>Logi</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-cyan-500' : scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>Home</Link>
            <Link to="/movers-packers" className={`text-sm font-medium transition-colors ${isActive('/movers-packers') ? 'text-cyan-500' : scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>Movers & Packers</Link>
            <Link to="/truck-partners" className={`text-sm font-medium transition-colors ${isActive('/truck-partners') ? 'text-cyan-500' : scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>Truck Partners</Link>
            <Link to="/enterprise" className={`text-sm font-medium transition-colors ${isActive('/enterprise') ? 'text-cyan-500' : scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>For Enterprise</Link>
          </div>

          {isAuthenticated ? (
            <Button variant={scrolled ? 'primary' : 'accent'} size="sm" onClick={handleDashboardClick}>
              Dashboard
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoginClick}
                className={scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'}
              >
                Log In
              </Button>
              <Button
                variant={scrolled ? 'primary' : 'accent'}
                size="sm"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { isAuthenticated, logout, isLoading } = useAuth();

  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    // Check if backend is reachable via the API root
    fetch('/api/v1')
      .then(res => res.json())
      .then(data => setBackendStatus(data.name ? 'Connected' : 'Error'))
      .catch(err => {
        console.error('Backend check failed:', err);
        setBackendStatus('Offline');
      });
  }, []);

  // Pages that should hide the navbar
  const hideNavbarPaths = ['/login', '/register', '/forgot-password', '/dashboard'];
  const showNavbar = !hideNavbarPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Backend Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-mono">
        Backend: <span className={backendStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}>{backendStatus}</span>
      </div>

      {showNavbar && <Navbar />}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/movers-packers" element={<MoversPackers />} />
        <Route path="/truck-partners" element={<TruckPartners />} />
        <Route path="/enterprise" element={<Enterprise />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/track" element={<TrackingPage />} />
        <Route
          path="/tracking/live"
          element={
            <ProtectedRoute>
              <LiveTrackingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Role-Based Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleBasedDashboard onLogout={logout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business"
          element={
            <ProtectedRoute>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transporter"
          element={
            <ProtectedRoute>
              <TransporterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments/new"
          element={
            <ProtectedRoute>
              <CreateShipmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shipments"
          element={
            <ProtectedRoute>
              <ShipmentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drivers"
          element={
            <ProtectedRoute>
              <DriverManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-portal"
          element={
            <ProtectedRoute>
              <DriverPortalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <VehicleManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedRoute>
              <RouteManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/locations"
          element={
            <ProtectedRoute>
              <LocationManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accidents"
          element={
            <ProtectedRoute>
              <AccidentHeatmap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-monitoring"
          element={
            <ProtectedRoute>
              <DriverMonitoringPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;