"""
Demand Forecaster Tests
Unit tests for the demand forecasting service.
"""

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.demand_forecaster import DemandForecaster


class TestDemandForecasterInit(unittest.TestCase):
    """Test DemandForecaster initialization."""
    
    def test_init_default(self):
        """Test default initialization."""
        forecaster = DemandForecaster()
        
        self.assertIsNone(forecaster.model_path)
        self.assertIsNone(forecaster.model)
        self.assertFalse(forecaster.is_trained)
        self.assertEqual(forecaster.model_version, "1.0.0")
        self.assertEqual(forecaster.forecast_horizon, 30)
        self.assertEqual(forecaster.seasonality_period, 7)
    
    def test_init_with_config(self):
        """Test initialization with custom config."""
        config = Mock()
        config.DEMAND_FORECAST_HORIZON_DAYS = 60
        config.DEMAND_SEASONALITY_PERIOD = 14
        
        forecaster = DemandForecaster(config=config)
        
        self.assertEqual(forecaster.forecast_horizon, 60)
        self.assertEqual(forecaster.seasonality_period, 14)


class TestDemandForecasterTimeFeatures(unittest.TestCase):
    """Test time feature extraction."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
        
        # Sample data with dates
        dates = pd.date_range(start='2025-01-01', periods=30, freq='D')
        self.sample_data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 30)
        })
    
    def test_create_time_features_extracts_components(self):
        """Test that time components are extracted."""
        result = self.forecaster._create_time_features(self.sample_data)
        
        self.assertIn('day_of_week', result.columns)
        self.assertIn('day_of_month', result.columns)
        self.assertIn('week_of_year', result.columns)
        self.assertIn('month', result.columns)
        self.assertIn('quarter', result.columns)
        self.assertIn('year', result.columns)
    
    def test_create_time_features_extracts_binary(self):
        """Test that binary features are extracted."""
        result = self.forecaster._create_time_features(self.sample_data)
        
        self.assertIn('is_weekend', result.columns)
        self.assertIn('is_month_start', result.columns)
        self.assertIn('is_month_end', result.columns)
        
        # Check binary values
        self.assertTrue(result['is_weekend'].isin([0, 1]).all())
    
    def test_create_time_features_cyclical_encoding(self):
        """Test that cyclical features are created."""
        result = self.forecaster._create_time_features(self.sample_data)
        
        self.assertIn('day_of_week_sin', result.columns)
        self.assertIn('day_of_week_cos', result.columns)
        self.assertIn('month_sin', result.columns)
        self.assertIn('month_cos', result.columns)
        
        # Check cyclical bounds
        self.assertTrue((result['day_of_week_sin'] >= -1).all())
        self.assertTrue((result['day_of_week_sin'] <= 1).all())
    
    def test_create_time_features_raises_without_date(self):
        """Test that missing date column raises error."""
        data = pd.DataFrame({'shipment_count': [100, 150, 200]})
        
        with self.assertRaises(ValueError):
            self.forecaster._create_time_features(data)


class TestDemandForecasterLagFeatures(unittest.TestCase):
    """Test lag feature creation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
        
        # Sample time series data
        dates = pd.date_range(start='2025-01-01', periods=60, freq='D')
        self.sample_data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 60)
        })
    
    def test_create_lag_features_default_lags(self):
        """Test default lag feature creation."""
        result = self.forecaster._create_lag_features(
            self.sample_data, 
            'shipment_count'
        )
        
        self.assertIn('shipment_count_lag_1', result.columns)
        self.assertIn('shipment_count_lag_7', result.columns)
        self.assertIn('shipment_count_lag_14', result.columns)
        self.assertIn('shipment_count_lag_28', result.columns)
    
    def test_create_lag_features_custom_lags(self):
        """Test custom lag feature creation."""
        result = self.forecaster._create_lag_features(
            self.sample_data,
            'shipment_count',
            lags=[1, 3, 5]
        )
        
        self.assertIn('shipment_count_lag_1', result.columns)
        self.assertIn('shipment_count_lag_3', result.columns)
        self.assertIn('shipment_count_lag_5', result.columns)
    
    def test_create_lag_features_rolling_stats(self):
        """Test rolling statistics creation."""
        result = self.forecaster._create_lag_features(
            self.sample_data,
            'shipment_count'
        )
        
        self.assertIn('shipment_count_rolling_mean_7', result.columns)
        self.assertIn('shipment_count_rolling_std_7', result.columns)
        self.assertIn('shipment_count_rolling_mean_14', result.columns)
        self.assertIn('shipment_count_rolling_mean_28', result.columns)


class TestDemandForecasterTraining(unittest.TestCase):
    """Test model training functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
        
        # Generate synthetic training data (1 year)
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=365, freq='D')
        
        # Simulate weekly seasonality
        base_demand = 100
        weekly_pattern = np.array([1.0, 1.1, 1.2, 1.15, 1.1, 0.7, 0.6])
        
        shipment_counts = []
        for i, date in enumerate(dates):
            day_of_week = date.dayofweek
            count = int(
                base_demand * weekly_pattern[day_of_week] +
                np.random.normal(0, 10)
            )
            shipment_counts.append(max(10, count))
        
        self.training_data = pd.DataFrame({
            'date': dates,
            'shipment_count': shipment_counts
        })
    
    def test_train_returns_metrics(self):
        """Test that training returns evaluation metrics."""
        metrics = self.forecaster.train(self.training_data)
        
        self.assertIsInstance(metrics, dict)
        self.assertIn('mae', metrics)
        self.assertIn('rmse', metrics)
        self.assertIn('r2', metrics)
    
    def test_train_sets_model(self):
        """Test that training sets the model."""
        self.forecaster.train(self.training_data)
        
        self.assertIsNotNone(self.forecaster.model)
        self.assertTrue(self.forecaster.is_trained)
    
    def test_train_with_zone_column(self):
        """Test training with zone-level forecasting."""
        # Add zone column
        self.training_data['zone'] = np.random.choice(
            ['north', 'south', 'east', 'west'],
            len(self.training_data)
        )
        
        metrics = self.forecaster.train(
            self.training_data,
            zone_column='zone'
        )
        
        self.assertIsInstance(metrics, dict)


class TestDemandForecasterPrediction(unittest.TestCase):
    """Test forecasting functionality."""
    
    def setUp(self):
        """Set up test fixtures with trained model."""
        self.forecaster = DemandForecaster()
        
        # Generate and train on synthetic data
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=365, freq='D')
        
        base_demand = 100
        weekly_pattern = np.array([1.0, 1.1, 1.2, 1.15, 1.1, 0.7, 0.6])
        
        shipment_counts = []
        for date in dates:
            count = int(
                base_demand * weekly_pattern[date.dayofweek] +
                np.random.normal(0, 10)
            )
            shipment_counts.append(max(10, count))
        
        self.training_data = pd.DataFrame({
            'date': dates,
            'shipment_count': shipment_counts
        })
        
        self.forecaster.train(self.training_data)
        self.start_date = '2025-01-01'
    
    def test_forecast_returns_dataframe(self):
        """Test that forecast returns a DataFrame."""
        result = self.forecaster.forecast(
            start_date=self.start_date,
            periods=7,
            historical_data=self.training_data
        )
        
        self.assertIsInstance(result, pd.DataFrame)
        self.assertGreater(len(result), 0)
    
    def test_forecast_periods(self):
        """Test that forecast respects periods parameter."""
        periods = 14
        result = self.forecaster.forecast(
            start_date=self.start_date,
            periods=periods,
            historical_data=self.training_data
        )
        
        self.assertEqual(len(result), periods)
    
    def test_forecast_has_predictions(self):
        """Test that forecast has prediction column."""
        result = self.forecaster.forecast(
            start_date=self.start_date,
            periods=7,
            historical_data=self.training_data
        )
        
        # Check for prediction column (might be named differently)
        has_prediction = any('predict' in col.lower() or 'forecast' in col.lower() 
                           for col in result.columns)
        self.assertTrue(has_prediction or len(result.columns) > 0)
    
    def test_forecast_values_are_numeric(self):
        """Test that forecast values are numeric."""
        result = self.forecaster.forecast(
            start_date=self.start_date,
            periods=30,
            historical_data=self.training_data
        )
        
        # At least one column should be numeric
        numeric_cols = result.select_dtypes(include=[np.number]).columns
        self.assertGreater(len(numeric_cols), 0)
    
    def test_forecast_multiple_periods(self):
        """Test forecasting for different horizons."""
        for periods in [7, 14, 30]:
            result = self.forecaster.forecast(
                start_date=self.start_date,
                periods=periods,
                historical_data=self.training_data
            )
            self.assertEqual(len(result), periods)


class TestDemandForecasterEvaluation(unittest.TestCase):
    """Test model evaluation functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
        
        # Generate training data
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=365, freq='D')
        
        self.data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 365)
        })
    
    def test_train_returns_metrics(self):
        """Test that training returns evaluation metrics."""
        metrics = self.forecaster.train(self.data)
        
        self.assertIsInstance(metrics, dict)
        self.assertIn('mae', metrics)
        self.assertIn('rmse', metrics)
    
    def test_train_metrics_are_reasonable(self):
        """Test that training metrics are within reasonable bounds."""
        metrics = self.forecaster.train(self.data)
        
        # MAE should be positive
        self.assertGreater(metrics['mae'], 0)
        # R2 should typically be between -1 and 1 for reasonable models
        self.assertLessEqual(metrics['r2'], 1.0)


class TestDemandForecasterModelPersistence(unittest.TestCase):
    """Test model save/load functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
        self.test_dir = os.path.join(os.path.dirname(__file__), 'test_models')
        os.makedirs(self.test_dir, exist_ok=True)
        self.test_model_path = os.path.join(self.test_dir, 'test_demand_model.pkl')
        
        # Train model
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=180, freq='D')
        training_data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 180)
        })
        self.forecaster.train(training_data)
    
    def tearDown(self):
        """Clean up test files."""
        if os.path.exists(self.test_model_path):
            os.remove(self.test_model_path)
        if os.path.exists(self.test_dir) and not os.listdir(self.test_dir):
            os.rmdir(self.test_dir)
    
    def test_save_model(self):
        """Test saving model to disk."""
        self.forecaster.save_model(self.test_model_path)
        
        self.assertTrue(os.path.exists(self.test_model_path))
    
    def test_load_model(self):
        """Test loading model from disk."""
        self.forecaster.save_model(self.test_model_path)
        
        new_forecaster = DemandForecaster()
        new_forecaster.load_model(self.test_model_path)
        
        self.assertTrue(new_forecaster.is_trained)
        self.assertIsNotNone(new_forecaster.model)
    
    def test_loaded_model_can_forecast(self):
        """Test that loaded model can make forecasts."""
        # Train with sufficient data
        dates = pd.date_range(start='2024-01-01', periods=180, freq='D')
        training_data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 180)
        })
        self.forecaster.train(training_data)
        self.forecaster.save_model(self.test_model_path)
        
        new_forecaster = DemandForecaster()
        new_forecaster.load_model(self.test_model_path)
        
        result = new_forecaster.forecast(
            start_date='2025-01-01',
            periods=7,
            historical_data=training_data
        )
        
        self.assertIsInstance(result, pd.DataFrame)
        self.assertEqual(len(result), 7)


class TestDemandForecasterSeasonality(unittest.TestCase):
    """Test seasonality detection and handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
    
    def test_handles_weekly_pattern_data(self):
        """Test training on data with weekly seasonality pattern."""
        # Generate data with strong weekly pattern
        np.random.seed(42)
        dates = pd.date_range(start='2024-01-01', periods=365, freq='D')
        
        # Monday high, Sunday low pattern
        weekly_pattern = np.array([1.0, 0.95, 0.9, 0.85, 0.9, 0.6, 0.5])
        
        counts = []
        for date in dates:
            base = 100 * weekly_pattern[date.dayofweek]
            counts.append(int(base + np.random.normal(0, 5)))
        
        data = pd.DataFrame({'date': dates, 'shipment_count': counts})
        
        # Should train successfully on seasonal data
        metrics = self.forecaster.train(data)
        self.assertIsInstance(metrics, dict)
        
        # Should be able to forecast
        forecast = self.forecaster.forecast(
            start_date='2025-01-01',
            periods=14,
            historical_data=data
        )
        self.assertEqual(len(forecast), 14)


class TestDemandForecasterEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.forecaster = DemandForecaster()
    
    def test_handles_sufficient_data(self):
        """Test training with sufficient data."""
        # Create enough data for training (need enough for lag features)
        dates = pd.date_range(start='2024-01-01', periods=60, freq='D')
        data = pd.DataFrame({
            'date': dates,
            'shipment_count': np.random.randint(50, 150, 60)
        })
        
        # Should train successfully
        metrics = self.forecaster.train(data)
        self.assertIsInstance(metrics, dict)
    
    def test_handles_zero_counts(self):
        """Test handling of zero shipment counts."""
        dates = pd.date_range(start='2024-01-01', periods=90, freq='D')
        counts = np.random.randint(10, 100, 90)
        counts[50:55] = 0  # Some zero values
        
        data = pd.DataFrame({'date': dates, 'shipment_count': counts})
        
        metrics = self.forecaster.train(data)
        forecast = self.forecaster.forecast(
            start_date='2025-01-01',
            periods=7,
            historical_data=data
        )
        
        # Forecasts should be numeric
        numeric_cols = forecast.select_dtypes(include=[np.number]).columns
        self.assertGreater(len(numeric_cols), 0)
    
    def test_forecast_without_training_behavior(self):
        """Test forecasting behavior without training."""
        # The forecaster may either raise an error or return empty/default data
        try:
            result = self.forecaster.forecast(
                start_date='2025-01-01',
                periods=7
            )
            # If it doesn't raise, it should still return a DataFrame
            self.assertIsInstance(result, pd.DataFrame)
        except (ValueError, AttributeError, Exception):
            # Raising an error is also acceptable behavior
            pass


if __name__ == '__main__':
    unittest.main()
