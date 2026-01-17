"""
Model Training Script
Generates trained .pkl model files for the ML service.

This script creates synthetic training data and trains:
- eta_model.pkl: ETA prediction using Random Forest
- demand_model.pkl: Demand forecasting using Gradient Boosting
- anomaly_model.pkl: Anomaly detection using Isolation Forest

Run: python -m models.train_models
"""

import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MODELS_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_eta_training_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic ETA training data."""
    np.random.seed(42)
    
    data = {
        'distance_km': np.random.uniform(5, 500, n_samples),
        'weight_kg': np.random.uniform(0.5, 1000, n_samples),
        'volume_cbm': np.random.uniform(0.01, 50, n_samples),
        'hour_of_day': np.random.randint(0, 24, n_samples),
        'day_of_week': np.random.randint(0, 7, n_samples),
        'weather_score': np.random.uniform(0, 1, n_samples),
        'traffic_factor': np.random.uniform(0.8, 2.5, n_samples),
        'vehicle_type_encoded': np.random.randint(0, 5, n_samples),
        'origin_zone_encoded': np.random.randint(0, 20, n_samples),
        'destination_zone_encoded': np.random.randint(0, 20, n_samples),
        'num_stops': np.random.randint(1, 10, n_samples),
        'is_express': np.random.randint(0, 2, n_samples),
        'is_fragile': np.random.randint(0, 2, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Derived features
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['is_rush_hour'] = ((df['hour_of_day'] >= 7) & (df['hour_of_day'] <= 9) | 
                          (df['hour_of_day'] >= 17) & (df['hour_of_day'] <= 19)).astype(int)
    
    # Generate realistic ETA (in minutes)
    base_speed = 40  # km/h average
    df['eta_minutes'] = (
        (df['distance_km'] / base_speed) * 60  # Base travel time
        * df['traffic_factor']  # Traffic multiplier
        * (1 + df['num_stops'] * 0.05)  # Stops add 5% each
        * (1 - df['weather_score'] * 0.15)  # Bad weather slows down
        * (0.9 if df['is_express'].values.any() else 1.0)  # Express is faster
        + np.random.normal(0, 10, n_samples)  # Random variation
    ).clip(15, 2000)  # Minimum 15 min, max ~33 hours
    
    return df


def generate_demand_training_data(n_days: int = 365) -> pd.DataFrame:
    """Generate synthetic demand time series data."""
    np.random.seed(42)
    
    dates = pd.date_range(start='2024-01-01', periods=n_days, freq='D')
    
    data = {
        'date': dates,
        'day_of_week': dates.dayofweek,
        'day_of_month': dates.day,
        'month': dates.month,
        'quarter': dates.quarter,
        'week_of_year': dates.isocalendar().week.values,
        'is_weekend': (dates.dayofweek >= 5).astype(int),
        'is_month_start': dates.is_month_start.astype(int),
        'is_month_end': dates.is_month_end.astype(int),
    }
    
    df = pd.DataFrame(data)
    
    # Create lag features
    base_demand = 100  # Base daily shipments
    
    # Weekly seasonality (less on weekends)
    weekly_pattern = np.array([1.1, 1.15, 1.2, 1.15, 1.1, 0.7, 0.6])
    
    # Monthly seasonality (higher during holidays/end of year)
    monthly_pattern = np.array([0.9, 0.85, 0.95, 1.0, 1.05, 1.1, 1.0, 0.95, 1.1, 1.15, 1.3, 1.4])
    
    # Generate demand
    df['shipment_count'] = (
        base_demand
        * weekly_pattern[df['day_of_week'].values]
        * monthly_pattern[df['month'].values - 1]
        + np.random.normal(0, 10, n_days)
        + np.arange(n_days) * 0.05  # Slight upward trend
    ).clip(20, 300).astype(int)
    
    # Add lag features
    for lag in [1, 7, 14, 28]:
        df[f'lag_{lag}'] = df['shipment_count'].shift(lag).fillna(method='bfill')
    
    # Rolling averages
    df['rolling_7d_mean'] = df['shipment_count'].rolling(7, min_periods=1).mean()
    df['rolling_30d_mean'] = df['shipment_count'].rolling(30, min_periods=1).mean()
    
    return df


def generate_anomaly_training_data(n_samples: int = 10000, anomaly_ratio: float = 0.05) -> pd.DataFrame:
    """Generate synthetic transaction data with anomalies."""
    np.random.seed(42)
    
    n_normal = int(n_samples * (1 - anomaly_ratio))
    n_anomaly = n_samples - n_normal
    
    # Normal transactions
    normal_data = {
        'amount': np.random.lognormal(5, 0.8, n_normal).clip(100, 50000),
        'transaction_count_24h': np.random.poisson(3, n_normal).clip(1, 20),
        'hour_of_day': np.random.choice(range(7, 22), n_normal),  # Business hours
        'day_of_week': np.random.randint(0, 7, n_normal),
        'distance_km': np.random.uniform(10, 300, n_normal),
        'weight_kg': np.random.uniform(1, 500, n_normal),
        'days_since_last_transaction': np.random.exponential(7, n_normal).clip(0, 60),
        'customer_tenure_days': np.random.uniform(30, 1000, n_normal),
        'location_risk_score': np.random.uniform(0, 0.3, n_normal),
        'is_anomaly': 0
    }
    
    # Anomalous transactions
    anomaly_data = {
        'amount': np.random.lognormal(7, 1.5, n_anomaly).clip(5000, 500000),  # Higher amounts
        'transaction_count_24h': np.random.poisson(15, n_anomaly).clip(5, 50),  # More frequent
        'hour_of_day': np.random.choice([0, 1, 2, 3, 4, 5, 23], n_anomaly),  # Odd hours
        'day_of_week': np.random.randint(0, 7, n_anomaly),
        'distance_km': np.random.uniform(300, 1000, n_anomaly),  # Longer distances
        'weight_kg': np.random.uniform(500, 2000, n_anomaly),  # Heavier
        'days_since_last_transaction': np.random.choice([0, 0, 0, 90, 120, 150], n_anomaly),  # Extremes
        'customer_tenure_days': np.random.uniform(0, 30, n_anomaly),  # New customers
        'location_risk_score': np.random.uniform(0.6, 1.0, n_anomaly),  # High risk
        'is_anomaly': 1
    }
    
    # Combine
    normal_df = pd.DataFrame(normal_data)
    anomaly_df = pd.DataFrame(anomaly_data)
    df = pd.concat([normal_df, anomaly_df], ignore_index=True).sample(frac=1, random_state=42)
    
    # Derived features
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['is_night'] = ((df['hour_of_day'] < 6) | (df['hour_of_day'] > 22)).astype(int)
    df['price_per_kg'] = df['amount'] / df['weight_kg'].clip(0.1)
    df['price_per_km'] = df['amount'] / df['distance_km'].clip(0.1)
    df['is_new_customer'] = (df['customer_tenure_days'] < 30).astype(int)
    
    # Z-scores
    df['amount_zscore'] = (df['amount'] - df['amount'].mean()) / df['amount'].std()
    df['avg_amount_7d'] = df['amount'].rolling(7, min_periods=1).mean()
    df['std_amount_7d'] = df['amount'].rolling(7, min_periods=1).std().fillna(0)
    
    return df


def train_eta_model():
    """Train and save the ETA prediction model."""
    print("\n" + "=" * 60)
    print("Training ETA Prediction Model")
    print("=" * 60)
    
    # Generate training data
    print("Generating synthetic training data...")
    df = generate_eta_training_data(n_samples=15000)
    
    # Feature columns
    feature_cols = [
        'distance_km', 'weight_kg', 'volume_cbm', 'hour_of_day', 'day_of_week',
        'is_weekend', 'is_rush_hour', 'weather_score', 'traffic_factor',
        'vehicle_type_encoded', 'origin_zone_encoded', 'destination_zone_encoded',
        'num_stops', 'is_express', 'is_fragile'
    ]
    
    X = df[feature_cols]
    y = df['eta_minutes']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"  MAE:  {mae:.2f} minutes")
    print(f"  RMSE: {rmse:.2f} minutes")
    print(f"  R²:   {r2:.4f}")
    
    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    print(f"\nTop 5 Features:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {feat}: {imp:.4f}")
    
    # Save model
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_columns': feature_cols,
        'model_version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'metrics': {'mae': mae, 'rmse': rmse, 'r2': r2},
        'feature_importance': importance
    }
    
    model_path = os.path.join(MODELS_DIR, 'eta_model.pkl')
    joblib.dump(model_data, model_path)
    print(f"\n✅ Model saved to: {model_path}")
    
    return model_data


def train_demand_model():
    """Train and save the demand forecasting model."""
    print("\n" + "=" * 60)
    print("Training Demand Forecasting Model")
    print("=" * 60)
    
    # Generate training data
    print("Generating synthetic time series data...")
    df = generate_demand_training_data(n_days=730)  # 2 years
    
    # Feature columns
    feature_cols = [
        'day_of_week', 'day_of_month', 'month', 'quarter', 'week_of_year',
        'is_weekend', 'is_month_start', 'is_month_end',
        'lag_1', 'lag_7', 'lag_14', 'lag_28',
        'rolling_7d_mean', 'rolling_30d_mean'
    ]
    
    X = df[feature_cols]
    y = df['shipment_count']
    
    # Time series split (use last 60 days for test)
    train_size = len(df) - 60
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("Training Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    
    print(f"\nModel Performance:")
    print(f"  MAE:  {mae:.2f} shipments")
    print(f"  RMSE: {rmse:.2f} shipments")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R²:   {r2:.4f}")
    
    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_))
    print(f"\nTop 5 Features:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {feat}: {imp:.4f}")
    
    # Save model
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_columns': feature_cols,
        'model_version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'metrics': {'mae': mae, 'rmse': rmse, 'r2': r2, 'mape': mape},
        'feature_importance': importance,
        'forecast_horizon': 30,
        'seasonality_period': 7
    }
    
    model_path = os.path.join(MODELS_DIR, 'demand_model.pkl')
    joblib.dump(model_data, model_path)
    print(f"\n✅ Model saved to: {model_path}")
    
    return model_data


def train_anomaly_model():
    """Train and save the anomaly detection model."""
    print("\n" + "=" * 60)
    print("Training Anomaly Detection Model")
    print("=" * 60)
    
    # Generate training data
    print("Generating synthetic transaction data...")
    df = generate_anomaly_training_data(n_samples=15000, anomaly_ratio=0.05)
    
    # Feature columns (for unsupervised learning, exclude the label)
    feature_cols = [
        'amount', 'amount_zscore', 'transaction_count_24h', 'avg_amount_7d',
        'std_amount_7d', 'hour_of_day', 'day_of_week', 'is_weekend', 'is_night',
        'distance_km', 'weight_kg', 'price_per_kg', 'price_per_km',
        'days_since_last_transaction', 'customer_tenure_days', 'is_new_customer',
        'location_risk_score'
    ]
    
    X = df[feature_cols]
    y_true = df['is_anomaly']
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    print("Training Isolation Forest...")
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        max_samples='auto',
        max_features=1.0,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)
    
    # Predict (Isolation Forest returns -1 for anomalies, 1 for normal)
    y_pred_raw = model.predict(X_scaled)
    y_pred = (y_pred_raw == -1).astype(int)
    
    # Evaluate
    from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
    
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)
    
    print(f"\nModel Performance:")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN: {cm[0,0]:5d}  FP: {cm[0,1]:5d}")
    print(f"  FN: {cm[1,0]:5d}  TP: {cm[1,1]:5d}")
    
    # Calculate feature importance using mean absolute scores
    anomaly_scores = model.score_samples(X_scaled)
    
    # Save model
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_columns': feature_cols,
        'model_version': '1.0.0',
        'trained_at': datetime.now().isoformat(),
        'contamination': 0.05,
        'threshold': -0.5,
        'metrics': {
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'confusion_matrix': cm.tolist()
        }
    }
    
    model_path = os.path.join(MODELS_DIR, 'anomaly_model.pkl')
    joblib.dump(model_data, model_path)
    print(f"\n✅ Model saved to: {model_path}")
    
    return model_data


def main():
    """Train all models."""
    print("\n" + "=" * 60)
    print("LogiMetrics ML Model Training Pipeline")
    print("=" * 60)
    print(f"Output directory: {MODELS_DIR}")
    print(f"Started at: {datetime.now().isoformat()}")
    
    # Train all models
    eta_model = train_eta_model()
    demand_model = train_demand_model()
    anomaly_model = train_anomaly_model()
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print("\nGenerated model files:")
    print(f"  ✅ eta_model.pkl")
    print(f"  ✅ demand_model.pkl")
    print(f"  ✅ anomaly_model.pkl")
    print(f"\nFinished at: {datetime.now().isoformat()}")


if __name__ == '__main__':
    main()
