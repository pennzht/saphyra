import efa
import expr

tests = [
    ('(_x : (3 + _y))', '_y', '5'),
    ('(_x : (3 + _y))', '_y', '_x'),
    ('(_x : (_y : (_x _y _z)))', '_z', '(a _x m)')
]

for (exp, var, arg) in tests:
    print (exp, var, arg)
    print (efa.lambda_replace (expr.parse(exp), var, expr.parse(arg)))
    print ()
