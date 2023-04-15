import expr
import arvm

expressions = [
    '(+ 1 2)',
    '(+ (* 3 4) (+ 1 2))',
    '(if (> 2 1) 12 34)',
#    '(globals [(x) 3] (x))',
#    '(globals [(f n) (* n n n)] (f 5))',
]

for e in expressions:
    v = expr.parse (e)
    s = arvm.initstack (v)
    print (s)
    while s != arvm.step (s):
        s = arvm.step (s)
        print (s)
    print ()


