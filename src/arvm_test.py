import expr
import arvm

expressions = [
    '(+ 1 2)',
    '(+ (* 3 4) (+ 1 2))',
    '(if (> 2 1) 12 34)',
    '(globals [(x) 3] (x))',
    '(globals [(f n) (* n n n)] (f 5))',

    # Complex operation
    '''
    (globals [(fib n)
              (if (> n 1) (+ (fib (- n 1)) (fib (- n 2)))
                  n)]
     (fib 6))
    ''',

    # Exponentiation
    '''
    (globals
        [(expt a b)
         (if (= b 0) 1 (* a (expt a (- b 1))))]
     (expt 3 5)
    )
    ''',

    # Exponentiation with computations in parts
    '''
    (^ (+ 1 2) (+ 1 9))
    '''
]

for e in expressions:
    v = expr.parse (e)
    s = arvm.initstack (v)
    print (s)
    while s != arvm.step (s):
        s = arvm.step (s)
        print (s)
    print ()


