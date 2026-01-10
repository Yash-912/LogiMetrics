"""
LogiMetrics ML Service
Flask application entry point for ML predictions and optimizations.
"""

import os
import sys
import logging
from datetime import datetime
from functools import wraps

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

# Add the ml-service directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config, Config


def create_app(config_name: str = None) -> Flask:
    """
    Application factory for creating Flask app.
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    
    # Setup logging
    setup_logging(app)
    
    # Initialize extensions
    init_extensions(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register middleware
    register_middleware(app)
    
    # Health check and info endpoints
    register_health_endpoints(app)
    
    app.logger.info(f"ML Service initialized in {config_name or 'development'} mode")
    
    return app


def setup_logging(app: Flask) -> None:
    """Configure application logging."""
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO'))
    log_format = app.config.get('LOG_FORMAT', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Create logs directory if it doesn't exist
    log_file = app.config.get('LOG_FILE', 'logs/ml-service.log')
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file) if log_dir else logging.StreamHandler()
        ]
    )
    
    # Set Flask app logger level
    app.logger.setLevel(log_level)
    
    # Reduce noise from third-party loggers
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)


def init_extensions(app: Flask) -> None:
    """Initialize Flask extensions."""
    # CORS
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['*']))
    
    # Initialize model manager (lazy loading)
    app.model_manager = None


def register_blueprints(app: Flask) -> None:
    """Register Flask blueprints for API routes."""
    from routes import (
        eta_bp,
        demand_bp,
        route_bp,
        anomaly_bp,
        price_bp,
        health_bp
    )
    
    # API version prefix
    api_prefix = '/api/v1'
    
    app.register_blueprint(eta_bp, url_prefix=f'{api_prefix}/eta')
    app.register_blueprint(demand_bp, url_prefix=f'{api_prefix}/demand')
    app.register_blueprint(route_bp, url_prefix=f'{api_prefix}/routes')
    app.register_blueprint(anomaly_bp, url_prefix=f'{api_prefix}/anomaly')
    app.register_blueprint(price_bp, url_prefix=f'{api_prefix}/pricing')
    app.register_blueprint(health_bp, url_prefix=f'{api_prefix}/health')


def register_error_handlers(app: Flask) -> None:
    """Register error handlers for the application."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid request data',
            'status_code': 400
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'status_code': 401
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'error': 'Forbidden',
            'message': 'Access denied',
            'status_code': 403
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Not Found',
            'message': 'Resource not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        return jsonify({
            'success': False,
            'error': 'Unprocessable Entity',
            'message': str(error.description) if hasattr(error, 'description') else 'Invalid input data',
            'status_code': 422
        }), 422
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'success': False,
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded. Please try again later.',
            'status_code': 429
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f'Internal Server Error: {str(error)}')
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500
        }), 500
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({
            'success': False,
            'error': error.name,
            'message': error.description,
            'status_code': error.code
        }), error.code
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        app.logger.exception(f'Unhandled exception: {str(error)}')
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred' if not app.debug else str(error),
            'status_code': 500
        }), 500


def register_middleware(app: Flask) -> None:
    """Register middleware for request/response handling."""
    
    @app.before_request
    def before_request():
        """Execute before each request."""
        g.start_time = datetime.utcnow()
        g.request_id = request.headers.get('X-Request-ID', os.urandom(8).hex())
        
        # Log incoming request
        app.logger.debug(f"[{g.request_id}] {request.method} {request.path}")
    
    @app.after_request
    def after_request(response):
        """Execute after each request."""
        # Calculate response time
        if hasattr(g, 'start_time'):
            elapsed = (datetime.utcnow() - g.start_time).total_seconds() * 1000
            response.headers['X-Response-Time'] = f'{elapsed:.2f}ms'
        
        # Add request ID to response
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        
        # Add service info
        response.headers['X-Service'] = 'LogiMetrics-ML'
        response.headers['X-Service-Version'] = app.config.get('MODEL_VERSION', '1.0.0')
        
        # Log response
        app.logger.debug(
            f"[{getattr(g, 'request_id', 'unknown')}] "
            f"{request.method} {request.path} - {response.status_code}"
        )
        
        return response


def register_health_endpoints(app: Flask) -> None:
    """Register health check and service info endpoints."""
    
    @app.route('/')
    def index():
        """Root endpoint with service info."""
        return jsonify({
            'service': 'LogiMetrics ML Service',
            'version': app.config.get('MODEL_VERSION', '1.0.0'),
            'status': 'running',
            'timestamp': datetime.utcnow().isoformat(),
            'endpoints': {
                'health': '/api/v1/health',
                'eta': '/api/v1/eta',
                'demand': '/api/v1/demand',
                'routes': '/api/v1/routes',
                'anomaly': '/api/v1/anomaly',
                'pricing': '/api/v1/pricing'
            }
        })
    
    @app.route('/health')
    def health():
        """Basic health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @app.route('/ready')
    def ready():
        """Readiness probe endpoint."""
        # Check if models are loaded
        models_ready = True  # Add actual model check here
        
        if models_ready:
            return jsonify({
                'status': 'ready',
                'timestamp': datetime.utcnow().isoformat()
            })
        else:
            return jsonify({
                'status': 'not_ready',
                'message': 'Models not loaded',
                'timestamp': datetime.utcnow().isoformat()
            }), 503


def get_model_manager():
    """Get or create the model manager instance."""
    from services.model_manager import ModelManager
    
    app = Flask.current_app if Flask.current_app else None
    if app and app.model_manager is None:
        app.model_manager = ModelManager(app.config)
    
    return app.model_manager if app else ModelManager(get_config())


# Create routes module placeholder if it doesn't exist
def create_routes_placeholder():
    """Create placeholder routes module."""
    routes_dir = os.path.join(os.path.dirname(__file__), 'routes')
    routes_init = os.path.join(routes_dir, '__init__.py')
    
    if not os.path.exists(routes_dir):
        os.makedirs(routes_dir, exist_ok=True)
    
    # Always recreate routes with proper implementation
    placeholder_content = '''"""
ML Service Routes
API route blueprints for ML predictions with actual service integration.
"""

import os
import sys
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Service instances (lazy loaded)
_eta_predictor = None
_demand_forecaster = None
_route_optimizer = None
_anomaly_detector = None
_pricing_engine = None


def get_eta_predictor():
    """Get or create ETA predictor instance."""
    global _eta_predictor
    if _eta_predictor is None:
        try:
            from services.eta_predictor import ETAPredictor
            _eta_predictor = ETAPredictor()
            # Try to load pre-trained model
            model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'eta_model.pkl')
            if os.path.exists(model_path):
                _eta_predictor.load_model(model_path)
                logger.info("ETA model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ETA predictor: {e}")
            _eta_predictor = None
    return _eta_predictor


def get_demand_forecaster():
    """Get or create demand forecaster instance."""
    global _demand_forecaster
    if _demand_forecaster is None:
        try:
            from services.demand_forecaster import DemandForecaster
            _demand_forecaster = DemandForecaster()
            model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'demand_model.pkl')
            if os.path.exists(model_path):
                _demand_forecaster.load_model(model_path)
                logger.info("Demand model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize demand forecaster: {e}")
            _demand_forecaster = None
    return _demand_forecaster


def get_route_optimizer():
    """Get or create route optimizer instance."""
    global _route_optimizer
    if _route_optimizer is None:
        try:
            from services.route_optimizer import RouteOptimizer
            _route_optimizer = RouteOptimizer()
            logger.info("Route optimizer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize route optimizer: {e}")
            _route_optimizer = None
    return _route_optimizer


def get_anomaly_detector():
    """Get or create anomaly detector instance."""
    global _anomaly_detector
    if _anomaly_detector is None:
        try:
            from services.anomaly_detector import AnomalyDetector
            _anomaly_detector = AnomalyDetector()
            model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'anomaly_model.pkl')
            if os.path.exists(model_path):
                _anomaly_detector.load_model(model_path)
                logger.info("Anomaly model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize anomaly detector: {e}")
            _anomaly_detector = None
    return _anomaly_detector


def get_pricing_engine():
    """Get or create pricing engine instance."""
    global _pricing_engine
    if _pricing_engine is None:
        try:
            from services.price_optimizer import PriceOptimizer
            _pricing_engine = PriceOptimizer()
            logger.info("Pricing engine initialized")
        except Exception as e:
            logger.error(f"Failed to initialize pricing engine: {e}")
            _pricing_engine = None
    return _pricing_engine


# ============================================================
# ETA Prediction Routes
# ============================================================
eta_bp = Blueprint('eta', __name__)

@eta_bp.route('/predict', methods=['POST'])
def predict_eta():
    """Predict delivery ETA."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        predictor = get_eta_predictor()
        if predictor is None:
            return jsonify({
                'success': False,
                'error': 'ETA predictor not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        result = predictor.predict(data)
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    except Exception as e:
        logger.exception("ETA prediction failed")
        return jsonify({
            'success': False,
            'error': 'Prediction failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@eta_bp.route('/batch', methods=['POST'])
def batch_predict_eta():
    """Batch predict ETAs for multiple shipments."""
    try:
        data = request.get_json()
        if not data or 'shipments' not in data:
            return jsonify({
                'success': False,
                'error': 'No shipments data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        predictor = get_eta_predictor()
        if predictor is None:
            return jsonify({
                'success': False,
                'error': 'ETA predictor not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        results = []
        for shipment in data['shipments']:
            try:
                result = predictor.predict(shipment)
                results.append({'shipment_id': shipment.get('shipment_id'), 'prediction': result, 'success': True})
            except Exception as e:
                results.append({'shipment_id': shipment.get('shipment_id'), 'error': str(e), 'success': False})
        
        return jsonify({
            'success': True,
            'data': results,
            'total': len(results),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Batch ETA prediction failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# Demand Forecasting Routes
# ============================================================
demand_bp = Blueprint('demand', __name__)

@demand_bp.route('/forecast', methods=['POST'])
def forecast_demand():
    """Forecast demand for a given period."""
    try:
        data = request.get_json() or {}
        
        forecaster = get_demand_forecaster()
        if forecaster is None:
            return jsonify({
                'success': False,
                'error': 'Demand forecaster not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        # Extract parameters
        periods = data.get('periods', 7)
        start_date = data.get('start_date')
        region = data.get('region')
        historical_data = data.get('historical_data')
        
        result = forecaster.forecast(
            start_date=start_date,
            periods=periods,
            historical_data=historical_data
        )
        
        # Convert DataFrame to dict if needed
        if hasattr(result, 'to_dict'):
            result = result.to_dict('records')
        
        return jsonify({
            'success': True,
            'data': {
                'forecast': result,
                'periods': periods,
                'region': region
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    except Exception as e:
        logger.exception("Demand forecast failed")
        return jsonify({
            'success': False,
            'error': 'Forecast failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@demand_bp.route('/train', methods=['POST'])
def train_demand_model():
    """Train demand forecasting model with new data."""
    try:
        data = request.get_json()
        if not data or 'training_data' not in data:
            return jsonify({
                'success': False,
                'error': 'No training data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        forecaster = get_demand_forecaster()
        if forecaster is None:
            return jsonify({
                'success': False,
                'error': 'Demand forecaster not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        forecaster.train(data['training_data'])
        
        # Save model
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'demand_model.pkl')
        forecaster.save_model(model_path)
        
        return jsonify({
            'success': True,
            'message': 'Model trained and saved successfully',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Demand model training failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# Route Optimization Routes
# ============================================================
route_bp = Blueprint('routes', __name__)

@route_bp.route('/optimize', methods=['POST'])
def optimize_routes():
    """Optimize delivery routes."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        optimizer = get_route_optimizer()
        if optimizer is None:
            return jsonify({
                'success': False,
                'error': 'Route optimizer not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        locations = data.get('locations', [])
        vehicles = data.get('vehicles', [])
        constraints = data.get('constraints', {})
        
        if not locations:
            return jsonify({
                'success': False,
                'error': 'No locations provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        result = optimizer.optimize(locations, vehicles, constraints)
        
        # Convert result to dict if needed
        if hasattr(result, 'to_dict'):
            result = result.to_dict()
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    except Exception as e:
        logger.exception("Route optimization failed")
        return jsonify({
            'success': False,
            'error': 'Optimization failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@route_bp.route('/distance', methods=['POST'])
def calculate_distance():
    """Calculate distance between points."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        optimizer = get_route_optimizer()
        if optimizer is None:
            return jsonify({
                'success': False,
                'error': 'Route optimizer not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        origin = data.get('origin')
        destination = data.get('destination')
        
        if not origin or not destination:
            return jsonify({
                'success': False,
                'error': 'Origin and destination required',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        distance = optimizer.calculate_distance(
            origin.get('lat'), origin.get('lng'),
            destination.get('lat'), destination.get('lng')
        )
        
        return jsonify({
            'success': True,
            'data': {
                'distance_km': distance,
                'origin': origin,
                'destination': destination
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Distance calculation failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# Anomaly Detection Routes
# ============================================================
anomaly_bp = Blueprint('anomaly', __name__)

@anomaly_bp.route('/detect', methods=['POST'])
def detect_anomaly():
    """Detect anomalies in transactions or shipments."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        detector = get_anomaly_detector()
        if detector is None:
            return jsonify({
                'success': False,
                'error': 'Anomaly detector not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        result = detector.detect(data)
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    except Exception as e:
        logger.exception("Anomaly detection failed")
        return jsonify({
            'success': False,
            'error': 'Detection failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@anomaly_bp.route('/batch', methods=['POST'])
def batch_detect_anomalies():
    """Batch detect anomalies in multiple records."""
    try:
        data = request.get_json()
        if not data or 'records' not in data:
            return jsonify({
                'success': False,
                'error': 'No records provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        detector = get_anomaly_detector()
        if detector is None:
            return jsonify({
                'success': False,
                'error': 'Anomaly detector not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        results = []
        anomaly_count = 0
        for record in data['records']:
            try:
                result = detector.detect(record)
                if result.get('is_anomaly'):
                    anomaly_count += 1
                results.append({'record_id': record.get('id'), 'result': result, 'success': True})
            except Exception as e:
                results.append({'record_id': record.get('id'), 'error': str(e), 'success': False})
        
        return jsonify({
            'success': True,
            'data': results,
            'summary': {
                'total': len(results),
                'anomalies': anomaly_count,
                'normal': len(results) - anomaly_count
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Batch anomaly detection failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# Price Optimization Routes
# ============================================================
price_bp = Blueprint('pricing', __name__)

@price_bp.route('/calculate', methods=['POST'])
def calculate_price():
    """Calculate optimized price for a shipment."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        engine = get_pricing_engine()
        if engine is None:
            return jsonify({
                'success': False,
                'error': 'Pricing engine not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        result = engine.calculate_price(data)
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 400
    except Exception as e:
        logger.exception("Price calculation failed")
        return jsonify({
            'success': False,
            'error': 'Calculation failed',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@price_bp.route('/optimize', methods=['POST'])
def optimize_price():
    """Optimize pricing based on demand and market conditions."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        engine = get_pricing_engine()
        if engine is None:
            return jsonify({
                'success': False,
                'error': 'Pricing engine not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        base_price = data.get('base_price')
        demand_factor = data.get('demand_factor', 1.0)
        competition_factor = data.get('competition_factor', 1.0)
        
        if base_price is None:
            return jsonify({
                'success': False,
                'error': 'Base price required',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        result = engine.optimize_price(base_price, demand_factor, competition_factor)
        
        return jsonify({
            'success': True,
            'data': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Price optimization failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@price_bp.route('/quote', methods=['POST'])
def get_quote():
    """Get price quote for a shipment."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.utcnow().isoformat()
            }), 400
        
        engine = get_pricing_engine()
        if engine is None:
            return jsonify({
                'success': False,
                'error': 'Pricing engine not available',
                'timestamp': datetime.utcnow().isoformat()
            }), 503
        
        # Calculate price
        price_result = engine.calculate_price(data)
        
        # Get route optimizer for distance
        optimizer = get_route_optimizer()
        distance = None
        if optimizer and data.get('origin') and data.get('destination'):
            origin = data['origin']
            dest = data['destination']
            distance = optimizer.calculate_distance(
                origin.get('lat'), origin.get('lng'),
                dest.get('lat'), dest.get('lng')
            )
        
        return jsonify({
            'success': True,
            'data': {
                'quote': price_result,
                'distance_km': distance,
                'valid_until': datetime.utcnow().isoformat(),
                'currency': 'INR'
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.exception("Quote generation failed")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# Health Routes
# ============================================================
health_bp = Blueprint('health', __name__)

@health_bp.route('/', methods=['GET'])
def health_check():
    """Detailed health check."""
    # Check each service
    services_status = {}
    
    try:
        eta = get_eta_predictor()
        services_status['eta_predictor'] = 'available' if eta else 'unavailable'
    except:
        services_status['eta_predictor'] = 'error'
    
    try:
        demand = get_demand_forecaster()
        services_status['demand_forecaster'] = 'available' if demand else 'unavailable'
    except:
        services_status['demand_forecaster'] = 'error'
    
    try:
        routes = get_route_optimizer()
        services_status['route_optimizer'] = 'available' if routes else 'unavailable'
    except:
        services_status['route_optimizer'] = 'error'
    
    try:
        anomaly = get_anomaly_detector()
        services_status['anomaly_detector'] = 'available' if anomaly else 'unavailable'
    except:
        services_status['anomaly_detector'] = 'error'
    
    try:
        pricing = get_pricing_engine()
        services_status['pricing_engine'] = 'available' if pricing else 'unavailable'
    except:
        services_status['pricing_engine'] = 'error'
    
    # Overall status
    all_available = all(s == 'available' for s in services_status.values())
    any_error = any(s == 'error' for s in services_status.values())
    
    return jsonify({
        'status': 'healthy' if all_available else ('degraded' if not any_error else 'unhealthy'),
        'services': services_status,
        'timestamp': datetime.utcnow().isoformat()
    })

@health_bp.route('/models', methods=['GET'])
def model_status():
    """Get status of loaded models."""
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    
    model_files = {
        'eta_model': 'eta_model.pkl',
        'demand_model': 'demand_model.pkl',
        'anomaly_model': 'anomaly_model.pkl'
    }
    
    models_status = {}
    for name, filename in model_files.items():
        path = os.path.join(models_dir, filename)
        exists = os.path.exists(path)
        models_status[name] = {
            'loaded': exists,
            'path': path if exists else None,
            'size_mb': round(os.path.getsize(path) / 1024 / 1024, 2) if exists else None
        }
    
    return jsonify({
        'success': True,
        'models': models_status,
        'models_directory': models_dir,
        'timestamp': datetime.utcnow().isoformat()
    })

@health_bp.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness check for Kubernetes."""
    # Check if at least one model is available
    eta = get_eta_predictor()
    
    if eta is not None:
        return jsonify({
            'ready': True,
            'timestamp': datetime.utcnow().isoformat()
        })
    else:
        return jsonify({
            'ready': False,
            'message': 'Services not initialized',
            'timestamp': datetime.utcnow().isoformat()
        }), 503
'''
    with open(routes_init, 'w') as f:
        f.write(placeholder_content)
    
    logger.info(f"Routes module created at {routes_init}") if 'logger' in dir() else print(f"Routes module created at {routes_init}")


# Application instance
app = None


def get_app() -> Flask:
    """Get or create the application instance."""
    global app
    if app is None:
        # Create routes placeholder
        create_routes_placeholder()
        app = create_app()
    return app


if __name__ == '__main__':
    # Create and run the application
    create_routes_placeholder()
    application = create_app()
    
    host = application.config.get('HOST', '0.0.0.0')
    port = application.config.get('PORT', 5001)
    debug = application.config.get('DEBUG', False)
    
    application.logger.info(f"Starting ML Service on {host}:{port}")
    application.run(host=host, port=port, debug=debug)
