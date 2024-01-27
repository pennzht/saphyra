# Toposort of a graph
# Potential features:
#     Automatically grouping nodes with affinity
#     Assigning hints to order
#     Incremental

from collections import defaultdict
from pprint import pprint

def sort_theory (theory):
    nodes = {}
    ancestors = defaultdict (list)
    descendants = defaultdict (list)
    for row in theory:
        if not row: raise Exception ('Unrecognized row.')
        head = row[0]
        if head == 'comment': pass
        elif head == 'node':
            (_, name, inputs, outputs) = row
            if name in nodes:
                raise Exception (f'Node {name} redefined.')
            nodes[name] = (inputs, outputs)
        elif head == 'derive':
            (_, method, result_node, *orig_nodes) = row
            ancestors[result_node].extend (orig_nodes)
            for elem in orig_nodes: descendants[elem].append (result_node)
        elif head == 'link':
            (_, late_node, late_index,
             early_node, early_index) = row
            ancestors[late_node].append (early_node)
            descendants[early_node].append (late_node)
        else:
            raise Exception ('Unrecognized row.')
    pprint (nodes)
    pprint (ancestors)
    pprint (descendants)


