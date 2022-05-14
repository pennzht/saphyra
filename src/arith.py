# Checks an arithmetic theory.

# Env items
# def nat x ...
# def stmt x ...
# def (nat,bool) P ...
# assume stmt B
# assume nat x
# assume prop P
# builtin

def _get (env, expr):
    for (envtype, typ, name, value) in env:
        if name == expr:
            return (envtype, typ, name, value)
    return None

def typeof (env, expr):
    if isinstance (expr, str):
        ans = _get (env, expr)
        if ans is None:
            raise ValueError (f'Expression {expr} not found in environment {env}')
        else:
            (envtype, typ, name, value) = ans
            return typ
    if isinstance (expr, tuple):
        if not expr:
            raise ValueError (f'Empty expression found with {env}')
        head = expr[0]
        if head == '=>':
            if not len (expr) == 4:
                raise ValueError (f'Syntax error at {expr}')
            [_, typ, ip, op] = expr
            if any (name == ip for (_, _, name, _) in env):
                raise ValueError (f'Reused name {ip} at {expr} with {env}')
            typop = typeof (env + [('assume', typ, ip, None)],
                            op)
            return ('->', typ, typop)
        # Application
        ans = _get (env, head)
        if ans is None:
            raise ValueError (f'Function {head} at {expr} not found with {env}')
        (envtype, typ, name, value) = ans
        # Check application correctness
        [_, *params] = expr
        types = [typeof (env, p) for p in params]
        if not (isinstance (typ, tuple) and typ[0] == '->'):
            raise ValueError (f'Function type mismatch at {expr} with {env}')
        [_, *inlist, out] = typ
        if inlist != types:
            raise ValueError (f'Function type mismatch at {expr} with {inv}')
        return out

DefaultEnv = [
    ('builtin', ('->', ('->', 'nat', 'stmt'), 'stmt'), 'forall', None),
    ('builtin', ('->', ('->', 'nat', 'stmt'), 'stmt'), 'exists', None),
    ('builtin', 'nat', 'O', None),
    ('builtin', ('->', 'nat', 'nat'), 'S', None),
    ('builtin', ('->', 'nat', 'nat', 'nat'), '+', None),
    ('builtin', ('->', 'nat', 'nat', 'nat'), '*', None),
    ('builtin', ('->', 'nat', 'nat', 'nat'), '^', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '=', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '!=', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '<', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '>', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '<=', None),
    ('builtin', ('->', 'nat', 'nat', 'stmt'), '>=', None),
]

if __name__ == '__main__':
    # Run tests.
    print (typeof (DefaultEnv,
                   ('S', 'O')))
    print (typeof (DefaultEnv,
                   ('forall', ('=>', 'nat', 'x', ('=', 'x', 'x')))))
    print (typeof (DefaultEnv,
                   ('=>', 'nat', 'x', ('+', 'x', ('S', ('S', 'O'))))))
