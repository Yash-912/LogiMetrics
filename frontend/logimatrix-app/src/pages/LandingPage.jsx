import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Globe } from '@/components/ui/globe';
import { MapPin, DollarSign, Truck, Shield, ArrowRight, Crosshair, Target } from 'lucide-react';

const Typewriter = ({ text, delay = 0, className = "" }) => {
    const [displayText, setDisplayText] = useState('');
    useEffect(() => {
        let timeout;
        let charIndex = 0;
        timeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (charIndex <= text.length) {
                    setDisplayText(text.slice(0, charIndex));
                    charIndex++;
                } else {
                    clearInterval(interval);
                }
            }, 70);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);
    return <span className={className}>{displayText}<span className="inline-block w-[3px] h-[1em] bg-cyan-400 ml-1 animate-pulse align-middle"></span></span>;
};

const CollaboratorLogo = ({ name }) => (
    <div className="text-xl font-bold text-slate-400 hover:text-slate-700 transition-colors duration-300 font-sans tracking-tight cursor-default select-none">
        {name}
    </div>
);

const LandingPage = () => {
    const features = [
        {
            icon: <MapPin className="w-12 h-12" />,
            title: '700+ Destinations',
            description: 'Extensive network covering major cities and remote locations.'
        },
        {
            icon: <DollarSign className="w-12 h-12" />,
            title: 'Competitive Pricing',
            bg: 'from-blue-600 to-cyan-500',
            description: 'Best market rates with transparent pricing models.'
        },
        {
            icon: <Truck className="w-12 h-12" />,
            title: 'GPS Enabled Trucks',
            description: 'Real-time tracking for all your shipments.'
        },
        {
            icon: <Shield className="w-12 h-12" />,
            title: 'Pre-Insured Trips',
            description: 'Comprehensive insurance coverage for peace of mind.'
        }
    ];

    return (
        <div className="min-h-screen  text-white font-sans selection:bg-cyan-500/30">

            {/* 1. HERO SECTION */}
            <section className="relative w-full h-[100vh] flex flex-col items-center justify-start overflow-hidden pt-36 pb-20">

                {/* Background Layers */}


                {/* HUD Elements */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none">
                    <div className="absolute top-32 left-10 font-mono text-xs text-cyan-500">
                        <div className="flex items-center gap-2 mb-1"><Crosshair className="w-3 h-3" /> LAT: 28.6139° N</div>
                        <div className="flex items-center gap-2"><Target className="w-3 h-3" /> LNG: 77.2090° E</div>
                    </div>
                    <div className="absolute top-32 right-10 w-32 h-32 border-t border-r border-cyan-500/30"></div>
                </div>

                {/* Faint Map Pattern */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
                        <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1.5" className="text-slate-500" fill="currentColor" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#dot-pattern)" />
                    </svg>
                </div>

                {/* Hero Content */}
                <div className="relative z-20 text-center max-w-5xl mx-auto space-y-12">
                    <div className="space-y-6">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 animate-fade-in-up">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Enterprise Logistics OS</span>
                        </div>

                        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black leading-tight tracking-tight">
                            <span className="block text-white mb-2">Powering Smarter</span>
                            <Typewriter text="Logistics Across Cities" className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300" delay={300} />
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                            The world's most advanced logistics platform. Connected, intelligent, and built for scale.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button variant="primary" size="lg" className="shadow-lg shadow-blue-500/20 text-lg px-8 py-6 rounded-full">
                            Start Mapping Routes <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button variant="outline" size="lg" className="backdrop-blur-sm bg-slate-900/30 text-lg px-8 py-6 rounded-full border-cyan-500/30 text-cyan-300">
                            Track Live Shipments
                        </Button>
                    </div>
                </div>

                {/* Globe - Anchored Bottom */}
                <div className="absolute bottom-0 w-full h-[55vh] z-10 pointer-events-none flex justify-center items-end overflow-hidden">
                    <div className="relative w-[150vw] h-[150vw] sm:w-[1000px] sm:h-[1000px] translate-y-[45%]">
                        <Globe className="opacity-100" />
                    </div>

                    {/* Bottom Fade Mask */}


                    {/* Halo */}
                    <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-cyan-500/20 blur-[100px] rounded-[100%] z-0"></div>
                </div>
            </section>

            {/* SEMICIRCLE DIVIDER - Transition from dark to ice blue */}
            <div className="relative z-20 w-full h-32 overflow-hidden bg-[#020617]">
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-64 rounded-t-[50%] bg-[#F2F8FF]"
                    style={{ boxShadow: '0 -30px 80px rgba(34, 211, 238, 0.15)' }}
                />
            </div>

            {/* 2. COLLABORATORS SECTION - Ice Blue Background */}
            <section className="relative z-30 bg-[#F2F8FF] py-16 flex justify-center">

                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 px-12 py-8 rounded-3xl max-w-5xl shadow-lg mx-6">

                    <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8">Trusted by Industry Leaders</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70 hover:opacity-100 transition-all duration-500">

                        <CollaboratorLogo name="airbnb" />
                        <CollaboratorLogo name="stripe" />
                        <CollaboratorLogo name="LinkedIn" />
                        <CollaboratorLogo name="ATLASSIAN" />
                        <CollaboratorLogo name="IBM" />
                        <CollaboratorLogo name="Snap Inc." />
                    </div>
                </div>
            </section>

            {/* 3. FEATURES SECTION - Ice Blue Background */}
            <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#F2F8FF] relative z-20">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl sm:text-5xl font-bold text-slate-800 mb-6">
                            Built for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Future of Transport</span>
                        </h2>
                        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                            Experience seamless integration and real-time control over your entire supply chain.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <Card
                                key={idx}
                                className={idx === 1 ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-cyan-300' : 'bg-white border-slate-200 shadow-md'}
                            >
                                <div className={'w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ' + (idx === 1 ? 'bg-cyan-500/20 text-cyan-600 shadow-[0_0_15px_-3px_rgba(34,211,238,0.2)]' : 'bg-slate-100 text-slate-600')}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-800">{feature.title}</h3>
                                <p className={'leading-relaxed ' + (idx === 1 ? 'text-cyan-700' : 'text-slate-500')}>
                                    {feature.description}
                                </p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
