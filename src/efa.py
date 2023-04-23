# Checks an arithmetic theory, generalized.

# Env items
# stmt
#     def/axiom/theorem (statement)
#     hastype (identifier) (type)
#
# Env items in syntax:
# (fresh <var-symbol>)
# (assume <stmt>)
# (def <type> <def-symbol> <definition>)

import expr
import sys

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

def isseq (o):
    return isinstance (o, tuple) or isinstance (o, list)

def isvar (o):
    return isinstance (o, str) and o.startswith('_') and not o.startswith('__')

def ispat (o):
    return isinstance (o, str) and o.startswith('__')

def islambda (o):
    return isseq (o) and len (o) == 3 and isvar (o[0]) and o[1] == ':'

def hashead (obj, head):
    return isseq (obj) and obj and obj[0] == head

def all_symbols (o):
    if isseq (o):
        return {sym for subo in o for sym in all_symbols (subo)}
    else:
        return {o}

def all_vars (o):
    if isseq (o):
        return {x for x in all_symbols (o) if isvar (x)}
    else:
        return {o}

def genvar (original, avoid):
    while original in avoid:
        original = original + "+"
    return original

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

def is_valid_derivation (axiom, sentences):
    if True:
        ...
    else:
        raise SyntaxError (f'Invalid axiom: {axiom} @ {sentences}')

class ProofError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofError: {self.claim}'

class ProofSyntaxError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofSyntaxError: {self.claim}'

def lambda_b_reduce (lam, arg, avoid_binding = ()):
    if not islambda (lam):
        raise ValueError (f'Bad lambda {lam}')
    var = lam[0]
    return lambda_replace (lam[2], var, arg, avoid_binding)

def lambda_replace (exp, var, arg, avoid_binding = ()):
    if islambda (exp):
        # Lambda. Beware of variable capture.
        innervar = exp[0]
        innerexp = exp[2]
        if innervar in all_vars (arg):
            newvar = genvar (original = innervar,
                               avoid = all_symbols (arg) .union (all_symbols (exp)) .union (set (avoid_binding)))
            innerexp = lambda_replace (innerexp, innervar, newvar, ())
            innervar = newvar
        new_innerexp = lambda_replace (innerexp, var, arg, avoid_binding)
        return (innervar, ':', new_innerexp)
    elif isseq (exp):
        return tuple (
            lambda_replace (subexp, var, arg, avoid_binding)
            for subexp in exp
        )
    else:
        # Atomic.
        if exp == var: return arg
        else:          return exp

def lambda_eq (a, b):
    # Judges if `a` and `b` are the same lambda expression.
    return lambda_normal (a) == lambda_normal (b)

def lambda_normal (lam):
    # Returns the "normal form" of a lambda expression.
    return _lambda_normal (lam, countfrom = 0, varmap = {})

def _lambda_normal (lam, countfrom, varmap):
    if islambda (lam):
        (var, _, sub) = lam
        rname = '_!R' + str (countfrom)
        assert var not in varmap
        varmap[var] = rname
        ans = (rname, ':', _lambda_normal (sub, countfrom + 1, varmap))
        del varmap[var]
        return ans
    elif isseq (lam):
        return tuple (_lambda_normal (sub, countfrom, varmap)
                      for sub in lam)
    else:
        # Atomic.
        return varmap.get (lam, lam)

def lambda_valid (lam, avoid = ()):
    # Returns if `lam` is a valid lambda expression.
    if islambda (lam):
        (var, _, sub) = lam
        return var not in avoid and lambda_valid (sub, avoid + (var,))
    elif isseq (lam):
        return all (lambda_valid (sub, avoid)
                    for sub in lam)
    else:
        # Atomic.
        return True

def verify (theory_text, file_name='(unnamed)'):
    parsed = expr.parseall (theory_text)
    claims = {**_extract_axioms ()}
    definitions = {}
    types = {**_typemap}

    pr (claims)
    pr (types)

    return True

    try:
        for row in parsed:
            if hashead (row, 'comment'):
                continue # Just a comment.

            if hashead (row, 'define'):
                # Run a definition.
                (_define, lhs, rhs) = row
                if name in definitions:
                    raise ProofError (f'Redefinition of name {name}')
                definitions[name] = ['<->', form1, form2]
                claims[name] = definitions[name]
                continue

            if hashead (row, 'prove'):
                (_prove, label, axiom_invocation, stmt) = row
                assert _prove == 'prove'
                assert type (label) is str
                assert label not in claims
                assert type (axiom_invocation) is tuple

                # Verify statement TODO: add induction, pack/unpack axioms
                (axiom, *precedents) = axiom_invocation
                precedents = [claims[name] for name in precedents]
                if is_valid_derivation (axiom, [*precedents, stmt]):
                    'success'
                    claims[label] = stmt
                    continue
                else:
                    raise ProofError (row)

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
    ans = verify (source)
    if ans:
        exit (0)
    else:
        exit (111)

