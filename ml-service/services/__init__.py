"""
LogiMetrics ML Services
ML prediction and optimization services for the logistics platform.
"""

from .eta_predictor import ETAPredictor, predict_eta
from .demand_forecaster import DemandForecaster, forecast_demand
from .route_optimizer import RouteOptimizer, optimize_route, Location, Vehicle, OptimizationResult
from .anomaly_detector import AnomalyDetector, detect_anomaly
from .price_optimizer import PriceOptimizer, calculate_shipping_price

__all__ = [
    # ETA Prediction
    'ETAPredictor',
    'predict_eta',
    
    # Demand Forecasting
    'DemandForecaster',
    'forecast_demand',
    
    # Route Optimization
    'RouteOptimizer',
    'optimize_route',
    'Location',
    'Vehicle', 
    'OptimizationResult',
    
    # Anomaly Detection
    'AnomalyDetector',
    'detect_anomaly',
    
    # Price Optimization
    'PriceOptimizer',
    'calculate_shipping_price',
]

__version__ = '1.0.0'
