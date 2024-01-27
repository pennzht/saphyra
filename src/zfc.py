# FOL (first-order logic) derivation system

from pprint import pprint
import expr

# Type signatures and inference

Types = {
    '(-> stmt stmt stmt)':
        ['and', 'or', 'impl', 'equiv'],
    '(-> stmt stmt)':
        ['not'],
    'stmt':
        ['true', 'false'],
    '(-> (-> obj stmt) stmt)':
        ['forall', 'exists'],
    'obj': ['empty', 'infinity'],
    '(-> obj obj obj)': ['pair'],
    '(-> obj obj)': ['union', 'pow'],
    '(-> obj (-> obj stmt) obj)': ['subset'],
    '(-> obj (-> obj obj) obj)': ['map'],
}

_typemap = {}
for key in Types:
    type_signature = expr.parse (key)
    for obj in Types[key]:
        _typemap[obj] = type_signature

pprint (_typemap)

def infer_type (term, env=None):
    env = env or []
    if type (term) is str:
        for (a, b) in env:
            if a == term: return b
        raise Exception (f'Term {term} not found in env {env}')
    elif type (term) is tuple and term and term[0] == ':':
        # Lambda
        ...
    elif type (term) is tuple:
        # Application
        ...
    else:
        raise Exception (f'Unexpected term type {term}')

# 1. Simple derivation node
# 2. Simple derivation graph

