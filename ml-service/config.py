"""
ML Service Configuration
Configuration management for the LogiMetrics ML microservice.
"""

import os
from datetime import timedelta


class Config:
    """Base configuration class."""
    
    # Flask settings
    SECRET_KEY = os.getenv('ML_SECRET_KEY', 'ml-service-secret-key-change-in-production')
    DEBUG = False
    TESTING = False
    
    # Server settings
    HOST = os.getenv('ML_HOST', '0.0.0.0')
    PORT = int(os.getenv('ML_PORT', 5001))
    
    # Backend API settings
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000/api')
    BACKEND_API_KEY = os.getenv('BACKEND_API_KEY', '')
    
    # Database connections (for direct access if needed)
    POSTGRES_URI = os.getenv('POSTGRES_URI', 'postgresql://user:password@localhost:5432/logimetrics')
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/logimetrics')
    REDIS_URI = os.getenv('REDIS_URI', 'redis://localhost:6379/0')
    
    # Model paths
    MODEL_DIR = os.getenv('MODEL_DIR', os.path.join(os.path.dirname(__file__), 'models'))
    DATA_DIR = os.getenv('DATA_DIR', os.path.join(os.path.dirname(__file__), 'data'))
    
    # Model file names
    ETA_MODEL_FILE = 'eta_model.pkl'
    DEMAND_MODEL_FILE = 'demand_model.pkl'
    ANOMALY_MODEL_FILE = 'anomaly_model.pkl'
    PRICE_MODEL_FILE = 'price_model.pkl'
    
    # Model settings
    MODEL_VERSION = os.getenv('MODEL_VERSION', '1.0.0')
    MODEL_RETRAIN_INTERVAL = int(os.getenv('MODEL_RETRAIN_INTERVAL', 86400))  # 24 hours in seconds
    
    # ETA Prediction settings
    ETA_DEFAULT_BUFFER_MINUTES = int(os.getenv('ETA_DEFAULT_BUFFER_MINUTES', 15))
    ETA_CONFIDENCE_THRESHOLD = float(os.getenv('ETA_CONFIDENCE_THRESHOLD', 0.7))
    
    # Demand Forecasting settings
    DEMAND_FORECAST_HORIZON_DAYS = int(os.getenv('DEMAND_FORECAST_HORIZON_DAYS', 30))
    DEMAND_SEASONALITY_PERIOD = int(os.getenv('DEMAND_SEASONALITY_PERIOD', 7))  # Weekly
    
    # Route Optimization settings
    ROUTE_MAX_WAYPOINTS = int(os.getenv('ROUTE_MAX_WAYPOINTS', 25))
    ROUTE_MAX_VEHICLES = int(os.getenv('ROUTE_MAX_VEHICLES', 50))
    ROUTE_OPTIMIZATION_TIMEOUT = int(os.getenv('ROUTE_OPTIMIZATION_TIMEOUT', 30))  # seconds
    
    # Anomaly Detection settings
    ANOMALY_CONTAMINATION = float(os.getenv('ANOMALY_CONTAMINATION', 0.1))
    ANOMALY_THRESHOLD = float(os.getenv('ANOMALY_THRESHOLD', 0.5))
    
    # Price Optimization settings
    PRICE_MIN_MARGIN = float(os.getenv('PRICE_MIN_MARGIN', 0.1))  # 10%
    PRICE_MAX_ADJUSTMENT = float(os.getenv('PRICE_MAX_ADJUSTMENT', 0.3))  # 30%
    
    # Feature Engineering settings
    FEATURE_CACHE_TTL = int(os.getenv('FEATURE_CACHE_TTL', 3600))  # 1 hour
    
    # Logging settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    LOG_FILE = os.getenv('LOG_FILE', 'logs/ml-service.log')
    
    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # Rate limiting
    RATE_LIMIT_DEFAULT = os.getenv('RATE_LIMIT_DEFAULT', '100/minute')
    RATE_LIMIT_PREDICTION = os.getenv('RATE_LIMIT_PREDICTION', '50/minute')
    
    # Health check settings
    HEALTH_CHECK_INTERVAL = int(os.getenv('HEALTH_CHECK_INTERVAL', 30))
    
    # External APIs
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
    
    # Training settings
    TRAINING_BATCH_SIZE = int(os.getenv('TRAINING_BATCH_SIZE', 1000))
    TRAINING_TEST_SPLIT = float(os.getenv('TRAINING_TEST_SPLIT', 0.2))
    TRAINING_RANDOM_STATE = int(os.getenv('TRAINING_RANDOM_STATE', 42))
    
    @classmethod
    def get_model_path(cls, model_name: str) -> str:
        """Get full path for a model file."""
        return os.path.join(cls.MODEL_DIR, model_name)
    
    @classmethod
    def get_data_path(cls, data_type: str, filename: str) -> str:
        """Get full path for a data file."""
        return os.path.join(cls.DATA_DIR, data_type, filename)


class DevelopmentConfig(Config):
    """Development configuration."""
    
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    
    # Use local development databases
    POSTGRES_URI = os.getenv('POSTGRES_URI', 'postgresql://postgres:postgres@localhost:5432/logimetrics_dev')
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/logimetrics_dev')
    REDIS_URI = os.getenv('REDIS_URI', 'redis://localhost:6379/1')


class TestingConfig(Config):
    """Testing configuration."""
    
    TESTING = True
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    
    # Use test databases
    POSTGRES_URI = os.getenv('POSTGRES_URI', 'postgresql://postgres:postgres@localhost:5432/logimetrics_test')
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/logimetrics_test')
    REDIS_URI = os.getenv('REDIS_URI', 'redis://localhost:6379/2')
    
    # Faster settings for testing
    MODEL_RETRAIN_INTERVAL = 60
    ROUTE_OPTIMIZATION_TIMEOUT = 5


class ProductionConfig(Config):
    """Production configuration."""
    
    DEBUG = False
    LOG_LEVEL = 'WARNING'
    
    # Production should always have these set via environment variables
    SECRET_KEY = os.getenv('ML_SECRET_KEY')
    
    # Stricter rate limits in production
    RATE_LIMIT_DEFAULT = os.getenv('RATE_LIMIT_DEFAULT', '60/minute')
    RATE_LIMIT_PREDICTION = os.getenv('RATE_LIMIT_PREDICTION', '30/minute')


class StagingConfig(Config):
    """Staging configuration."""
    
    DEBUG = False
    LOG_LEVEL = 'INFO'


# Configuration mapping
config_map = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(env: str = None) -> Config:
    """
    Get configuration based on environment.
    
    Args:
        env: Environment name (development, testing, staging, production)
        
    Returns:
        Configuration class instance
    """
    if env is None:
        env = os.getenv('FLASK_ENV', os.getenv('ML_ENV', 'development'))
    
    return config_map.get(env, config_map['default'])


# Default config instance
current_config = get_config()
