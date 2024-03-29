sampleTreeDeriv1 = `\
(comment - format is
  (stmt #label content) or
  (node #label ins outs rule subs)
  each node also "exports" some stmts.
)

(stmt #stmt-0 (-> (-> (and _A _B) _C) (-> _A (-> _B _C))))

(node #ans [] [#stmt-0] impl-intro (
    (stmt #in (-> (and _A _B) _C))
    (stmt #out (-> _A (-> _B _C)))
    (node #ans-1 [#in] [#out] impl-intro (
        (stmt #in-2 (-> (and _A _B) _C))
        (stmt #in-2a _A)
        (stmt #out-2 (-> (_B _C)))
        (node #ans-2 [#in-2 #in-2a] [#out-2] impl-intro (
            (stmt #in-3 (-> (and _A _B) _C))
            (stmt #in-3a _A)
            (stmt #in-3b _B)
            (stmt #out-3 _C)
            (node #ans-3 [#in-3 #in-3a #in-3b] [#out-3] join (
                (stmt #and (and _A _B))
                (stmt #a _A)
                (stmt #b _B)
                (stmt #outcome _C)
                (node #mp [#and #mp-r] [#outcome] mp)
                (node #and-intro [#a #b] [#and] and-intro)
            ))
        ))
    ))
))

`;

sampleTreeDeriv2 = `\
(comment - format is
  (node #label [ins] [outs] [justification args.optional] (subs.optional))
    ins and outs are statements.
    justification is a in the syntax [and-intro ...]
    subs = list of nodes and links
  (link #early #late statement)
    #early and #late are statement labels,
    may be ^a (parent assumptions) or ^c (parent consequents)
)

(node #t/switch [] [(-> (and _A _B) (and _B _A))]
  [impl-intro] (
  (node #1 [(and _A _B)] [(and _B _A)] [join] (
    (node #1 [(and _A _B)] [_A _B] [and-elim] ())
    (node #2 [_B _A] [(and _B _A)] [and-intro] ())
    (link ^a #1 (and _A _B))
    (link #1 #2 _A) (link #1 #2 _B)
    (link #2 ^c (and _B _A))
  ))
))
`;

sampleTreeDeriv3 = `\
(comment - an incomplete derivation)

(node #t/switch [] [(-> (and _A _B) (and _B _A))]
  [impl-intro] (
  (node #1 [(and _A _B)] [(and _B _A)] [join] (

  ))
))
`;

sampleTreeDeriv4 = `\
(node #root [(and _A (and _B _C))] [(and (and _A _B) _C)] [join] (

))
`;

sampleTreeDeriv5 = `\
(node #root [] [(-> _A (-> _B _A))] [join] ())
`;

sampleTreeDeriv6 = `\
(node #root [] [(-> (-> (and _A _B) _C) (-> _A (-> _B _C)))] [join] ())
`;

// Generated from tactics!
sampleTreeDeriv6Complete = `\
[node #root [] [[-> [-> [and _A _B] _C] [-> _A [-> _B _C]]]] [join] [[node #gen/2 [] [[-> [-> [and _A _B] _C] [-> _A [-> _B _C]]]] [impl-intro] [[node #gen/1 [[-> [and _A _B] _C]] [[-> _A [-> _B _C]]] [join] [[node #gen/4 [[-> [and _A _B] _C]] [[-> _A [-> _B _C]]] [impl-intro] [[node #gen/3 [_A [-> [and _A _B] _C]] [[-> _B _C]] [join] [[node #gen/6 [[-> [and _A _B] _C] _A] [[-> _B _C]] [impl-intro] [[node #gen/5 [_B [-> [and _A _B] _C] _A] [_C] [join] [[node #gen/7 [[-> [and _A _B] _C]] [[-> [and _A _B] _C]] [id] []] [link #gen/7 ^c [-> [and _A _B] _C]] [link ^a #gen/7 [-> [and _A _B] _C]] [node #gen/8 [_A] [_A] [id] []] [link #gen/8 ^c _A] [link ^a #gen/8 _A] [node #gen/9 [[and _A _B]] [[and _A _B]] [id] []] [link #gen/9 ^c [and _A _B]] [node #gen/10 [_A _B] [[and _A _B]] [and-intro] []] [link #gen/10 #gen/9 [and _A _B]] [link #gen/8 #gen/10 _A] [link ^a #gen/10 _B] [node #gen/11 [[and _A _B] [-> [and _A _B] _C]] [_C] [mp] []] [link #gen/7 #gen/11 [-> [and _A _B] _C]] [link #gen/9 #gen/11 [and _A _B]] [link #gen/11 ^c _C]]]]] [link #gen/6 ^c [-> _B _C]] [link ^a #gen/6 [-> [and _A _B] _C]] [link ^a #gen/6 _A]]]]] [link #gen/4 ^c [-> _A [-> _B _C]]] [link ^a #gen/4 [-> [and _A _B] _C]]]]]] [link #gen/2 ^c [-> [-> [and _A _B] _C] [-> _A [-> _B _C]]]]]]`;
