"""
LogiMetrics ML Service Tests
Test suite for ML service components.
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test configuration
TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'test')
TEST_MODEL_DIR = os.path.join(os.path.dirname(__file__), 'test_models')


def run_all_tests():
    """Run all test suites."""
    import unittest
    
    # Discover and run all tests
    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir=os.path.dirname(__file__),
        pattern='test_*.py'
    )
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
