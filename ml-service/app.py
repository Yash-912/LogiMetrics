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
    
    if not os.path.exists(routes_init):
        # Create placeholder blueprints
        placeholder_content = '''"""
ML Service Routes
API route blueprints for ML predictions.
"""

from flask import Blueprint, jsonify
from datetime import datetime

# ETA Prediction Routes
eta_bp = Blueprint('eta', __name__)

@eta_bp.route('/predict', methods=['POST'])
def predict_eta():
    """Predict delivery ETA."""
    return jsonify({
        'success': True,
        'message': 'ETA prediction endpoint - implementation pending',
        'timestamp': datetime.utcnow().isoformat()
    })

# Demand Forecasting Routes
demand_bp = Blueprint('demand', __name__)

@demand_bp.route('/forecast', methods=['POST'])
def forecast_demand():
    """Forecast demand."""
    return jsonify({
        'success': True,
        'message': 'Demand forecast endpoint - implementation pending',
        'timestamp': datetime.utcnow().isoformat()
    })

# Route Optimization Routes
route_bp = Blueprint('routes', __name__)

@route_bp.route('/optimize', methods=['POST'])
def optimize_routes():
    """Optimize delivery routes."""
    return jsonify({
        'success': True,
        'message': 'Route optimization endpoint - implementation pending',
        'timestamp': datetime.utcnow().isoformat()
    })

# Anomaly Detection Routes
anomaly_bp = Blueprint('anomaly', __name__)

@anomaly_bp.route('/detect', methods=['POST'])
def detect_anomaly():
    """Detect anomalies in transactions."""
    return jsonify({
        'success': True,
        'message': 'Anomaly detection endpoint - implementation pending',
        'timestamp': datetime.utcnow().isoformat()
    })

# Price Optimization Routes
price_bp = Blueprint('pricing', __name__)

@price_bp.route('/optimize', methods=['POST'])
def optimize_price():
    """Optimize pricing."""
    return jsonify({
        'success': True,
        'message': 'Price optimization endpoint - implementation pending',
        'timestamp': datetime.utcnow().isoformat()
    })

# Health Routes
health_bp = Blueprint('health', __name__)

@health_bp.route('/', methods=['GET'])
def health_check():
    """Detailed health check."""
    return jsonify({
        'status': 'healthy',
        'services': {
            'eta_predictor': 'available',
            'demand_forecaster': 'available',
            'route_optimizer': 'available',
            'anomaly_detector': 'available',
            'price_optimizer': 'available'
        },
        'timestamp': datetime.utcnow().isoformat()
    })

@health_bp.route('/models', methods=['GET'])
def model_status():
    """Get status of loaded models."""
    return jsonify({
        'success': True,
        'models': {
            'eta_model': {'loaded': False, 'version': None},
            'demand_model': {'loaded': False, 'version': None},
            'anomaly_model': {'loaded': False, 'version': None},
            'price_model': {'loaded': False, 'version': None}
        },
        'timestamp': datetime.utcnow().isoformat()
    })
'''
        with open(routes_init, 'w') as f:
            f.write(placeholder_content)


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
