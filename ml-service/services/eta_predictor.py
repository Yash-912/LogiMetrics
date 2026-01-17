"""
ETA Predictor Service
Predicts delivery times using historical shipment data and machine learning.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

logger = logging.getLogger(__name__)


class ETAPredictor:
    """
    Machine learning-based ETA (Estimated Time of Arrival) predictor.
    
    Uses historical shipment data to predict delivery times based on:
    - Distance and route characteristics
    - Vehicle type and capacity
    - Traffic patterns (time of day, day of week)
    - Weather conditions
    - Package weight and dimensions
    - Origin/destination zones
    """
    
    # Feature columns used for prediction
    FEATURE_COLUMNS = [
        'distance_km',
        'weight_kg',
        'volume_cbm',
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'is_rush_hour',
        'weather_score',
        'traffic_factor',
        'vehicle_type_encoded',
        'origin_zone_encoded',
        'destination_zone_encoded',
        'num_stops',
        'is_express',
        'is_fragile'
    ]
    
    def __init__(self, model_path: Optional[str] = None, config: Optional[Any] = None):
        """
        Initialize the ETA predictor.
        
        Args:
            model_path: Path to load/save the trained model
            config: Configuration object with model settings
        """
        self.model_path = model_path
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.model_version = "1.0.0"
        self.feature_importance = {}
        
        # Default buffer time (in minutes)
        self.buffer_minutes = 15
        if config:
            self.buffer_minutes = getattr(config, 'ETA_DEFAULT_BUFFER_MINUTES', 15)
        
        # Load existing model if path provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare and engineer features from raw shipment data.
        
        Args:
            data: Raw shipment data DataFrame
            
        Returns:
            Prepared features DataFrame
        """
        df = data.copy()
        
        # Extract time-based features
        if 'pickup_time' in df.columns:
            df['pickup_datetime'] = pd.to_datetime(df['pickup_time'])
            df['hour_of_day'] = df['pickup_datetime'].dt.hour
            df['day_of_week'] = df['pickup_datetime'].dt.dayofweek
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            df['is_rush_hour'] = df['hour_of_day'].isin([7, 8, 9, 17, 18, 19]).astype(int)
        else:
            # Use current time if not provided
            now = datetime.now()
            df['hour_of_day'] = df.get('hour_of_day', now.hour)
            df['day_of_week'] = df.get('day_of_week', now.weekday())
            df['is_weekend'] = df.get('is_weekend', int(now.weekday() in [5, 6]))
            df['is_rush_hour'] = df.get('is_rush_hour', int(now.hour in [7, 8, 9, 17, 18, 19]))
        
        # Set default values for missing columns
        defaults = {
            'distance_km': 10.0,
            'weight_kg': 5.0,
            'volume_cbm': 0.1,
            'weather_score': 1.0,  # 1.0 = good weather, 0.5 = bad weather
            'traffic_factor': 1.0,  # 1.0 = normal, 1.5 = heavy traffic
            'num_stops': 1,
            'is_express': 0,
            'is_fragile': 0
        }
        
        for col, default_val in defaults.items():
            if col not in df.columns:
                df[col] = default_val
        
        # Encode categorical variables
        categorical_cols = ['vehicle_type', 'origin_zone', 'destination_zone']
        for col in categorical_cols:
            encoded_col = f'{col}_encoded'
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    # Fit on all unique values including 'unknown'
                    unique_vals = list(df[col].unique()) + ['unknown']
                    self.label_encoders[col].fit(unique_vals)
                
                # Handle unknown values
                known_classes = set(self.label_encoders[col].classes_)
                df[col] = df[col].apply(lambda x: x if x in known_classes else 'unknown')
                df[encoded_col] = self.label_encoders[col].transform(df[col])
            else:
                df[encoded_col] = 0
        
        return df
    
    def train(
        self,
        training_data: pd.DataFrame,
        target_column: str = 'actual_duration_minutes',
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, float]:
        """
        Train the ETA prediction model.
        
        Args:
            training_data: Historical shipment data with actual durations
            target_column: Name of the target column (actual delivery time)
            test_size: Proportion of data to use for testing
            random_state: Random seed for reproducibility
            
        Returns:
            Dictionary containing training metrics
        """
        logger.info(f"Training ETA model with {len(training_data)} samples")
        
        # Prepare features
        df = self._prepare_features(training_data)
        
        # Select features that exist
        available_features = [col for col in self.FEATURE_COLUMNS if col in df.columns]
        X = df[available_features]
        y = df[target_column]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Random Forest model
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=random_state,
            n_jobs=-1
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Calculate metrics
        y_pred = self.model.predict(X_test_scaled)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'r2': r2_score(y_test, y_pred),
            'samples_trained': len(X_train),
            'samples_tested': len(X_test),
            'features_used': available_features
        }
        
        # Store feature importance
        self.feature_importance = dict(zip(available_features, self.model.feature_importances_))
        metrics['feature_importance'] = self.feature_importance
        
        self.is_trained = True
        logger.info(f"Model trained successfully. MAE: {metrics['mae']:.2f} minutes")
        
        return metrics
    
    def predict(
        self,
        shipment_data: Dict[str, Any],
        include_confidence: bool = True
    ) -> Dict[str, Any]:
        """
        Predict ETA for a single shipment.
        
        Args:
            shipment_data: Shipment details for prediction
            include_confidence: Whether to include confidence intervals
            
        Returns:
            Prediction result with ETA and optional confidence
        """
        if not self.is_trained and self.model is None:
            # Use heuristic prediction if model not trained
            return self._heuristic_predict(shipment_data)
        
        # Convert to DataFrame
        df = pd.DataFrame([shipment_data])
        df = self._prepare_features(df)
        
        # Select available features
        available_features = [col for col in self.FEATURE_COLUMNS if col in df.columns]
        X = df[available_features]
        
        # Scale and predict
        X_scaled = self.scaler.transform(X)
        predicted_minutes = self.model.predict(X_scaled)[0]
        
        # Add buffer time
        total_minutes = predicted_minutes + self.buffer_minutes
        
        result = {
            'predicted_duration_minutes': round(predicted_minutes, 1),
            'buffer_minutes': self.buffer_minutes,
            'total_duration_minutes': round(total_minutes, 1),
            'model_version': self.model_version
        }
        
        # Calculate confidence interval using prediction variance from tree ensemble
        if include_confidence:
            predictions = np.array([tree.predict(X_scaled)[0] 
                                   for tree in self.model.estimators_])
            std = predictions.std()
            result['confidence'] = {
                'lower_bound_minutes': round(max(0, predicted_minutes - 1.96 * std), 1),
                'upper_bound_minutes': round(predicted_minutes + 1.96 * std, 1),
                'std_minutes': round(std, 1),
                'confidence_level': 0.95
            }
        
        # Calculate estimated arrival time
        pickup_time = shipment_data.get('pickup_time')
        if pickup_time:
            if isinstance(pickup_time, str):
                pickup_time = datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
            result['estimated_arrival'] = (
                pickup_time + timedelta(minutes=total_minutes)
            ).isoformat()
        
        return result
    
    def predict_batch(
        self,
        shipments: List[Dict[str, Any]],
        include_confidence: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Predict ETAs for multiple shipments.
        
        Args:
            shipments: List of shipment data dictionaries
            include_confidence: Whether to include confidence intervals
            
        Returns:
            List of prediction results
        """
        if not self.is_trained and self.model is None:
            return [self._heuristic_predict(s) for s in shipments]
        
        df = pd.DataFrame(shipments)
        df = self._prepare_features(df)
        
        available_features = [col for col in self.FEATURE_COLUMNS if col in df.columns]
        X = df[available_features]
        X_scaled = self.scaler.transform(X)
        
        predictions = self.model.predict(X_scaled)
        
        results = []
        for i, (pred, shipment) in enumerate(zip(predictions, shipments)):
            result = {
                'shipment_id': shipment.get('shipment_id', i),
                'predicted_duration_minutes': round(pred, 1),
                'buffer_minutes': self.buffer_minutes,
                'total_duration_minutes': round(pred + self.buffer_minutes, 1),
                'model_version': self.model_version
            }
            
            pickup_time = shipment.get('pickup_time')
            if pickup_time:
                if isinstance(pickup_time, str):
                    pickup_time = datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
                result['estimated_arrival'] = (
                    pickup_time + timedelta(minutes=pred + self.buffer_minutes)
                ).isoformat()
            
            results.append(result)
        
        return results
    
    def _heuristic_predict(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback heuristic prediction when model is not trained.
        
        Args:
            shipment_data: Shipment details
            
        Returns:
            Heuristic-based ETA prediction
        """
        distance_km = shipment_data.get('distance_km', 10)
        weight_kg = shipment_data.get('weight_kg', 5)
        is_express = shipment_data.get('is_express', False)
        traffic_factor = shipment_data.get('traffic_factor', 1.0)
        
        # Base calculation: assume 40 km/h average speed in urban areas
        base_time = (distance_km / 40) * 60  # Convert to minutes
        
        # Add loading/unloading time based on weight
        handling_time = 10 + (weight_kg / 10) * 2
        
        # Apply traffic factor
        base_time *= traffic_factor
        
        # Express shipments are faster
        if is_express:
            base_time *= 0.8
        
        total_time = base_time + handling_time + self.buffer_minutes
        
        result = {
            'predicted_duration_minutes': round(base_time + handling_time, 1),
            'buffer_minutes': self.buffer_minutes,
            'total_duration_minutes': round(total_time, 1),
            'model_version': 'heuristic',
            'confidence': {
                'lower_bound_minutes': round(total_time * 0.7, 1),
                'upper_bound_minutes': round(total_time * 1.5, 1),
                'confidence_level': 0.7
            }
        }
        
        pickup_time = shipment_data.get('pickup_time')
        if pickup_time:
            if isinstance(pickup_time, str):
                pickup_time = datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
            result['estimated_arrival'] = (
                pickup_time + timedelta(minutes=total_time)
            ).isoformat()
        
        return result
    
    def save_model(self, path: Optional[str] = None) -> str:
        """
        Save the trained model to disk.
        
        Args:
            path: Path to save the model (uses default if not provided)
            
        Returns:
            Path where model was saved
        """
        save_path = path or self.model_path
        if not save_path:
            raise ValueError("No model path specified")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'model_version': self.model_version,
            'feature_importance': self.feature_importance,
            'buffer_minutes': self.buffer_minutes,
            'is_trained': self.is_trained,
            'saved_at': datetime.now().isoformat()
        }
        
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        joblib.dump(model_data, save_path)
        logger.info(f"Model saved to {save_path}")
        
        return save_path
    
    def load_model(self, path: Optional[str] = None) -> bool:
        """
        Load a trained model from disk.
        
        Args:
            path: Path to load the model from
            
        Returns:
            True if model loaded successfully
        """
        load_path = path or self.model_path
        if not load_path or not os.path.exists(load_path):
            logger.warning(f"Model file not found: {load_path}")
            return False
        
        try:
            model_data = joblib.load(load_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoders = model_data.get('label_encoders', {})
            self.model_version = model_data.get('model_version', '1.0.0')
            self.feature_importance = model_data.get('feature_importance', {})
            self.buffer_minutes = model_data.get('buffer_minutes', 15)
            self.is_trained = model_data.get('is_trained', True)
            
            logger.info(f"Model loaded from {load_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance from the trained model.
        
        Returns:
            Dictionary mapping feature names to importance scores
        """
        if not self.feature_importance:
            logger.warning("No feature importance available. Train the model first.")
            return {}
        
        return dict(sorted(
            self.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model metadata
        """
        return {
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'model_type': type(self.model).__name__ if self.model else None,
            'buffer_minutes': self.buffer_minutes,
            'feature_count': len(self.FEATURE_COLUMNS),
            'feature_importance': self.get_feature_importance()
        }


# Convenience function for quick predictions
def predict_eta(
    distance_km: float,
    weight_kg: float = 5.0,
    pickup_time: Optional[datetime] = None,
    is_express: bool = False,
    traffic_factor: float = 1.0,
    model_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Quick ETA prediction without managing predictor instance.
    
    Args:
        distance_km: Distance in kilometers
        weight_kg: Package weight in kg
        pickup_time: Scheduled pickup time
        is_express: Whether express delivery
        traffic_factor: Traffic multiplier (1.0 = normal)
        model_path: Optional path to trained model
        
    Returns:
        ETA prediction result
    """
    predictor = ETAPredictor(model_path=model_path)
    
    shipment_data = {
        'distance_km': distance_km,
        'weight_kg': weight_kg,
        'pickup_time': pickup_time or datetime.now(),
        'is_express': int(is_express),
        'traffic_factor': traffic_factor
    }
    
    return predictor.predict(shipment_data)
