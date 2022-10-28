import unittest
from arith import typeof, DefaultEnv, match
from expr import parse as P

class ArithTest (unittest.TestCase):
    def test_types (self):
            self.assertEqual (typeof (DefaultEnv,
                                      P ('(S O)')),
                              'nat')
            self.assertEqual (typeof (DefaultEnv,
                                      P ('(forall (=> nat x (= x x)))')),
                              'stmt')
            self.assertEqual (typeof (DefaultEnv,
                                      P ('(=> nat x (+ x [S [S O]]))')),
                              P ('(-> nat nat)'))
            with self.assertRaises (ValueError):
                typeof (DefaultEnv, P ('(+ O)'))

class MatchTest (unittest.TestCase):
    def test_matching (self):
        self.assertEqual (match ([P ('(> 1 0)'),
                                  P ('(> 2 1)'),
                                  P ('(and [> 1 0] [> 2 1])')],
                                 ['*a', '*b', P ('(and *a *b)')]),
                          {1: True, '*a': P ('(> 1 0)'), '*b': P ('(> 2 1)')})
        self.assertEqual (match (['P',
                                  P ('(-> P Q)'),
                                  P ('(-> Q R)')],
                                 ['*a', P ('(-> *a *b)'), P ('(-> *b *c)')]),
                          {1: True, '*a': 'P', '*b': 'Q', '*c': 'R'})

if __name__ == '__main__':
    unittest.main ()

