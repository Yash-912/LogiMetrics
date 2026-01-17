import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Truck, Calendar, Package, ArrowRight, CheckCircle, Navigation, User, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VEHICLES = [
    { id: 'ace', name: 'Tata Ace', capacity: '750 kg', price: '₹450', image: '🚛' },
    { id: 'pickup', name: 'Bolero Pickup', capacity: '1.5 Ton', price: '₹850', image: '🚚' },
    { id: 'canter', name: 'Eicher Canter', capacity: '3.5 Ton', price: '₹1800', image: '🚛' },
];

const BookingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        pickup: '',
        drop: '',
        vehicle: null,
        date: '',
        goodsType: '',
        name: '',
        phone: '',
        email: ''
    });

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleBooking = () => {
        // Mock Booking Logic
        alert(`Booking Confirmed for ${formData.name}! Tracking link sent to ${formData.phone}.`);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4 flex justify-center items-start selection:bg-cyan-500/30 font-sans">

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Form Steps */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>

                    <Card className="bg-slate-900/60 backdrop-blur-xl border-slate-800 p-8 shadow-2xl min-h-[500px] flex flex-col">

                        {/* STEP 1: Route Selection */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-2xl font-bold">Where are we moving?</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Pickup Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-cyan-400" />
                                            <input
                                                type="text"
                                                placeholder="Enter pickup address"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                                value={formData.pickup}
                                                onChange={e => setFormData({ ...formData, pickup: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Drop Location</label>
                                        <div className="relative">
                                            <Navigation className="absolute left-4 top-3.5 w-5 h-5 text-blue-400" />
                                            <input
                                                type="text"
                                                placeholder="Enter drop address"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                                value={formData.drop}
                                                onChange={e => setFormData({ ...formData, drop: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Vehicle Selection */}
                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-2xl font-bold">Select Vehicle</h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {VEHICLES.map(v => (
                                        <div
                                            key={v.id}
                                            onClick={() => setFormData({ ...formData, vehicle: v })}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all hover:bg-slate-800/50 ${formData.vehicle?.id === v.id ? 'bg-cyan-900/20 border-cyan-500' : 'bg-slate-950 border-slate-800'}`}
                                        >
                                            <div className="text-3xl mb-2">{v.image}</div>
                                            <div className="font-bold text-lg">{v.name}</div>
                                            <div className="text-sm text-slate-400">{v.capacity} • Base: {v.price}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Contact Details */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-2xl font-bold">Who is booking?</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <input
                                                type="tel"
                                                placeholder="Enter phone number"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Email Address (Optional)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <input
                                                type="email"
                                                placeholder="Enter email address"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Confirm Details */}
                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in-up">
                                <h2 className="text-2xl font-bold">Booking Summary</h2>

                                <div className="bg-slate-950 p-6 rounded-xl space-y-4 border border-slate-800">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                        <span className="text-slate-400">Customer</span>
                                        <span className="font-medium text-right">{formData.name || 'Guest'} <br /> <span className="text-xs text-slate-500">{formData.phone}</span></span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                        <span className="text-slate-400">Route</span>
                                        <span className="font-medium text-right">{formData.pickup || 'Unknown'} <br /> <span className="text-xs text-slate-500">to</span> <br /> {formData.drop || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                        <span className="text-slate-400">Vehicle</span>
                                        <span className="font-medium">{formData.vehicle?.name || 'Not Selected'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-lg font-bold text-white">Est. Total</span>
                                        <span className="text-2xl font-bold text-cyan-400">{formData.vehicle?.price || '₹0'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="mt-auto pt-8 flex justify-between">
                            {step > 1 ? (
                                <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white">
                                    Back
                                </Button>
                            ) : <div></div>}

                            {step < 4 ? (
                                <Button variant="primary" onClick={handleNext} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-full px-8">
                                    Next Step <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            ) : (
                                <Button variant="primary" onClick={handleBooking} className="bg-green-600 hover:bg-green-500 rounded-full px-8 shadow-lg shadow-green-500/20">
                                    Confirm Booking <CheckCircle className="ml-2 w-4 h-4" />
                                </Button>
                            )}
                        </div>

                    </Card>
                </div>

                {/* RIGHT COLUMN: Info Panel (Static for now) */}
                <div className="hidden lg:block space-y-6">
                    <div className="bg-slate-900/40 border border-slate-800/50 p-6 rounded-2xl h-full flex flex-col justify-center items-center text-center backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <Truck className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Safe & Reliable</h3>
                        <p className="text-slate-400 text-sm mb-6">Every trip is GPS tracked and insured. Our partners are verified professionals.</p>

                        <div className="w-full bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-left space-y-3">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Support</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-medium">Agents Online</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BookingPage;
