import unittest
from arith import typeof, DefaultEnv, match

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

class MatchTest (unittest.TestCase):
    def test_matching (self):
        self.assertEqual (match ([('>', '1', '0'),
                                  ('>', '2', '1'),
                                  ('and', ('>', '1', '0'), ('>', '2', '1'))],
                                 ['*a', '*b', ('and', '*a', '*b')]),
                          {1: True, '*a': ('>', '1', '0'), '*b': ('>', '2', '1')})
        self.assertEqual (match (['P',
                                  ('->', 'P', 'Q'),
                                  ('->', 'Q', 'R')],
                                 ['*a', ('->', '*a', '*b'), ('->', '*b', '*c')]),
                          {1: True, '*a': 'P', '*b': 'Q', '*c': 'R'})

if __name__ == '__main__':
    unittest.main ()


