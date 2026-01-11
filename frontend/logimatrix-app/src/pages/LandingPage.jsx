import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Globe } from '@/components/ui/globe';
import { MapPin, DollarSign, Truck, Shield, ArrowRight, Crosshair, Target } from 'lucide-react';

// Import images from assets
import featureDestinations from '@/assets/global-supply-chain.jpg';
import featurePricing from '@/assets/transparent-pricing.jpg';
import featureGps from '@/assets/truck-tracking.jpg';
import featureInsurance from '@/assets/secure-logistics.jpg';

const Typewriter = ({ text, delay = 0, className = "" }) => {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

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
                    setIsComplete(true);
                }
            }, 70);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);

    return (
        <span className={className}>
            {displayText}
            {!isComplete && <span className="inline w-[3px] h-[0.8em] bg-cyan-400 ml-0.5 animate-pulse" style={{ display: 'inline-block', verticalAlign: 'middle' }}></span>}
        </span>
    );
};

const CollaboratorLogo = ({ name }) => (
    <div className="text-xl font-bold text-slate-500 hover:text-slate-800 transition-colors duration-300 font-sans tracking-tight cursor-default select-none grayscale hover:grayscale-0">
        {name}
    </div>
);

const FeatureCircle = ({ item, side }) => {
    return (
        <div className={`relative flex items-center group ${side === 'left' ? 'flex-row' : 'flex-row-reverse'} mb-24 last:mb-0 w-full`}>
            {/* The Image Circle */}
            <div className="relative z-10 flex-shrink-0">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-[6px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden relative group-hover:scale-105 transition-transform duration-500 ease-out">
                    <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-700"
                    />
                    {/* Inner Shadow Overlay */}
                    <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] rounded-full pointer-events-none"></div>
                </div>

                {/* Floating Badge/Icon on rim */}
                <div className={`absolute top-0 ${side === 'left' ? '-right-2' : '-left-2'} w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-slate-900 shadow-lg z-20`}>
                    {item.icon}
                </div>
            </div>

            {/* The Connector Arrow */}
            <div className={`flex-grow relative h-px mx-4 ${side === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-cyan-500/50 to-transparent`}>
                <div className={`absolute -top-1.5 ${side === 'left' ? '-right-1' : '-left-1'} w-3 h-3 bg-cyan-500 rounded-full animate-pulse`}></div>
            </div>

            {/* The Text Content */}
            <div className={`flex-1 ${side === 'left' ? 'text-left pl-4' : 'text-right pr-4'} max-w-xs`}>
                <div className={`flex items-center gap-3 mb-2 ${side === 'left' ? 'justify-start' : 'justify-end'}`}>
                    <h3 className="text-2xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
                        {item.title}
                    </h3>
                    <div className="p-1.5 rounded-full bg-cyan-100/50 text-cyan-600">
                        <ArrowRight className={`w-4 h-4 ${side === 'right' && 'rotate-180'}`} />
                    </div>
                </div>
                <p className="text-slate-500 font-medium leading-relaxed">
                    {item.description}
                </p>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <MapPin className="w-5 h-5" />,
            title: '700+ Destinations',
            description: 'Extensive network covering major cities and remote locations.',
            image: featureDestinations
        },
        {
            icon: <DollarSign className="w-5 h-5" />,
            title: 'Competitive Pricing',
            description: 'Best market rates with transparent pricing models.',
            image: featurePricing
        },
        {
            icon: <Truck className="w-5 h-5" />,
            title: 'GPS Enabled Trucks',
            description: 'Real-time tracking for all your shipments.',
            image: featureGps
        },
        {
            icon: <Shield className="w-5 h-5" />,
            title: 'Pre-Insured Trips',
            description: 'Comprehensive insurance coverage for peace of mind.',
            image: featureInsurance
        }
    ];

    return (
        <div className="min-h-screen text-white font-sans selection:bg-cyan-500/30">

            {/* 1. HERO SECTION */}
            <section className="relative w-full min-h-screen flex flex-col items-center justify-start overflow-hidden pt-36 pb-20 bg-[#020617]">

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
                <div className="relative z-20 text-center max-w-5xl mx-auto space-y-12 px-4">
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

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        {/*<Button
                            variant="primary"
                            size="lg"
                            className="shadow-lg shadow-blue-500/20 text-lg px-8 py-6 rounded-full"
                            onClick={() => navigate('/register?role=shipper')}
                        >
                            Start Shipping <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>*/}
                        {/*<Button
                            variant="outline"
                            size="lg"
                            className="backdrop-blur-sm bg-slate-900/30 text-lg px-8 py-6 rounded-full border-cyan-500/30 text-cyan-300"
                            onClick={() => navigate('/track')}
                        >
                            Track Live Shipments
                        </Button>*/}
                    </div>
                </div>

                {/* Globe - Anchored Bottom */}
                <div className="absolute bottom-0 w-full h-[55vh] z-10 pointer-events-none flex justify-center items-end overflow-hidden">
                    <div className="relative w-[150vw] h-[150vw] sm:w-[1000px] sm:h-[1000px] translate-y-[45%]">
                        <Globe className="opacity-100" />
                    </div>

                    {/* Halo */}
                    <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-cyan-500/20 blur-[100px] rounded-[100%] z-0"></div>
                </div>
            </section>

            {/* 2. SEMICIRCLE & COLLABORATORS SECTION (Ice Blue) */}

            {/* Semicircle Divider */}
            <div className="relative z-20 w-full h-24 -mt-24 pointer-events-none">
                <svg className="absolute bottom-0 w-full h-full text-[#F2F8FF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <path fill="currentColor" fillOpacity="1" d="M0,320L1440,320L1440,160C1440,160 1120,320 720,320C320,320 0,160 0,160L0,320Z"></path>
                </svg>
            </div>

            <section className="relative z-30 bg-[#F2F8FF] py-16 flex justify-center text-slate-900">
                <div className="bg-white border border-slate-200 px-12 py-8 rounded-3xl max-w-5xl shadow-xl shadow-blue-900/5 mx-6">
                    <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8">Trusted by Industry Leaders</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-80 hover:opacity-100 transition-all duration-500 grayscale hover:grayscale-0">
                        <CollaboratorLogo name="Flipkart" />
                        <CollaboratorLogo name="Amazon" />
                        <CollaboratorLogo name="Delhivery" />
                        <CollaboratorLogo name="BlueDart" />
                        <CollaboratorLogo name="DHL" />
                        <CollaboratorLogo name="FedEx" />
                    </div>
                </div>
            </section>

            {/* 3. REIMAGINED FEATURES SECTION */}
            <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#F2F8FF] relative z-20 text-slate-900 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
                    <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-cyan-200/20 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto relative">
                    <div className="text-center mb-32">
                        <h2 className="text-4xl sm:text-6xl font-black text-slate-900 mb-6 tracking-tight">
                            Global Reach, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Local Touch</span>
                        </h2>
                        <div className="w-24 h-1 bg-cyan-500 mx-auto rounded-full"></div>
                    </div>

                    <div className="relative w-full flex flex-col items-center">
                        {/* Central Decorative Line (Dashed) */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-slate-200 -translate-x-1/2 hidden md:block"></div>

                        {/* Feature Items */}
                        <div className="w-full flex flex-col gap-12 md:gap-0">
                            {/* Item 1 - Left */}
                            <div className="w-full md:w-1/2 md:pr-12 md:self-start">
                                <FeatureCircle item={features[0]} side="left" />
                            </div>

                            {/* Item 2 - Right */}
                            <div className="w-full md:w-1/2 md:pl-12 md:self-end md:-mt-32">
                                <FeatureCircle item={features[1]} side="right" />
                            </div>

                            {/* Item 3 - Left */}
                            <div className="w-full md:w-1/2 md:pr-12 md:self-start md:-mt-32">
                                <FeatureCircle item={features[2]} side="left" />
                            </div>

                            {/* Item 4 - Right */}
                            <div className="w-full md:w-1/2 md:pl-12 md:self-end md:-mt-32">
                                <FeatureCircle item={features[3]} side="right" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. FOOTER CTA */}
            <section className="bg-[#020617] py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">
                        Ready to Transform Your Logistics?
                    </h2>
                    <p className="text-slate-400 text-lg mb-8">
                        Join thousands of businesses already using LogiMatrix
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => navigate('/register')}
                        >
                            Get Started Free
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="border-slate-700 text-slate-300"
                            onClick={() => navigate('/enterprise')}
                        >
                            Enterprise Solutions
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
