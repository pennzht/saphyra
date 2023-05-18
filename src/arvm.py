# A reasonable virtual machine.

import functools
import operator as op

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
    ["F" env function value-list active-value-index]
    ["V" value]
    ["E" env expression]
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

def expand_function (fn, env, value_list, stack):
    natives = {'-': op.sub, 'div': op.floordiv, 'mod': op.mod,
               '^': op.pow, '>': op.gt, '>=': op.ge,
               '<': op.lt, '<=': op.le, '!=': op.ne, '=': op.eq,}
    if fn == '+':
        return env, sum (value_list)
    elif fn == '*':
        return env, functools.reduce (op.mul, value_list, 1)
    elif fn == 'not':
        return env, 0 if value_list[0] else 1
    elif fn in natives:
        return env, natives[fn](value_list[0], value_list[1])
    else:
        # User-defined function
        for elem in stack:
            if type (elem) is tuple and elem[0] == 'G':
                # global
                (_g, name, args, body) = elem
                if fn == name and len (args) == len (value_list):
                    # Good, expand
                    newenv = {**env}
                    for (argname, argval) in zip (args, value_list):
                        newenv[argname] = argval
                    return newenv, body
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
            _f, env, fn_name, value_list, active_index = stack.pop ()
            stack.append ((_f, env, fn_name, replace_index (value_list, active_index, value), active_index+1))
        else: pass
    elif tail_type == 'F':
        _, env, fn, value_list, active_index = stack[-1]
        # Special case: if
        if fn == 'if':
            if active_index == 0:
                stack.append (('E', env, value_list[0]))
            else:
                stack.pop ()
                if value_list[0]:
                    stack.append (('E', env, value_list[1]))
                else:
                    stack.append (('E', env, value_list[2]))
        else:
            if active_index < len (value_list):
                stack.append (('E', env, value_list[active_index]))
            else:
                stack.pop ()
                stack.append (('E', * expand_function (fn, env, value_list, stack)))
    elif tail_type == 'E':
        _, env, expr = stack.pop ()
        if isinstance (expr, tuple):
            # Function application
            stack.append (('F', env, expr[0], expr[1:], 0))
        elif isinstance (expr, str) and expr in env:
            stack.append (('V', env[expr]))
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
        ans.append (('E', {}, value[-1]))
    else:
        ans.append (('E', {}, value))
    return tuple (ans)

