import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BarChart3, Globe, Lock, Mail, Building2, Phone, CheckCircle } from 'lucide-react';

const Enterprise = () => {
    const navigate = useNavigate();
    const [showContactForm, setShowContactForm] = useState(false);
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [contactForm, setContactForm] = useState({
        companyName: '',
        email: '',
        phone: '',
        message: ''
    });

    const handleContactChange = (e) => {
        setContactForm({ ...contactForm, [e.target.name]: e.target.value });
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        // In production, this would send to an API
        console.log('Enterprise Contact Form:', contactForm);
        setFormSubmitted(true);
        setTimeout(() => {
            setShowContactForm(false);
            setFormSubmitted(false);
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-20">
            <section className="relative py-28 px-6 text-center border-b border-white/5">
                <span className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-4 block">For Large Business</span>
                <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter">
                    Supply Chain <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">Intelligence</span>
                </h1>
                <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                    End-to-end logistics operating system for high-volume shippers.
                    Automate dispatch, track real-time, and optimize costs with AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        className="px-8 text-lg"
                        onClick={() => setShowContactForm(true)}
                    >
                        Schedule Demo <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="px-8 text-lg border-slate-700 hover:bg-slate-800"
                        onClick={() => navigate('/register?role=shipper')}
                    >
                        Get Started Now
                    </Button>
                </div>
            </section>

            {/* Contact Form Modal */}
            {showContactForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 relative">
                        <button
                            onClick={() => setShowContactForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        {formSubmitted ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                                <p className="text-gray-400">Our team will contact you within 24 hours.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-white mb-2">Schedule a Demo</h3>
                                <p className="text-gray-400 mb-6">Fill in your details and we'll reach out</p>

                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={contactForm.companyName}
                                                onChange={handleContactChange}
                                                placeholder="Acme Inc."
                                                className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={contactForm.email}
                                                onChange={handleContactChange}
                                                placeholder="you@company.com"
                                                className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={contactForm.phone}
                                                onChange={handleContactChange}
                                                placeholder="+91 98765 43210"
                                                className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Message (Optional)</label>
                                        <textarea
                                            name="message"
                                            value={contactForm.message}
                                            onChange={handleContactChange}
                                            placeholder="Tell us about your logistics needs..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600">
                                        Request Demo
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            <section className="max-w-7xl mx-auto px-6 py-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-bold mb-6">API-First Logistics</h2>
                        <p className="text-slate-400 text-lg mb-8">
                            Integrate our powerful Logistics API directly into your ERP or WMS.
                            Get rates, book trucks, and track shipments programmatically.
                        </p>
                        <ul className="space-y-4">
                            {['99.9% Uptime SLA', 'Dedicated Account Manager', 'Custom Analytics Dashboard'].map(item => (
                                <li key={item} className="flex items-center gap-3 text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 font-mono text-sm text-blue-300 shadow-2xl">
                        <div className="flex gap-2 mb-4 border-b border-slate-800 pb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <p><span className="text-purple-400">const</span> shipment = <span className="text-yellow-400">await</span> logimatrix.<span className="text-blue-400">createShipment</span>({'{'}</p>
                        <div className="pl-4 text-slate-400">
                            <p>origin: <span className="text-green-400">"Warehouse_A"</span>,</p>
                            <p>destination: <span className="text-green-400">"Retail_Store_12"</span>,</p>
                            <p>weight: <span className="text-orange-400">2500</span>,</p>
                            <p>vehicle: <span className="text-green-400">"20FT_CONTAINER"</span></p>
                        </div>
                        <p>{'}'});</p>
                        <p className="mt-4 text-slate-500">// Returns tracking ID and ETA instantly</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Enterprise;
