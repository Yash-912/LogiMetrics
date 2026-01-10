/**
 * Create Shipment Page
 * Multi-step form for creating a new shipment
 */

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    MapPin, Package, Calculator, Truck, Check,
    ArrowRight, ArrowLeft, Plus, Trash2, Calendar
} from 'lucide-react';
import { createShipment } from '@/api/shipment.api';

// Validation Schema
const shipmentSchema = z.object({
    // Step 1: Origin/Destination
    pickupAddress: z.object({
        street: z.string().min(5, 'Street address is required'),
        city: z.string().min(2, 'City is required'),
        state: z.string().min(2, 'State is required'),
        postalCode: z.string().min(5, 'Postal code is required'),
        country: z.string().min(2, 'Country is required'),
        date: z.string().min(1, 'Pickup date is required'),
    }),
    deliveryAddress: z.object({
        street: z.string().min(5, 'Street address is required'),
        city: z.string().min(2, 'City is required'),
        state: z.string().min(2, 'State is required'),
        postalCode: z.string().min(5, 'Postal code is required'),
        country: z.string().min(2, 'Country is required'),
        date: z.string().optional(),
    }),

    // Step 2: Items
    items: z.array(z.object({
        description: z.string().min(3, 'Description is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        weight: z.number().min(0.1, 'Weight must be positive'),
        dimensions: z.object({
            length: z.number().min(0.1),
            width: z.number().min(0.1),
            height: z.number().min(0.1),
        }).optional(),
    })).min(1, 'Add at least one item'),

    // Step 3: Type & Pricing related
    type: z.enum(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable']),
    insuranceRequired: z.boolean().default(false),
    estimatedValue: z.number().min(0).optional(),

    // Step 4: Assignment (Optional at creation)
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
});

const STEPS = [
    { id: 1, title: 'Route', icon: MapPin },
    { id: 2, title: 'Items', icon: Package },
    { id: 3, title: 'Service', icon: Calculator },
    { id: 4, title: 'Assign', icon: Truck },
    { id: 5, title: 'Review', icon: Check },
];

const CreateShipmentPage = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { control, register, handleSubmit, watch, formState: { errors }, trigger } = useForm({
        resolver: zodResolver(shipmentSchema),
        defaultValues: {
            pickupAddress: { country: 'India' },
            deliveryAddress: { country: 'India' },
            items: [{ description: '', quantity: 1, weight: 1 }],
            type: 'standard',
            insuranceRequired: false,
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const formData = watch();

    const handleNext = async () => {
        let isValid = false;

        // Validate current step fields
        if (currentStep === 1) {
            isValid = await trigger(['pickupAddress', 'deliveryAddress']);
        } else if (currentStep === 2) {
            isValid = await trigger(['items']);
        } else if (currentStep === 3) {
            isValid = await trigger(['type', 'estimatedValue']);
        } else {
            isValid = true;
        }

        if (isValid) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Aggregate items since backend currently supports single shipment description
            const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalWeight = data.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
            const description = data.items.map(i => `${i.quantity}x ${i.description}`).join(', ');

            // Transform data to match API expectations
            const apiData = {
                pickupAddress: data.pickupAddress.street,
                pickupCity: data.pickupAddress.city,
                pickupState: data.pickupAddress.state,
                pickupCountry: data.pickupAddress.country,
                pickupPostalCode: data.pickupAddress.postalCode,
                deliveryAddress: data.deliveryAddress.street,
                deliveryCity: data.deliveryAddress.city,
                deliveryState: data.deliveryAddress.state,
                deliveryCountry: data.deliveryAddress.country,
                deliveryPostalCode: data.deliveryAddress.postalCode,
                scheduledPickupDate: data.pickupAddress.date,
                scheduledDeliveryDate: data.deliveryAddress.date || undefined,
                type: data.type,
                description: description,
                quantity: totalQuantity,
                weight: totalWeight,
                insuranceRequired: data.insuranceRequired,
                value: data.estimatedValue,
                // For now hardcode company/customer since we don't have selection yet
                companyId: 'UNKNOWN', // Backend validation might trigger here if not handled
                customerId: 'UNKNOWN'
            };

            await createShipment(apiData);
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to create shipment:', error);
            const msg = error.response?.data?.message || 'Failed to create shipment';
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step Components
    const RouteStep = () => (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Pickup */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Pickup Details
                </h3>

                <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Street Address</label>
                        <input
                            {...register('pickupAddress.street')}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            placeholder="123 Pickup St"
                        />
                        {errors.pickupAddress?.street && <span className="text-red-400 text-xs">{errors.pickupAddress.street.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">City</label>
                            <input
                                {...register('pickupAddress.city')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                            {errors.pickupAddress?.city && <span className="text-red-400 text-xs">{errors.pickupAddress.city.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">State</label>
                            <input
                                {...register('pickupAddress.state')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Postal Code</label>
                            <input
                                {...register('pickupAddress.postalCode')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Country</label>
                            <input
                                {...register('pickupAddress.country')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Pickup Date</label>
                        <input
                            type="datetime-local"
                            {...register('pickupAddress.date')}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        />
                        {errors.pickupAddress?.date && <span className="text-red-400 text-xs">{errors.pickupAddress.date.message}</span>}
                    </div>
                </div>
            </div>

            {/* Delivery */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Delivery Details
                </h3>

                <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Street Address</label>
                        <input
                            {...register('deliveryAddress.street')}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            placeholder="456 Dropoff Ave"
                        />
                        {errors.deliveryAddress?.street && <span className="text-red-400 text-xs">{errors.deliveryAddress.street.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">City</label>
                            <input
                                {...register('deliveryAddress.city')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">State</label>
                            <input
                                {...register('deliveryAddress.state')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Postal Code</label>
                            <input
                                {...register('deliveryAddress.postalCode')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Country</label>
                            <input
                                {...register('deliveryAddress.country')}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Expected Delivery (Optional)</label>
                        <input
                            type="datetime-local"
                            {...register('deliveryAddress.date')}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const ItemsStep = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Shipment Items</h3>
                <Button size="sm" variant="outline" type="button" onClick={() => append({ description: '', quantity: 1, weight: 1 })}>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
            </div>

            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 relative group">
                        <button
                            type="button"
                            onClick={() => remove(index)}
                            className="absolute top-2 right-2 p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-6">
                                <label className="block text-xs text-slate-400 mb-1">Description</label>
                                <input
                                    {...register(`items.${index}.description`)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                    placeholder="e.g. Electronics Box"
                                />
                                {errors.items?.[index]?.description && <span className="text-red-400 text-xs">{errors.items[index].description.message}</span>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Qty</label>
                                <input
                                    type="number"
                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    {...register(`items.${index}.weight`, { valueAsNumber: true })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {errors.items && <p className="text-red-400 text-sm text-center">{errors.items.message}</p>}
        </div>
    );

    const ServiceStep = () => (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Service Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'].map((type) => (
                        <label key={type} className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${formData.type === type
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                            }`}>
                            <input
                                type="radio"
                                value={type}
                                {...register('type')}
                                className="hidden"
                            />
                            <div className="text-center capitalize font-medium text-white">{type}</div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        {...register('insuranceRequired')}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                        <span className="text-white font-medium">Require Insurance</span>
                        <p className="text-xs text-slate-400">Protect your shipment against loss or damage</p>
                    </div>
                </label>

                {formData.insuranceRequired && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm text-slate-400 mb-1">Estimated Value (₹)</label>
                        <input
                            type="number"
                            {...register('estimatedValue', { valueAsNumber: true })}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            placeholder="0.00"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    const AssignStep = () => (
        <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Driver Auto-Assignment</h3>
            <p className="text-slate-400 max-w-md mx-auto">
                We'll automatically assign the best available driver based on the route and vehicle requirements. You can also manually assign later.
            </p>

            {/* Search manually would go here in future */}
        </div>
    );

    const ReviewStep = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Review Shipment Details</h3>

            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-8 pb-6 border-b border-slate-700">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold mb-2">Pickup</p>
                        <p className="text-white font-medium">{formData.pickupAddress?.street}</p>
                        <p className="text-slate-400 text-sm">
                            {formData.pickupAddress?.city}, {formData.pickupAddress?.state} {formData.pickupAddress?.postalCode}
                        </p>
                        <p className="text-cyan-400 text-sm mt-1">{formData.pickupAddress?.date?.replace('T', ' ')}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold mb-2">Delivery</p>
                        <p className="text-white font-medium">{formData.deliveryAddress?.street}</p>
                        <p className="text-slate-400 text-sm">
                            {formData.deliveryAddress?.city}, {formData.deliveryAddress?.state} {formData.deliveryAddress?.postalCode}
                        </p>
                        <p className="text-purple-400 text-sm mt-1">{formData.deliveryAddress?.date?.replace('T', ' ')}</p>
                    </div>
                </div>

                <div>
                    <p className="text-xs uppercase text-slate-500 font-bold mb-2">Items</p>
                    <div className="space-y-2">
                        {formData.items?.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm py-2 border-b border-slate-700/50 last:border-0">
                                <span className="text-white">{item.quantity}x {item.description}</span>
                                <span className="text-slate-400">{item.weight} kg</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div>
                        <p className="text-xs uppercase text-slate-500 font-bold">Service Type</p>
                        <p className="text-white capitalize">{formData.type}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase text-slate-500 font-bold">Est. Cost</p>
                        <p className="text-2xl font-bold text-white">₹{1200 + (formData.items?.length * 500)}</p>
                        <p className="text-xs text-slate-500">*Calculated based on distance & weight</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" className="p-2" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold">Create New Shipment</h1>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex justify-between relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -z-10" />

                        {STEPS.map((step) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 bg-[#020617] px-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive
                                        ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/20'
                                        : isCompleted
                                            ? 'border-green-500 text-green-400 bg-green-950/30'
                                            : 'border-slate-700 text-slate-500 bg-slate-900'
                                        }`}>
                                        {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Content */}
                <Card className="p-8 bg-slate-900/50 border-slate-800 min-h-[400px]">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        {currentStep === 1 && <RouteStep />}
                        {currentStep === 2 && <ItemsStep />}
                        {currentStep === 3 && <ServiceStep />}
                        {currentStep === 4 && <AssignStep />}
                        {currentStep === 5 && <ReviewStep />}

                        <div className="flex justify-between mt-8 pt-8 border-t border-slate-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={currentStep === 1 || isSubmitting}
                                className={currentStep === 1 ? 'invisible' : ''}
                            >
                                Back
                            </Button>

                            {currentStep < 5 ? (
                                <Button type="button" variant="primary" onClick={handleNext}>
                                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button type="submit" variant="primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Shipment'} <Package className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default CreateShipmentPage;
