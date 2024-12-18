// Outdated format.
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

/**
(comment - format is
  (node #label [ins] [outs] [justification args.optional] (subs.optional))
    ins and outs are statements.
    justification is a in the syntax [and-intro ...]
    subs = list of nodes and links
  (link #early #late statement)
    #early and #late are statement labels,
    may be ^a (parent assumptions) or ^c (parent consequents)
)
**/
sampleTreeDeriv2 = `\
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

sampleTreeDeriv7 = `\
(node #root [] [
  (forall (: _x:O (= _x:O (+ _x:O O))))
] [join] ())
`;

sampleTreeDeriv7Manual = `\
(node #root [] [
  (forall (: _x:O (= _x:O _x:O)))
] [forall-intro] (
  (node #1 [] [((: _x:O (= _x:O _x:O)) _y:O)] [join] [])
))
`;

sampleTreeDeriv7Complete = `[node #root []
  [[forall [: _x:O [= _x:O [+ _x:O O]]]]]
  [join]
  [[comment This is a proof of the theorem: forall x, x = x + 0.]
    [node #2 [] [[forall [: _x:O [= _x:O [+ _x:O O]]]]] [forall-intro] [[node #1 [] [[[: _x:O [= _x:O [+ _x:O O]]] _v0:O]] [join] [[node #3 [] [[= [[: _x:O [= _x:O [+ _x:O O]]] _v0:O] [= _v0:O [+ _v0:O O]]]] [beta] []] [node #4 [[= [[: _x:O [= _x:O [+ _x:O O]]] _v0:O] [= _v0:O [+ _v0:O O]]]] [[= [= _v0:O [+ _v0:O O]] [[: _x:O [= _x:O [+ _x:O O]]] _v0:O]]] [=-sym] []] [node #5 [[= [= _v0:O [+ _v0:O O]] [[: _x:O [= _x:O [+ _x:O O]]] _v0:O]] [= _v0:O [+ _v0:O O]]] [[[: _x:O [= _x:O [+ _x:O O]]] _v0:O]] [equiv-elim] []] [link #3 #4 [= [[: _x:O [= _x:O [+ _x:O O]]] _v0:O] [= _v0:O [+ _v0:O O]]]] [link #4 #5 [= [= _v0:O [+ _v0:O O]] [[: _x:O [= _x:O [+ _x:O O]]] _v0:O]]] [link #5 ^c [[: _x:O [= _x:O [+ _x:O O]]] _v0:O]] [node #6 [[= [+ _v0:O O] _v0:O]] [[= _v0:O [+ _v0:O O]]] [=-sym] []] [link #6 #5 [= _v0:O [+ _v0:O O]]] [node #7 [] [[= [+ _v0:O O] _v0:O]] [+-O] []] [link #7 #6 [= [+ _v0:O O] _v0:O]]]]]] [link #2 ^c [forall [: _x:O [= _x:O [+ _x:O O]]]]]]]`;

sampleTreeDeriv8Complete = "[node #root [] [[-> _A [-> _B [and _A [or _B _C]]]]] [join] [[node #2 [] [[-> _A [-> _B [and _A [or _B _C]]]]] [impl-intro] [[node #1 [_A] [[-> _B [and _A [or _B _C]]]] [join] [[node #4 [_A] [[-> _B [and _A [or _B _C]]]] [impl-intro] [[node #3 [_A _B] [[and _A [or _B _C]]] [join] [[node #5 [_A [or _B _C]] [[and _A [or _B _C]]] [and-intro] []] [link #5 ^c [and _A [or _B _C]]] [node #6 [_B] [[or _B _C]] [or-intro-1] []] [link #6 #5 [or _B _C]] [link ^a #5 _A] [link ^a #6 _B]]]]] [link ^a #4 _A] [link #4 ^c [-> _B [and _A [or _B _C]]]]]]]] [link #2 ^c [-> _A [-> _B [and _A [or _B _C]]]]]]]";

sampleTreeDeriv9 = `
  [node #root [] [  (forall (: _x:O (= (+ O _x:O) O)))  ] [join] ()]
`

sampleTreeDeriv9Partial = "[node #root [] [[forall [: _x:O [= [+ O _x:O] O]]]] [join] [[node #1 [[[: _x:O [= [+ O _x:O] O]] O] [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]] [[forall [: _x:O [= [+ O _x:O] O]]]] [peano-2] []] [link #1 ^c [forall [: _x:O [= [+ O _x:O] O]]]] [node #2 [] [[= [[: _x:O [= [+ O _x:O] O]] O] [= [+ O O] O]]] [beta] []] [node #3 [[= [[: _x:O [= [+ O _x:O] O]] O] [= [+ O O] O]]] [[= [= [+ O O] O] [[: _x:O [= [+ O _x:O] O]] O]]] [=-sym] []] [node #4 [[= [= [+ O O] O] [[: _x:O [= [+ O _x:O] O]] O]] [= [+ O O] O]] [[[: _x:O [= [+ O _x:O] O]] O]] [equiv-elim] []] [link #2 #3 [= [[: _x:O [= [+ O _x:O] O]] O] [= [+ O O] O]]] [link #3 #4 [= [= [+ O O] O] [[: _x:O [= [+ O _x:O] O]] O]]] [link #4 #1 [[: _x:O [= [+ O _x:O] O]] O]] [node #5 [] [[= [+ O O] O]] [+-O] []] [link #5 #4 [= [+ O O] O]] [node #6 [] [[= [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [beta] []] [node #7 [[= [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]]] [=-sym] []] [node #8 [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [[forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]] [equiv-elim] []] [link #6 #7 [= [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [link #7 #8 [= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]]] [link #8 #1 [forall [[: _p:<OP> [: _n:O [-> [_p:<OP> _n:O] [_p:<OP> [S _n:O]]]]] [: _x:O [= [+ O _x:O] O]]]]] [node #9 [] [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [beta] []] [node #10 [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [=-sym] []] [node #11 [[= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [[forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [equiv-elim] []] [link #9 #10 [= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [link #10 #11 [= [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]] [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]] [link #11 #8 [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [node #13 [] [[forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]] [forall-intro] [[node #12 [] [[[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]] [join] [[node #14 [] [[= [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O] [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]]]] [beta] []] [node #15 [[= [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O] [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]]]] [[= [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]] [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]]] [=-sym] []] [node #16 [[= [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]] [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]] [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]]] [[[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]] [equiv-elim] []] [link #14 #15 [= [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O] [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]]]] [link #15 #16 [= [-> [= [+ O _v0:O] O] [= [+ O [S _v0:O]] O]] [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]]] [link #16 ^c [[: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]] _v0:O]]]]]] [link #13 #11 [forall [: _n:O [-> [= [+ O _n:O] O] [= [+ O [S _n:O]] O]]]]]]]" ;

tauto10 = `[node #root [] [[-> [and [-> _X _Y] [-> _Y _Z]] [-> _X _Z]]] [join] [
  [comment This is a tautology, proven by hand.]
  [node #1 [] [[-> [and [-> _X _Y] [-> _Y _Z]] [-> _X _Z]]] [impl-intro] [
    [node #0 [[and [-> _X _Y] [-> _Y _Z]]] [[-> _X _Z]] [join] [
      [node #2 [[and [-> _X _Y] [-> _Y _Z]]] [[-> _X _Y] [-> _Y _Z]] [and-elim] []]
      [link ^a #2 [and [-> _X _Y] [-> _Y _Z]]]
      [node #4 [[and [-> _X _Y] [-> _Y _Z]]] [[-> _X _Z]] [impl-intro] [
        [node #3 [[and [-> _X _Y] [-> _Y _Z]] _X] [_Z] [join] [
          [node #5 [[and [-> _X _Y] [-> _Y _Z]]] [[-> _X _Y] [-> _Y _Z]] [and-elim] []]
          [link ^a #5 [and [-> _X _Y] [-> _Y _Z]]]
          [node #6 [_X [-> _X _Y]] [_Y] [mp] []]
          [link #5 #6 [-> _X _Y]]
          [node #7 [_Y [-> _Y _Z]] [_Z] [mp] []]
          [link #5 #7 [-> _Y _Z]]
          [link #7 ^c _Z]
          [link #6 #7 _Y]
          [link ^a #6 _X]
        ]]
      ]]
      [link ^a #4 [and [-> _X _Y] [-> _Y _Z]]]
      [link #4 ^c [-> _X _Z]]
    ]]
  ]]
  [link #1 ^c [-> [and [-> _X _Y] [-> _Y _Z]] [-> _X _Z]]]
]]`;

tryProve1 = `
  [node #root [] [(-> _A:P (-> _B:P (and (and _A:P _A:P) _B:P)))]
    [join] [
      [comment Try proving this statement with the <impl-intro> or <tauto> tactics.]
    ]
  ]
`

tryProve2 = `
  [node #root
    [_A:P _C:P _E:P]
    [(and (or _A:P _E:P) (or _B:P _C:P))]
    [join]
    [
      [comment Try proving this statement with tactics.]
    ]
  ]
`
