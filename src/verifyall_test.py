import unittest
import os
from general import verify

class VerifyAllTest (unittest.TestCase):
    def test_verify_all (self):
        for file_name in os.listdir ('../theories'):
            with open (os.path.join ('../theories', file_name)) as f:
                data = f.read ()
            self.assertTrue (verify (data, file_name = file_name))

if __name__ == '__main__':
    unittest.main ()

