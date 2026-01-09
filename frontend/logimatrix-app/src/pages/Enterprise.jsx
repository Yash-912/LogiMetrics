import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BarChart3, Globe, Lock } from 'lucide-react';

const Enterprise = () => {
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
                <Button size="lg" className="px-8 text-lg">Schedule Demo <ArrowRight className="ml-2 w-5 h-5" /></Button>
            </section>

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
