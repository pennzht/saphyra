import arith
import expr
import sys

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
    for row in parsed:
        if type (row) is tuple and row and row[0] == 'comment':
            continue # Just a comment.
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
            if arith.is_valid_derivation (axiom, [*precedents, stmt]):
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


