# A reasonable virtual machine.

import functools
import operator

'''
Design

Basic types
* symbols
* numbers
* booleans

Composed types
* arrays

Stack structure
[frame0 frame1 ...... active-frame]
each frame is: ["F" function value-list active-value-index] or ["V" value] or ["E" expression]
'''

def expand_function (fn, value_list):
    if fn == '+':
        return sum (value_list)
    elif fn == '*':
        return functools.reduce (operator.mul, value_list, 1)
    elif fn == '>':
        return value_list[0] > value_list[1]
    elif fn == 'if':
        a, b, c = value_list
        return b if a else c
    raise Exception (f'Unidentified function {fn}')

def replace_index (l, ind, value):
    l = list (l)
    l[ind] = value
    return tuple (l)

def step (stack):
    stack = list (stack)
    tail = stack[-1]
    tail_type = tail[0]
    if tail_type == 'V':
        if len (stack) > 1:
            value = tail[1]
            stack.pop ()
            _f, fn_name, value_list, active_index = stack.pop ()
            stack.append ((_f, fn_name, replace_index (value_list, active_index, value), active_index+1))
        else: pass
    elif tail_type == 'F':
        _, fn, value_list, active_index = stack[-1]
        if active_index < len (value_list):
            stack.append (('E', value_list[active_index]))
        else:
            stack.pop ()
            stack.append (('E', expand_function (fn, value_list)))
    elif tail_type == 'E':
        _, expr = stack.pop ()
        if isinstance (expr, tuple):
            # Function application
            stack.append (('F', expr[0], expr[1:], 0))
        else:
            stack.append (('V', int (expr)))
    return tuple (stack)

def initstack (value):
    return (('E', value),)
