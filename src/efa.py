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

def sub_by_path (term, path):
    if not path:
        return term
    else:
        return sub_by_path (term[path[0]], path[1:])

def replace_by_path (term, path, target):
    if not path:
        return target
    else:
        ans = list (term)
        ans[path[0]] = replace_by_path (ans[path[0]], path[1:], target)
        return tuple (ans)

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
                    f = get (rule, '__f')
                    base, step = claims[get (rule, 'base')], claims[get (rule, 'step')]
                    base_matches = lambda_eq (base, lambda_b_reduce (f, 'O'))
                    if not base_matches: raise ProofError (row)
                    inductive_var = step[1][1]
                    step_matches = lambda_eq (step, ('if',
                                                     lambda_b_reduce (f, inductive_var),
                                                     lambda_b_reduce (f, ('S', inductive_var)),
                                                     ('S', 'O')))
                    if not step_matches: raise ProofError (row)
                    'Good'

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
                            print ('prec', prec)
                            print ('body', body)
                            print ('pattern', pattern)
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

