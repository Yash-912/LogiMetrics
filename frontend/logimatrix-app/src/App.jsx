import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Icons
import { Menu, X } from 'lucide-react';

// Pages
import LandingPage from '@/pages/LandingPage';
import MoversPackers from '@/pages/MoversPackers';
import TruckPartners from '@/pages/TruckPartners';
import Enterprise from '@/pages/Enterprise';
import AdminDashboard from '@/pages/AdminDashboard'; // New Import

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

// Public Navbar
const Navbar = ({ onLogin }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full bg-[#020617]/80 backdrop-blur-xl z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-black tracking-tighter">
              <span className="text-white">Logi</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>Home</Link>
            <Link to="/movers-packers" className={`text-sm font-medium transition-colors ${isActive('/movers-packers') ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>Movers & Packers</Link>
            <Link to="/truck-partners" className={`text-sm font-medium transition-colors ${isActive('/truck-partners') ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>Truck Partners</Link>
            <Link to="/enterprise" className={`text-sm font-medium transition-colors ${isActive('/enterprise') ? 'text-cyan-400' : 'text-slate-400 hover:text-white'}`}>For Enterprise</Link>
          </div>

          <Button variant="accent" size="sm" onClick={onLogin}>
            Log In
          </Button>
        </div>
      </div>
    </nav>
  );
};

import { useNavigate } from 'react-router-dom';

const AppContent = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    login({ email: 'admin@logimatrix.com', role: 'admin', name: 'Admin' });
    navigate('/dashboard'); // 🔥 THIS WAS MISSING
  };

  // Determine if we should show the public Navbar
  // Don't show Navbar if we are on the dashboard (or authenticated and trying to view dashboard)
  const showNavbar = !isAuthenticated || location.pathname !== '/dashboard';

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {showNavbar && <Navbar onLogin={handleLogin} />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/movers-packers" element={<MoversPackers />} />
        <Route path="/truck-partners" element={<TruckPartners />} />
        <Route path="/enterprise" element={<Enterprise />} />

        <Route
          path="/dashboard"
          element={isAuthenticated ? <AdminDashboard onLogout={logout} /> : <Navigate to="/" />}
        />

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