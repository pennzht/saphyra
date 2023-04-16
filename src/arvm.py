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
each frame is one of:
    ["D" function args-list body]
    ["F" function value-list active-value-index]
    ["V" value]
    ["E" expression]
'''

def replace_args (args, value_list, body):
    if type (body) in {list, tuple}:
        return tuple (replace_args (args, value_list, x)
                      for x in body)
    else:
        for (a, b) in zip (args, value_list):
            if a == body:
                return b
        return body

def expand_function (fn, value_list, stack):
    if fn == '+':
        return sum (value_list)
    elif fn == '-':
        return value_list[0] - value_list[1]
    elif fn == '*':
        return functools.reduce (operator.mul, value_list, 1)
    elif fn == 'div':
        return value_list[0] // value_list[1] if value_list[1] else None
    elif fn == 'mod':
        return value_list[0] % value_list[1] if value_list[1] else None
    elif fn == '^':
        return value_list[0] ** value_list[1] if value_list[1] >= 0 else 0
    elif fn == '>':
        return value_list[0] > value_list[1]
    elif fn == '>=':
        return value_list[0] >= value_list[1]
    else:
        # User-defined function
        for elem in stack:
            if type (elem) is tuple and elem[0] == 'G':
                # global
                (_g, name, args, body) = elem
                if fn == name and len (args) == len (value_list):
                    # Good, replace
                    return replace_args (args, value_list, body)
            else:
                break
    return f'Unidentified function {fn}'

def replace_index (l, ind, value):
    l = list (l)
    l[ind] = value
    return tuple (l)

def step (stack):
    if type (stack) not in {tuple, list}:
        return stack  # Error

    stack = list (stack)
    tail = stack[-1]
    tail_type = tail[0]
    if tail_type == 'V':
        if len (stack) > 1 and stack[-2][0] == 'F':
            value = tail[1]
            stack.pop ()
            _f, fn_name, value_list, active_index = stack.pop ()
            stack.append ((_f, fn_name, replace_index (value_list, active_index, value), active_index+1))
        else: pass
    elif tail_type == 'F':
        _, fn, value_list, active_index = stack[-1]
        # Special case: if
        if fn == 'if':
            if active_index == 0:
                stack.append (('E', value_list[0]))
            else:
                stack.pop ()
                if value_list[0]:
                    stack.append (('E', value_list[1]))
                else:
                    stack.append (('E', value_list[2]))
        else:
            if active_index < len (value_list):
                stack.append (('E', value_list[active_index]))
            else:
                stack.pop ()
                stack.append (('E', expand_function (fn, value_list, stack)))
    elif tail_type == 'E':
        _, expr = stack.pop ()
        if isinstance (expr, tuple):
            # Function application
            stack.append (('F', expr[0], expr[1:], 0))
        else:
            stack.append (('V', int (expr)))
    return tuple (stack)

def initstack (value):
    ans = []
    if isinstance (value, tuple) and value and value[0] == 'globals':
        # Define globals
        if len (value) >= 2:
            for (a, b) in value[1:-1]:
                ans.append (('G', a[0], a[1:], b))
        ans.append (('E', value[-1]))
    else:
        ans.append (('E', value))
    return tuple (ans)

