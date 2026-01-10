/**
 * Forgot Password Page
 * Request password reset email
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        try {
            await forgotPassword(email);
            setIsSuccess(true);
        } catch (err) {
            // Don't reveal if email exists or not for security
            // Still show success to prevent email enumeration
            setIsSuccess(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success State
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
                {/* Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 w-full max-w-md text-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center mb-8">
                        <div className="text-3xl font-black tracking-tighter">
                            <span className="text-white">Logi</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                        </div>
                    </Link>

                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-4">Check Your Email</h1>

                        <p className="text-slate-400 mb-6">
                            If an account exists for <span className="text-white font-medium">{email}</span>,
                            you'll receive a password reset link shortly.
                        </p>

                        <div className="space-y-3">
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => setIsSuccess(false)}
                            >
                                Try Another Email
                            </Button>

                            <Link to="/login">
                                <Button variant="outline" className="w-full">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                                </Button>
                            </Link>
                        </div>

                        <p className="mt-6 text-sm text-slate-500">
                            Didn't receive the email? Check your spam folder or try again in a few minutes.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center mb-8">
                    <div className="text-3xl font-black tracking-tighter">
                        <span className="text-white">Logi</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Matrix</span>
                    </div>
                </Link>

                {/* Form Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
                    <h1 className="text-2xl font-bold text-white text-center mb-2">Forgot Password?</h1>
                    <p className="text-slate-400 text-center mb-8">
                        No worries! Enter your email and we'll send you a reset link.
                    </p>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full py-3 text-base font-semibold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </Button>
                    </form>

                    {/* Back to Login */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </div>

                {/* Register Link */}
                <p className="mt-6 text-center text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
