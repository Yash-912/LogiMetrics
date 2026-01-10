"""
Price Optimizer Service
Dynamic pricing optimization for logistics services.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)


class PriceOptimizer:
    """
    Dynamic pricing optimizer for logistics services.
    
    Optimizes prices based on:
    - Demand/supply dynamics
    - Time of day/week patterns
    - Distance and weight factors
    - Zone-based pricing
    - Competitive positioning
    - Capacity utilization
    """
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        config: Optional[Any] = None
    ):
        """
        Initialize the price optimizer.
        
        Args:
            model_path: Path to load/save the trained model
            config: Configuration object with pricing settings
        """
        self.model_path = model_path
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_version = "1.0.0"
        self.feature_columns = []
        
        # Pricing constraints
        self.min_margin = 0.1  # 10% minimum margin
        self.max_adjustment = 0.3  # 30% max adjustment
        
        if config:
            self.min_margin = getattr(config, 'PRICE_MIN_MARGIN', 0.1)
            self.max_adjustment = getattr(config, 'PRICE_MAX_ADJUSTMENT', 0.3)
        
        # Base pricing rules (can be overridden)
        self.base_rate_per_km = 15.0  # INR per km
        self.base_rate_per_kg = 5.0   # INR per kg
        self.minimum_charge = 100.0   # Minimum shipment charge
        
        # Zone multipliers
        self.zone_multipliers = {
            'metro': 1.0,
            'urban': 1.1,
            'semi_urban': 1.2,
            'rural': 1.4,
            'remote': 1.6
        }
        
        # Time-of-day multipliers
        self.time_multipliers = {
            'peak': 1.15,    # 8-10 AM, 5-8 PM
            'normal': 1.0,   # Regular hours
            'off_peak': 0.95 # Late night, early morning
        }
        
        # Load existing model if path provided
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def _get_time_period(self, hour: int) -> str:
        """Determine time period based on hour of day."""
        if hour in [8, 9, 10, 17, 18, 19, 20]:
            return 'peak'
        elif hour in [0, 1, 2, 3, 4, 5, 22, 23]:
            return 'off_peak'
        else:
            return 'normal'
    
    def _prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features for price optimization.
        
        Args:
            data: Raw shipment data DataFrame
            
        Returns:
            Prepared features DataFrame
        """
        df = data.copy()
        
        # Distance and weight features
        df['distance_km'] = df.get('distance_km', 10)
        df['weight_kg'] = df.get('weight_kg', 5)
        df['volume_cbm'] = df.get('volume_cbm', 0.1)
        
        # Calculate dimensional weight
        df['dimensional_weight'] = df['volume_cbm'] * 167  # CBM to kg conversion
        df['chargeable_weight'] = df[['weight_kg', 'dimensional_weight']].max(axis=1)
        
        # Time features
        if 'pickup_time' in df.columns:
            df['pickup_datetime'] = pd.to_datetime(df['pickup_time'])
            df['hour_of_day'] = df['pickup_datetime'].dt.hour
            df['day_of_week'] = df['pickup_datetime'].dt.dayofweek
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        else:
            now = datetime.now()
            df['hour_of_day'] = df.get('hour_of_day', now.hour)
            df['day_of_week'] = df.get('day_of_week', now.weekday())
            df['is_weekend'] = df.get('is_weekend', int(now.weekday() in [5, 6]))
        
        df['time_period'] = df['hour_of_day'].apply(self._get_time_period)
        df['time_multiplier'] = df['time_period'].map(self.time_multipliers)
        
        # Zone features
        df['origin_zone'] = df.get('origin_zone', 'urban')
        df['destination_zone'] = df.get('destination_zone', 'urban')
        df['origin_multiplier'] = df['origin_zone'].map(self.zone_multipliers).fillna(1.0)
        df['destination_multiplier'] = df['destination_zone'].map(self.zone_multipliers).fillna(1.0)
        df['zone_multiplier'] = (df['origin_multiplier'] + df['destination_multiplier']) / 2
        
        # Service type features
        df['is_express'] = df.get('is_express', 0)
        df['is_fragile'] = df.get('is_fragile', 0)
        df['is_cod'] = df.get('is_cod', 0)  # Cash on delivery
        df['is_insured'] = df.get('is_insured', 0)
        
        # Demand features
        df['demand_factor'] = df.get('demand_factor', 1.0)
        df['capacity_utilization'] = df.get('capacity_utilization', 0.7)
        
        return df
    
    def train(
        self,
        training_data: pd.DataFrame,
        target_column: str = 'accepted_price'
    ) -> Dict[str, Any]:
        """
        Train the price prediction model based on historical data.
        
        Args:
            training_data: Historical shipment data with accepted prices
            target_column: Column containing accepted/final prices
            
        Returns:
            Dictionary containing training metrics
        """
        logger.info(f"Training price model with {len(training_data)} samples")
        
        # Prepare features
        df = self._prepare_features(training_data)
        
        # Define feature columns
        self.feature_columns = [
            'distance_km', 'chargeable_weight', 'hour_of_day', 'day_of_week',
            'is_weekend', 'time_multiplier', 'zone_multiplier',
            'is_express', 'is_fragile', 'is_cod', 'is_insured',
            'demand_factor', 'capacity_utilization'
        ]
        
        # Ensure all columns exist
        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        X = df[self.feature_columns].fillna(0)
        y = df[target_column]
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Gradient Boosting model
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.model.fit(X_scaled, y)
        
        # Calculate metrics
        y_pred = self.model.predict(X_scaled)
        
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        metrics = {
            'mae': mean_absolute_error(y, y_pred),
            'rmse': np.sqrt(mean_squared_error(y, y_pred)),
            'r2': r2_score(y, y_pred),
            'samples_trained': len(X),
            'avg_price': float(y.mean()),
            'price_range': [float(y.min()), float(y.max())]
        }
        
        # Feature importance
        feature_importance = dict(zip(self.feature_columns, self.model.feature_importances_))
        metrics['top_features'] = dict(sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5])
        
        self.is_trained = True
        logger.info(f"Price model trained. MAE: {metrics['mae']:.2f}")
        
        return metrics
    
    def calculate_price(
        self,
        shipment: Dict[str, Any],
        include_breakdown: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate optimized price for a shipment.
        
        Args:
            shipment: Shipment details
            include_breakdown: Whether to include price breakdown
            
        Returns:
            Price calculation result with components
        """
        # Prepare features
        df = pd.DataFrame([shipment])
        df = self._prepare_features(df)
        row = df.iloc[0]
        
        # Calculate base price
        distance_km = row['distance_km']
        chargeable_weight = row['chargeable_weight']
        
        distance_charge = distance_km * self.base_rate_per_km
        weight_charge = chargeable_weight * self.base_rate_per_kg
        base_price = max(distance_charge + weight_charge, self.minimum_charge)
        
        # Apply zone multiplier
        zone_multiplier = row['zone_multiplier']
        base_price *= zone_multiplier
        
        # Apply time multiplier
        time_multiplier = row['time_multiplier']
        base_price *= time_multiplier
        
        # Apply service surcharges
        surcharges = 0
        surcharge_details = []
        
        if row.get('is_express', 0):
            express_surcharge = base_price * 0.5
            surcharges += express_surcharge
            surcharge_details.append({'type': 'Express', 'amount': round(express_surcharge, 2)})
        
        if row.get('is_fragile', 0):
            fragile_surcharge = base_price * 0.15
            surcharges += fragile_surcharge
            surcharge_details.append({'type': 'Fragile Handling', 'amount': round(fragile_surcharge, 2)})
        
        if row.get('is_cod', 0):
            cod_surcharge = 30 + (base_price * 0.02)
            surcharges += cod_surcharge
            surcharge_details.append({'type': 'COD', 'amount': round(cod_surcharge, 2)})
        
        if row.get('is_insured', 0):
            declared_value = shipment.get('declared_value', base_price * 10)
            insurance_surcharge = declared_value * 0.01
            surcharges += insurance_surcharge
            surcharge_details.append({'type': 'Insurance', 'amount': round(insurance_surcharge, 2)})
        
        subtotal = base_price + surcharges
        
        # Apply demand-based dynamic pricing
        demand_factor = row.get('demand_factor', 1.0)
        capacity_utilization = row.get('capacity_utilization', 0.7)
        
        # Calculate surge multiplier
        surge_multiplier = 1.0
        if demand_factor > 1.2 or capacity_utilization > 0.85:
            surge = min(
                (demand_factor - 1) * 0.5 + (capacity_utilization - 0.7) * 0.3,
                self.max_adjustment
            )
            surge_multiplier = 1 + surge
        elif demand_factor < 0.8 or capacity_utilization < 0.4:
            discount = min(
                (1 - demand_factor) * 0.3 + (0.7 - capacity_utilization) * 0.2,
                self.max_adjustment
            )
            surge_multiplier = 1 - discount
        
        dynamic_price = subtotal * surge_multiplier
        
        # Use ML model for price optimization if trained
        ml_suggested_price = None
        if self.is_trained and self.model is not None:
            for col in self.feature_columns:
                if col not in df.columns:
                    df[col] = 0
            X = df[self.feature_columns].fillna(0)
            X_scaled = self.scaler.transform(X)
            ml_suggested_price = float(self.model.predict(X_scaled)[0])
        
        # Final price (blend of rule-based and ML if available)
        if ml_suggested_price is not None:
            # Weighted average: 60% rules, 40% ML
            final_price = (dynamic_price * 0.6) + (ml_suggested_price * 0.4)
        else:
            final_price = dynamic_price
        
        # Calculate taxes (GST)
        gst_rate = 0.18
        gst_amount = final_price * gst_rate
        total_price = final_price + gst_amount
        
        result = {
            'base_price': round(base_price, 2),
            'surcharges': round(surcharges, 2),
            'subtotal': round(subtotal, 2),
            'surge_multiplier': round(surge_multiplier, 3),
            'dynamic_price': round(dynamic_price, 2),
            'gst': round(gst_amount, 2),
            'total_price': round(total_price, 2),
            'currency': 'INR',
            'model_version': self.model_version
        }
        
        if include_breakdown:
            result['breakdown'] = {
                'distance_charge': round(distance_km * self.base_rate_per_km, 2),
                'weight_charge': round(chargeable_weight * self.base_rate_per_kg, 2),
                'zone_multiplier': round(zone_multiplier, 2),
                'time_multiplier': round(time_multiplier, 2),
                'surcharges': surcharge_details,
                'demand_factor': round(demand_factor, 2),
                'capacity_utilization': round(capacity_utilization, 2)
            }
            if ml_suggested_price:
                result['breakdown']['ml_suggested_price'] = round(ml_suggested_price, 2)
        
        return result
    
    def get_quote(
        self,
        shipment: Dict[str, Any],
        include_alternatives: bool = True
    ) -> Dict[str, Any]:
        """
        Get a price quote with multiple service options.
        
        Args:
            shipment: Shipment details
            include_alternatives: Include alternative service options
            
        Returns:
            Quote with pricing options
        """
        # Standard pricing
        standard = self.calculate_price({**shipment, 'is_express': 0})
        
        quote = {
            'quote_id': f"Q{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'created_at': datetime.now().isoformat(),
            'valid_until': (datetime.now() + timedelta(hours=24)).isoformat(),
            'standard': {
                'service': 'Standard',
                'price': standard['total_price'],
                'estimated_days': self._estimate_delivery_days(shipment, 'standard'),
                'breakdown': standard.get('breakdown')
            },
            'model_version': self.model_version
        }
        
        if include_alternatives:
            # Express pricing
            express = self.calculate_price({**shipment, 'is_express': 1})
            quote['express'] = {
                'service': 'Express',
                'price': express['total_price'],
                'estimated_days': self._estimate_delivery_days(shipment, 'express'),
                'premium': round(express['total_price'] - standard['total_price'], 2)
            }
            
            # Economy pricing (off-peak)
            economy_shipment = {**shipment, 'time_period': 'off_peak', 'is_express': 0}
            economy = self.calculate_price(economy_shipment)
            quote['economy'] = {
                'service': 'Economy',
                'price': round(economy['total_price'] * 0.85, 2),  # Additional discount
                'estimated_days': self._estimate_delivery_days(shipment, 'economy'),
                'savings': round(standard['total_price'] - (economy['total_price'] * 0.85), 2)
            }
        
        return quote
    
    def _estimate_delivery_days(
        self,
        shipment: Dict[str, Any],
        service_type: str
    ) -> str:
        """Estimate delivery time based on service type and distance."""
        distance = shipment.get('distance_km', 50)
        
        if service_type == 'express':
            if distance <= 50:
                return '4-6 hours'
            elif distance <= 200:
                return 'Same day'
            else:
                return '1-2 days'
        elif service_type == 'economy':
            if distance <= 100:
                return '3-5 days'
            else:
                return '5-7 days'
        else:  # standard
            if distance <= 50:
                return '1 day'
            elif distance <= 200:
                return '1-2 days'
            elif distance <= 500:
                return '2-3 days'
            else:
                return '3-5 days'
    
    def analyze_pricing_performance(
        self,
        historical_data: pd.DataFrame,
        price_column: str = 'quoted_price',
        accepted_column: str = 'was_accepted'
    ) -> Dict[str, Any]:
        """
        Analyze pricing performance and suggest optimizations.
        
        Args:
            historical_data: Historical quote data
            price_column: Column with quoted prices
            accepted_column: Column indicating acceptance
            
        Returns:
            Pricing analysis and recommendations
        """
        df = historical_data.copy()
        
        # Overall acceptance rate
        acceptance_rate = df[accepted_column].mean() if accepted_column in df.columns else 0.5
        
        # Price elasticity analysis
        df['price_bucket'] = pd.qcut(df[price_column], q=5, labels=['Very Low', 'Low', 'Medium', 'High', 'Very High'])
        
        bucket_analysis = df.groupby('price_bucket').agg({
            price_column: 'mean',
            accepted_column: 'mean'
        }).to_dict('index') if accepted_column in df.columns else {}
        
        # Identify optimal price range
        if accepted_column in df.columns:
            best_bucket = max(bucket_analysis.items(), 
                            key=lambda x: x[1][accepted_column] * x[1][price_column])
            optimal_range = (
                df[df['price_bucket'] == best_bucket[0]][price_column].min(),
                df[df['price_bucket'] == best_bucket[0]][price_column].max()
            )
        else:
            optimal_range = (df[price_column].mean() * 0.9, df[price_column].mean() * 1.1)
        
        analysis = {
            'total_quotes': len(df),
            'acceptance_rate': round(acceptance_rate, 4),
            'avg_price': round(df[price_column].mean(), 2),
            'price_std': round(df[price_column].std(), 2),
            'bucket_performance': bucket_analysis,
            'optimal_price_range': {
                'min': round(optimal_range[0], 2),
                'max': round(optimal_range[1], 2)
            },
            'recommendations': []
        }
        
        # Generate recommendations
        if acceptance_rate < 0.4:
            analysis['recommendations'].append(
                'Low acceptance rate. Consider reducing base prices or offering more discounts.'
            )
        elif acceptance_rate > 0.8:
            analysis['recommendations'].append(
                'High acceptance rate. Consider increasing prices to improve margins.'
            )
        
        return analysis
    
    def update_pricing_rules(
        self,
        base_rate_per_km: Optional[float] = None,
        base_rate_per_kg: Optional[float] = None,
        minimum_charge: Optional[float] = None,
        zone_multipliers: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """Update pricing rules."""
        if base_rate_per_km is not None:
            self.base_rate_per_km = base_rate_per_km
        if base_rate_per_kg is not None:
            self.base_rate_per_kg = base_rate_per_kg
        if minimum_charge is not None:
            self.minimum_charge = minimum_charge
        if zone_multipliers is not None:
            self.zone_multipliers.update(zone_multipliers)
        
        return {
            'base_rate_per_km': self.base_rate_per_km,
            'base_rate_per_kg': self.base_rate_per_kg,
            'minimum_charge': self.minimum_charge,
            'zone_multipliers': self.zone_multipliers
        }
    
    def save_model(self, path: Optional[str] = None) -> str:
        """Save the trained model and pricing rules to disk."""
        save_path = path or self.model_path
        if not save_path:
            raise ValueError("No model path specified")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'model_version': self.model_version,
            'is_trained': self.is_trained,
            'base_rate_per_km': self.base_rate_per_km,
            'base_rate_per_kg': self.base_rate_per_kg,
            'minimum_charge': self.minimum_charge,
            'zone_multipliers': self.zone_multipliers,
            'time_multipliers': self.time_multipliers,
            'min_margin': self.min_margin,
            'max_adjustment': self.max_adjustment,
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
            self.model = model_data.get('model')
            self.scaler = model_data.get('scaler', StandardScaler())
            self.feature_columns = model_data.get('feature_columns', [])
            self.model_version = model_data.get('model_version', '1.0.0')
            self.is_trained = model_data.get('is_trained', False)
            self.base_rate_per_km = model_data.get('base_rate_per_km', 15.0)
            self.base_rate_per_kg = model_data.get('base_rate_per_kg', 5.0)
            self.minimum_charge = model_data.get('minimum_charge', 100.0)
            self.zone_multipliers = model_data.get('zone_multipliers', self.zone_multipliers)
            self.time_multipliers = model_data.get('time_multipliers', self.time_multipliers)
            self.min_margin = model_data.get('min_margin', 0.1)
            self.max_adjustment = model_data.get('max_adjustment', 0.3)
            
            logger.info(f"Model loaded from {load_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the optimizer."""
        return {
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'model_type': type(self.model).__name__ if self.model else 'Rule-based',
            'base_rate_per_km': self.base_rate_per_km,
            'base_rate_per_kg': self.base_rate_per_kg,
            'minimum_charge': self.minimum_charge,
            'min_margin': self.min_margin,
            'max_adjustment': self.max_adjustment,
            'zone_multipliers': self.zone_multipliers,
            'time_multipliers': self.time_multipliers
        }


# Convenience function
def calculate_shipping_price(
    distance_km: float,
    weight_kg: float,
    is_express: bool = False,
    zone: str = 'urban'
) -> Dict[str, Any]:
    """
    Quick price calculation without managing optimizer instance.
    
    Args:
        distance_km: Distance in kilometers
        weight_kg: Weight in kilograms
        is_express: Whether express delivery
        zone: Delivery zone type
        
    Returns:
        Price calculation result
    """
    optimizer = PriceOptimizer()
    
    shipment = {
        'distance_km': distance_km,
        'weight_kg': weight_kg,
        'is_express': int(is_express),
        'destination_zone': zone
    }
    
    return optimizer.calculate_price(shipment)
