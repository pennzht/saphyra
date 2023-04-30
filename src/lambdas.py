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

def free_vars (o):
    if islambda (o):
        return free_vars (o[2]) - {o[0]}
    elif isseq (o):
        return {var for subo in o for var in free_vars (subo)}
    else:
        return {o} if isvar (o) else set ()

def free_vars_and_pats (o):
    if islambda (o):
        return free_vars_and_pats (o[2]) - {o[0]}
    elif isseq (o):
        return {var for subo in o for var in free_vars_and_pats (subo)}
    else:
        return {o} if isvar (o) or ispat (o) else set ()

def genvar (original, avoid):
    while original in avoid:
        original = original + "+"
    return original

def lambda_b_reduce (lam, arg, avoid_binding = ()):
    if not islambda (lam):
        raise ValueError (f'Bad lambda {lam}')
    var = lam[0]
    return lambda_replace (lam[2], var, arg, avoid_binding)

# A note on variable capture.
# For EFA, the usual replacement process is safe
#     and capture detection may generally be unnecessary,
#     save for the cases where `arg` contains a bound variable
#     that conflicts with a free variable.
# Another possible case exists when a pattern of the form
#     (__f _x) is realized, which invokes replacement.
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

def rich_lambda_replace (exp, f, arg, avoid_binding = ()):
    if islambda (exp):
        innervar = exp[0]
        innerexp = exp[2]
        if innervar in all_vars (arg):
            newvar = genvar (original = innervar,
                               avoid = all_symbols (arg) .union (all_symbols (exp)) .union (set (avoid_binding)))
            innerexp = lambda_replace (innerexp, innervar, newvar, ())
            innervar = newvar
        new_innerexp = rich_lambda_replace (innerexp, f, arg, avoid_binding)
        return (innervar, ':', new_innerexp)
    elif isseq (exp):
        exp = tuple (rich_lambda_replace (subexp, f, arg, avoid_binding)
                     for subexp in exp)
        # Detect (f x)
        if exp[0] == f and len (exp) == 2:
            exp = lambda_b_reduce (arg, exp[1], avoid_binding)
        return exp
    else:
        return exp

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

