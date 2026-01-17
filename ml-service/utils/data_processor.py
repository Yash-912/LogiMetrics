"""
Data Processor Utility
Data preprocessing utilities for ML models in the LogiMetrics platform.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder, RobustScaler
from sklearn.impute import SimpleImputer

logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Comprehensive data preprocessing utility for ML pipelines.
    
    Handles:
    - Data cleaning and validation
    - Missing value imputation
    - Outlier detection and handling
    - Data normalization and scaling
    - Categorical encoding
    - Data type conversions
    """
    
    def __init__(self, config: Optional[Any] = None):
        """
        Initialize the data processor.
        
        Args:
            config: Configuration object with processing settings
        """
        self.config = config
        self.scalers = {}
        self.encoders = {}
        self.imputers = {}
        self.fitted = False
        
    def clean_data(
        self,
        data: pd.DataFrame,
        drop_duplicates: bool = True,
        drop_na_threshold: float = 0.5,
        reset_index: bool = True
    ) -> pd.DataFrame:
        """
        Clean raw data by removing duplicates and handling missing values.
        
        Args:
            data: Input DataFrame
            drop_duplicates: Whether to remove duplicate rows
            drop_na_threshold: Drop columns with NA ratio above this threshold
            reset_index: Whether to reset the index after cleaning
            
        Returns:
            Cleaned DataFrame
        """
        df = data.copy()
        initial_rows = len(df)
        initial_cols = len(df.columns)
        
        # Drop duplicate rows
        if drop_duplicates:
            df = df.drop_duplicates()
            logger.debug(f"Removed {initial_rows - len(df)} duplicate rows")
        
        # Drop columns with too many missing values
        na_ratios = df.isna().mean()
        cols_to_drop = na_ratios[na_ratios > drop_na_threshold].index.tolist()
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)
            logger.debug(f"Dropped {len(cols_to_drop)} columns with >{drop_na_threshold*100}% missing values")
        
        # Reset index
        if reset_index:
            df = df.reset_index(drop=True)
        
        logger.info(f"Data cleaned: {initial_rows} -> {len(df)} rows, {initial_cols} -> {len(df.columns)} columns")
        return df
    
    def handle_missing_values(
        self,
        data: pd.DataFrame,
        numeric_strategy: str = 'median',
        categorical_strategy: str = 'most_frequent',
        columns: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Handle missing values with appropriate imputation strategies.
        
        Args:
            data: Input DataFrame
            numeric_strategy: Strategy for numeric columns ('mean', 'median', 'most_frequent', 'constant')
            categorical_strategy: Strategy for categorical columns ('most_frequent', 'constant')
            columns: Specific columns to impute (None = all columns)
            
        Returns:
            DataFrame with imputed values
        """
        df = data.copy()
        
        if columns is None:
            columns = df.columns.tolist()
        
        numeric_cols = df[columns].select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df[columns].select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Impute numeric columns
        if numeric_cols:
            imputer_key = f'numeric_{numeric_strategy}'
            if imputer_key not in self.imputers:
                self.imputers[imputer_key] = SimpleImputer(strategy=numeric_strategy)
                df[numeric_cols] = self.imputers[imputer_key].fit_transform(df[numeric_cols])
            else:
                df[numeric_cols] = self.imputers[imputer_key].transform(df[numeric_cols])
        
        # Impute categorical columns
        if categorical_cols:
            imputer_key = f'categorical_{categorical_strategy}'
            if imputer_key not in self.imputers:
                self.imputers[imputer_key] = SimpleImputer(strategy=categorical_strategy)
                df[categorical_cols] = self.imputers[imputer_key].fit_transform(df[categorical_cols])
            else:
                df[categorical_cols] = self.imputers[imputer_key].transform(df[categorical_cols])
        
        logger.debug(f"Imputed missing values in {len(numeric_cols)} numeric and {len(categorical_cols)} categorical columns")
        return df
    
    def normalize(
        self,
        data: pd.DataFrame,
        columns: Optional[List[str]] = None,
        method: str = 'standard',
        fit: bool = True
    ) -> pd.DataFrame:
        """
        Normalize numeric columns using specified method.
        
        Args:
            data: Input DataFrame
            columns: Columns to normalize (None = all numeric)
            method: Normalization method ('standard', 'minmax', 'robust')
            fit: Whether to fit the scaler or use existing
            
        Returns:
            Normalized DataFrame
        """
        df = data.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not columns:
            return df
        
        # Select scaler
        scaler_key = f'{method}_{"_".join(sorted(columns)[:3])}'
        
        if fit or scaler_key not in self.scalers:
            if method == 'standard':
                scaler = StandardScaler()
            elif method == 'minmax':
                scaler = MinMaxScaler()
            elif method == 'robust':
                scaler = RobustScaler()
            else:
                raise ValueError(f"Unknown normalization method: {method}")
            
            df[columns] = scaler.fit_transform(df[columns])
            self.scalers[scaler_key] = scaler
            logger.debug(f"Fitted {method} scaler for {len(columns)} columns")
        else:
            df[columns] = self.scalers[scaler_key].transform(df[columns])
            logger.debug(f"Applied existing {method} scaler to {len(columns)} columns")
        
        return df
    
    def encode_categorical(
        self,
        data: pd.DataFrame,
        columns: Optional[List[str]] = None,
        method: str = 'label',
        fit: bool = True
    ) -> pd.DataFrame:
        """
        Encode categorical columns.
        
        Args:
            data: Input DataFrame
            columns: Columns to encode (None = all categorical)
            method: Encoding method ('label', 'onehot', 'ordinal')
            fit: Whether to fit encoders or use existing
            
        Returns:
            Encoded DataFrame
        """
        df = data.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if not columns:
            return df
        
        if method == 'label':
            for col in columns:
                encoder_key = f'label_{col}'
                if fit or encoder_key not in self.encoders:
                    encoder = LabelEncoder()
                    # Handle unseen values by adding 'unknown' category
                    df[col] = df[col].fillna('unknown').astype(str)
                    df[f'{col}_encoded'] = encoder.fit_transform(df[col])
                    self.encoders[encoder_key] = encoder
                else:
                    df[col] = df[col].fillna('unknown').astype(str)
                    # Handle unseen categories
                    known_classes = set(self.encoders[encoder_key].classes_)
                    df[col] = df[col].apply(lambda x: x if x in known_classes else 'unknown')
                    df[f'{col}_encoded'] = self.encoders[encoder_key].transform(df[col])
                    
        elif method == 'onehot':
            df = pd.get_dummies(df, columns=columns, prefix=columns, drop_first=True)
            
        logger.debug(f"Encoded {len(columns)} categorical columns using {method} encoding")
        return df
    
    def remove_outliers(
        self,
        data: pd.DataFrame,
        columns: Optional[List[str]] = None,
        method: str = 'iqr',
        threshold: float = 1.5
    ) -> pd.DataFrame:
        """
        Remove outliers from numeric columns.
        
        Args:
            data: Input DataFrame
            columns: Columns to check for outliers (None = all numeric)
            method: Detection method ('iqr', 'zscore')
            threshold: Threshold for outlier detection (IQR multiplier or z-score)
            
        Returns:
            DataFrame with outliers removed
        """
        df = data.copy()
        initial_rows = len(df)
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        mask = pd.Series([True] * len(df))
        
        for col in columns:
            if method == 'iqr':
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                mask &= (df[col] >= lower_bound) & (df[col] <= upper_bound)
            elif method == 'zscore':
                z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
                mask &= z_scores < threshold
        
        df = df[mask].reset_index(drop=True)
        logger.info(f"Removed {initial_rows - len(df)} outliers using {method} method")
        return df
    
    def prepare_for_training(
        self,
        data: pd.DataFrame,
        target_column: str,
        feature_columns: Optional[List[str]] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare data for model training with train/test split.
        
        Args:
            data: Input DataFrame
            target_column: Name of the target variable column
            feature_columns: List of feature columns (None = all except target)
            test_size: Proportion of data for testing
            random_state: Random seed for reproducibility
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        from sklearn.model_selection import train_test_split
        
        df = data.copy()
        
        if feature_columns is None:
            feature_columns = [col for col in df.columns if col != target_column]
        
        X = df[feature_columns].values
        y = df[target_column].values
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        logger.info(f"Split data: {len(X_train)} train, {len(X_test)} test samples")
        return X_train, X_test, y_train, y_test
    
    def validate_input(
        self,
        data: Dict[str, Any],
        required_fields: List[str],
        field_types: Optional[Dict[str, type]] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate input data for prediction.
        
        Args:
            data: Input data dictionary
            required_fields: List of required field names
            field_types: Optional dict mapping field names to expected types
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        # Check required fields
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
            elif data[field] is None:
                errors.append(f"Field '{field}' cannot be null")
        
        # Check field types
        if field_types:
            for field, expected_type in field_types.items():
                if field in data and data[field] is not None:
                    if not isinstance(data[field], expected_type):
                        errors.append(f"Field '{field}' expected {expected_type.__name__}, got {type(data[field]).__name__}")
        
        return len(errors) == 0, errors


def validate_coordinates(lat: float, lon: float) -> bool:
    """
    Validate geographic coordinates.
    
    Args:
        lat: Latitude value
        lon: Longitude value
        
    Returns:
        True if coordinates are valid
    """
    return -90 <= lat <= 90 and -180 <= lon <= 180


def validate_shipment_data(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate shipment data for ETA prediction.
    
    Args:
        data: Shipment data dictionary
        
    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []
    
    # Required fields
    required = ['origin', 'destination', 'weight_kg']
    for field in required:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    
    # Validate origin coordinates
    if 'origin' in data:
        origin = data['origin']
        if not isinstance(origin, dict) or 'lat' not in origin or 'lng' not in origin:
            errors.append("Origin must have 'lat' and 'lng' coordinates")
        elif not validate_coordinates(origin.get('lat', 0), origin.get('lng', 0)):
            errors.append("Invalid origin coordinates")
    
    # Validate destination coordinates
    if 'destination' in data:
        dest = data['destination']
        if not isinstance(dest, dict) or 'lat' not in dest or 'lng' not in dest:
            errors.append("Destination must have 'lat' and 'lng' coordinates")
        elif not validate_coordinates(dest.get('lat', 0), dest.get('lng', 0)):
            errors.append("Invalid destination coordinates")
    
    # Validate weight
    if 'weight_kg' in data:
        weight = data['weight_kg']
        if not isinstance(weight, (int, float)) or weight <= 0:
            errors.append("Weight must be a positive number")
        elif weight > 50000:  # 50 tons max
            errors.append("Weight exceeds maximum allowed (50000 kg)")
    
    # Validate distance if provided
    if 'distance_km' in data:
        distance = data['distance_km']
        if not isinstance(distance, (int, float)) or distance <= 0:
            errors.append("Distance must be a positive number")
    
    return len(errors) == 0, errors


def sanitize_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize input data by removing dangerous characters and trimming strings.
    
    Args:
        data: Input data dictionary
        
    Returns:
        Sanitized data dictionary
    """
    sanitized = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            # Trim whitespace and remove potentially dangerous characters
            clean_value = value.strip()
            # Remove null bytes and other control characters
            clean_value = ''.join(char for char in clean_value if ord(char) >= 32 or char in '\n\r\t')
            sanitized[key] = clean_value[:10000]  # Limit string length
        elif isinstance(value, dict):
            sanitized[key] = sanitize_input(value)
        elif isinstance(value, list):
            sanitized[key] = [sanitize_input(item) if isinstance(item, dict) else item for item in value]
        else:
            sanitized[key] = value
    
    return sanitized


def convert_to_dataframe(
    data: Union[Dict, List[Dict]],
    columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Convert dictionary or list of dictionaries to DataFrame.
    
    Args:
        data: Input data (dict or list of dicts)
        columns: Optional list of columns to include
        
    Returns:
        DataFrame
    """
    if isinstance(data, dict):
        df = pd.DataFrame([data])
    else:
        df = pd.DataFrame(data)
    
    if columns:
        # Add missing columns with NaN
        for col in columns:
            if col not in df.columns:
                df[col] = np.nan
        df = df[columns]
    
    return df
