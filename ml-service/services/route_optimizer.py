"""
Route Optimizer Service
AI-powered route optimization using Google OR-Tools for Vehicle Routing Problem (VRP).
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Try to import OR-Tools
try:
    from ortools.constraint_solver import routing_enums_pb2
    from ortools.constraint_solver import pywrapcp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning("OR-Tools not available. Using fallback optimization.")


@dataclass
class Location:
    """Represents a delivery location."""
    id: str
    latitude: float
    longitude: float
    name: str = ""
    demand: int = 1  # Units to deliver
    time_window_start: Optional[int] = None  # Minutes from start
    time_window_end: Optional[int] = None
    service_time: int = 10  # Minutes to service this location
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'name': self.name,
            'demand': self.demand,
            'time_window': [self.time_window_start, self.time_window_end],
            'service_time': self.service_time
        }


@dataclass
class Vehicle:
    """Represents a delivery vehicle."""
    id: str
    capacity: int = 100
    start_location_idx: int = 0  # Index of depot/start location
    end_location_idx: Optional[int] = None  # Index of end location (None = return to start)
    cost_per_km: float = 1.0
    max_distance_km: Optional[float] = None
    max_stops: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'capacity': self.capacity,
            'start_location_idx': self.start_location_idx,
            'end_location_idx': self.end_location_idx,
            'cost_per_km': self.cost_per_km,
            'max_distance_km': self.max_distance_km,
            'max_stops': self.max_stops
        }


@dataclass
class OptimizationResult:
    """Result of route optimization."""
    success: bool
    routes: List[Dict[str, Any]] = field(default_factory=list)
    total_distance_km: float = 0.0
    total_time_minutes: float = 0.0
    total_cost: float = 0.0
    unassigned_locations: List[str] = field(default_factory=list)
    computation_time_ms: float = 0.0
    solver_status: str = ""
    model_version: str = "1.0.0"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'routes': self.routes,
            'total_distance_km': round(self.total_distance_km, 2),
            'total_time_minutes': round(self.total_time_minutes, 1),
            'total_cost': round(self.total_cost, 2),
            'unassigned_locations': self.unassigned_locations,
            'computation_time_ms': round(self.computation_time_ms, 2),
            'solver_status': self.solver_status,
            'model_version': self.model_version
        }


class RouteOptimizer:
    """
    Route optimization using Google OR-Tools VRP solver.
    
    Supports:
    - Multiple vehicles with different capacities
    - Time window constraints
    - Vehicle capacity constraints
    - Distance/time minimization
    - Multi-depot scenarios
    """
    
    # Earth radius for distance calculations
    EARTH_RADIUS_KM = 6371.0
    
    def __init__(self, config: Optional[Any] = None):
        """
        Initialize the route optimizer.
        
        Args:
            config: Configuration object with optimization settings
        """
        self.config = config
        self.model_version = "1.0.0"
        
        # Default settings
        self.max_waypoints = 25
        self.max_vehicles = 50
        self.optimization_timeout = 30  # seconds
        self.average_speed_kmh = 40  # Average vehicle speed
        
        if config:
            self.max_waypoints = getattr(config, 'ROUTE_MAX_WAYPOINTS', 25)
            self.max_vehicles = getattr(config, 'ROUTE_MAX_VEHICLES', 50)
            self.optimization_timeout = getattr(config, 'ROUTE_OPTIMIZATION_TIMEOUT', 30)
    
    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        Calculate the great-circle distance between two points on Earth.
        
        Args:
            lat1, lon1: Coordinates of first point
            lat2, lon2: Coordinates of second point
            
        Returns:
            Distance in kilometers
        """
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return self.EARTH_RADIUS_KM * c
    
    def _compute_distance_matrix(self, locations: List[Location]) -> List[List[int]]:
        """
        Compute distance matrix between all locations.
        
        Args:
            locations: List of Location objects
            
        Returns:
            2D list of distances in meters (for OR-Tools compatibility)
        """
        n = len(locations)
        matrix = [[0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    dist = self._haversine_distance(
                        locations[i].latitude, locations[i].longitude,
                        locations[j].latitude, locations[j].longitude
                    )
                    # Convert to meters and round
                    matrix[i][j] = int(dist * 1000)
        
        return matrix
    
    def _compute_time_matrix(
        self,
        distance_matrix: List[List[int]],
        locations: List[Location]
    ) -> List[List[int]]:
        """
        Compute time matrix including travel time and service time.
        
        Args:
            distance_matrix: Distance matrix in meters
            locations: List of Location objects
            
        Returns:
            2D list of times in minutes
        """
        n = len(locations)
        matrix = [[0] * n for _ in range(n)]
        
        speed_m_per_min = (self.average_speed_kmh * 1000) / 60
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    travel_time = distance_matrix[i][j] / speed_m_per_min
                    service_time = locations[j].service_time
                    matrix[i][j] = int(travel_time + service_time)
        
        return matrix
    
    def optimize(
        self,
        locations: List[Union[Location, Dict[str, Any]]],
        vehicles: List[Union[Vehicle, Dict[str, Any]]] = None,
        depot_index: int = 0,
        objective: str = 'distance'  # 'distance' or 'time'
    ) -> OptimizationResult:
        """
        Optimize routes for given locations and vehicles.
        
        Args:
            locations: List of delivery locations (first is typically depot)
            vehicles: List of vehicles (defaults to single vehicle)
            depot_index: Index of the depot in locations list
            objective: Optimization objective ('distance' or 'time')
            
        Returns:
            OptimizationResult with optimized routes
        """
        start_time = datetime.now()
        
        # Convert dicts to dataclasses if needed
        if locations and isinstance(locations[0], dict):
            locations = [Location(**loc) for loc in locations]
        
        if vehicles is None:
            vehicles = [Vehicle(id='vehicle_1', capacity=1000)]
        elif isinstance(vehicles[0], dict):
            vehicles = [Vehicle(**v) for v in vehicles]
        
        # Validate inputs
        if len(locations) < 2:
            return OptimizationResult(
                success=False,
                solver_status="Need at least 2 locations (depot + 1 delivery)"
            )
        
        if len(locations) > self.max_waypoints:
            return OptimizationResult(
                success=False,
                solver_status=f"Too many waypoints. Max: {self.max_waypoints}"
            )
        
        if not ORTOOLS_AVAILABLE:
            # Fallback to simple nearest neighbor
            return self._fallback_optimize(locations, vehicles, depot_index, start_time)
        
        try:
            result = self._ortools_optimize(
                locations, vehicles, depot_index, objective, start_time
            )
            return result
        except Exception as e:
            logger.error(f"OR-Tools optimization failed: {e}")
            return self._fallback_optimize(locations, vehicles, depot_index, start_time)
    
    def _ortools_optimize(
        self,
        locations: List[Location],
        vehicles: List[Vehicle],
        depot_index: int,
        objective: str,
        start_time: datetime
    ) -> OptimizationResult:
        """
        Optimize using Google OR-Tools VRP solver.
        """
        # Compute matrices
        distance_matrix = self._compute_distance_matrix(locations)
        time_matrix = self._compute_time_matrix(distance_matrix, locations)
        
        # Create routing model
        manager = pywrapcp.RoutingIndexManager(
            len(locations),
            len(vehicles),
            depot_index
        )
        routing = pywrapcp.RoutingModel(manager)
        
        # Create distance callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add distance constraint
        routing.AddDimension(
            transit_callback_index,
            0,  # No slack
            100000000,  # Max distance per vehicle (100km in meters)
            True,  # Start cumul to zero
            'Distance'
        )
        
        # Add capacity constraint
        demands = [loc.demand for loc in locations]
        
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]
        
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # Null capacity slack
            [v.capacity for v in vehicles],  # Vehicle capacities
            True,  # Start cumul to zero
            'Capacity'
        )
        
        # Add time windows if specified
        has_time_windows = any(
            loc.time_window_start is not None and loc.time_window_end is not None
            for loc in locations
        )
        
        if has_time_windows:
            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                return time_matrix[from_node][to_node]
            
            time_callback_index = routing.RegisterTransitCallback(time_callback)
            
            routing.AddDimension(
                time_callback_index,
                30,  # Allow waiting (slack)
                1440,  # Max time per vehicle (24 hours in minutes)
                False,  # Don't start cumul to zero
                'Time'
            )
            
            time_dimension = routing.GetDimensionOrDie('Time')
            for i, loc in enumerate(locations):
                if loc.time_window_start is not None and loc.time_window_end is not None:
                    index = manager.NodeToIndex(i)
                    time_dimension.CumulVar(index).SetRange(
                        loc.time_window_start,
                        loc.time_window_end
                    )
        
        # Set search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = self.optimization_timeout
        
        # Solve
        solution = routing.SolveWithParameters(search_parameters)
        
        computation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        if not solution:
            return OptimizationResult(
                success=False,
                solver_status=self._get_solver_status(routing.status()),
                computation_time_ms=computation_time
            )
        
        # Extract solution
        routes = []
        total_distance = 0
        total_time = 0
        total_cost = 0
        
        for vehicle_idx in range(len(vehicles)):
            route_distance = 0
            route_time = 0
            route_stops = []
            
            index = routing.Start(vehicle_idx)
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                route_stops.append({
                    'location_id': locations[node].id,
                    'name': locations[node].name,
                    'latitude': locations[node].latitude,
                    'longitude': locations[node].longitude,
                    'sequence': len(route_stops)
                })
                
                prev_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += distance_matrix[manager.IndexToNode(prev_index)][manager.IndexToNode(index)]
                route_time += time_matrix[manager.IndexToNode(prev_index)][manager.IndexToNode(index)]
            
            # Add final node
            node = manager.IndexToNode(index)
            route_stops.append({
                'location_id': locations[node].id,
                'name': locations[node].name,
                'latitude': locations[node].latitude,
                'longitude': locations[node].longitude,
                'sequence': len(route_stops)
            })
            
            if len(route_stops) > 2:  # More than just depot -> depot
                route_distance_km = route_distance / 1000
                routes.append({
                    'vehicle_id': vehicles[vehicle_idx].id,
                    'stops': route_stops,
                    'distance_km': round(route_distance_km, 2),
                    'time_minutes': route_time,
                    'cost': round(route_distance_km * vehicles[vehicle_idx].cost_per_km, 2)
                })
                total_distance += route_distance_km
                total_time += route_time
                total_cost += route_distance_km * vehicles[vehicle_idx].cost_per_km
        
        return OptimizationResult(
            success=True,
            routes=routes,
            total_distance_km=total_distance,
            total_time_minutes=total_time,
            total_cost=total_cost,
            computation_time_ms=computation_time,
            solver_status='OPTIMAL' if routing.status() == 1 else 'FEASIBLE',
            model_version=self.model_version
        )
    
    def _fallback_optimize(
        self,
        locations: List[Location],
        vehicles: List[Vehicle],
        depot_index: int,
        start_time: datetime
    ) -> OptimizationResult:
        """
        Fallback nearest neighbor optimization when OR-Tools is unavailable.
        """
        # Simple nearest neighbor heuristic
        unvisited = set(range(len(locations)))
        unvisited.remove(depot_index)
        
        routes = []
        total_distance = 0
        
        for vehicle in vehicles:
            if not unvisited:
                break
            
            route_stops = [{
                'location_id': locations[depot_index].id,
                'name': locations[depot_index].name,
                'latitude': locations[depot_index].latitude,
                'longitude': locations[depot_index].longitude,
                'sequence': 0
            }]
            
            current = depot_index
            route_distance = 0
            capacity_used = 0
            
            while unvisited:
                # Find nearest unvisited location
                nearest = None
                nearest_dist = float('inf')
                
                for loc_idx in unvisited:
                    dist = self._haversine_distance(
                        locations[current].latitude, locations[current].longitude,
                        locations[loc_idx].latitude, locations[loc_idx].longitude
                    )
                    
                    # Check capacity constraint
                    if capacity_used + locations[loc_idx].demand <= vehicle.capacity:
                        if dist < nearest_dist:
                            nearest = loc_idx
                            nearest_dist = dist
                
                if nearest is None:
                    break
                
                unvisited.remove(nearest)
                route_distance += nearest_dist
                capacity_used += locations[nearest].demand
                current = nearest
                
                route_stops.append({
                    'location_id': locations[nearest].id,
                    'name': locations[nearest].name,
                    'latitude': locations[nearest].latitude,
                    'longitude': locations[nearest].longitude,
                    'sequence': len(route_stops)
                })
            
            # Return to depot
            return_dist = self._haversine_distance(
                locations[current].latitude, locations[current].longitude,
                locations[depot_index].latitude, locations[depot_index].longitude
            )
            route_distance += return_dist
            
            route_stops.append({
                'location_id': locations[depot_index].id,
                'name': locations[depot_index].name,
                'latitude': locations[depot_index].latitude,
                'longitude': locations[depot_index].longitude,
                'sequence': len(route_stops)
            })
            
            if len(route_stops) > 2:
                routes.append({
                    'vehicle_id': vehicle.id,
                    'stops': route_stops,
                    'distance_km': round(route_distance, 2),
                    'time_minutes': int(route_distance / self.average_speed_kmh * 60),
                    'cost': round(route_distance * vehicle.cost_per_km, 2)
                })
                total_distance += route_distance
        
        computation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        unassigned = [locations[i].id for i in unvisited]
        
        return OptimizationResult(
            success=True,
            routes=routes,
            total_distance_km=total_distance,
            total_time_minutes=int(total_distance / self.average_speed_kmh * 60),
            total_cost=sum(r['cost'] for r in routes),
            unassigned_locations=unassigned,
            computation_time_ms=computation_time,
            solver_status='HEURISTIC (nearest neighbor)',
            model_version=self.model_version
        )
    
    def _get_solver_status(self, status: int) -> str:
        """Convert OR-Tools status code to string."""
        status_map = {
            0: 'ROUTING_NOT_SOLVED',
            1: 'ROUTING_SUCCESS',
            2: 'ROUTING_PARTIAL_SUCCESS_LOCAL_OPTIMUM_NOT_REACHED',
            3: 'ROUTING_FAIL',
            4: 'ROUTING_FAIL_TIMEOUT',
            5: 'ROUTING_INVALID'
        }
        return status_map.get(status, f'UNKNOWN_{status}')
    
    def optimize_simple(
        self,
        waypoints: List[Tuple[float, float]],
        depot: Tuple[float, float] = None
    ) -> Dict[str, Any]:
        """
        Simple optimization interface with just coordinates.
        
        Args:
            waypoints: List of (latitude, longitude) tuples
            depot: Optional depot location (defaults to first waypoint)
            
        Returns:
            Optimized route as dictionary
        """
        locations = []
        
        # Add depot
        if depot:
            locations.append(Location(
                id='depot',
                latitude=depot[0],
                longitude=depot[1],
                name='Depot',
                demand=0
            ))
        
        # Add waypoints
        for i, (lat, lon) in enumerate(waypoints):
            if depot is None and i == 0:
                locations.append(Location(
                    id='depot',
                    latitude=lat,
                    longitude=lon,
                    name='Depot',
                    demand=0
                ))
            else:
                locations.append(Location(
                    id=f'stop_{i}',
                    latitude=lat,
                    longitude=lon,
                    name=f'Stop {i}',
                    demand=1
                ))
        
        result = self.optimize(locations)
        return result.to_dict()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the optimizer."""
        return {
            'model_version': self.model_version,
            'ortools_available': ORTOOLS_AVAILABLE,
            'max_waypoints': self.max_waypoints,
            'max_vehicles': self.max_vehicles,
            'optimization_timeout_seconds': self.optimization_timeout,
            'average_speed_kmh': self.average_speed_kmh
        }


# Convenience function
def optimize_route(
    waypoints: List[Tuple[float, float]],
    depot: Tuple[float, float] = None
) -> Dict[str, Any]:
    """
    Quick route optimization without managing optimizer instance.
    
    Args:
        waypoints: List of (latitude, longitude) tuples
        depot: Optional depot location
        
    Returns:
        Optimized route dictionary
    """
    optimizer = RouteOptimizer()
    return optimizer.optimize_simple(waypoints, depot)
