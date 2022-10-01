# Checks an arithmetic theory.

# Env items
# def
#     def nat x <def>
#     def (-> nat nat) f <def>
#     def (-> nat stmt) P <def>
# typesign type name None
# assume None None prop
# fresh nat x None

DefaultEnv = [
    ('typesign', 'stmt', 'true', None),
    ('typesign', 'stmt', 'false', None),
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

def isseq (o):
    return isinstance (o, tuple) or isinstance (o, list)

def mergematch (m1, m2):
    ans = {**m1}
    for (a, b) in m2.items ():
        if a not in ans:
            ans[a] = b
        elif ans[a] == b:
            pass
        else:
            return False
    return ans

def match (form, pattern):
    '''Returns whether [form] matches [pattern].

    Returns a nonempty object if match succeeds, and
    [False] if match fails.'''
    if isseq (pattern) and len (pattern) == 2 and pattern[0].startswith('**'):
        # Application pattern
        # TODO: use delayed match; afterprocessing for match
        pass # TODO

    if isseq (pattern):
        if not (isseq (form) and len (form) == len (pattern)):
            return False
        ans = {1: True}
        for (subf, subp) in zip (form, pattern):
            subm = match (subf, subp)
            ans = mergematch (ans, subm)
            if not ans:
                return False
        return ans

    elif isinstance (pattern, str):
        if pattern.startswith ('*'):
            # placeholder
            return {1: True, pattern: form}
        elif pattern == form:
            return {1: True}
        else:
            return False

# Statements
# (name, (origin-name, origin-parts), stmt)
# (name, push / pop)

# Axioms.
# The only ones requiring more than `match`
# are `impl-i` and `forall-i`.

def is_valid_derivation (axiom, sentences):
    if axiom == 'and-i':
        return match (sentences, ['*a', '*b', ('and', '*a', '*b')])
    elif axiom == 'and-el':
        return match (sentences, [('and', '*a', '*b'), '*a'])
    elif axiom == 'and-er':
        return match (sentences, [('and', '*a', '*b'), '*b'])
    elif axiom == 'or-il':
        return match (sentences, ['*a', ('or', '*a', '*b')])
    elif axiom == 'or-ir':
        return match (sentences, ['*b', ('or', '*a', '*b')])
    elif axiom == 'or-e':
        return match (sentences, [('or', '*a', '*b'), ('impl', '*a', '*c'), ('impl', '*b', '*c'), '*c'])
    elif axiom == 'true-i':
        return match (sentences, ['true'])
    elif axiom == 'false-e':
        return match (sentences, [('impl', 'false', '*a')])
    elif axiom == 'not-i':
        return match (sentences, [('impl', '*a', 'false'), ('not', '*a')])
    elif axiom == 'not-e':
        return match (sentences, [('not', '*a'), ('impl', '*a', 'false')])
    elif axiom == 'impl-e':
        return match (sentences, [('impl', '*a', '*b'), '*a', '*b'])
    elif axiom == 'impl-i':
        # impl introduction
        if len (sentences) != 2:
            return False
        [(env1, stmt1), (env2, stmt2)] = sentences
        if not (len (env1) == len (env2) + 1 and env1[:-1] == env2):
            return False
        return match ([env1[-1], stmt1, stmt2],
                      ['*a', '*b', ('impl', '*a', '*b')])
    elif axiom == 'equiv-el':
        return match (sentences, [('equiv', '*a', '*b'), ('impl', '*a', '*b')])
    elif axiom == 'equiv-er':
        return match (sentences, [('equiv', '*a', '*b'), ('impl', '*b', '*a')])
    elif axiom == 'forall-i':
        # forall introduction
        if len (sentences) != 2:
            return False
        [(env1, stmt1), (env2, stmt2)] = sentences
        if not (len (env1) == len (env2) + 1 and env1[:-1] == env2):
            return False
        return match ([env1[-1], stmt1, stmt2],
                      [('fresh', 'nat', '*a', None),
                       '*s',
                       ('forall', ('=>', '*a', '*s'))])
    elif axiom == 'forall-e':
        return match (sentences, [('forall', ('=>', '*n', ('**p', '*n'))),
                                  ('**p', '*m')])
    elif axiom == 'exists-i':
        return match (sentences, [('**p', '*m'),
                                  ('exists', ('=>', '*n', ('**p', '*n')))])
    elif axiom == 'exists-e':
        return match (sentences, [('exists', ('=>', '*n', ('**p', '*n'))),
                                  ('forall', ('=>', '*n', ('impl',
                                                           ('**p', '*n'),
                                                           '*q'))),
                                  '*q'])
    elif axiom == '=-i':
        return match (sentences, [('=', '*a', '*a')])
    elif axiom == '=-e':
        return match (sentences, [('=', '*a', '*b'),
                                  ('**p', '*a'),
                                  ('**p', '*b')])
    elif axiom == 'peano-0':
        return match (sentences, [('=', ('S', '*a'), ('S', '*b')),
                                  ('=', '*a', '*b')])
    elif axiom == 'peano-1':
        return match (sentences, [('not', ('=', ('S', '*a'), 'O'))])
    elif axiom == 'peano-2':
        return match (sentences, [('**p', 'O'),
                                  ('forall', ('=>', 'nat', 'n', ('impl', ('**p', 'n'),
                                                                 ('**p', ('S', 'n'))))),
                                  ('forall', ('=>', 'nat', 'n', ('**p', 'n')))])
    elif axiom == '+-0':
        return match (sentences, [('=', ('+', '*a', 'O'), '*a')])
    elif axiom == '+-S':
        return match (sentences, [('=', ('+', '*a', ('S', '*b')), ('S', ('+', '*a', '*b')))])
    elif axiom == '*-0':
        return match (sentences, [('=', ('*', '*a', 'O'), 'O')])
    elif axiom == '*-S':
        return match (sentences, [('=', ('*', '*a', ('S', '*b')),
                                   ('+', '*a', ('*', '*a', '*b')))])
    elif axiom == '^-0':
        return match (sentences, [('=', ('^', '*a', 'O'), ('S', 'O'))])
    elif axiom == '^-S':
        return match (sentences, [('=', ('^', '*a', ('S', '*b')),
                                   ('*', '*a', ('^', '*a', '*b')))])
    else:
        raise SyntaxError (f'Invalid axiom: {axiom} @ {sentences}')
