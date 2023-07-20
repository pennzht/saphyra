# Given a statement, attempts to match parts of it with different theorems.
# TODO: incomplete.

# General form:

import lambdas
import expr

isseq = lambdas.isseq

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

def match_pattern (pattern, form):
    if isseq (pattern):
        if isseq (form) and len (pattern) == len (form):
            # Good.
            ans = {1: 1}
            for (p1, f1) in zip (pattern, form):
                ans = mergematch (ans, match_pattern (p1, f1))
            return ans
        else:
            return False
    else:
        if pattern == form:
            return {1: 1}
        elif pattern.startswith ('_'):
            return {pattern: form}
        else:
            return False

def apply_theorem_at (theorem_left, theorem_right, term, path):
    subterm = lambdas.sub_by_path (term, path)
    attempt_match = match_pattern (pattern = theorem_left, form = subterm)
    pass  # TODO, continue

if __name__ == '__main__':
    print (match_pattern (
        expr.parse ('((_a + O) = _a)'),
        expr.parse ('((O + O) = O)'),
    ))
    print (match_pattern (
        expr.parse ('((_a + O) = _a)'),
        expr.parse ('(((S (S O)) + O) = (S O))'),
    ))
    print (match_pattern (
        expr.parse ('((_a + O) = _a)'),
        expr.parse ('(((S (S O)) + O) = (S (S O)))'),
    ))
    print (match_pattern (
        expr.parse ('((_a + (S _b)) = (S (_a + _b)))'),
        expr.parse ('((_O + (S _O)) = (S (_O + _O)))'),
    ))

