# Checks an arithmetic theory, generalized.

# Env items
#     def/axiom/theorem (statement)
#     hastype (identifier) (type)
#         ... for type checking

import expr
import sys
from lambdas import *

pr = expr.pr

Types = {
    'nat': ['O'],
    '(-> nat nat)': ['S'],
    '(-> nat nat nat)': ['+', '*', '^', '='],
    '(-> nat nat nat nat)': ['if'],
    '(-> nat (-> nat nat) (-> nat nat) nat)': ['find'],
}

_typemap = {}
for key in Types:
    type_signature = expr.parse (key)
    for obj in Types[key]:
        _typemap[obj] = type_signature

def calc_type (term, env):
    if type (term) is str:
        if isvar (term): return 'nat'
        if ispat (term): return ('->', 'nat', 'nat')
        return env.get (term, 'error')
    if islambda (term):
        return ('->', 'nat', calc_type (term[2], env))
    if term[1] in {'+', '*', '^', '='}:
        if calc_type (term[0]) == 'nat' and calc_type (term[2]) == 'nat':
            return 'nat'
        else:
            return 'error'
    # General function
    fntype = env.get (term[0], 'error')
    if fntype == 'error' or not isseq (fntype): return 'error'
    args = term[1:]
    argtypes = tuple (calc_type (subterm, env) for subterm in term[1:])
    if fntype[:-1] == ('->',) + argtypes:
        return fntype[-1]
    else:
        return 'error'

def _extract_axioms ():
    axioms = expr.data ('efa.blue')
    ans = {}
    i = 0
    while i < len (axioms):
        if hashead (axioms[i], 'comment'):
            i += 1
        else:
            ans[axioms[i]] = axioms[i+1]
            i += 2
    return ans

class ProofError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofError: {self.claim}'

class ProofSyntaxError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofSyntaxError: {self.claim}'

def get (dictionary, key, default='__error__'):
    for (k, *subs) in dictionary:
        if k == key:
            if not subs:
                return True
            else:
                return subs[0]
    # Not found
    if default == '__error__': raise Exception (f'{key} not found in {dictionary}')
    else: return default

# Individual rules

def is_instantiation (rule, var, target, output):
    return lambda_eq (lambda_replace (rule, var, target), output)

def is_replacement (path, old_structure, new_structure, lhs, rhs):
    return (lambda_eq (sub_by_path (old_structure, path), lhs) and
            lambda_eq (replace_by_path (old_structure, path, rhs), new_structure))

def is_beta (redux, reduced):
    return lambda_eq (reduced, lambda_b_reduce (redux[0], redux[1]))

def is_induction (base, step, indvar, output):
    if not isvar (indvar): return False
    f = (indvar, ':', output)
    base_matches = lambda_eq (base, lambda_b_reduce (f, 'O'))
    # Checks generality, avoiding var capture
    general_step = (indvar, ':', step)
    # print (expr.purr (general_step))
    step_matches_1 = lambda_eq (lambda_b_reduce (general_step, '_!Rl'),
                                ('if',
                                 lambda_b_reduce (f, '_!Rl'),
                                 lambda_b_reduce (f, ('S', '_!Rl')),
                                 ('S', 'O')))
    step_matches_2 = lambda_eq (lambda_b_reduce (general_step, '_!Rr'),
                                ('if',
                                 lambda_b_reduce (f, '_!Rr'),
                                 lambda_b_reduce (f, ('S', '_!Rr')),
                                 ('S', 'O')))
    return base_matches and step_matches_1 and step_matches_2

def verify (theory, file_name='(unnamed)'):
    claims = {**_extract_axioms ()}
    types = {**_typemap}

    pr (claims)
    pr (types)

    try:
        for row in theory:
            if hashead (row, 'comment'):
                continue # Just a comment.

            if hashead (row, 'define'):
                # Run a definition.
                (_define, lhs, rhs) = row
                if isseq (lhs):
                    if (lhs and not isvar (lhs[0]) and not ispat (lhs[0]) and
                        all (isvar(x) or ispat(x) for x in lhs[1:]) and
                        len (set (lhs[1:])) == len (lhs[1:])):
                        # Well-defined lhs
                        head = lhs[0]
                        args = tuple (lhs[1:])
                    else:
                        raise ProofError (f'Bad LHS {lhs} in definition.')
                elif type (lhs) is str and not lhs.startswith ('_'):
                    head = lhs
                    args = None
                else:
                    raise ProofError (f'Bad LHS {lhs} in definition.')

                if head in claims or head in types:
                    raise ProofError (f'Redefining symbol {head}.')

                # Process definition.
                if calc_type (rhs, types) == 'nat':
                    if free_vars_and_pats (rhs).issubset (set (args) if args else set ()):
                        # Valid definition.
                        if args is None:
                            result_type = 'nat'
                        else:
                            result_type = tuple (['nat' if isvar (x) else ('->', 'nat', 'nat')
                                                  for x in args]
                                                 + ['->', 'nat'])
                        types[head] = result_type
                        claims[head] = (lhs, '=', rhs)
                        continue  # Successful definition.
                    else:
                        raise ProofError (f'RHS {rhs} has free variables not bound in {lhs}.')
                else:
                    raise ProofError (f'RHS {rhs} is not of type "nat".')

            if hashead (row, 'prove'):
                (_prove, label, rule, body) = row
                assert _prove == 'prove'
                assert type (label) is str
                assert label not in claims
                assert type (rule) is tuple and type (rule[0]) is str
                ruletype = rule[0]

                # Special cases
                if ruletype == 'pack':
                    prec = claims[get (rule, 'source')]
                    if body == (prec, '=', ('S', 'O')):
                        'Good'
                    else:
                        raise ProofError (row)

                elif ruletype == 'unpack':
                    prec = claims[get (rule, 'source')]
                    if prec == (body, '=', ('S', 'O')):
                        'Good'
                    else:
                        raise ProofError (row)

                elif ruletype == 'induction':
                    base = claims[get (rule, 'base')]
                    step = claims[get (rule, 'step')]
                    indvar = get (rule, 'indvar')
                    output = body
                    if is_induction (base, step, indvar, output):
                        'Good'
                    else:
                        raise ProofError (row)

                elif ruletype == 'beta':
                    assert body[1] == '='
                    if is_beta (body[0], body[2]):
                        'Good'
                    else:
                        raise ProofError (row)

                elif ruletype == 'repl':
                    path = get (rule, 'path', ())
                    assert isseq (path)
                    path = tuple (map (int, path))
                    old = get (rule, 'old')
                    new = body
                    equation = get (rule, 'from')
                    assert equation[1] == '='
                    if is_replacement (path, old, new, equation[0],
                                       equation[2]):
                        'Good'
                    else:
                        raise ProofError (row)

                elif ruletype == 'inst':
                    # Instantiation
                    source = get (rule, 'from')
                    var = get (rule, 'var')
                    target = get (rule, 'target')
                    if is_instantiation (source, var, target, body):
                        'Good'
                    else:
                        raise ProofError (row)

                else:
                    pattern = claims[ruletype]
                    if get (rule, 'reverse', False):
                        lhs, eq, rhs = pattern
                        pattern = rhs, eq, lhs
                    path = get (rule, 'path', ())
                    assert isseq (path)
                    path = tuple (map (int, path))
                    # Rule expansion
                    replacements = [pair for pair in rule[1:] if type (pair) is tuple and pair[0].startswith ('_')]
                    for (var, target) in replacements:
                        if isvar (var):
                            pattern = lambda_replace (pattern, var, target)
                        else:
                            pattern = rich_lambda_replace (pattern, var, target)
                    # Check against path
                    source = get (rule, 'source', None)
                    if source is None:
                        if lambda_eq (pattern, body):
                            'Good'
                        else:
                            print (pattern, body, sep='\n')
                            raise ProofError (row)
                    else:
                        prec = claims[source]
                        if (lambda_eq (sub_by_path (prec, path), pattern[0]) and
                            lambda_eq (replace_by_path (prec, path, pattern[2]), body)):
                            'Good'
                        else:
                            print (path)
                            print ('prec', expr.purr(prec), sep='\n')
                            print ('body', expr.purr(body), sep='\n')
                            print ('pattern', expr.purr(pattern), sep='\n')
                            raise ProofError (row)

                # Well-proven
                claims[label] = body
                print ('Registered claim ', label, '\n', expr.purr(body), sep='')
                continue

            # Invalid statement
            raise ProofSyntaxError (row)

    except ValueError:
        raise ProofSyntaxError (row)
    except AssertionError:
        raise ProofSyntaxError (row)
    # Success!
    print (f'{len (claims)} claims verified from {file_name}')
    return True

if __name__ == '__main__':
    source = sys.stdin.read ()
    ans = verify (expr.parseall (source))
    if ans:
        exit (0)
    else:
        exit (111)

