"""
Anomaly Detector Service
Fraud and anomaly detection in logistics transactions using machine learning.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neighbors import LocalOutlierFactor
import joblib

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Machine learning-based anomaly detector for fraud detection.
    
    Detects anomalies in:
    - Transaction amounts and patterns
    - Shipment weight/dimensions inconsistencies
    - Unusual route deviations
    - Suspicious timing patterns
    - Geographic anomalies
    """
    
    # Feature columns for anomaly detection
    FEATURE_COLUMNS = [
        'amount',
        'amount_zscore',
        'transaction_count_24h',
        'avg_amount_7d',
        'std_amount_7d',
        'hour_of_day',
        'day_of_week',
        'is_weekend',
        'is_night',
        'distance_km',
        'weight_kg',
        'price_per_kg',
        'price_per_km',
        'days_since_last_transaction',
        'customer_tenure_days',
        'is_new_customer',
        'is_new_route',
        'location_risk_score'
    ]
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        config: Optional[Any] = None,
        contamination: float = 0.1
    ):
        """
        Initialize the anomaly detector.
        
        Args:
            model_path: Path to load/save the trained model
            config: Configuration object with model settings
            contamination: Expected proportion of outliers in data
        """
        self.model_path = model_path
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.model_version = "1.0.0"
        self.feature_columns = []
        self.threshold = 0.5
        
        # Contamination (expected outlier ratio)
        self.contamination = contamination
        if config:
            self.contamination = getattr(config, 'ANOMALY_CONTAMINATION', 0.1)
            self.threshold = getattr(config, 'ANOMALY_THRESHOLD', 0.5)
        
        # Load existing model if path provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare and engineer features from transaction data.
        
        Args:
            data: Raw transaction data DataFrame
            
        Returns:
            Prepared features DataFrame
        """
        df = data.copy()
        
        # Time-based features
        if 'transaction_time' in df.columns:
            df['transaction_datetime'] = pd.to_datetime(df['transaction_time'])
            df['hour_of_day'] = df['transaction_datetime'].dt.hour
            df['day_of_week'] = df['transaction_datetime'].dt.dayofweek
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            df['is_night'] = df['hour_of_day'].isin(list(range(22, 24)) + list(range(0, 6))).astype(int)
        else:
            now = datetime.now()
            df['hour_of_day'] = df.get('hour_of_day', now.hour)
            df['day_of_week'] = df.get('day_of_week', now.weekday())
            df['is_weekend'] = df.get('is_weekend', int(now.weekday() in [5, 6]))
            df['is_night'] = df.get('is_night', int(now.hour in list(range(22, 24)) + list(range(0, 6))))
        
        # Amount statistics
        if 'amount' in df.columns:
            df['amount_zscore'] = (df['amount'] - df['amount'].mean()) / (df['amount'].std() + 1e-8)
        else:
            df['amount'] = 0
            df['amount_zscore'] = 0
        
        # Price ratios
        if 'weight_kg' in df.columns and df['weight_kg'].sum() > 0:
            df['price_per_kg'] = df['amount'] / (df['weight_kg'] + 1e-8)
        else:
            df['weight_kg'] = df.get('weight_kg', 1)
            df['price_per_kg'] = df['amount']
        
        if 'distance_km' in df.columns and df['distance_km'].sum() > 0:
            df['price_per_km'] = df['amount'] / (df['distance_km'] + 1e-8)
        else:
            df['distance_km'] = df.get('distance_km', 1)
            df['price_per_km'] = df['amount']
        
        # Customer features
        df['customer_tenure_days'] = df.get('customer_tenure_days', 30)
        df['is_new_customer'] = (df['customer_tenure_days'] < 30).astype(int)
        
        # Transaction history features (defaults if not available)
        df['transaction_count_24h'] = df.get('transaction_count_24h', 1)
        df['avg_amount_7d'] = df.get('avg_amount_7d', df['amount'])
        df['std_amount_7d'] = df.get('std_amount_7d', 0)
        df['days_since_last_transaction'] = df.get('days_since_last_transaction', 7)
        
        # Route/location features
        df['is_new_route'] = df.get('is_new_route', 0)
        df['location_risk_score'] = df.get('location_risk_score', 0.5)
        
        return df
    
    def train(
        self,
        training_data: pd.DataFrame,
        feature_columns: List[str] = None
    ) -> Dict[str, Any]:
        """
        Train the anomaly detection model.
        
        Args:
            training_data: Historical transaction data
            feature_columns: Optional list of feature columns to use
            
        Returns:
            Dictionary containing training metrics
        """
        logger.info(f"Training anomaly detection model with {len(training_data)} samples")
        
        # Prepare features
        df = self._prepare_features(training_data)
        
        # Determine which features to use
        if feature_columns:
            self.feature_columns = [col for col in feature_columns if col in df.columns]
        else:
            self.feature_columns = [col for col in self.FEATURE_COLUMNS if col in df.columns]
        
        if not self.feature_columns:
            raise ValueError("No valid feature columns found in training data")
        
        X = df[self.feature_columns].fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        self.model = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            max_samples='auto',
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled)
        
        # Get anomaly scores for training data
        scores = self.model.decision_function(X_scaled)
        predictions = self.model.predict(X_scaled)
        
        # Calculate metrics
        num_anomalies = (predictions == -1).sum()
        anomaly_ratio = num_anomalies / len(predictions)
        
        metrics = {
            'samples_trained': len(X),
            'feature_count': len(self.feature_columns),
            'features_used': self.feature_columns,
            'num_anomalies_detected': int(num_anomalies),
            'anomaly_ratio': float(anomaly_ratio),
            'score_mean': float(scores.mean()),
            'score_std': float(scores.std()),
            'score_min': float(scores.min()),
            'score_max': float(scores.max()),
            'contamination': self.contamination
        }
        
        self.is_trained = True
        logger.info(f"Anomaly model trained. Detected {num_anomalies} anomalies ({anomaly_ratio:.2%})")
        
        return metrics
    
    def detect(
        self,
        transaction: Dict[str, Any],
        return_details: bool = True
    ) -> Dict[str, Any]:
        """
        Detect if a single transaction is anomalous.
        
        Args:
            transaction: Transaction data dictionary
            return_details: Whether to include detailed scores
            
        Returns:
            Detection result with anomaly flag and scores
        """
        if not self.is_trained and self.model is None:
            return self._heuristic_detect(transaction)
        
        # Convert to DataFrame
        df = pd.DataFrame([transaction])
        df = self._prepare_features(df)
        
        # Select available features
        available_features = [col for col in self.feature_columns if col in df.columns]
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        X = df[self.feature_columns].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        # Get prediction and score
        prediction = self.model.predict(X_scaled)[0]
        anomaly_score = self.model.decision_function(X_scaled)[0]
        
        # Convert score to probability-like value (0-1, higher = more anomalous)
        # Isolation Forest scores are typically between -0.5 and 0.5
        normalized_score = 1 - (anomaly_score + 0.5)
        normalized_score = max(0, min(1, normalized_score))
        
        result = {
            'is_anomaly': bool(prediction == -1),
            'anomaly_score': round(float(normalized_score), 4),
            'risk_level': self._get_risk_level(normalized_score),
            'model_version': self.model_version
        }
        
        if return_details:
            # Identify contributing factors
            result['details'] = {
                'raw_score': round(float(anomaly_score), 4),
                'threshold': self.threshold,
                'features_analyzed': len(self.feature_columns)
            }
            
            # Feature contributions (simplified)
            if 'amount' in transaction:
                avg = df['avg_amount_7d'].iloc[0] if 'avg_amount_7d' in df.columns else transaction['amount']
                if avg > 0:
                    deviation = abs(transaction['amount'] - avg) / avg
                    if deviation > 0.5:
                        result['details']['amount_deviation'] = f"{deviation:.1%} from average"
        
        return result
    
    def detect_batch(
        self,
        transactions: List[Dict[str, Any]],
        return_summary: bool = True
    ) -> Dict[str, Any]:
        """
        Detect anomalies in multiple transactions.
        
        Args:
            transactions: List of transaction dictionaries
            return_summary: Whether to include summary statistics
            
        Returns:
            Detection results for all transactions
        """
        if not self.is_trained and self.model is None:
            results = [self._heuristic_detect(t) for t in transactions]
            return {'results': results, 'model_version': 'heuristic'}
        
        df = pd.DataFrame(transactions)
        df = self._prepare_features(df)
        
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        X = df[self.feature_columns].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        predictions = self.model.predict(X_scaled)
        scores = self.model.decision_function(X_scaled)
        
        results = []
        for i, (pred, score, trans) in enumerate(zip(predictions, scores, transactions)):
            normalized_score = 1 - (score + 0.5)
            normalized_score = max(0, min(1, normalized_score))
            
            results.append({
                'transaction_id': trans.get('transaction_id', i),
                'is_anomaly': bool(pred == -1),
                'anomaly_score': round(float(normalized_score), 4),
                'risk_level': self._get_risk_level(normalized_score)
            })
        
        response = {
            'results': results,
            'model_version': self.model_version
        }
        
        if return_summary:
            num_anomalies = sum(1 for r in results if r['is_anomaly'])
            response['summary'] = {
                'total_transactions': len(results),
                'anomalies_detected': num_anomalies,
                'anomaly_rate': round(num_anomalies / len(results), 4) if results else 0,
                'high_risk_count': sum(1 for r in results if r['risk_level'] == 'high'),
                'medium_risk_count': sum(1 for r in results if r['risk_level'] == 'medium')
            }
        
        return response
    
    def _heuristic_detect(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fallback heuristic detection when model is not trained.
        
        Args:
            transaction: Transaction data
            
        Returns:
            Heuristic-based detection result
        """
        risk_score = 0.0
        risk_factors = []
        
        # Check amount anomalies
        amount = transaction.get('amount', 0)
        avg_amount = transaction.get('avg_amount_7d', amount)
        
        if avg_amount > 0:
            deviation = abs(amount - avg_amount) / avg_amount
            if deviation > 2.0:
                risk_score += 0.4
                risk_factors.append('Amount significantly higher than average')
            elif deviation > 1.0:
                risk_score += 0.2
        
        # Check new customer risk
        if transaction.get('is_new_customer', False) or transaction.get('customer_tenure_days', 365) < 7:
            risk_score += 0.15
            risk_factors.append('New customer')
        
        # Check unusual timing
        hour = transaction.get('hour_of_day', datetime.now().hour)
        if hour in list(range(0, 6)):
            risk_score += 0.1
            risk_factors.append('Late night transaction')
        
        # Check high transaction frequency
        tx_count = transaction.get('transaction_count_24h', 1)
        if tx_count > 10:
            risk_score += 0.2
            risk_factors.append(f'High transaction frequency: {tx_count} in 24h')
        
        # Check new route
        if transaction.get('is_new_route', False):
            risk_score += 0.1
        
        # Check high-risk location
        location_risk = transaction.get('location_risk_score', 0.5)
        if location_risk > 0.7:
            risk_score += 0.15
        
        # Normalize score
        risk_score = min(1.0, risk_score)
        
        return {
            'is_anomaly': risk_score >= self.threshold,
            'anomaly_score': round(risk_score, 4),
            'risk_level': self._get_risk_level(risk_score),
            'risk_factors': risk_factors,
            'model_version': 'heuristic'
        }
    
    def _get_risk_level(self, score: float) -> str:
        """Convert anomaly score to risk level."""
        if score >= 0.7:
            return 'high'
        elif score >= 0.4:
            return 'medium'
        else:
            return 'low'
    
    def update_threshold(self, new_threshold: float) -> None:
        """Update the anomaly detection threshold."""
        if 0 < new_threshold < 1:
            self.threshold = new_threshold
            logger.info(f"Threshold updated to {new_threshold}")
        else:
            raise ValueError("Threshold must be between 0 and 1")
    
    def save_model(self, path: Optional[str] = None) -> str:
        """Save the trained model to disk."""
        save_path = path or self.model_path
        if not save_path:
            raise ValueError("No model path specified")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'model_version': self.model_version,
            'contamination': self.contamination,
            'threshold': self.threshold,
            'is_trained': self.is_trained,
            'saved_at': datetime.now().isoformat()
        }
        
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        joblib.dump(model_data, save_path)
        logger.info(f"Model saved to {save_path}")
        
        return save_path
    
    def load_model(self, path: Optional[str] = None) -> bool:
        """Load a trained model from disk."""
        load_path = path or self.model_path
        if not load_path or not os.path.exists(load_path):
            logger.warning(f"Model file not found: {load_path}")
            return False
        
        try:
            model_data = joblib.load(load_path)
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_columns = model_data.get('feature_columns', [])
            self.model_version = model_data.get('model_version', '1.0.0')
            self.contamination = model_data.get('contamination', 0.1)
            self.threshold = model_data.get('threshold', 0.5)
            self.is_trained = model_data.get('is_trained', True)
            
            logger.info(f"Model loaded from {load_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model."""
        return {
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'model_type': type(self.model).__name__ if self.model else None,
            'contamination': self.contamination,
            'threshold': self.threshold,
            'feature_count': len(self.feature_columns),
            'features': self.feature_columns
        }


# Convenience function
def detect_anomaly(
    transaction: Dict[str, Any],
    model_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Quick anomaly detection without managing detector instance.
    
    Args:
        transaction: Transaction data dictionary
        model_path: Optional path to trained model
        
    Returns:
        Detection result with anomaly flag
    """
    detector = AnomalyDetector(model_path=model_path)
    return detector.detect(transaction)
