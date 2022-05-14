# Checks an arithmetic theory.

# Env items
# def nat x ...
# def stmt x ...
# def (nat,bool) P ...
# typesign type name None
# assume None None prop

DefaultEnv = [
    ('typesign', ('->', 'stmt', 'stmt'), 'not', None),
    ('typesign', ('->', 'stmt', 'stmt', 'stmt'), 'and', None),
    ('typesign', ('->', 'stmt', 'stmt', 'stmt'), 'or', None),
    ('typesign', ('->', 'stmt', 'stmt', 'stmt'), 'impl', None),
    ('typesign', ('->', 'stmt', 'stmt', 'stmt'), 'equiv', None),
    ('typesign', ('->', ('->', 'nat', 'stmt'), 'stmt'), 'forall', None),
    ('typesign', ('->', ('->', 'nat', 'stmt'), 'stmt'), 'exists', None),
    ('typesign', 'nat', 'O', None),
    ('typesign', ('->', 'nat', 'nat'), 'S', None),
    ('typesign', ('->', 'nat', 'nat', 'nat'), '+', None),
    ('typesign', ('->', 'nat', 'nat', 'nat'), '*', None),
    ('typesign', ('->', 'nat', 'nat', 'nat'), '^', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '=', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '!=', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '<', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '>', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '<=', None),
    ('typesign', ('->', 'nat', 'nat', 'stmt'), '>=', None),
]

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
            typop = typeof (env + [('typesign', typ, ip, None)],
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
            raise ValueError (f'Function type mismatch at {expr} with {env}')
        return out

# Statement
# (env, stmt)

