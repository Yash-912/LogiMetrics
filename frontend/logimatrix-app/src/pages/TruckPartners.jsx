import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DollarSign, Map, Smartphone } from 'lucide-react';

const TruckPartners = () => {
    return (
        <div className="min-h-screen bg-[#020617] text-white pt-20">
            <section className="relative py-24 px-6 text-center">
                <h1 className="text-5xl md:text-7xl font-black mb-6">Drive & <span className="text-cyan-400">Earn</span></h1>
                <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                    Join the largest network of logistics partners. Guaranteed trips, timely payments, and 24/7 support.
                </p>
                <div className="bg-slate-900/50 p-8 rounded-2xl max-w-md mx-auto border border-slate-800">
                    <h3 className="text-xl font-bold mb-4">Attach your Vehicle</h3>
                    <input type="text" placeholder="Enter Mobile Number" className="w-full bg-slate-800 border-none rounded-lg py-3 px-4 mb-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500" />
                    <Button className="w-full">Join Now</Button>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
                {[
                    { title: 'Zero Commission', desc: 'Keep what you earn. We charge minimal platform fees.', icon: <DollarSign className="w-8 h-8" /> },
                    { title: 'Return Trips', desc: 'Get return loads from any destination instantly.', icon: <Map className="w-8 h-8" /> },
                    { title: 'Easy App', desc: 'Manage trips and payments from a single app.', icon: <Smartphone className="w-8 h-8" /> }
                ].map((box, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-xl hover:border-cyan-500/30 transition-colors">
                        <div className="bg-cyan-500/10 w-16 h-16 rounded-full flex items-center justify-center text-cyan-400 mb-6 mx-auto">
                            {box.icon}
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">{box.title}</h3>
                        <p className="text-center text-slate-400">{box.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TruckPartners;
