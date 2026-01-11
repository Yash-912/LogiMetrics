/**
 * Register Page
 * Multi-step registration form with company info and role selection
 * Connects to MongoDB backend via auth API
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Eye, EyeOff, Mail, Lock, User, Phone, Building2,
    AlertCircle, Loader2, ArrowRight, ArrowLeft, Check,
    Truck, Package, Briefcase, MapPin, Globe, CheckCircle
} from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Role Selection', icon: Briefcase },
    { id: 3, title: 'Company Info', icon: Building2 },
];

// Roles matching MongoDB schema
const ROLES = [
    {
        id: 'shipper',
        title: 'Business / Shipper',
        description: 'Create shipment requests and track orders',
        icon: Package,
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'transporter',
        title: 'Transporter / Fleet Owner',
        description: 'Manage fleets, drivers and deliveries',
        icon: Truck,
        color: 'from-purple-500 to-pink-500'
    },
    {
        id: 'driver',
        title: 'Driver',
        description: 'Execute deliveries and update status',
        icon: User,
        color: 'from-orange-500 to-red-500'
    },
    {
        id: 'customer',
        title: 'Customer',
        description: 'Track personal orders',
        icon: Globe,
        color: 'from-emerald-500 to-teal-500'
    },
];

// InputField component
const InputField = ({ icon: Icon, label, name, type = 'text', placeholder, error, value, onChange, disabled, required, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
            {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${error ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'
                    }`}
                disabled={disabled}
                {...props}
            />
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
);

const RegisterPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, isLoading, register: authRegister } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // ... state remains unchanged ...
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: '',
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        registrationNumber: '',
        taxId: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
    });
    // ... other states unchanged ...
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Check for role in URL query parameter and pre-select it
    useEffect(() => {
        const roleFromUrl = searchParams.get('role');
        if (roleFromUrl && ROLES.some(r => r.id === roleFromUrl)) {
            setFormData(prev => ({ ...prev, role: roleFromUrl }));
            // If role is pre-selected, skip to step 2 (role is already set)
            // Actually, keep on step 1 but the role will be pre-filled when they reach step 2
        }
    }, [searchParams]);

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // ... handleChange unchanged ...
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        setApiError('');
    };

    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
            if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
            if (!formData.email) {
                newErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = 'Please enter a valid email';
            }
            if (!formData.phone) {
                newErrors.phone = 'Phone number is required';
            } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
                newErrors.phone = 'Please enter a valid 10-digit phone number';
            }
            if (!formData.password) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        if (step === 2) {
            if (!formData.role) newErrors.role = 'Please select a role';
        }

        if (step === 3) {
            // Only validate company info if it's shown (for business roles)
            if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
            if (!formData.city.trim()) newErrors.city = 'City is required';
            if (!formData.state.trim()) newErrors.state = 'State is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check if the selected role requires company info
    const requiresCompanyInfo = (roleId) => {
        return ['shipper', 'transporter'].includes(roleId);
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep === 2) {
                // If moving from Step 2 (Role) to Step 3
                if (requiresCompanyInfo(formData.role)) {
                    setCurrentStep(3);
                } else {
                    // Skip step 3 for personal accounts and submit directly
                    handleSubmit(new Event('submit'));
                }
            } else {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault(); // Handle both direct calls and form events

        // If we are on step 3, validate it. 
        // If we came from step 2 (skipping 3), no step 3 validation needed here as it was skipped safely.
        if (currentStep === 3 && !validateStep(3)) return;

        setIsSubmitting(true);
        setApiError('');

        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                role: formData.role,
                // Only include company info if provided/required
                company: requiresCompanyInfo(formData.role) ? {
                    name: formData.companyName,
                    email: formData.companyEmail || formData.email,
                    phone: formData.companyPhone || formData.phone,
                    registrationNumber: formData.registrationNumber,
                    gstNumber: formData.taxId,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                } : undefined
            };

            const result = await authRegister(payload);

            if (result.success) {
                setSuccessMessage('Account created successfully! Redirecting...');
                setTimeout(() => {
                    switch (formData.role) {
                        case 'driver':
                            navigate('/driver-portal', { replace: true });
                            break;
                        case 'shipper':
                        case 'transporter':
                            navigate('/dashboard', { replace: true });
                            break;
                        case 'customer':
                            navigate('/track', { replace: true });
                            break;
                        default:
                            navigate('/dashboard', { replace: true });
                            break;
                    }
                }, 1500);
            } else {
                setApiError(result.error || 'Registration failed. Please try again.');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setApiError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... renderPersonalInfo unchanged ...
    const renderPersonalInfo = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <InputField
                    icon={User}
                    label="First Name"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    disabled={isSubmitting}
                    required
                />
                <InputField
                    label="Last Name"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <InputField
                icon={Mail}
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                disabled={isSubmitting}
                required
            />

            <InputField
                icon={Phone}
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                disabled={isSubmitting}
                required
            />

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-12 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${errors.password ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'
                            }`}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-12 py-3 bg-slate-800/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700 focus:border-cyan-500'
                            }`}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
            </div>
        </div>
    );

    // ... renderCompanyInfo unchanged ...
    const renderCompanyInfo = () => (
        <div className="space-y-5">
            <InputField
                icon={Building2}
                label="Company Name"
                name="companyName"
                placeholder="Acme Logistics Pvt Ltd"
                value={formData.companyName}
                onChange={handleChange}
                error={errors.companyName}
                disabled={isSubmitting}
                required
            />

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    icon={Mail}
                    label="Company Email"
                    name="companyEmail"
                    type="email"
                    placeholder="contact@company.com"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    disabled={isSubmitting}
                />
                <InputField
                    icon={Phone}
                    label="Company Phone"
                    name="companyPhone"
                    type="tel"
                    placeholder="02212345678"
                    value={formData.companyPhone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="Registration Number"
                    name="registrationNumber"
                    placeholder="CIN/LLP/Reg No."
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    disabled={isSubmitting}
                />
                <InputField
                    label="GST Number (Tax ID)"
                    name="taxId"
                    placeholder="22AAAAA0000A1Z5"
                    value={formData.taxId}
                    onChange={handleChange}
                    disabled={isSubmitting}
                />
            </div>

            <InputField
                icon={MapPin}
                label="Address"
                name="address"
                placeholder="123 Business Park, Sector 5"
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
                <InputField
                    label="City"
                    name="city"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    disabled={isSubmitting}
                    required
                />
                <InputField
                    label="State"
                    name="state"
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={handleChange}
                    error={errors.state}
                    disabled={isSubmitting}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Country</label>
                <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none"
                        disabled={isSubmitting}
                    >
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="UK">United Kingdom</option>
                        <option value="UAE">UAE</option>
                        <option value="Singapore">Singapore</option>
                    </select>
                </div>
            </div>
        </div>
    );

    // ... renderRoleSelection unchanged ...
    const renderRoleSelection = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <Briefcase className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-white">Select User Profile</h3>
                <p className="text-slate-400">Choose the role that best describes your usage</p>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                    Profile Type <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full pl-4 pr-10 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none transition-all cursor-pointer"
                    >
                        <option value="" disabled>Select a profile...</option>
                        {ROLES.map(role => (
                            <option key={role.id} value={role.id}>
                                {role.title}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Check className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {formData.role && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 transition-all animate-in fade-in slide-in-from-top-2">
                    {(() => {
                        const selectedRole = ROLES.find(r => r.id === formData.role);
                        if (!selectedRole) return null;
                        const Icon = selectedRole.icon;
                        return (
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg bg-gradient-to-r ${selectedRole.color}`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">{selectedRole.title}</h4>
                                    <p className="text-sm text-slate-400 mt-1">{selectedRole.description}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {errors.role && <p className="text-center text-sm text-red-400">{errors.role}</p>}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4 py-8">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                <Link to="/" className="flex items-center justify-center mb-8">
                    <div className="text-3xl font-black tracking-tighter">
                        <span className="text-white">Logi</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                    </div>
                </Link>

                <div className="flex justify-center mb-8">
                    {STEPS.map((step, idx) => {
                        // Hide Step 3 indicator if strictly on step 2 and Role doesn't require company info?
                        // Actually, it's better to show all steps but maybe disable step 3 visually if skipped?
                        // For simplicity, let's keep all 3 visible, user will just jump over 3 if needed.
                        return (
                            <div key={step.id} className="flex items-center">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${currentStep >= step.id
                                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                                    : 'border-slate-700 text-slate-500'
                                    }`}>
                                    {currentStep > step.id ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-cyan-500' : 'bg-slate-700'
                                        }`} />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
                    <h1 className="text-2xl font-bold text-white text-center mb-2">Create Account</h1>
                    <p className="text-slate-400 text-center mb-8">Step {currentStep} of 3: {STEPS[currentStep - 1].title}</p>

                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <p className="text-emerald-400 text-sm">{successMessage}</p>
                        </div>
                    )}

                    {apiError && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{apiError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {currentStep === 1 && renderPersonalInfo()}
                        {currentStep === 2 && renderRoleSelection()}
                        {currentStep === 3 && renderCompanyInfo()}

                        <div className="flex gap-4 mt-8">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                            )}

                            {/* Button Logic: If Step < 3, show Next. If Step 2 and Profile is personal, Next acts as Submit. Note: handleNext handles logic */}
                            {currentStep < 3 ? (
                                <Button
                                    type="button"
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleNext}
                                >
                                    {/* If on step 2 and direct submit is possible, label could be 'Create Account' but keeping 'Next' for simplicity unless state matches */}
                                    {currentStep === 2 && !requiresCompanyInfo(formData.role) && formData.role ? (
                                        <>Create Account <Check className="w-4 h-4 ml-2" /></>
                                    ) : (
                                        <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            Create Account <Check className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>

                    <p className="mt-6 text-center text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
