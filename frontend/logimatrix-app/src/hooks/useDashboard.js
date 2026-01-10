/**
 * Dashboard Hooks
 * Custom hooks for fetching dashboard data using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shipmentApi from '@/api/shipment.api';
import * as vehicleApi from '@/api/vehicle.api';
import * as driverApi from '@/api/driver.api';
import * as analyticsApi from '@/api/analytics.api';

// Query Keys
export const queryKeys = {
    dashboardStats: ['dashboard', 'stats'],
    recentShipments: ['shipments', 'recent'],
    shipments: (params) => ['shipments', params],
    shipment: (id) => ['shipment', id],
    vehicles: (params) => ['vehicles', params],
    drivers: (params) => ['drivers', params],
};

// Dashboard Stats Hook
export const useDashboardStats = () => {
    return useQuery({
        queryKey: queryKeys.dashboardStats,
        queryFn: analyticsApi.getDashboardStats,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 2,
    });
};

// Recent Shipments Hook (for dashboard overview)
export const useRecentShipments = (limit = 10) => {
    return useQuery({
        queryKey: queryKeys.recentShipments,
        queryFn: () => shipmentApi.getShipments({
            limit,
            sort: '-createdAt'
        }),
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
};

// All Shipments with Pagination/Filter Hook
export const useShipments = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.shipments(params),
        queryFn: () => shipmentApi.getShipments(params),
        staleTime: 1000 * 60, // 1 minute
        keepPreviousData: true,
    });
};

// Single Shipment Hook
export const useShipment = (id) => {
    return useQuery({
        queryKey: queryKeys.shipment(id),
        queryFn: () => shipmentApi.getShipment(id),
        enabled: !!id,
    });
};

// Create Shipment Mutation
export const useCreateShipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: shipmentApi.createShipment,
        onSuccess: () => {
            queryClient.invalidateQueries(['shipments']);
            queryClient.invalidateQueries(queryKeys.dashboardStats);
        },
    });
};

// Update Shipment Mutation
export const useUpdateShipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => shipmentApi.updateShipment(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['shipments']);
            queryClient.invalidateQueries(queryKeys.shipment(variables.id));
        },
    });
};

// Delete Shipment Mutation
export const useDeleteShipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: shipmentApi.deleteShipment,
        onSuccess: () => {
            queryClient.invalidateQueries(['shipments']);
            queryClient.invalidateQueries(queryKeys.dashboardStats);
        },
    });
};

// Update Shipment Status Mutation
export const useUpdateShipmentStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status, notes }) => shipmentApi.updateShipmentStatus(id, status, notes),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['shipments']);
            queryClient.invalidateQueries(queryKeys.shipment(variables.id));
        },
    });
};

// Vehicles Hook
export const useVehicles = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.vehicles(params),
        queryFn: () => vehicleApi.getVehicles(params),
        staleTime: 1000 * 60 * 2,
    });
};

// Drivers Hook
export const useDrivers = (params = {}) => {
    return useQuery({
        queryKey: queryKeys.drivers(params),
        queryFn: () => driverApi.getDrivers(params),
        staleTime: 1000 * 60 * 2,
    });
};

export default {
    useDashboardStats,
    useRecentShipments,
    useShipments,
    useShipment,
    useCreateShipment,
    useUpdateShipment,
    useDeleteShipment,
    useUpdateShipmentStatus,
    useVehicles,
    useDrivers,
};
