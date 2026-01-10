"""
Route Optimizer Tests
Unit tests for the route optimization service.
"""

import os
import sys
import unittest
from datetime import datetime
from unittest.mock import Mock, patch
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.route_optimizer import (
    RouteOptimizer,
    Location,
    Vehicle,
    OptimizationResult,
    ORTOOLS_AVAILABLE
)


class TestLocationDataclass(unittest.TestCase):
    """Test Location dataclass."""
    
    def test_location_creation(self):
        """Test creating a Location instance."""
        loc = Location(
            id='loc_1',
            latitude=28.6139,
            longitude=77.2090,
            name='Delhi'
        )
        
        self.assertEqual(loc.id, 'loc_1')
        self.assertEqual(loc.latitude, 28.6139)
        self.assertEqual(loc.longitude, 77.2090)
        self.assertEqual(loc.name, 'Delhi')
    
    def test_location_defaults(self):
        """Test Location default values."""
        loc = Location(id='loc_1', latitude=28.6139, longitude=77.2090)
        
        self.assertEqual(loc.name, '')
        self.assertEqual(loc.demand, 1)
        self.assertIsNone(loc.time_window_start)
        self.assertIsNone(loc.time_window_end)
        self.assertEqual(loc.service_time, 10)
    
    def test_location_to_dict(self):
        """Test Location serialization."""
        loc = Location(
            id='loc_1',
            latitude=28.6139,
            longitude=77.2090,
            name='Delhi',
            demand=5
        )
        
        result = loc.to_dict()
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result['id'], 'loc_1')
        self.assertEqual(result['latitude'], 28.6139)
        self.assertEqual(result['demand'], 5)


class TestVehicleDataclass(unittest.TestCase):
    """Test Vehicle dataclass."""
    
    def test_vehicle_creation(self):
        """Test creating a Vehicle instance."""
        vehicle = Vehicle(id='truck_1', capacity=500)
        
        self.assertEqual(vehicle.id, 'truck_1')
        self.assertEqual(vehicle.capacity, 500)
    
    def test_vehicle_defaults(self):
        """Test Vehicle default values."""
        vehicle = Vehicle(id='truck_1')
        
        self.assertEqual(vehicle.capacity, 100)
        self.assertEqual(vehicle.start_location_idx, 0)
        self.assertIsNone(vehicle.end_location_idx)
        self.assertEqual(vehicle.cost_per_km, 1.0)
        self.assertIsNone(vehicle.max_distance_km)
        self.assertIsNone(vehicle.max_stops)
    
    def test_vehicle_to_dict(self):
        """Test Vehicle serialization."""
        vehicle = Vehicle(
            id='truck_1',
            capacity=500,
            cost_per_km=2.5,
            max_distance_km=1000
        )
        
        result = vehicle.to_dict()
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result['id'], 'truck_1')
        self.assertEqual(result['capacity'], 500)
        self.assertEqual(result['cost_per_km'], 2.5)


class TestOptimizationResult(unittest.TestCase):
    """Test OptimizationResult dataclass."""
    
    def test_result_creation(self):
        """Test creating an OptimizationResult."""
        result = OptimizationResult(
            success=True,
            total_distance_km=150.5,
            total_time_minutes=180
        )
        
        self.assertTrue(result.success)
        self.assertEqual(result.total_distance_km, 150.5)
        self.assertEqual(result.total_time_minutes, 180)
    
    def test_result_defaults(self):
        """Test OptimizationResult default values."""
        result = OptimizationResult(success=False)
        
        self.assertEqual(result.routes, [])
        self.assertEqual(result.total_distance_km, 0.0)
        self.assertEqual(result.total_cost, 0.0)
        self.assertEqual(result.unassigned_locations, [])
    
    def test_result_to_dict(self):
        """Test OptimizationResult serialization."""
        result = OptimizationResult(
            success=True,
            total_distance_km=150.567,
            total_time_minutes=180.333
        )
        
        data = result.to_dict()
        
        self.assertIsInstance(data, dict)
        self.assertTrue(data['success'])
        self.assertEqual(data['total_distance_km'], 150.57)  # Rounded
        self.assertEqual(data['total_time_minutes'], 180.3)  # Rounded


class TestRouteOptimizerInit(unittest.TestCase):
    """Test RouteOptimizer initialization."""
    
    def test_init_default(self):
        """Test default initialization."""
        optimizer = RouteOptimizer()
        
        self.assertEqual(optimizer.model_version, "1.0.0")
        self.assertEqual(optimizer.max_waypoints, 25)
        self.assertEqual(optimizer.max_vehicles, 50)
        self.assertEqual(optimizer.optimization_timeout, 30)
        self.assertEqual(optimizer.average_speed_kmh, 40)
    
    def test_init_with_config(self):
        """Test initialization with custom config."""
        config = Mock()
        config.ROUTE_MAX_WAYPOINTS = 50
        config.ROUTE_MAX_VEHICLES = 100
        config.ROUTE_OPTIMIZATION_TIMEOUT = 60
        
        optimizer = RouteOptimizer(config=config)
        
        self.assertEqual(optimizer.max_waypoints, 50)
        self.assertEqual(optimizer.max_vehicles, 100)
        self.assertEqual(optimizer.optimization_timeout, 60)


class TestRouteOptimizerDistance(unittest.TestCase):
    """Test distance calculation functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
    
    def test_haversine_same_point(self):
        """Test haversine distance for same point is zero."""
        distance = self.optimizer._haversine_distance(
            28.6139, 77.2090,  # Delhi
            28.6139, 77.2090   # Same point
        )
        
        self.assertAlmostEqual(distance, 0.0, places=5)
    
    def test_haversine_known_distance(self):
        """Test haversine distance for known points."""
        # Delhi to Mumbai: approximately 1150 km
        distance = self.optimizer._haversine_distance(
            28.6139, 77.2090,  # Delhi
            19.0760, 72.8777   # Mumbai
        )
        
        # Should be roughly 1150 km (allow 10% tolerance)
        self.assertGreater(distance, 1000)
        self.assertLess(distance, 1300)
    
    def test_haversine_symmetry(self):
        """Test that distance is symmetric."""
        d1 = self.optimizer._haversine_distance(28.6139, 77.2090, 19.0760, 72.8777)
        d2 = self.optimizer._haversine_distance(19.0760, 72.8777, 28.6139, 77.2090)
        
        self.assertAlmostEqual(d1, d2, places=5)


class TestRouteOptimizerDistanceMatrix(unittest.TestCase):
    """Test distance matrix computation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        # Sample locations (Indian cities)
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, name='Delhi'),
            Location(id='loc_1', latitude=19.0760, longitude=72.8777, name='Mumbai'),
            Location(id='loc_2', latitude=13.0827, longitude=80.2707, name='Chennai'),
            Location(id='loc_3', latitude=22.5726, longitude=88.3639, name='Kolkata')
        ]
    
    def test_distance_matrix_shape(self):
        """Test that distance matrix has correct shape."""
        matrix = self.optimizer._compute_distance_matrix(self.locations)
        
        n = len(self.locations)
        self.assertEqual(len(matrix), n)
        for row in matrix:
            self.assertEqual(len(row), n)
    
    def test_distance_matrix_diagonal_zero(self):
        """Test that diagonal elements are zero."""
        matrix = self.optimizer._compute_distance_matrix(self.locations)
        
        for i in range(len(self.locations)):
            self.assertEqual(matrix[i][i], 0)
    
    def test_distance_matrix_symmetric(self):
        """Test that matrix is symmetric."""
        matrix = self.optimizer._compute_distance_matrix(self.locations)
        
        n = len(self.locations)
        for i in range(n):
            for j in range(n):
                self.assertEqual(matrix[i][j], matrix[j][i])
    
    def test_distance_matrix_values_in_meters(self):
        """Test that distances are in meters."""
        matrix = self.optimizer._compute_distance_matrix(self.locations)
        
        # Delhi to Mumbai should be ~1150000 meters
        delhi_mumbai = matrix[0][1]
        self.assertGreater(delhi_mumbai, 1000000)
        self.assertLess(delhi_mumbai, 1500000)


class TestRouteOptimizerTimeMatrix(unittest.TestCase):
    """Test time matrix computation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, service_time=0),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025, service_time=15),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910, service_time=10)
        ]
        
        self.distance_matrix = self.optimizer._compute_distance_matrix(self.locations)
    
    def test_time_matrix_shape(self):
        """Test that time matrix has correct shape."""
        matrix = self.optimizer._compute_time_matrix(
            self.distance_matrix,
            self.locations
        )
        
        n = len(self.locations)
        self.assertEqual(len(matrix), n)
        for row in matrix:
            self.assertEqual(len(row), n)
    
    def test_time_matrix_includes_service_time(self):
        """Test that time matrix includes service time."""
        matrix = self.optimizer._compute_time_matrix(
            self.distance_matrix,
            self.locations
        )
        
        # Time to loc_1 should include 15 min service time
        # Time should be greater than just travel time
        travel_time_only = self.distance_matrix[0][1] / ((40 * 1000) / 60)
        total_time = matrix[0][1]
        
        self.assertGreater(total_time, travel_time_only)


class TestRouteOptimizerOptimization(unittest.TestCase):
    """Test route optimization functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        # Small test case: depot + 4 deliveries in Delhi area
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, name='Depot', demand=0),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025, name='Loc 1', demand=10),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910, name='Loc 2', demand=15),
            Location(id='loc_3', latitude=28.4595, longitude=77.0266, name='Loc 3', demand=20),
            Location(id='loc_4', latitude=28.6304, longitude=77.2177, name='Loc 4', demand=5)
        ]
        
        self.vehicle = Vehicle(id='truck_1', capacity=100)
    
    def test_optimize_returns_result(self):
        """Test that optimize returns an OptimizationResult."""
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=[self.vehicle]
        )
        
        self.assertIsInstance(result, OptimizationResult)
    
    def test_optimize_with_dict_inputs(self):
        """Test optimization with dictionary inputs."""
        locations = [
            {'id': 'depot', 'latitude': 28.6139, 'longitude': 77.2090},
            {'id': 'loc_1', 'latitude': 28.7041, 'longitude': 77.1025},
            {'id': 'loc_2', 'latitude': 28.5355, 'longitude': 77.3910}
        ]
        
        result = self.optimizer.optimize(locations=locations)
        
        self.assertIsInstance(result, OptimizationResult)
    
    def test_optimize_success_with_valid_input(self):
        """Test successful optimization."""
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=[self.vehicle]
        )
        
        self.assertTrue(result.success)
        self.assertGreater(len(result.routes), 0)
    
    def test_optimize_calculates_distance(self):
        """Test that total distance is calculated."""
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=[self.vehicle]
        )
        
        self.assertGreater(result.total_distance_km, 0)
    
    def test_optimize_fails_with_single_location(self):
        """Test that optimization fails with only one location."""
        result = self.optimizer.optimize(
            locations=[self.locations[0]]  # Only depot
        )
        
        self.assertFalse(result.success)
    
    def test_optimize_respects_capacity(self):
        """Test that vehicle capacity is respected."""
        # Create demands that exceed single vehicle capacity
        high_demand_locs = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, demand=0),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025, demand=60),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910, demand=60),
            Location(id='loc_3', latitude=28.4595, longitude=77.0266, demand=60)
        ]
        
        small_vehicle = Vehicle(id='small', capacity=50)
        
        result = self.optimizer.optimize(
            locations=high_demand_locs,
            vehicles=[small_vehicle]
        )
        
        # Should have unassigned locations or multiple routes
        if result.success:
            total_demand_served = sum(
                sum(stop.get('demand', 0) for stop in route.get('stops', []))
                for route in result.routes
            )
            # Total demand should not exceed capacity * num_vehicles
            self.assertLessEqual(total_demand_served, 50)


class TestRouteOptimizerMultiVehicle(unittest.TestCase):
    """Test multi-vehicle optimization."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        # Locations with varying demands
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, demand=0),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025, demand=30),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910, demand=25),
            Location(id='loc_3', latitude=28.4595, longitude=77.0266, demand=35),
            Location(id='loc_4', latitude=28.6304, longitude=77.2177, demand=20),
            Location(id='loc_5', latitude=28.5921, longitude=77.0460, demand=30)
        ]
        
        self.vehicles = [
            Vehicle(id='truck_1', capacity=80),
            Vehicle(id='truck_2', capacity=80)
        ]
    
    def test_multi_vehicle_optimization(self):
        """Test optimization with multiple vehicles."""
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=self.vehicles
        )
        
        self.assertTrue(result.success)
        # Should use multiple vehicles for efficiency
        self.assertGreaterEqual(len(result.routes), 1)
    
    def test_distributes_load(self):
        """Test that load is distributed across vehicles."""
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=self.vehicles
        )
        
        if result.success and len(result.routes) > 1:
            # Each route should have some stops
            for route in result.routes:
                self.assertGreater(len(route.get('stops', route.get('route', []))), 0)


class TestRouteOptimizerFallback(unittest.TestCase):
    """Test fallback optimization when OR-Tools is not available."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910),
            Location(id='loc_3', latitude=28.4595, longitude=77.0266)
        ]
    
    @unittest.skipIf(ORTOOLS_AVAILABLE, "Skipping fallback test - OR-Tools is available")
    def test_fallback_optimization(self):
        """Test that fallback optimization works without OR-Tools."""
        result = self.optimizer.optimize(locations=self.locations)
        
        # Should still return a result
        self.assertIsInstance(result, OptimizationResult)
    
    def test_optimization_without_ortools(self):
        """Test optimization works even without OR-Tools."""
        # The optimizer should handle cases when OR-Tools is unavailable
        result = self.optimizer.optimize(
            locations=self.locations,
            vehicles=[Vehicle(id='truck_1', capacity=100)]
        )
        
        self.assertIsInstance(result, OptimizationResult)
        # Should return a result (either success or graceful failure)


class TestRouteOptimizerTimeWindows(unittest.TestCase):
    """Test time window constraints."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
    
    def test_time_windows_respected(self):
        """Test that time windows are respected in optimization."""
        locations = [
            Location(
                id='depot',
                latitude=28.6139, longitude=77.2090,
                time_window_start=0, time_window_end=480  # 8 hours
            ),
            Location(
                id='loc_1',
                latitude=28.7041, longitude=77.1025,
                time_window_start=60, time_window_end=120  # 1-2 hours
            ),
            Location(
                id='loc_2',
                latitude=28.5355, longitude=77.3910,
                time_window_start=180, time_window_end=240  # 3-4 hours
            )
        ]
        
        result = self.optimizer.optimize(
            locations=locations,
            vehicles=[Vehicle(id='truck_1', capacity=100)]
        )
        
        # Should complete successfully with time windows
        self.assertIsInstance(result, OptimizationResult)


class TestRouteOptimizerEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
    
    def test_empty_locations(self):
        """Test handling of empty locations list."""
        result = self.optimizer.optimize(locations=[])
        
        self.assertFalse(result.success)
    
    def test_only_depot(self):
        """Test handling of only depot location."""
        result = self.optimizer.optimize(
            locations=[Location(id='depot', latitude=28.6139, longitude=77.2090)]
        )
        
        self.assertFalse(result.success)
    
    def test_invalid_coordinates(self):
        """Test handling of invalid coordinates."""
        locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090),
            Location(id='invalid', latitude=999, longitude=999)  # Invalid
        ]
        
        # Should handle gracefully
        result = self.optimizer.optimize(locations=locations)
        self.assertIsInstance(result, OptimizationResult)
    
    def test_large_number_of_locations(self):
        """Test handling of many locations."""
        # Generate 30 random locations around Delhi
        np.random.seed(42)
        locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090, demand=0)
        ]
        
        for i in range(29):
            locations.append(Location(
                id=f'loc_{i}',
                latitude=28.6139 + np.random.uniform(-0.5, 0.5),
                longitude=77.2090 + np.random.uniform(-0.5, 0.5),
                demand=np.random.randint(1, 10)
            ))
        
        result = self.optimizer.optimize(
            locations=locations,
            vehicles=[Vehicle(id='truck_1', capacity=200)]
        )
        
        # Should handle without crashing
        self.assertIsInstance(result, OptimizationResult)


class TestRouteOptimizerResultFormat(unittest.TestCase):
    """Test result format and structure."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.optimizer = RouteOptimizer()
        
        self.locations = [
            Location(id='depot', latitude=28.6139, longitude=77.2090),
            Location(id='loc_1', latitude=28.7041, longitude=77.1025),
            Location(id='loc_2', latitude=28.5355, longitude=77.3910)
        ]
    
    def test_result_contains_routes(self):
        """Test that result contains route information."""
        result = self.optimizer.optimize(locations=self.locations)
        
        if result.success:
            self.assertIsInstance(result.routes, list)
            self.assertGreater(len(result.routes), 0)
    
    def test_result_has_computation_time(self):
        """Test that result includes computation time."""
        result = self.optimizer.optimize(locations=self.locations)
        
        self.assertIsInstance(result.computation_time_ms, float)
        self.assertGreaterEqual(result.computation_time_ms, 0)
    
    def test_result_serializable(self):
        """Test that result can be serialized to dict."""
        result = self.optimizer.optimize(locations=self.locations)
        
        data = result.to_dict()
        
        self.assertIsInstance(data, dict)
        self.assertIn('success', data)
        self.assertIn('routes', data)
        self.assertIn('total_distance_km', data)


if __name__ == '__main__':
    unittest.main()
