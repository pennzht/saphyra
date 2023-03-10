# Checks an arithmetic theory.

# Env items
# def
#     def nat x <def>
#     def (-> nat nat) f <def>
#     def (-> nat stmt) P <def>
# typesign type name None
# assume None None prop
# fresh nat x None
#
# General form
# [command] [type] [name] [definition]

# Requirements on env:
# Every variable should be unique
#
# Env items in syntax:
# (fresh <var-symbol>)
# (assume <stmt>)
# (def <type> <def-symbol> <definition>)

import expr

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

def _primitive_match (form, pattern):
    '''Returns whether [form] matches [pattern].

    Returns a nonempty object if match succeeds, and
    [False] if match fails.'''
    if isseq (pattern) and len (pattern) == 2 and type (pattern[0]) is str and pattern[0].startswith('**'):
        # Application pattern
        # TODO: use delayed match; afterprocessing for match
        return {pattern: form}

    if isseq (pattern):
        if not (isseq (form) and len (form) == len (pattern)):
            return False
        ans = {1: True}
        for (subf, subp) in zip (form, pattern):
            subm = _primitive_match (subf, subp)
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

def _attempt_resolve (a, b, pa, pb):
    if pa == pb:
        return pa
    if a == pa and b == pb:
        return '*_'
    if type (pa) == type (pb) == tuple and len (pa) == len (pb):
        partial_matches = [_attempt_resolve (a, b, parta, partb)
                           for (parta, partb) in zip (pa, pb)]
        if None in partial_matches:
            return None
        return tuple (partial_matches)
    return None

def match (form, pattern):
    form = tuple (form)
    pattern = tuple (pattern)
    pm_match = _primitive_match (form, pattern)

    # If match fails, return False
    if not pm_match:
        return False

    atomic_matches = {} # str -> form
    pattern_matches = {} # **p -> [(str, form) *]
    for p, f in pm_match.items ():
        if type (p) is str and p.startswith ('*'):
            atomic_matches[p] = f
        elif type (p) is tuple and type (p[0]) is str and p[0].startswith ('**'):
            (phead, pvar) = p
            pattern_matches.setdefault (phead, [])
            pattern_matches[phead].append ((pvar, f))
        elif p == 1:
            pass # Placeholder pattern
        else:
            raise Exception (f'Bad pattern {p}')
    # TODO: Handle pattern matches
    # How?
    # match (a, b, pa, pb) is true if and only if:
    #    pa == pb
    # || a == pa && b == pb
    # || len (pa) == len (pb) && match (a, b, pa[i], pb[i]) for all i
    # What about missing parameters?
    #     Currently: no.
    resolved = {}
    for p, p_matches in pattern_matches.items ():
        # Check one-output goals
        if all (x[1] == p_matches[0][1] for x in p_matches):
            ans = p_matches[0][1]
            resolved[p] = ans
            continue
        # Unify goals with same input
        unified_goals = {}
        for (a, pa) in p_matches:
            if type (a) is str and a.startswith ('*'):
                if a in atomic_matches:
                    norm = atomic_matches[a]
                else:
                    continue
            else:
                norm = a
            # Add norm -> pa goal
            if norm not in unified_goals:
                unified_goals[norm] = pa
            elif unified_goals[norm] != pa:
                return False # No match
        # Otherwise, enter match
        goals = list (unified_goals.items ())
        if len (goals) <= 1:
            continue  # Trivial match
        for i in range (1, len (goals)):
            (a, pa) = goals[0]
            (b, pb) = goals[i]
            resolution_2 = _attempt_resolve (a, b, pa, pb)
            if resolution_2 is None:
                return False # No match
            elif i == 1:
                resolution = resolution_2
            elif resolution != resolution_2:
                return False # No match
        # Successful match!
        resolved[p] = resolution
    return {1: True, **atomic_matches, **resolved}

# Statements
# (name, (origin-name, origin-parts), stmt)
# (name, push / pop)

# Axioms.
# The only ones requiring more than `match`
# are `impl-i` and `forall-i`.

AXIOMS = {
    'and-i':      expr.parseall ('*a *b (and *a *b)'),
    'and-el':     expr.parseall ('(and *a *b) *a'),
    'and-er':     expr.parseall ('(and *a *b) *b'),

    'or-il':      expr.parseall ('*a (or *a *b)'),
    'or-ir':      expr.parseall ('*b (or *a *b)'),
    'or-e':       expr.parseall ('(or *a *b) (impl *a *c) (impl *b *c) *c'),

    'true-i':     expr.parseall ('true'),
    'false-e':    expr.parseall ('(impl false *a)'),

    'not-i':      expr.parseall ('(impl *a false) (not *a)'),
    'not-e':      expr.parseall ('(not *a) (impl *a false)'),

    'impl-e':     expr.parseall ('(impl *a *b) *a *b'),

    'equiv-el':   expr.parseall ('(equiv *a *b) (impl *a *b)'),
    'equiv-er':   expr.parseall ('(equiv *a *b) (impl *b *a)'),

    'forall-e':   expr.parseall ('(forall (=> *n (**p *n))) (**p *m)'),

    'exists-i':   expr.parseall ('(**p *m) (exists (=> *n (**p *n)))'),
    'exists-e':   expr.parseall ('(exists (=> *n (**p *n))) (forall (=> *n (impl (**p *n) *q))) *q'),

    '=-i':        expr.parseall ('(= *a *a)'),
    '=-e':        expr.parseall ('(= *a *b) (**p *a) (**p *b)'),

    'peano-0':    expr.parseall ('(= (S *a) (S *b)) (= *a *b)'),
    'peano-1':    expr.parseall ('(not (= (S *a) O))'),
    'peano-2':    expr.parseall ('(**p O) (forall (=> nat n (impl (**p n) (**p (S n))))) (forall (=> nat n (**p n)))'),
    '+-O':        expr.parseall ('(= (+ *a O) *a)'),
    '+-S':        expr.parseall ('(= (+ *a (S *b)) (S (+ *a *b)))'),
    '*-O':        expr.parseall ('(= (* *a O) O)'),
    '*-S':        expr.parseall ('(= (* *a (S *b)) (+ *a (* *a *b)))'),
    '^-O':        expr.parseall ('(= (^ *a O) (S O))'),
    '^-S':        expr.parseall ('(= (^ *a (S *b)) (* *a (^ *a *b)))'),
}

def is_valid_derivation (axiom, sentences):
    # TODO: Add 'assumption', 'weakening', 'contraction'
    # Minimally speaking, only 'assumption' is necessary.

    # TODO: Correct logic for sentences with nonempty environment.

    # Simplified
    if axiom in AXIOMS:
        # Ensure all sentences have the same environment.
        environments = [env for (env, _) in sentences]
        if not all (x == environments[-1]
                    for x in environments):
            return False

        sentences = [result for (_, result) in sentences]

        pattern = AXIOMS[axiom]
        return match (sentences, pattern)

    # Other cases
    elif axiom == 'impl-i':
        # impl introduction
        if len (sentences) != 2:
            return False
        [(env1, stmt1), (env2, stmt2)] = sentences
        if not (len (env1) == len (env2) + 1 and env1[:-1] == env2):
            return False
        return match ([env1[-1], stmt1, stmt2],
                      ['*a', '*b', ('impl', '*a', '*b')])
    elif axiom == 'forall-i':
        # forall introduction
        if len (sentences) != 2:
            return False
        [(env1, stmt1), (env2, stmt2)] = sentences
        if not (len (env1) == len (env2) + 1 and env1[:-1] == env2):
            return False
        return match ([env1[-1], stmt1, stmt2],
                      [('fresh', '*a'),
                       '*s',
                       ('forall', ('=>', '*a', '*s'))])
    else:
        raise SyntaxError (f'Invalid axiom: {axiom} @ {sentences}')

