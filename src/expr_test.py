import unittest
from expr import _tokens, ParseError, parseall, parse

class ExprTest (unittest.TestCase):
    def test_types (self):
        self.assertEqual (parse ('(S O)'),
                          ('S', 'O'))
        self.assertEqual (parse ('(forall (=> nat x (= x x)))'),
                          ('forall', ('=>', 'nat', 'x', ('=', 'x', 'x'))))
        with self.assertRaises (ParseError):
            parse ('(S O')
        with self.assertRaises (ParseError):
            parse ('S O)')
        with self.assertRaises (ParseError):
            parse ('(S O) (S (S O))')

if __name__ == '__main__':
    unittest.main ()

