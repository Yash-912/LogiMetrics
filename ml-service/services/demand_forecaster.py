"""
Demand Forecaster Service
Time series forecasting for logistics capacity planning.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge, Lasso
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

logger = logging.getLogger(__name__)


class DemandForecaster:
    """
    Machine learning-based demand forecaster for logistics capacity planning.
    
    Predicts future shipment volumes based on:
    - Historical shipment patterns
    - Seasonal trends (weekly, monthly, yearly)
    - Day of week / month effects
    - Special events and holidays
    - Zone/region characteristics
    """
    
    def __init__(self, model_path: Optional[str] = None, config: Optional[Any] = None):
        """
        Initialize the demand forecaster.
        
        Args:
            model_path: Path to load/save the trained model
            config: Configuration object with model settings
        """
        self.model_path = model_path
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_version = "1.0.0"
        self.feature_columns = []
        
        # Forecast settings
        self.forecast_horizon = 30  # days
        self.seasonality_period = 7  # weekly
        if config:
            self.forecast_horizon = getattr(config, 'DEMAND_FORECAST_HORIZON_DAYS', 30)
            self.seasonality_period = getattr(config, 'DEMAND_SEASONALITY_PERIOD', 7)
        
        # Load existing model if path provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _create_time_features(self, df: pd.DataFrame, date_column: str = 'date') -> pd.DataFrame:
        """
        Create time-based features from date column.
        
        Args:
            df: Input DataFrame
            date_column: Name of the date column
            
        Returns:
            DataFrame with time features
        """
        result = df.copy()
        
        if date_column in result.columns:
            result['date'] = pd.to_datetime(result[date_column])
        elif 'date' not in result.columns:
            raise ValueError(f"Date column '{date_column}' not found")
        
        # Extract time components
        result['day_of_week'] = result['date'].dt.dayofweek
        result['day_of_month'] = result['date'].dt.day
        result['week_of_year'] = result['date'].dt.isocalendar().week.astype(int)
        result['month'] = result['date'].dt.month
        result['quarter'] = result['date'].dt.quarter
        result['year'] = result['date'].dt.year
        result['is_weekend'] = result['day_of_week'].isin([5, 6]).astype(int)
        result['is_month_start'] = result['date'].dt.is_month_start.astype(int)
        result['is_month_end'] = result['date'].dt.is_month_end.astype(int)
        
        # Cyclical encoding for periodic features
        result['day_of_week_sin'] = np.sin(2 * np.pi * result['day_of_week'] / 7)
        result['day_of_week_cos'] = np.cos(2 * np.pi * result['day_of_week'] / 7)
        result['day_of_month_sin'] = np.sin(2 * np.pi * result['day_of_month'] / 31)
        result['day_of_month_cos'] = np.cos(2 * np.pi * result['day_of_month'] / 31)
        result['month_sin'] = np.sin(2 * np.pi * result['month'] / 12)
        result['month_cos'] = np.cos(2 * np.pi * result['month'] / 12)
        
        return result
    
    def _create_lag_features(
        self,
        df: pd.DataFrame,
        target_column: str,
        lags: List[int] = None
    ) -> pd.DataFrame:
        """
        Create lagged features for time series prediction.
        
        Args:
            df: Input DataFrame (must be sorted by date)
            target_column: Column to create lags for
            lags: List of lag periods
            
        Returns:
            DataFrame with lag features
        """
        result = df.copy()
        
        if lags is None:
            lags = [1, 7, 14, 28]  # Previous day, week, 2 weeks, month
        
        for lag in lags:
            result[f'{target_column}_lag_{lag}'] = result[target_column].shift(lag)
        
        # Rolling statistics
        for window in [7, 14, 28]:
            result[f'{target_column}_rolling_mean_{window}'] = (
                result[target_column].rolling(window=window, min_periods=1).mean()
            )
            result[f'{target_column}_rolling_std_{window}'] = (
                result[target_column].rolling(window=window, min_periods=1).std()
            )
        
        return result
    
    def train(
        self,
        historical_data: pd.DataFrame,
        target_column: str = 'shipment_count',
        date_column: str = 'date',
        zone_column: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Train the demand forecasting model.
        
        Args:
            historical_data: Historical shipment data with dates and counts
            target_column: Column containing shipment counts
            date_column: Column containing dates
            zone_column: Optional column for zone-level forecasting
            
        Returns:
            Dictionary containing training metrics
        """
        logger.info(f"Training demand model with {len(historical_data)} samples")
        
        # Prepare data
        df = historical_data.copy()
        df = df.sort_values(date_column).reset_index(drop=True)
        
        # Create features
        df = self._create_time_features(df, date_column)
        df = self._create_lag_features(df, target_column)
        
        # Add zone encoding if specified
        if zone_column and zone_column in df.columns:
            df = pd.get_dummies(df, columns=[zone_column], prefix='zone')
        
        # Drop rows with NaN from lag features
        df = df.dropna()
        
        # Define feature columns
        exclude_cols = [target_column, 'date', date_column]
        self.feature_columns = [col for col in df.columns 
                               if col not in exclude_cols and df[col].dtype in ['int64', 'float64']]
        
        X = df[self.feature_columns]
        y = df[target_column]
        
        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=5)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Gradient Boosting model (good for time series)
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5,
            random_state=42
        )
        
        # Cross-validation scores
        cv_scores = cross_val_score(
            self.model, X_scaled, y,
            cv=tscv, scoring='neg_mean_absolute_error'
        )
        
        # Fit on all data
        self.model.fit(X_scaled, y)
        
        # Predictions
        y_pred = self.model.predict(X_scaled)
        
        metrics = {
            'mae': mean_absolute_error(y, y_pred),
            'rmse': np.sqrt(mean_squared_error(y, y_pred)),
            'r2': r2_score(y, y_pred),
            'cv_mae_mean': -cv_scores.mean(),
            'cv_mae_std': cv_scores.std(),
            'samples_trained': len(X),
            'feature_count': len(self.feature_columns)
        }
        
        # Feature importance
        feature_importance = dict(zip(self.feature_columns, self.model.feature_importances_))
        metrics['top_features'] = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10])
        
        self.is_trained = True
        logger.info(f"Demand model trained. MAE: {metrics['mae']:.2f}")
        
        return metrics
    
    def forecast(
        self,
        start_date: Union[str, datetime],
        periods: int = None,
        historical_data: Optional[pd.DataFrame] = None,
        target_column: str = 'shipment_count',
        zone: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Generate demand forecast for future dates.
        
        Args:
            start_date: Start date for forecast
            periods: Number of days to forecast
            historical_data: Recent historical data for lag features
            target_column: Target column name
            zone: Optional zone for zone-specific forecast
            
        Returns:
            DataFrame with forecasted demand
        """
        if periods is None:
            periods = self.forecast_horizon
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Generate future dates
        future_dates = pd.date_range(start=start_date, periods=periods, freq='D')
        forecast_df = pd.DataFrame({'date': future_dates})
        
        # Create time features
        forecast_df = self._create_time_features(forecast_df)
        
        if not self.is_trained or self.model is None:
            # Use heuristic forecast
            return self._heuristic_forecast(forecast_df, zone)
        
        # Initialize lag features with historical data or defaults
        if historical_data is not None and len(historical_data) >= 28:
            # Use actual historical values for initial lags
            recent_values = historical_data[target_column].tail(28).values
        else:
            # Use average values as defaults
            recent_values = np.full(28, 100)  # Default average
        
        # Forecast iteratively (each day uses previous predictions)
        predictions = []
        
        for i in range(len(forecast_df)):
            row = forecast_df.iloc[i:i+1].copy()
            
            # Add lag features
            for lag in [1, 7, 14, 28]:
                if i >= lag:
                    row[f'{target_column}_lag_{lag}'] = predictions[i - lag]
                else:
                    idx = len(recent_values) - (lag - i)
                    if idx >= 0:
                        row[f'{target_column}_lag_{lag}'] = recent_values[idx]
                    else:
                        row[f'{target_column}_lag_{lag}'] = np.mean(recent_values)
            
            # Rolling features (simplified for forecasting)
            all_values = list(recent_values) + predictions
            for window in [7, 14, 28]:
                if len(all_values) >= window:
                    recent = all_values[-window:]
                    row[f'{target_column}_rolling_mean_{window}'] = np.mean(recent)
                    row[f'{target_column}_rolling_std_{window}'] = np.std(recent)
                else:
                    row[f'{target_column}_rolling_mean_{window}'] = np.mean(all_values)
                    row[f'{target_column}_rolling_std_{window}'] = np.std(all_values) if len(all_values) > 1 else 0
            
            # Ensure all feature columns exist
            for col in self.feature_columns:
                if col not in row.columns:
                    row[col] = 0
            
            # Predict
            X = row[self.feature_columns]
            X_scaled = self.scaler.transform(X)
            pred = max(0, self.model.predict(X_scaled)[0])  # Ensure non-negative
            predictions.append(pred)
        
        forecast_df['forecasted_demand'] = predictions
        forecast_df['model_version'] = self.model_version
        
        # Add confidence intervals (simple approach based on historical variance)
        std_factor = 0.15  # 15% standard deviation
        forecast_df['lower_bound'] = (forecast_df['forecasted_demand'] * (1 - 1.96 * std_factor)).clip(lower=0)
        forecast_df['upper_bound'] = forecast_df['forecasted_demand'] * (1 + 1.96 * std_factor)
        
        return forecast_df[['date', 'forecasted_demand', 'lower_bound', 'upper_bound', 'model_version']]
    
    def _heuristic_forecast(
        self,
        forecast_df: pd.DataFrame,
        zone: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Fallback heuristic forecast when model is not trained.
        
        Args:
            forecast_df: DataFrame with future dates and time features
            zone: Optional zone identifier
            
        Returns:
            DataFrame with heuristic forecasts
        """
        result = forecast_df.copy()
        
        # Base demand (average daily shipments)
        base_demand = 100
        
        # Apply day-of-week pattern
        dow_factors = {
            0: 1.2,   # Monday - high
            1: 1.1,   # Tuesday
            2: 1.0,   # Wednesday
            3: 1.0,   # Thursday
            4: 1.15,  # Friday
            5: 0.6,   # Saturday - low
            6: 0.5    # Sunday - lowest
        }
        
        result['forecasted_demand'] = result['day_of_week'].map(dow_factors) * base_demand
        
        # Apply month-end surge
        result.loc[result['is_month_end'] == 1, 'forecasted_demand'] *= 1.3
        
        # Add some noise for realism
        np.random.seed(42)
        noise = np.random.normal(1, 0.1, len(result))
        result['forecasted_demand'] *= noise
        result['forecasted_demand'] = result['forecasted_demand'].clip(lower=0).round(0)
        
        result['model_version'] = 'heuristic'
        result['lower_bound'] = (result['forecasted_demand'] * 0.7).round(0)
        result['upper_bound'] = (result['forecasted_demand'] * 1.3).round(0)
        
        return result[['date', 'forecasted_demand', 'lower_bound', 'upper_bound', 'model_version']]
    
    def analyze_seasonality(
        self,
        historical_data: pd.DataFrame,
        target_column: str = 'shipment_count',
        date_column: str = 'date'
    ) -> Dict[str, Any]:
        """
        Analyze seasonality patterns in historical data.
        
        Args:
            historical_data: Historical shipment data
            target_column: Column with shipment counts
            date_column: Column with dates
            
        Returns:
            Dictionary with seasonality analysis
        """
        df = historical_data.copy()
        df['date'] = pd.to_datetime(df[date_column])
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
        
        analysis = {
            'daily_pattern': df.groupby('day_of_week')[target_column].mean().to_dict(),
            'monthly_pattern': df.groupby('month')[target_column].mean().to_dict(),
            'weekly_pattern': df.groupby('week_of_year')[target_column].mean().to_dict(),
            'overall_stats': {
                'mean': df[target_column].mean(),
                'std': df[target_column].std(),
                'min': df[target_column].min(),
                'max': df[target_column].max(),
                'median': df[target_column].median()
            }
        }
        
        # Find peak days
        dow_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily = analysis['daily_pattern']
        peak_day = max(daily, key=daily.get)
        low_day = min(daily, key=daily.get)
        
        analysis['insights'] = {
            'peak_day': dow_names[peak_day],
            'low_day': dow_names[low_day],
            'peak_month': max(analysis['monthly_pattern'], key=analysis['monthly_pattern'].get),
            'weekend_ratio': (daily.get(5, 0) + daily.get(6, 0)) / (2 * analysis['overall_stats']['mean'])
        }
        
        return analysis
    
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
            'forecast_horizon': self.forecast_horizon,
            'seasonality_period': self.seasonality_period,
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
            self.forecast_horizon = model_data.get('forecast_horizon', 30)
            self.seasonality_period = model_data.get('seasonality_period', 7)
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
            'forecast_horizon': self.forecast_horizon,
            'seasonality_period': self.seasonality_period,
            'feature_count': len(self.feature_columns)
        }


# Convenience function
def forecast_demand(
    start_date: Union[str, datetime],
    periods: int = 7,
    model_path: Optional[str] = None
) -> pd.DataFrame:
    """
    Quick demand forecast without managing forecaster instance.
    
    Args:
        start_date: Start date for forecast
        periods: Number of days to forecast
        model_path: Optional path to trained model
        
    Returns:
        DataFrame with forecasted demand
    """
    forecaster = DemandForecaster(model_path=model_path)
    return forecaster.forecast(start_date=start_date, periods=periods)
