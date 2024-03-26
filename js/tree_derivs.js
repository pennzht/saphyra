export const sampleDeriv1 = `

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

export const sampleDeriv2 = `
(comment - format is
  (node #label [ins] [outs] [justification args.optional] (subs.optional))
)

(node #t/switch [] [(-> (and _A _B) (and _B _A))]
  [impl-intro] (
  (node #t/switch/1 [(and _A _B)] [(and _B _A)] [join] (
    (node #t/switch/1/1 [(and _A _B)] [_A _B] [and-elim])
    (node #t/switch/1/2 [_B _A] [(and _B _A)] [and-intro])
    (link #t/switch/1/1 out 0 #t/switch/1/2 in 1)
    (link #t/switch/1/1 out 1 #t/switch/1/2 in 0)
  ))
))
`;
