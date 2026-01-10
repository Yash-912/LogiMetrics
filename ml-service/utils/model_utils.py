"""
Model Utilities
Model loading, saving, and evaluation utilities for ML models in LogiMetrics.
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score
)
from sklearn.model_selection import cross_val_score, KFold, TimeSeriesSplit

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Model management utility for saving, loading, and versioning ML models.
    
    Handles:
    - Model serialization/deserialization
    - Version tracking
    - Metadata management
    - Model validation
    """
    
    def __init__(self, model_dir: Optional[str] = None, config: Optional[Any] = None):
        """
        Initialize the model manager.
        
        Args:
            model_dir: Directory for storing models
            config: Configuration object
        """
        self.model_dir = model_dir or os.path.join(os.path.dirname(__file__), '..', 'models')
        self.config = config
        self.loaded_models = {}
        
        # Ensure model directory exists
        os.makedirs(self.model_dir, exist_ok=True)
        
    def save_model(
        self,
        model: Any,
        model_name: str,
        metadata: Optional[Dict[str, Any]] = None,
        scaler: Optional[Any] = None,
        feature_columns: Optional[List[str]] = None,
        version: Optional[str] = None
    ) -> str:
        """
        Save a trained model with metadata.
        
        Args:
            model: Trained model object
            model_name: Name for the model file (without extension)
            metadata: Additional metadata to store
            scaler: Optional scaler object used with the model
            feature_columns: List of feature column names
            version: Model version string
            
        Returns:
            Path to saved model file
        """
        version = version or datetime.now().strftime('%Y%m%d_%H%M%S')
        
        model_data = {
            'model': model,
            'model_name': model_name,
            'model_version': version,
            'saved_at': datetime.now().isoformat(),
            'scaler': scaler,
            'feature_columns': feature_columns or [],
            'metadata': metadata or {}
        }
        
        # Add model type info
        model_data['model_type'] = type(model).__name__
        
        # Generate filename
        filename = f"{model_name}.pkl"
        filepath = os.path.join(self.model_dir, filename)
        
        # Save model
        joblib.dump(model_data, filepath)
        
        logger.info(f"Model saved: {filepath} (version: {version})")
        return filepath
    
    def load_model(
        self,
        model_name: str,
        version: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load a model from disk.
        
        Args:
            model_name: Name of the model to load
            version: Specific version to load (None = latest)
            
        Returns:
            Model data dictionary or None if not found
        """
        # Check if already loaded
        cache_key = f"{model_name}_{version or 'latest'}"
        if cache_key in self.loaded_models:
            logger.debug(f"Returning cached model: {model_name}")
            return self.loaded_models[cache_key]
        
        # Construct filepath
        filename = f"{model_name}.pkl"
        filepath = os.path.join(self.model_dir, filename)
        
        if not os.path.exists(filepath):
            logger.warning(f"Model not found: {filepath}")
            return None
        
        try:
            model_data = joblib.load(filepath)
            
            # Validate model data
            if 'model' not in model_data:
                logger.error(f"Invalid model file: {filepath}")
                return None
            
            # Cache loaded model
            self.loaded_models[cache_key] = model_data
            
            logger.info(f"Model loaded: {model_name} (version: {model_data.get('model_version', 'unknown')})")
            return model_data
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            return None
    
    def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata about a saved model without loading the full model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Model info dictionary or None if not found
        """
        model_data = self.load_model(model_name)
        if not model_data:
            return None
        
        return {
            'model_name': model_data.get('model_name'),
            'model_version': model_data.get('model_version'),
            'model_type': model_data.get('model_type'),
            'saved_at': model_data.get('saved_at'),
            'feature_columns': model_data.get('feature_columns', []),
            'metadata': model_data.get('metadata', {})
        }
    
    def list_models(self) -> List[Dict[str, Any]]:
        """
        List all available models in the model directory.
        
        Returns:
            List of model info dictionaries
        """
        models = []
        
        for filename in os.listdir(self.model_dir):
            if filename.endswith('.pkl'):
                model_name = filename[:-4]  # Remove .pkl extension
                info = self.get_model_info(model_name)
                if info:
                    info['filename'] = filename
                    models.append(info)
        
        return models
    
    def delete_model(self, model_name: str) -> bool:
        """
        Delete a model from disk.
        
        Args:
            model_name: Name of the model to delete
            
        Returns:
            True if deleted successfully
        """
        filename = f"{model_name}.pkl"
        filepath = os.path.join(self.model_dir, filename)
        
        if os.path.exists(filepath):
            os.remove(filepath)
            
            # Remove from cache
            for key in list(self.loaded_models.keys()):
                if key.startswith(model_name):
                    del self.loaded_models[key]
            
            logger.info(f"Model deleted: {model_name}")
            return True
        
        return False


def evaluate_regression_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str = 'model'
) -> Dict[str, float]:
    """
    Evaluate a regression model with common metrics.
    
    Args:
        y_true: True target values
        y_pred: Predicted values
        model_name: Name for logging
        
    Returns:
        Dictionary of metric names to values
    """
    metrics = {
        'mae': mean_absolute_error(y_true, y_pred),
        'mse': mean_squared_error(y_true, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
        'r2': r2_score(y_true, y_pred),
        'mape': np.mean(np.abs((y_true - y_pred) / (y_true + 1e-10))) * 100
    }
    
    # Additional metrics
    metrics['max_error'] = np.max(np.abs(y_true - y_pred))
    metrics['median_absolute_error'] = np.median(np.abs(y_true - y_pred))
    
    logger.info(f"{model_name} Regression Metrics: MAE={metrics['mae']:.4f}, RMSE={metrics['rmse']:.4f}, R²={metrics['r2']:.4f}")
    return metrics


def evaluate_classification_model(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_proba: Optional[np.ndarray] = None,
    model_name: str = 'model',
    labels: Optional[List] = None
) -> Dict[str, Any]:
    """
    Evaluate a classification model with common metrics.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_proba: Predicted probabilities (optional)
        model_name: Name for logging
        labels: Class labels for confusion matrix
        
    Returns:
        Dictionary of metric names to values
    """
    metrics = {
        'accuracy': accuracy_score(y_true, y_pred),
        'precision': precision_score(y_true, y_pred, average='weighted', zero_division=0),
        'recall': recall_score(y_true, y_pred, average='weighted', zero_division=0),
        'f1_score': f1_score(y_true, y_pred, average='weighted', zero_division=0),
        'confusion_matrix': confusion_matrix(y_true, y_pred, labels=labels).tolist()
    }
    
    # Add AUC if probabilities provided
    if y_proba is not None:
        try:
            if len(np.unique(y_true)) == 2:
                # Binary classification
                metrics['roc_auc'] = roc_auc_score(y_true, y_proba[:, 1] if y_proba.ndim > 1 else y_proba)
            else:
                # Multiclass
                metrics['roc_auc'] = roc_auc_score(y_true, y_proba, multi_class='ovr')
        except Exception as e:
            logger.warning(f"Could not calculate ROC-AUC: {e}")
    
    # Classification report as dict
    metrics['classification_report'] = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    
    logger.info(f"{model_name} Classification Metrics: Accuracy={metrics['accuracy']:.4f}, F1={metrics['f1_score']:.4f}")
    return metrics


def cross_validate_model(
    model: Any,
    X: np.ndarray,
    y: np.ndarray,
    cv: int = 5,
    scoring: str = 'neg_mean_absolute_error',
    is_time_series: bool = False
) -> Dict[str, Any]:
    """
    Perform cross-validation on a model.
    
    Args:
        model: Model to validate (must have fit/predict methods)
        X: Feature matrix
        y: Target values
        cv: Number of cross-validation folds
        scoring: Scoring metric
        is_time_series: Use TimeSeriesSplit instead of KFold
        
    Returns:
        Cross-validation results dictionary
    """
    if is_time_series:
        cv_splitter = TimeSeriesSplit(n_splits=cv)
    else:
        cv_splitter = KFold(n_splits=cv, shuffle=True, random_state=42)
    
    scores = cross_val_score(model, X, y, cv=cv_splitter, scoring=scoring)
    
    results = {
        'scores': scores.tolist(),
        'mean_score': float(np.mean(scores)),
        'std_score': float(np.std(scores)),
        'cv_folds': cv,
        'scoring': scoring
    }
    
    # Convert negative scores if applicable
    if scoring.startswith('neg_'):
        results['mean_score_abs'] = float(-np.mean(scores))
        results['std_score_abs'] = float(np.std(scores))
    
    logger.info(f"Cross-validation ({cv} folds): {results['mean_score']:.4f} (+/- {results['std_score']:.4f})")
    return results


def get_feature_importance(
    model: Any,
    feature_names: List[str],
    top_n: int = 10
) -> Dict[str, float]:
    """
    Extract feature importance from a model.
    
    Args:
        model: Trained model with feature_importances_ attribute
        feature_names: List of feature names
        top_n: Number of top features to return
        
    Returns:
        Dictionary mapping feature names to importance scores
    """
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
    elif hasattr(model, 'coef_'):
        importances = np.abs(model.coef_).flatten()
    else:
        logger.warning("Model does not have feature_importances_ or coef_ attribute")
        return {}
    
    if len(importances) != len(feature_names):
        logger.warning(f"Mismatch: {len(importances)} importances vs {len(feature_names)} features")
        return {}
    
    importance_dict = dict(zip(feature_names, importances))
    
    # Sort by importance
    sorted_importance = dict(
        sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)[:top_n]
    )
    
    return sorted_importance


def predict_with_confidence(
    model: Any,
    X: np.ndarray,
    confidence_method: str = 'std'
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Make predictions with confidence intervals.
    
    Args:
        model: Trained model
        X: Feature matrix
        confidence_method: Method to estimate confidence ('std' for tree ensembles)
        
    Returns:
        Tuple of (predictions, confidence_scores)
    """
    predictions = model.predict(X)
    
    # For ensemble models, use individual tree predictions for confidence
    if hasattr(model, 'estimators_'):
        # Get predictions from all estimators
        if hasattr(model, 'n_estimators'):
            all_predictions = np.array([
                tree.predict(X) for tree in model.estimators_
            ])
            
            # Confidence based on agreement (lower std = higher confidence)
            prediction_std = np.std(all_predictions, axis=0)
            max_std = np.max(prediction_std) if np.max(prediction_std) > 0 else 1
            confidence = 1 - (prediction_std / max_std)
        else:
            confidence = np.ones(len(predictions))
    else:
        # Default confidence of 1.0 for non-ensemble models
        confidence = np.ones(len(predictions))
    
    return predictions, confidence


class ModelRegistry:
    """
    Registry for managing multiple models and their versions.
    """
    
    def __init__(self, config: Optional[Any] = None):
        """
        Initialize the model registry.
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.models = {}
        self.model_managers = {}
        
    def register_model(
        self,
        model_name: str,
        model: Any,
        version: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Register a model in the registry.
        
        Args:
            model_name: Unique name for the model
            model: Model object
            version: Version string
            metadata: Optional metadata
        """
        if model_name not in self.models:
            self.models[model_name] = {}
        
        self.models[model_name][version] = {
            'model': model,
            'registered_at': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        logger.info(f"Registered model: {model_name} v{version}")
    
    def get_model(
        self,
        model_name: str,
        version: Optional[str] = None
    ) -> Optional[Any]:
        """
        Retrieve a model from the registry.
        
        Args:
            model_name: Name of the model
            version: Specific version (None = latest)
            
        Returns:
            Model object or None
        """
        if model_name not in self.models:
            return None
        
        versions = self.models[model_name]
        
        if version:
            return versions.get(version, {}).get('model')
        
        # Return latest version
        if versions:
            latest = max(versions.keys())
            return versions[latest].get('model')
        
        return None
    
    def list_versions(self, model_name: str) -> List[str]:
        """
        List all versions of a model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            List of version strings
        """
        if model_name not in self.models:
            return []
        
        return sorted(self.models[model_name].keys())


def compare_models(
    models: Dict[str, Any],
    X_test: np.ndarray,
    y_test: np.ndarray,
    task_type: str = 'regression'
) -> pd.DataFrame:
    """
    Compare multiple models on the same test data.
    
    Args:
        models: Dictionary mapping model names to model objects
        X_test: Test features
        y_test: Test targets
        task_type: 'regression' or 'classification'
        
    Returns:
        DataFrame with comparison results
    """
    results = []
    
    for name, model in models.items():
        try:
            y_pred = model.predict(X_test)
            
            if task_type == 'regression':
                metrics = evaluate_regression_model(y_test, y_pred, name)
            else:
                metrics = evaluate_classification_model(y_test, y_pred, model_name=name)
            
            metrics['model_name'] = name
            results.append(metrics)
            
        except Exception as e:
            logger.error(f"Error evaluating model {name}: {e}")
    
    if results:
        df = pd.DataFrame(results)
        df = df.set_index('model_name')
        return df
    
    return pd.DataFrame()
