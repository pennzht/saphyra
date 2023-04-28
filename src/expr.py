# Expressions.

# An expression is a string or a tuple of strings.

from itertools import chain

_OPEN = 0
_CLOSE = 1
_END = -1

_BREAKERS = {' ', '\t', '\n', '\r', _END}
_OPENS = {'(', '['}
_CLOSES = {')', ']'}

class ParseError (Exception):
    def __init__ (self, reason):
        self.reason = reason

    def __str__ (self):
        return f'ParseError: {self.reason}'

def _tokens (string):
    'Turns a string into tokens.'
    queue = []
    for char in chain (string, [_END]):
        if char in set.union (_BREAKERS, _OPENS, _CLOSES):
            if queue:
                yield ''.join (queue)
            queue.clear ()
            # Handle parentheses
            if char in _OPENS:
                yield _OPEN
            elif char in _CLOSES:
                yield _CLOSE
        else:
            queue.append (char)
    assert not queue

def parseall (string):
    'Parses a string as expressions.'
    tokens = _tokens (string)
    stack = [[]]
    for t in tokens:
        if t == _OPEN:
            stack.append ([])
        elif t == _CLOSE:
            if len (stack) > 1:
                stack[-2].append (tuple (stack[-1]))
                stack.pop ()
            else:
                raise ParseError ('Too many close parentheses')
        else:
            stack[-1].append (t)
    # Return stack
    if len (stack) != 1:
        raise ParseError ('Too many open parentheses')
    # Normal
    [ans] = stack
    return ans

def parse (string):
    expr = parseall (string)
    if len (expr) == 1:
        [ans] = expr
        return ans
    else:
        raise ParseError ('Too many expressions')

def data (filename):
    with open (filename, 'r') as f:
        ans = f.read ()
        return parseall (ans)

import pprint

def pr (*args, **kwargs):
    return pprint.PrettyPrinter (indent=4).pprint (*args, **kwargs)

### Custom pretty-printer

# returns list of (indent, line)
def format_lines (obj, depth, wlimit):
    if type (obj) in {tuple, list}:
        subs = [format_lines (subobj, depth + 1, wlimit)
                for subobj in obj]
        if all (len (sub) == 1 for sub in subs):
            current_size = (sum (len (l) for [(_, l)] in subs) +
                            max (0, len (subs) - 1) + 2)
            if current_size <= wlimit:
                line = ' '.join (line for [(_, line)] in subs)
                return [(0, '(' + line + ')')]
        # Normal structure of broken lines
        ans = []
        for sub in subs:
            for (indent, line) in sub:
                ans.append ((indent+1, line))
        # Add parentheses
        indent, line = ans[0]
        ans[0] = indent-1, '(' + line
        ans[-1] = ans[-1][0], ans[-1][1]+')'
        return ans
    else:
        return [(0, str (obj))]
            
def purr (obj):
    lines = format_lines (obj, 0, 40)
    return ''.join (' ' * indent + line + '\n' for (indent, line) in lines)

print (purr (parse ('(+ a b c)')))

print (purr (data ('arith.blue')))
