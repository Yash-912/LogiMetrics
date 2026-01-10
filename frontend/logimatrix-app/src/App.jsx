import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Icons
import { Menu, X } from "lucide-react";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import MoversPackers from "@/pages/MoversPackers";
import TruckPartners from "@/pages/TruckPartners";
import Enterprise from "@/pages/Enterprise";
import AdminDashboard from "@/pages/AdminDashboard";
import AccidentHeatmap from "@/pages/AccidentHeatmap";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const accessToken = localStorage.getItem("access_token");

    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Error parsing stored user:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Public Navbar
const Navbar = ({ onLogin }) => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full bg-[#020617]/80 backdrop-blur-xl z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-black tracking-tighter">
              <span className="text-white">Logi</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Matrix
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive("/")
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Home
            </Link>
            <Link
              to="/movers-packers"
              className={`text-sm font-medium transition-colors ${
                isActive("/movers-packers")
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Movers & Packers
            </Link>
            <Link
              to="/truck-partners"
              className={`text-sm font-medium transition-colors ${
                isActive("/truck-partners")
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Truck Partners
            </Link>
            <Link
              to="/enterprise"
              className={`text-sm font-medium transition-colors ${
                isActive("/enterprise")
                  ? "text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              For Enterprise
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                  onLogin?.();
                }}
              >
                Log Out
              </Button>
            ) : (
              <Button variant="accent" size="sm" onClick={onLogin}>
                Log In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

import { useNavigate } from "react-router-dom";

const AppContent = () => {
  const { isAuthenticated, login, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLoginSuccess = (userData) => {
    console.log("🔐 handleLoginSuccess called with:", userData);
    login(userData); // Call the AuthContext login function
    navigate("/dashboard"); // Navigate to dashboard
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Don't show navbar on login page
  const showNavbar = location.pathname !== "/login";

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {showNavbar && <Navbar onLogin={handleLoginClick} />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="/movers-packers" element={<MoversPackers />} />
        <Route path="/truck-partners" element={<TruckPartners />} />
        <Route path="/enterprise" element={<Enterprise />} />

        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/accidents" element={<AccidentHeatmap />} />
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
