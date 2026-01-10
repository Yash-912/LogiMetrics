/**
 * Mock API Service
 * Simulates backend responses for frontend-only development
 * 
 * To use real backend later, set USE_MOCK_API = false in environment
 */

// Check if we should use mock API
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || true; // Default to true for now

// Mock database stored in localStorage
const MOCK_USERS_KEY = 'mock_users';
const MOCK_CURRENT_USER_KEY = 'mock_current_user';
const MOCK_TOKENS_KEY = 'mock_tokens';

// Helper to get mock users
const getMockUsers = () => {
    const users = localStorage.getItem(MOCK_USERS_KEY);
    return users ? JSON.parse(users) : [];
};

// Helper to save mock users
const saveMockUsers = (users) => {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

// Generate mock JWT token
const generateMockToken = (user) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + (15 * 60 * 1000) // 15 minutes
    }));
    const signature = btoa('mock-signature-' + user.id);
    return `${header}.${payload}.${signature}`;
};

// Simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock Register
 */
export const mockRegister = async (userData) => {
    await delay(800);

    const users = getMockUsers();

    // Check if user exists
    if (users.find(u => u.email === userData.email)) {
        throw {
            response: {
                data: { message: 'User with this email already exists' },
                status: 409
            }
        };
    }

    // Create new user
    const newUser = {
        id: 'user_' + Date.now(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || 'shipper',
        company: userData.company,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveMockUsers(users);

    // Generate tokens
    const accessToken = generateMockToken(newUser);
    const refreshToken = 'mock-refresh-' + newUser.id;

    // Store tokens
    localStorage.setItem(MOCK_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(newUser));

    return {
        data: {
            success: true,
            message: 'Registration successful',
            data: {
                user: newUser,
                tokens: { accessToken, refreshToken }
            }
        }
    };
};

/**
 * Mock Login
 */
export const mockLogin = async (credentials) => {
    await delay(600);

    const users = getMockUsers();
    const user = users.find(u => u.email === credentials.email);

    if (!user) {
        throw {
            response: {
                data: { message: 'Invalid credentials' },
                status: 401
            }
        };
    }

    // In mock mode, any password works for existing users
    // Generate tokens
    const accessToken = generateMockToken(user);
    const refreshToken = 'mock-refresh-' + user.id;

    localStorage.setItem(MOCK_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(user));

    return {
        data: {
            success: true,
            message: 'Login successful',
            data: {
                user,
                tokens: { accessToken, refreshToken }
            }
        }
    };
};

/**
 * Mock Get Current User
 */
export const mockGetMe = async () => {
    await delay(300);

    const user = localStorage.getItem(MOCK_CURRENT_USER_KEY);
    if (!user) {
        throw {
            response: {
                data: { message: 'Not authenticated' },
                status: 401
            }
        };
    }

    return {
        data: {
            success: true,
            data: { user: JSON.parse(user) }
        }
    };
};

/**
 * Mock Logout
 */
export const mockLogout = async () => {
    await delay(200);
    localStorage.removeItem(MOCK_CURRENT_USER_KEY);
    localStorage.removeItem(MOCK_TOKENS_KEY);
    return { data: { success: true } };
};

/**
 * Mock Create Shipment
 */
export const mockCreateShipment = async (shipmentData) => {
    await delay(1000);

    const shipmentsKey = 'mock_shipments';
    const shipments = JSON.parse(localStorage.getItem(shipmentsKey) || '[]');

    const newShipment = {
        id: 'SHP-' + Date.now(),
        trackingNumber: 'TRK' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'pending',
        ...shipmentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    shipments.push(newShipment);
    localStorage.setItem(shipmentsKey, JSON.stringify(shipments));

    return {
        data: {
            success: true,
            message: 'Shipment created successfully',
            data: { shipment: newShipment }
        }
    };
};

/**
 * Mock Get Shipments
 */
export const mockGetShipments = async () => {
    await delay(500);

    const shipmentsKey = 'mock_shipments';
    const shipments = JSON.parse(localStorage.getItem(shipmentsKey) || '[]');

    return {
        data: {
            success: true,
            data: {
                shipments,
                pagination: {
                    total: shipments.length,
                    page: 1,
                    limit: 10
                }
            }
        }
    };
};

/**
 * Check if mock API should be used
 */
export const isMockMode = () => USE_MOCK_API;

export default {
    mockRegister,
    mockLogin,
    mockGetMe,
    mockLogout,
    mockCreateShipment,
    mockGetShipments,
    isMockMode
};
