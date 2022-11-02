import arith
import expr
import sys

if __name__ == '__main__':
    source = sys.stdin.read ()
    parsed = expr.parseall (source)
    for x in parsed: print (x)
    ... # Get verification


