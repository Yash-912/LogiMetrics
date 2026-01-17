"""
LogiMetrics ML Utilities
Utility functions for data processing, feature engineering, and model management.
"""

from .data_processor import (
    DataProcessor,
    validate_coordinates,
    validate_shipment_data,
    sanitize_input,
    convert_to_dataframe
)

from .feature_engineering import (
    FeatureEngineer,
    haversine_distance,
    calculate_bearing,
    get_direction,
    encode_cyclical,
    INDIAN_HOLIDAYS
)

from .model_utils import (
    ModelManager,
    ModelRegistry,
    evaluate_regression_model,
    evaluate_classification_model,
    cross_validate_model,
    get_feature_importance,
    predict_with_confidence,
    compare_models
)

__all__ = [
    # Data Processing
    'DataProcessor',
    'validate_coordinates',
    'validate_shipment_data',
    'sanitize_input',
    'convert_to_dataframe',
    
    # Feature Engineering
    'FeatureEngineer',
    'haversine_distance',
    'calculate_bearing',
    'get_direction',
    'encode_cyclical',
    'INDIAN_HOLIDAYS',
    
    # Model Utilities
    'ModelManager',
    'ModelRegistry',
    'evaluate_regression_model',
    'evaluate_classification_model',
    'cross_validate_model',
    'get_feature_importance',
    'predict_with_confidence',
    'compare_models',
]

__version__ = '1.0.0'
