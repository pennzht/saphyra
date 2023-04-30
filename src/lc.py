# Interactive for lambda calculus.

import expr
import sys
from lambdas import *

pr = expr.pr

def sub_by_path (term, path):
    if not path:
        return term
    else:
        return sub_by_path (term[path[0]], path[1:])

def replace_by_path (term, path, target):
    if not path:
        return target
    else:
        ans = list (term)
        ans[path[0]] = replace_by_path (ans[path[0]], path[1:], target)
        return tuple (ans)

'''\
Try typing:
    goal [[(_a : (_b : _a)) _b] _m]
    path 0
    path

And:
    goal [[(_a : (_b : _a)) _b] _m]
    path
'''
def verify ():
    try:
        goal = ('_a', ':', '_a')
        for line in sys.stdin:
            row = expr.parseall (line)
            assert isseq (row)
            if hashead (row, 'goal'):
                goal = row[1]
                print ('goal>', expr.purr (goal))
            elif hashead (row, 'path'):
                path = tuple (int(x) for x in row[1:])
                if is_redux (sub_by_path (goal, path)):
                    redux = sub_by_path (goal, path)
                    reduced = lambda_b_reduce (redux[0], redux[1], bindings_by (goal, path))
                    goal = replace_by_path (goal, path, reduced)
                else:
                    print ('Not a redux:', expr.purr (sub_by_path (goal, path)))
                print ('goal>', expr.purr (goal))

    except ValueError:
        raise ProofSyntaxError (row)
    except AssertionError:
        raise ProofSyntaxError (row)
    # Success!
    return True

if __name__ == '__main__':
    ans = verify ()
    if ans:
        exit (0)
    else:
        exit (111)

