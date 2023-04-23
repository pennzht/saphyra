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

Types = {
    'nat': ['O'],
    '(-> nat nat)': ['S'],
    '(-> nat nat nat)': ['+', '*', '^', '='],
    '(-> nat nat nat nat)': ['if'],
    '(-> nat (-> nat nat) (-> nat nat) nat)': ['find'],
}

typeof = {}
for key in Types:
    type_signature = expr.parse (key)
    for obj in Types[key]:
        typeof[obj] = type_signature

def isseq (o):
    return isinstance (o, tuple) or isinstance (o, list)

def hashead (obj, head):
    return isseq (obj) and obj and obj[0] == head

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

AXIOMS = _extract_axioms ()

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

def lambda_b_reduce (lam, arg, avoid_binding = None):
    if not avoid_binding: avoid_binding = []
    ...

def lambda_eq (a, b):
    # Judges if `a` and `b` are the same lambda expression.
    return lambda_normal (a) == lambda_normal (b)

def lambda_normal (lam):
    # Returns the "normal form" of a lambda expression.
    ...

def lambda_valid (lam):
    # Returns if `lam` is a valid lambda expression.
    ...

def verify (theory_text, file_name='(unnamed)'):
    parsed = expr.parseall (theory_text)
    claims = {}
    definitions = {}
    for row in parsed:
        if hashead (row, 'comment'):
            continue # Just a comment.

        if hashead (row, 'define'):
            # Run a definition.
            (_define, name, nametype, form1, form2) = row
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

