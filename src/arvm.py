# A reasonable virtual machine.

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

def step (stack):
    stack = list (stack)
    tail = stack[-1]
    tail_type = tail[0]
    if tail_type == 'V':
        if len (stack) > 1:
            value = tail[1]
            stack.pop ()
            _, _, value_list, active_index = stack[-1]
            stack[-1][2][active_index] = value
            stack[-1][3] += 1
        else: pass
    elif tail_type == 'F':
        _, fn, value_list, active_index = stack[-1]
        if active_index < len (value_list):
            stack.push (('E', value_list[active_index]))
        else:
            stack.pop ()
            stack.push (('E', expand_function (fn, value_list)))
    elif tail_type == 'E':
        _, expr = stack[-1]
        ... # TODO
    return tuple (stack)
