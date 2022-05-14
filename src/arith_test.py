import unittest
from arith import typeof, DefaultEnv

class ArithTest (unittest.TestCase):
    def test_types (self):
            self.assertEqual (typeof (DefaultEnv,
                                      ('S', 'O')),
                              'nat')
            self.assertEqual (typeof (DefaultEnv,
                                      ('forall', ('=>', 'nat', 'x', ('=', 'x', 'x')))),
                              'stmt')
            self.assertEqual (typeof (DefaultEnv,
                                      ('=>', 'nat', 'x', ('+', 'x', ('S', ('S', 'O'))))),
                              ('->', 'nat', 'nat'))
            with self.assertRaises (ValueError):
                typeof (DefaultEnv, ('+', 'O'))

if __name__ == '__main__':
    unittest.main ()


