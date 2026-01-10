"""
Feature Engineering Utility
Feature extraction and transformation for ML models in the LogiMetrics platform.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from math import radians, sin, cos, sqrt, atan2

logger = logging.getLogger(__name__)


# Indian public holidays (can be extended)
INDIAN_HOLIDAYS = [
    '01-26',  # Republic Day
    '03-29',  # Holi (approximate)
    '04-14',  # Ambedkar Jayanti
    '05-01',  # May Day
    '08-15',  # Independence Day
    '10-02',  # Gandhi Jayanti
    '10-24',  # Dussehra (approximate)
    '11-12',  # Diwali (approximate)
    '12-25',  # Christmas
]


class FeatureEngineer:
    """
    Feature engineering utility for logistics ML models.
    
    Creates features for:
    - Time-based patterns (hour, day, season, holidays)
    - Geographic features (distance, zones, clustering)
    - Shipment characteristics (weight bins, volume, priority)
    - Historical patterns (lag features, rolling statistics)
    """
    
    def __init__(self, config: Optional[Any] = None):
        """
        Initialize the feature engineer.
        
        Args:
            config: Configuration object with feature settings
        """
        self.config = config
        self.zone_encodings = {}
        self.category_mappings = {}
        
    def extract_time_features(
        self,
        data: pd.DataFrame,
        datetime_column: str = 'timestamp',
        prefix: str = ''
    ) -> pd.DataFrame:
        """
        Extract time-based features from a datetime column.
        
        Args:
            data: Input DataFrame
            datetime_column: Name of the datetime column
            prefix: Prefix for generated feature names
            
        Returns:
            DataFrame with time features added
        """
        df = data.copy()
        
        if datetime_column not in df.columns:
            logger.warning(f"Datetime column '{datetime_column}' not found, using current time")
            df[datetime_column] = datetime.now()
        
        # Convert to datetime
        dt_col = pd.to_datetime(df[datetime_column])
        
        # Extract basic time components
        df[f'{prefix}hour_of_day'] = dt_col.dt.hour
        df[f'{prefix}day_of_week'] = dt_col.dt.dayofweek
        df[f'{prefix}day_of_month'] = dt_col.dt.day
        df[f'{prefix}month'] = dt_col.dt.month
        df[f'{prefix}quarter'] = dt_col.dt.quarter
        df[f'{prefix}week_of_year'] = dt_col.dt.isocalendar().week.astype(int)
        df[f'{prefix}year'] = dt_col.dt.year
        
        # Binary features
        df[f'{prefix}is_weekend'] = (dt_col.dt.dayofweek >= 5).astype(int)
        df[f'{prefix}is_month_start'] = dt_col.dt.is_month_start.astype(int)
        df[f'{prefix}is_month_end'] = dt_col.dt.is_month_end.astype(int)
        
        # Time of day categories
        df[f'{prefix}is_morning'] = ((dt_col.dt.hour >= 6) & (dt_col.dt.hour < 12)).astype(int)
        df[f'{prefix}is_afternoon'] = ((dt_col.dt.hour >= 12) & (dt_col.dt.hour < 17)).astype(int)
        df[f'{prefix}is_evening'] = ((dt_col.dt.hour >= 17) & (dt_col.dt.hour < 21)).astype(int)
        df[f'{prefix}is_night'] = ((dt_col.dt.hour >= 21) | (dt_col.dt.hour < 6)).astype(int)
        
        # Rush hour (Indian traffic patterns)
        df[f'{prefix}is_rush_hour'] = (
            ((dt_col.dt.hour >= 8) & (dt_col.dt.hour <= 10)) |
            ((dt_col.dt.hour >= 17) & (dt_col.dt.hour <= 20))
        ).astype(int)
        
        # Holiday detection
        df[f'{prefix}is_holiday'] = dt_col.apply(
            lambda x: 1 if x.strftime('%m-%d') in INDIAN_HOLIDAYS else 0
        )
        
        # Season (Indian seasons)
        df[f'{prefix}season'] = dt_col.dt.month.apply(self._get_indian_season)
        
        # Cyclical encoding for continuous time features
        df[f'{prefix}hour_sin'] = np.sin(2 * np.pi * dt_col.dt.hour / 24)
        df[f'{prefix}hour_cos'] = np.cos(2 * np.pi * dt_col.dt.hour / 24)
        df[f'{prefix}day_sin'] = np.sin(2 * np.pi * dt_col.dt.dayofweek / 7)
        df[f'{prefix}day_cos'] = np.cos(2 * np.pi * dt_col.dt.dayofweek / 7)
        df[f'{prefix}month_sin'] = np.sin(2 * np.pi * dt_col.dt.month / 12)
        df[f'{prefix}month_cos'] = np.cos(2 * np.pi * dt_col.dt.month / 12)
        
        logger.debug(f"Extracted {len([c for c in df.columns if c.startswith(prefix)])} time features")
        return df
    
    def _get_indian_season(self, month: int) -> int:
        """Map month to Indian season (0=Winter, 1=Summer, 2=Monsoon, 3=Autumn)."""
        if month in [12, 1, 2]:
            return 0  # Winter
        elif month in [3, 4, 5]:
            return 1  # Summer
        elif month in [6, 7, 8, 9]:
            return 2  # Monsoon
        else:
            return 3  # Autumn
    
    def extract_location_features(
        self,
        data: pd.DataFrame,
        lat_column: str = 'latitude',
        lon_column: str = 'longitude',
        prefix: str = ''
    ) -> pd.DataFrame:
        """
        Extract location-based features from coordinates.
        
        Args:
            data: Input DataFrame
            lat_column: Name of latitude column
            lon_column: Name of longitude column
            prefix: Prefix for generated feature names
            
        Returns:
            DataFrame with location features added
        """
        df = data.copy()
        
        if lat_column not in df.columns or lon_column not in df.columns:
            logger.warning("Latitude/longitude columns not found")
            return df
        
        lat = df[lat_column]
        lon = df[lon_column]
        
        # Zone encoding (grid-based)
        df[f'{prefix}lat_zone'] = (lat // 1).astype(int)
        df[f'{prefix}lon_zone'] = (lon // 1).astype(int)
        df[f'{prefix}grid_zone'] = df[f'{prefix}lat_zone'].astype(str) + '_' + df[f'{prefix}lon_zone'].astype(str)
        
        # Region classification (India-specific)
        df[f'{prefix}region'] = df.apply(
            lambda row: self._classify_indian_region(row[lat_column], row[lon_column]),
            axis=1
        )
        
        # Urban/Rural indicator (simplified - based on known metro coordinates)
        df[f'{prefix}is_metro'] = df.apply(
            lambda row: self._is_metro_area(row[lat_column], row[lon_column]),
            axis=1
        )
        
        logger.debug(f"Extracted location features with prefix '{prefix}'")
        return df
    
    def _classify_indian_region(self, lat: float, lon: float) -> int:
        """Classify location into Indian region (0=North, 1=South, 2=East, 3=West, 4=Central)."""
        if lat > 25:
            return 0  # North
        elif lat < 15:
            return 1  # South
        elif lon > 85:
            return 2  # East
        elif lon < 75:
            return 3  # West
        else:
            return 4  # Central
    
    def _is_metro_area(self, lat: float, lon: float) -> int:
        """Check if coordinates are near major Indian metros."""
        metros = [
            (28.6139, 77.2090),   # Delhi
            (19.0760, 72.8777),   # Mumbai
            (13.0827, 80.2707),   # Chennai
            (22.5726, 88.3639),   # Kolkata
            (12.9716, 77.5946),   # Bangalore
            (17.3850, 78.4867),   # Hyderabad
            (23.0225, 72.5714),   # Ahmedabad
            (18.5204, 73.8567),   # Pune
        ]
        
        for metro_lat, metro_lon in metros:
            distance = haversine_distance(lat, lon, metro_lat, metro_lon)
            if distance < 50:  # Within 50km of metro
                return 1
        return 0
    
    def extract_shipment_features(
        self,
        data: pd.DataFrame,
        weight_column: str = 'weight_kg',
        volume_column: str = 'volume_cbm',
        distance_column: str = 'distance_km'
    ) -> pd.DataFrame:
        """
        Extract shipment-specific features.
        
        Args:
            data: Input DataFrame
            weight_column: Name of weight column
            volume_column: Name of volume column
            distance_column: Name of distance column
            
        Returns:
            DataFrame with shipment features added
        """
        df = data.copy()
        
        # Weight-based features
        if weight_column in df.columns:
            weight = df[weight_column]
            df['weight_bin'] = pd.cut(
                weight,
                bins=[0, 5, 25, 100, 500, float('inf')],
                labels=[0, 1, 2, 3, 4]
            ).astype(int)
            df['is_heavy'] = (weight > 100).astype(int)
            df['is_lightweight'] = (weight < 5).astype(int)
            df['weight_log'] = np.log1p(weight)
        
        # Volume-based features
        if volume_column in df.columns:
            volume = df[volume_column]
            df['volume_bin'] = pd.cut(
                volume,
                bins=[0, 0.1, 1, 5, 20, float('inf')],
                labels=[0, 1, 2, 3, 4]
            ).astype(int)
            df['is_bulky'] = (volume > 5).astype(int)
            df['volume_log'] = np.log1p(volume)
        
        # Distance-based features
        if distance_column in df.columns:
            distance = df[distance_column]
            df['distance_bin'] = pd.cut(
                distance,
                bins=[0, 10, 50, 200, 500, float('inf')],
                labels=[0, 1, 2, 3, 4]
            ).astype(int)
            df['is_local'] = (distance < 50).astype(int)
            df['is_long_haul'] = (distance > 500).astype(int)
            df['distance_log'] = np.log1p(distance)
        
        # Combined features
        if weight_column in df.columns and distance_column in df.columns:
            df['weight_distance_ratio'] = df[weight_column] / (df[distance_column] + 1)
        
        if volume_column in df.columns and weight_column in df.columns:
            df['density'] = df[weight_column] / (df[volume_column] + 0.001)
        
        logger.debug("Extracted shipment features")
        return df
    
    def extract_historical_features(
        self,
        data: pd.DataFrame,
        value_column: str,
        date_column: str = 'date',
        group_column: Optional[str] = None,
        lag_periods: List[int] = [1, 7, 14, 28],
        rolling_windows: List[int] = [7, 14, 30]
    ) -> pd.DataFrame:
        """
        Extract historical/time-series features.
        
        Args:
            data: Input DataFrame (should be sorted by date)
            value_column: Column to create lag/rolling features from
            date_column: Date column name
            group_column: Optional column to group by
            lag_periods: List of lag periods to create
            rolling_windows: List of rolling window sizes
            
        Returns:
            DataFrame with historical features added
        """
        df = data.copy()
        
        if value_column not in df.columns:
            logger.warning(f"Value column '{value_column}' not found")
            return df
        
        # Sort by date
        if date_column in df.columns:
            df = df.sort_values(date_column)
        
        # Create features per group or for entire dataset
        if group_column and group_column in df.columns:
            groups = df.groupby(group_column)
        else:
            groups = [(None, df)]
        
        result_dfs = []
        
        for group_name, group_df in groups:
            gdf = group_df.copy()
            
            # Lag features
            for lag in lag_periods:
                gdf[f'{value_column}_lag_{lag}'] = gdf[value_column].shift(lag)
            
            # Rolling statistics
            for window in rolling_windows:
                gdf[f'{value_column}_rolling_{window}_mean'] = (
                    gdf[value_column].rolling(window=window, min_periods=1).mean()
                )
                gdf[f'{value_column}_rolling_{window}_std'] = (
                    gdf[value_column].rolling(window=window, min_periods=1).std()
                )
                gdf[f'{value_column}_rolling_{window}_min'] = (
                    gdf[value_column].rolling(window=window, min_periods=1).min()
                )
                gdf[f'{value_column}_rolling_{window}_max'] = (
                    gdf[value_column].rolling(window=window, min_periods=1).max()
                )
            
            # Difference features
            gdf[f'{value_column}_diff_1'] = gdf[value_column].diff(1)
            gdf[f'{value_column}_pct_change'] = gdf[value_column].pct_change()
            
            result_dfs.append(gdf)
        
        df = pd.concat(result_dfs, ignore_index=True)
        
        # Fill NaN values created by lag/rolling
        df = df.fillna(method='bfill')
        
        logger.debug(f"Extracted historical features for '{value_column}'")
        return df
    
    def create_interaction_features(
        self,
        data: pd.DataFrame,
        feature_pairs: List[Tuple[str, str]],
        operations: List[str] = ['multiply', 'divide', 'add', 'subtract']
    ) -> pd.DataFrame:
        """
        Create interaction features between pairs of columns.
        
        Args:
            data: Input DataFrame
            feature_pairs: List of (column1, column2) tuples
            operations: List of operations to apply
            
        Returns:
            DataFrame with interaction features added
        """
        df = data.copy()
        
        for col1, col2 in feature_pairs:
            if col1 not in df.columns or col2 not in df.columns:
                continue
            
            if 'multiply' in operations:
                df[f'{col1}_x_{col2}'] = df[col1] * df[col2]
            if 'divide' in operations:
                df[f'{col1}_div_{col2}'] = df[col1] / (df[col2] + 1e-10)
            if 'add' in operations:
                df[f'{col1}_plus_{col2}'] = df[col1] + df[col2]
            if 'subtract' in operations:
                df[f'{col1}_minus_{col2}'] = df[col1] - df[col2]
        
        logger.debug(f"Created interaction features for {len(feature_pairs)} pairs")
        return df
    
    def create_feature_matrix(
        self,
        data: pd.DataFrame,
        feature_columns: List[str],
        include_time_features: bool = True,
        include_location_features: bool = True,
        datetime_column: Optional[str] = None,
        lat_column: Optional[str] = None,
        lon_column: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Create a complete feature matrix for model training/prediction.
        
        Args:
            data: Input DataFrame
            feature_columns: Base feature columns to include
            include_time_features: Whether to add time features
            include_location_features: Whether to add location features
            datetime_column: Datetime column for time features
            lat_column: Latitude column for location features
            lon_column: Longitude column for location features
            
        Returns:
            Feature matrix DataFrame
        """
        df = data.copy()
        
        # Extract time features
        if include_time_features and datetime_column:
            df = self.extract_time_features(df, datetime_column)
        
        # Extract location features
        if include_location_features and lat_column and lon_column:
            df = self.extract_location_features(df, lat_column, lon_column)
        
        # Select final features
        all_columns = list(df.columns)
        selected_columns = []
        
        for col in feature_columns:
            if col in all_columns:
                selected_columns.append(col)
        
        # Add generated features
        generated_prefixes = ['hour_', 'day_', 'month_', 'is_', 'season', 'lat_zone', 'lon_zone', 'region']
        for col in all_columns:
            if any(col.startswith(prefix) for prefix in generated_prefixes):
                if col not in selected_columns:
                    selected_columns.append(col)
        
        logger.info(f"Created feature matrix with {len(selected_columns)} features")
        return df[selected_columns]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.
    
    Args:
        lat1, lon1: Coordinates of first point
        lat2, lon2: Coordinates of second point
        
    Returns:
        Distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the initial bearing between two points.
    
    Args:
        lat1, lon1: Coordinates of first point
        lat2, lon2: Coordinates of second point
        
    Returns:
        Bearing in degrees (0-360)
    """
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlon = lon2 - lon1
    
    x = sin(dlon) * cos(lat2)
    y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
    
    bearing = atan2(x, y)
    bearing = np.degrees(bearing)
    bearing = (bearing + 360) % 360
    
    return bearing


def get_direction(bearing: float) -> str:
    """
    Convert bearing to compass direction.
    
    Args:
        bearing: Bearing in degrees
        
    Returns:
        Compass direction string
    """
    directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    index = round(bearing / 45) % 8
    return directions[index]


def encode_cyclical(value: float, max_value: float) -> Tuple[float, float]:
    """
    Encode a cyclical feature using sine and cosine.
    
    Args:
        value: Current value
        max_value: Maximum value in the cycle
        
    Returns:
        Tuple of (sin_encoded, cos_encoded)
    """
    angle = 2 * np.pi * value / max_value
    return np.sin(angle), np.cos(angle)
