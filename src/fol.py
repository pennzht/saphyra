# FOL.
# Currently ZOL (propositional) to bootstrap NDAG system.

import expr
import general  # for .match
import toposort
from pprint import pprint

class TheoryError (Exception):
    def __init__ (self, reason=None):
        self.reason = reason
    def __str__ (self):
        return f'TheoryError: {self.reason}'
    def __repr__ (self):
        return f'TheoryError (reason = {repr(self.reason)})'

def rules ():
    data = expr.data ('./fol.blue')
    return {a: (b, c) for (a, b, c) in data}

def verify_per_step (graph):
    '''Verifies a sorted graph step by step.'''
    nodes = graph['nodes']
    derives = graph['derives']
    links = graph['links']
    axioms = rules ()
    for node in graph['order']:
        reason = derives[node]
        if reason[0] not in {'impl-intro', 'join'}:
            # Actual axiom
            match = general.match (nodes[node], axioms[reason[0]])
            print ('match:', node, match)
        else:
            print ('skipping', node)

def verify (theory):
    '''Verifies a theory.

    A theory is a collection of definitions and links.'''
    try:
        graph = toposort.read_theory (theory)
        verify_per_step (graph)
        return True
    except TheoryError as e:
        print (e)
        return False

pprint (rules ())

print (verify (expr.data ('../theories/ndag-2.nodegraph')))
