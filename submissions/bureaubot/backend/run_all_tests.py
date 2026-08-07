import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_database import BackendTestSuite
from test_auth_rbac import AuthAndRbacTestSuite
from tests.test_api import BureauBotApiTests
from tests.test_eval_50 import BureauBot50EvalTests

if __name__ == "__main__":
    unittest.main()

