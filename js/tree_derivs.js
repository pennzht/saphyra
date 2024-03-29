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
(node #ans [] [(-> (-> (and _A _B) _C) (-> _A (-> _B _C)))] [join] ())
`;
