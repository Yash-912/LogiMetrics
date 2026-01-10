"""
ETA Predictor Tests
Unit tests for the ETA prediction service.
"""

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.eta_predictor import ETAPredictor


class TestETAPredictorInit(unittest.TestCase):
    """Test ETAPredictor initialization."""
    
    def test_init_default(self):
        """Test default initialization."""
        predictor = ETAPredictor()
        
        self.assertIsNone(predictor.model_path)
        self.assertIsNone(predictor.model)
        self.assertFalse(predictor.is_trained)
        self.assertEqual(predictor.model_version, "1.0.0")
        self.assertEqual(predictor.buffer_minutes, 15)
    
    def test_init_with_config(self):
        """Test initialization with custom config."""
        config = Mock()
        config.ETA_DEFAULT_BUFFER_MINUTES = 30
        
        predictor = ETAPredictor(config=config)
        
        self.assertEqual(predictor.buffer_minutes, 30)
    
    def test_feature_columns_defined(self):
        """Test that feature columns are properly defined."""
        predictor = ETAPredictor()
        
        self.assertIsInstance(predictor.FEATURE_COLUMNS, list)
        self.assertIn('distance_km', predictor.FEATURE_COLUMNS)
        self.assertIn('weight_kg', predictor.FEATURE_COLUMNS)
        self.assertIn('hour_of_day', predictor.FEATURE_COLUMNS)
        self.assertIn('day_of_week', predictor.FEATURE_COLUMNS)


class TestETAPredictorFeaturePreparation(unittest.TestCase):
    """Test feature preparation methods."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.predictor = ETAPredictor()
        
        # Sample data
        self.sample_data = pd.DataFrame({
            'distance_km': [50, 100, 150],
            'weight_kg': [10, 25, 50],
            'volume_cbm': [0.5, 1.0, 2.0],
            'vehicle_type': ['truck', 'van', 'truck'],
            'origin_zone': ['north', 'south', 'east'],
            'destination_zone': ['south', 'north', 'west'],
            'pickup_time': [
                datetime.now(),
                datetime.now() + timedelta(hours=5),
                datetime.now() + timedelta(hours=10)
            ]
        })
    
    def test_prepare_features_adds_time_features(self):
        """Test that time features are extracted from pickup_time."""
        result = self.predictor._prepare_features(self.sample_data)
        
        self.assertIn('hour_of_day', result.columns)
        self.assertIn('day_of_week', result.columns)
        self.assertIn('is_weekend', result.columns)
        self.assertIn('is_rush_hour', result.columns)
    
    def test_prepare_features_encodes_categorical(self):
        """Test that categorical variables are encoded."""
        result = self.predictor._prepare_features(self.sample_data)
        
        self.assertIn('vehicle_type_encoded', result.columns)
        self.assertIn('origin_zone_encoded', result.columns)
        self.assertIn('destination_zone_encoded', result.columns)
    
    def test_prepare_features_handles_missing_columns(self):
        """Test that missing columns get default values."""
        minimal_data = pd.DataFrame({
            'distance_km': [50, 100]
        })
        
        result = self.predictor._prepare_features(minimal_data)
        
        # Should have default values for missing columns
        self.assertIn('weight_kg', result.columns)
        self.assertIn('weather_score', result.columns)
        self.assertIn('traffic_factor', result.columns)
    
    def test_prepare_features_preserves_original_data(self):
        """Test that original data is not modified."""
        original_len = len(self.sample_data)
        original_cols = list(self.sample_data.columns)
        
        _ = self.predictor._prepare_features(self.sample_data)
        
        self.assertEqual(len(self.sample_data), original_len)
        self.assertEqual(list(self.sample_data.columns), original_cols)


class TestETAPredictorTraining(unittest.TestCase):
    """Test model training functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.predictor = ETAPredictor()
        
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 100
        
        self.training_data = pd.DataFrame({
            'distance_km': np.random.uniform(10, 500, n_samples),
            'weight_kg': np.random.uniform(1, 100, n_samples),
            'volume_cbm': np.random.uniform(0.1, 5, n_samples),
            'hour_of_day': np.random.randint(0, 24, n_samples),
            'day_of_week': np.random.randint(0, 7, n_samples),
            'is_weekend': np.random.randint(0, 2, n_samples),
            'is_rush_hour': np.random.randint(0, 2, n_samples),
            'weather_score': np.random.uniform(0.5, 1.0, n_samples),
            'traffic_factor': np.random.uniform(0.8, 2.0, n_samples),
            'vehicle_type_encoded': np.random.randint(0, 3, n_samples),
            'origin_zone_encoded': np.random.randint(0, 10, n_samples),
            'destination_zone_encoded': np.random.randint(0, 10, n_samples),
            'num_stops': np.random.randint(1, 5, n_samples),
            'is_express': np.random.randint(0, 2, n_samples),
            'is_fragile': np.random.randint(0, 2, n_samples),
            'actual_duration_minutes': np.random.uniform(30, 600, n_samples)
        })
    
    def test_train_returns_metrics(self):
        """Test that training returns evaluation metrics."""
        metrics = self.predictor.train(self.training_data)
        
        self.assertIsInstance(metrics, dict)
        self.assertIn('mae', metrics)
        self.assertIn('rmse', metrics)
        self.assertIn('r2', metrics)
    
    def test_train_sets_model(self):
        """Test that training sets the model."""
        self.predictor.train(self.training_data)
        
        self.assertIsNotNone(self.predictor.model)
        self.assertTrue(self.predictor.is_trained)
    
    def test_train_sets_feature_importance(self):
        """Test that training sets feature importance."""
        self.predictor.train(self.training_data)
        
        self.assertIsInstance(self.predictor.feature_importance, dict)
        self.assertGreater(len(self.predictor.feature_importance), 0)


class TestETAPredictorPrediction(unittest.TestCase):
    """Test prediction functionality."""
    
    def setUp(self):
        """Set up test fixtures with trained model."""
        self.predictor = ETAPredictor()
        
        # Train with synthetic data
        np.random.seed(42)
        n_samples = 100
        
        training_data = pd.DataFrame({
            'distance_km': np.random.uniform(10, 500, n_samples),
            'weight_kg': np.random.uniform(1, 100, n_samples),
            'volume_cbm': np.random.uniform(0.1, 5, n_samples),
            'hour_of_day': np.random.randint(0, 24, n_samples),
            'day_of_week': np.random.randint(0, 7, n_samples),
            'is_weekend': np.random.randint(0, 2, n_samples),
            'is_rush_hour': np.random.randint(0, 2, n_samples),
            'weather_score': np.random.uniform(0.5, 1.0, n_samples),
            'traffic_factor': np.random.uniform(0.8, 2.0, n_samples),
            'vehicle_type_encoded': np.random.randint(0, 3, n_samples),
            'origin_zone_encoded': np.random.randint(0, 10, n_samples),
            'destination_zone_encoded': np.random.randint(0, 10, n_samples),
            'num_stops': np.random.randint(1, 5, n_samples),
            'is_express': np.random.randint(0, 2, n_samples),
            'is_fragile': np.random.randint(0, 2, n_samples),
            'actual_duration_minutes': np.random.uniform(30, 600, n_samples)
        })
        
        self.predictor.train(training_data)
    
    def test_predict_single_shipment(self):
        """Test prediction for a single shipment."""
        shipment = {
            'distance_km': 100,
            'weight_kg': 25,
            'origin': {'lat': 28.6139, 'lng': 77.2090},
            'destination': {'lat': 19.0760, 'lng': 72.8777}
        }
        
        result = self.predictor.predict(shipment)
        
        self.assertIsInstance(result, dict)
        self.assertIn('predicted_duration_minutes', result)
        self.assertIn('confidence', result)
        self.assertGreater(result['predicted_duration_minutes'], 0)
    
    def test_predict_returns_realistic_eta(self):
        """Test that predictions are within realistic bounds."""
        shipment = {
            'distance_km': 50,
            'weight_kg': 10
        }
        
        result = self.predictor.predict(shipment)
        
        # Should return a positive duration
        self.assertGreater(result['predicted_duration_minutes'], 0)
        self.assertLess(result['total_duration_minutes'], 1000)
    
    def test_predict_without_training_returns_fallback(self):
        """Test that prediction without training uses fallback."""
        untrained_predictor = ETAPredictor()
        
        shipment = {
            'distance_km': 100,
            'weight_kg': 25
        }
        
        result = untrained_predictor.predict(shipment)
        
        # Should still return a result using fallback calculation
        self.assertIsInstance(result, dict)
        self.assertIn('predicted_duration_minutes', result)


class TestETAPredictorBatchPrediction(unittest.TestCase):
    """Test batch prediction functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.predictor = ETAPredictor()
        
        # Quick training
        np.random.seed(42)
        n = 50
        training_data = pd.DataFrame({
            'distance_km': np.random.uniform(10, 500, n),
            'weight_kg': np.random.uniform(1, 100, n),
            'volume_cbm': np.random.uniform(0.1, 5, n),
            'hour_of_day': np.random.randint(0, 24, n),
            'day_of_week': np.random.randint(0, 7, n),
            'is_weekend': np.random.randint(0, 2, n),
            'is_rush_hour': np.random.randint(0, 2, n),
            'weather_score': np.random.uniform(0.5, 1.0, n),
            'traffic_factor': np.random.uniform(0.8, 2.0, n),
            'vehicle_type_encoded': np.random.randint(0, 3, n),
            'origin_zone_encoded': np.random.randint(0, 10, n),
            'destination_zone_encoded': np.random.randint(0, 10, n),
            'num_stops': np.random.randint(1, 5, n),
            'is_express': np.random.randint(0, 2, n),
            'is_fragile': np.random.randint(0, 2, n),
            'actual_duration_minutes': np.random.uniform(30, 600, n)
        })
        self.predictor.train(training_data)
    
    def test_multiple_predictions(self):
        """Test multiple sequential predictions."""
        shipments = [
            {'distance_km': 50, 'weight_kg': 10},
            {'distance_km': 100, 'weight_kg': 25},
            {'distance_km': 200, 'weight_kg': 50}
        ]
        
        results = [self.predictor.predict(s) for s in shipments]
        
        self.assertIsInstance(results, list)
        self.assertEqual(len(results), 3)
        
        for result in results:
            self.assertIn('predicted_duration_minutes', result)
            self.assertGreater(result['predicted_duration_minutes'], 0)


class TestETAPredictorModelPersistence(unittest.TestCase):
    """Test model save/load functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.predictor = ETAPredictor()
        self.test_dir = os.path.join(os.path.dirname(__file__), 'test_models')
        os.makedirs(self.test_dir, exist_ok=True)
        self.test_model_path = os.path.join(self.test_dir, 'test_eta_model.pkl')
        
        # Train model
        np.random.seed(42)
        n = 50
        training_data = pd.DataFrame({
            'distance_km': np.random.uniform(10, 500, n),
            'weight_kg': np.random.uniform(1, 100, n),
            'volume_cbm': np.random.uniform(0.1, 5, n),
            'hour_of_day': np.random.randint(0, 24, n),
            'day_of_week': np.random.randint(0, 7, n),
            'is_weekend': np.random.randint(0, 2, n),
            'is_rush_hour': np.random.randint(0, 2, n),
            'weather_score': np.random.uniform(0.5, 1.0, n),
            'traffic_factor': np.random.uniform(0.8, 2.0, n),
            'vehicle_type_encoded': np.random.randint(0, 3, n),
            'origin_zone_encoded': np.random.randint(0, 10, n),
            'destination_zone_encoded': np.random.randint(0, 10, n),
            'num_stops': np.random.randint(1, 5, n),
            'is_express': np.random.randint(0, 2, n),
            'is_fragile': np.random.randint(0, 2, n),
            'actual_duration_minutes': np.random.uniform(30, 600, n)
        })
        self.predictor.train(training_data)
    
    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.test_model_path):
            os.remove(self.test_model_path)
        if os.path.exists(self.test_dir) and not os.listdir(self.test_dir):
            os.rmdir(self.test_dir)
    
    def test_save_model(self):
        """Test saving model to disk."""
        self.predictor.save_model(self.test_model_path)
        
        self.assertTrue(os.path.exists(self.test_model_path))
    
    def test_load_model(self):
        """Test loading model from disk."""
        self.predictor.save_model(self.test_model_path)
        
        new_predictor = ETAPredictor()
        new_predictor.load_model(self.test_model_path)
        
        self.assertTrue(new_predictor.is_trained)
        self.assertIsNotNone(new_predictor.model)
    
    def test_loaded_model_gives_same_predictions(self):
        """Test that loaded model gives consistent predictions."""
        self.predictor.save_model(self.test_model_path)
        
        shipment = {'distance_km': 100, 'weight_kg': 25}
        original_result = self.predictor.predict(shipment)
        
        new_predictor = ETAPredictor()
        new_predictor.load_model(self.test_model_path)
        loaded_result = new_predictor.predict(shipment)
        
        # Should be very close (allowing for minor floating point differences)
        self.assertAlmostEqual(
            original_result['predicted_duration_minutes'],
            loaded_result['predicted_duration_minutes'],
            places=2
        )


if __name__ == '__main__':
    unittest.main()
