# Given a statement, attempts to match parts of it with different theorems.
# TODO: incomplete.

# General form:

import lambdas
import expr
import efa

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

def _lambda_replace_all (exp, replacements):
    for (var, arg) in replacements.items ():
        exp = lambdas.lambda_replace (exp, var, arg)
    return exp

def apply_theorem_at (theorem_left, theorem_right, term, path):
    subterm = lambdas.sub_by_path (term, path)
    attempt_match = match_pattern (pattern = theorem_left, form = subterm)
    if not attempt_match:
        return 'FAIL: Cannot apply theorem.'
    reconstructed_subterm = _lambda_replace_all(
        theorem_left,
        attempt_match)
    if not lambdas.lambda_eq (reconstructed_subterm, subterm):
        return 'FAIL: Cannot apply theorem: replacement failed.'
    # Replacement successful.
    new_subterm = _lambda_replace_all(
        theorem_right,
        attempt_match)
    return lambdas.replace_by_path (term, path, new_subterm)

def print_valid_replacements (term, path, theorem_name, direction, axioms):
    if path == '?':
        paths = lambdas.all_path_indices (term)
    else:
        paths = [tuple (int (x) for x in path)]

    if theorem_name == '?' or direction == '?':
        theorems = [(a, d) for a in axioms for d in ['ltr', 'rtl']]
    else:
        theorems = [(theorem_name, direction)]

    for path in paths:
        for (theorem_name, direction) in theorems:
            theorem = axioms[theorem_name]
            if len (theorem) != 3 or theorem[1] != '=': continue
            if direction == 'ltr':
                l, _, r = theorem
            else:
                r, _, l = theorem
            new_term = apply_theorem_at (l, r, term, path)
            if type (new_term) is str and new_term.startswith('FAIL'):
                continue  # Application failed
            # Application succeeded
            print (path, theorem_name, direction, '->', expr.purr (new_term, maxwidth=80), end='')

def interactive (term):
    axioms = efa._extract_axioms ()
    expr.pr (axioms)
    commands = []
    while True:
        print (expr.purr (term))
        pattern = input ('Enter <path> <theorem> <direction:ltr/rtl> ... ')
        (path, theorem_name, direction) = expr.parseall (pattern)
        # Special case: if missing one, keep hinting
        if '?' in (path, theorem_name, direction):
            print_valid_replacements (term, path, theorem_name, direction,
                                      axioms)
            continue  # TODO: Add hinting.

        path = tuple (int (x) for x in path)
        print (path)
        print (theorem_name)
        print (direction)

        theorem = axioms[theorem_name]
        if direction == 'ltr':
            l, _, r = theorem
        else:
            r, _, l = theorem
        new_term = apply_theorem_at (l, r, term, path)
        if type (new_term) is str and new_term.startswith('FAIL'):
            print ('Attempt failed. Try again.')
        else:
            print ('Attempt succeeded.')
            commands.append (pattern)
            term = new_term
            print ('... commands ...', commands)

# Successful interactive steps:
# Starts with
#     (  ((S O) + (S O)) * ((S O) + (S O))  )
# (comment : 2 * 2)
# Ends with
#     (S (S (S (S O))))
# (comment : 4)
#
# [0] +-S ltr
# [0 1] +-O ltr
# [2] +-S ltr
# [2 1] +-O ltr
# [] *-S ltr
# [0] *-S ltr
# [0 0] *-O ltr
# [0] +-S ltr
# [0 1] +-S ltr
# [0 1 1] +-O ltr
# [] +-S ltr
# [1] +-S ltr
# [1 1] +-O ltr

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
    print (apply_theorem_at (
        expr.parse ('(if (S _c) _a _b)'),
        expr.parse ('_a'),
        expr.parse ('((if (S _r) (S _r) O) 1 2)'),
        (0,),
    ))  # Successful: ((S _r) 1 2)

    # Type "? +-S ltr" for hints on which paths to use,
    # and "[0] ? ?" for hints on which theorems to use.
    interactive (term = expr.parse ('(  ((S O) + (S O)) * ((S O) + (S O))  )'))
    # interactive (term = expr.parse ('((  ((S O) + (S O)) * ((S O) + (S O))  ) = (S (S (S (S O)))))'))
    # interactive (term =
    #              expr.parse ('''
    #                ((if (S O) _x _y) = (if _m _x _x))
    #              ''')
    #              )
