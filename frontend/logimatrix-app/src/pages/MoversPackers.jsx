import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Shield, Truck } from 'lucide-react';

const MoversPackers = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#020617] text-white pt-20">
            {/* Hero */}
            <section className="relative py-24 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        Move <span className="text-cyan-400">Without</span> The Stress
                    </h1>
                    <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                        Premium moving services for homes and offices. Professional packing, safe handling, and on-time delivery.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button
                            size="lg"
                            variant="primary"
                            onClick={() => navigate('/register?role=shipper')}
                        >
                            Get Started as Business
                        </Button>
                        <Button size="lg" variant="secondary">How it Works</Button>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { title: 'Home Relocation', text: 'Complete household shifting with premium packaging.', icon: <HomeIcon /> },
                        { title: 'Office Shifting', text: 'Minimal downtime moving for businesses.', icon: <OfficeIcon /> },
                        { title: 'Vehicle Moving', text: 'Safe transport for your car or bike.', icon: <CarIcon /> }
                    ].map((s, i) => (
                        <Card key={i} className="bg-slate-900/50 border-slate-800">
                            <div className="text-cyan-400 mb-4">{s.icon}</div>
                            <h3 className="text-2xl font-bold mb-2">{s.title}</h3>
                            <p className="text-slate-400">{s.text}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Features list */}
            <section className="py-20 bg-slate-900/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-bold mb-6">Why Choose Us?</h2>
                        <div className="space-y-6">
                            {[
                                "5-Layer Packaging Material",
                                "Dedicated Move Manager",
                                "Insurance Coverage Included",
                                "Real-time Tracking"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <CheckCircle className="text-cyan-400 w-6 h-6" />
                                    <span className="text-lg text-slate-300">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative h-[400px] bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
                        <Truck className="w-32 h-32 text-slate-600" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10"></div>
                    </div>
                </div>
            </section>
        </div>
    );
};

// Icons placeholders
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const OfficeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const CarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;

export default MoversPackers;
