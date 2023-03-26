# Checks an arithmetic theory, generalized.

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
import sys

Types = {
    'stmt': ['true', 'false'],
    '(-> stmt stmt)': ['not'],
    '(-> stmt stmt stmt)': ['and', 'or', 'impl', 'equiv'],
    '(-> (-> nat stmt) stmt)': ['forall', 'exists'],
    'nat': ['O'],
    '(-> nat nat)': ['S'],
    '(-> nat nat nat)': ['+', '*', '^'],
    '(-> nat nat stmt)': ['=', '!=', '<', '>', '<=', '>='],
}

typeof = {}
for key in Types:
    type_signature = expr.parse (key)
    for obj in Types[key]:
        typeof[obj] = type_signature

def isseq (o):
    return isinstance (o, tuple) or isinstance (o, list)

def mergematch (m1, m2):
    if False in [m1, m2]: return False
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

def match_defs (lhs, rhs, form1, form2):
    if form1 == form2: return {1: True}
    x = match ([form1, form2], [lhs, rhs])
    if x: return x

    if len (form1) == len (form2):
        ans = {1: True}
        for (p1, p2) in zip (form1, form2):
            new_match = match_defs (lhs, rhs, p1, p2)
            ans = mergematch (ans,
                              new_match)
            if not ans: return False
        return ans
    else:
        return False

# Statements
# (name, (origin-name, origin-parts), stmt)
# (name, push / pop)

# Axioms.
# The only ones requiring more than `match`
# are `impl-i` and `forall-i`.

# TODO: extract axioms!

_axioms_arith = expr.data ('arith.blue')

AXIOMS = {
    _axioms_arith[i]: _axioms_arith[i+1]
    for i in range (0, len (_axioms_arith), 2)
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

    # Impl-i, Forall-i
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
                       ('forall', ('=>', 'nat', '*a', '*s'))])

    # Def-unfold
    elif axiom == 'def-fold':
        [(env1, stmt1), equiv, (env2, stmt2)] = sentences
        [_arrow, _simple, _complex] = equiv
        return match_defs (_complex, _simple, stmt1, stmt2)
    elif axiom == 'def-unfold':
        [(env1, stmt1), equiv, (env2, stmt2)] = sentences
        [_arrow, _simple, _complex] = equiv
        return match_defs (_simple, _complex, stmt1, stmt2)

    else:
        raise SyntaxError (f'Invalid axiom: {axiom} @ {sentences}')

class ProofError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofError: {self.claim}'

class ProofSyntaxError (Exception):
    def __init__ (self, claim): self.claim = claim
    def __repl__ (self): return f'ProofSyntaxError: {self.claim}'

if __name__ == '__main__':
    source = sys.stdin.read ()
    parsed = expr.parseall (source)
    claims = {}
    definitions = {}
    for row in parsed:
        if type (row) is tuple and row and row[0] == 'comment':
            continue # Just a comment.

        if type (row) is tuple and row and row[0] == 'define':
            # Run a definition.
            (_define, name, nametype, form1, form2) = row
            if name in definitions:
                raise ProofError (f'Redefinition of name {name}')
            definitions[name] = ['<->', form1, form2]
            claims[name] = definitions[name]
            continue

        try:
            (_prove, label, axiom_invocation, *environment, _turnstile, result) = row
            assert _prove == 'prove'
            assert _turnstile == '|-'
            assert type (label) is str
            assert type (axiom_invocation) is tuple
            assert label not in claims
            # Construct statement
            stmt = (tuple (environment), result)

            # Verify statement
            (axiom, *precedents) = axiom_invocation
            precedents = [claims[name] for name in precedents]
            if is_valid_derivation (axiom, [*precedents, stmt]):
                'success'
                claims[label] = stmt
            else:
                raise ProofError (row)
        except ValueError:
            raise ProofSyntaxError (row)
        except AssertionError:
            raise ProofSyntaxError (row)
    # Success!
    print (f'{len (claims)} claims verified.')


