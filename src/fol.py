# FOL (first-order logic) derivation system

from pprint import pprint
import expr

# 1. Simple derivation node
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

# 2. Simple derivation graph

