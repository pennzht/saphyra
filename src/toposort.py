# Toposort of a graph
# Potential features:
#     Automatically grouping nodes with affinity
#     Assigning hints to order
#     Incremental

from collections import defaultdict
from pprint import pprint

def read_theory (theory):
    nodes = {}
    ancestors = defaultdict (list)
    descendants = defaultdict (list)
    derives = {}
    links = defaultdict (list)
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
            derives[result_node] = (
                tuple([method, *orig_nodes]))
            for elem in orig_nodes:
                descendants[elem].append (result_node)
        elif head == 'link':
            (_, late_node, late_index,
             early_node, early_index) = row
            ancestors[late_node].append (early_node)
            links[late_node].append (
                (late_index, early_node, early_index))
            descendants[early_node].append (late_node)
        else:
            raise Exception ('Unrecognized row.')

    order = find_order (nodes, ancestors, descendants)

    ans = {
        'nodes': nodes,
        'order': order,
        'ancestors': ancestors,
        'descendants': descendants,
        'derives': derives,
        'links': links,
    }
    pprint (ans); return ans

def find_order (nodes, ancestors, descendants):
    indegree = {n: len (ancestors[n]) for n in nodes}
    head = [n for n in nodes if indegree[n] == 0]
    head.reverse()
    order = []
    covered = set()
    while head and len (order) <= len (nodes):
        latest = head.pop ()
        order.append (latest)
        covered.add (latest)
        for nxt in descendants[latest]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0: head.append (nxt)
    if len (covered) == len (nodes):
        return order
    else:
        return None

