# FOL.
# Currently ZOL (propositional) to bootstrap NDAG system.

import expr
import general  # for .match
import toposort

class TheoryError (Exception):
    def __init__ (self, reason=None):
        self.reason = reason
    def __str__ (self):
        return f'TheoryError: {self.reason}'
    def __repr__ (self):
        return f'TheoryError (reason = {repr(self.reason)})'

def rules ():
    return expr.data ('./fol.blue')

def verify_per_step (graph):
    '''Verifies a sorted graph step by step.'''
    ...

def verify (theory):
    '''Verifies a theory.

    A theory is a collection of definitions and links.'''
    try:
        graph = toposort.sort_theory (theory)
        verify_per_step (graph)
        return True
    except TheoryError as e:
        print (e)
        return False

print (expr.purr (rules ()))

print (verify (expr.data ('../theories/ndag-2.nodegraph')))
