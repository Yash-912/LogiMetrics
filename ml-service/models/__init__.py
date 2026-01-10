"""
ML Models Package
Contains trained model files and training utilities.

Model Files:
- eta_model.pkl: ETA prediction model (Random Forest)
- demand_model.pkl: Demand forecasting model (Gradient Boosting)
- anomaly_model.pkl: Anomaly detection model (Isolation Forest)

Training:
    python -m models.train_models

Loading Models:
    import joblib
    eta_model = joblib.load('models/eta_model.pkl')
"""

import os
import joblib
from typing import Dict, Any, Optional

MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

# Model file paths
ETA_MODEL_PATH = os.path.join(MODELS_DIR, 'eta_model.pkl')
DEMAND_MODEL_PATH = os.path.join(MODELS_DIR, 'demand_model.pkl')
ANOMALY_MODEL_PATH = os.path.join(MODELS_DIR, 'anomaly_model.pkl')


def load_model(model_name: str) -> Optional[Dict[str, Any]]:
    """
    Load a trained model by name.
    
    Args:
        model_name: One of 'eta', 'demand', 'anomaly'
        
    Returns:
        Model data dictionary or None if not found
    """
    paths = {
        'eta': ETA_MODEL_PATH,
        'demand': DEMAND_MODEL_PATH,
        'anomaly': ANOMALY_MODEL_PATH
    }
    
    model_path = paths.get(model_name)
    if model_path and os.path.exists(model_path):
        return joblib.load(model_path)
    return None


def get_model_info(model_name: str) -> Optional[Dict[str, Any]]:
    """
    Get metadata about a trained model.
    
    Args:
        model_name: One of 'eta', 'demand', 'anomaly'
        
    Returns:
        Model info dictionary or None if not found
    """
    model_data = load_model(model_name)
    if model_data:
        return {
            'model_version': model_data.get('model_version', 'unknown'),
            'trained_at': model_data.get('trained_at', 'unknown'),
            'metrics': model_data.get('metrics', {}),
            'feature_columns': model_data.get('feature_columns', [])
        }
    return None


def list_available_models() -> Dict[str, bool]:
    """
    List available trained models.
    
    Returns:
        Dictionary mapping model names to availability status
    """
    return {
        'eta': os.path.exists(ETA_MODEL_PATH),
        'demand': os.path.exists(DEMAND_MODEL_PATH),
        'anomaly': os.path.exists(ANOMALY_MODEL_PATH)
    }


__all__ = [
    'load_model',
    'get_model_info',
    'list_available_models',
    'ETA_MODEL_PATH',
    'DEMAND_MODEL_PATH',
    'ANOMALY_MODEL_PATH'
]
