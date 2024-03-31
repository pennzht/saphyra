// First-order logic + Peano arithmetic.
// The below complex rules are not included here, but tested individually.
//     impl-intro, forall-intro, exists-elim, beta-reduction

folRules = `
(and-intro
  [_A _B]
  [_A _B] [(and _A _B)])

(and-elim
  [_A _B]
  [(and _A _B)] [_A _B])

(or-intro-1
  [_A _B]
  [_A] [(or _A _B)])

(or-intro-2
  [_A _B]
  [_B] [(or _A _B)])

(or-elim
  [_A _B _C]
  [(or _A _B) (-> _A _C) (-> _B _C)]
  [_C])

(false-elim
  [_A]
  [false] [_A])

(true-intro
  []
  [] [true])

(mp
  [_A _B]
  [_A (-> _A _B)] [_B])

(tnd
  [_A]
  [] [(or _A (-> _A false))])

(id
  [_A]
  [_A] [_A])

(equiv-intro
  [_A _B]
  [(-> _A _B) (-> _B _A)] [(= _A _B)])

(equiv-elim
  [_A _B]
  [(= _A _B) _A] [_B])

(forall-elim
  [_P _x]
  [(forall _P)] [(_P _x)])

(exists-intro
  [_P _x]
  [(_P _x)] [(exists _P)])

(=-intro
  [_a]
  [] [(= _a _a)])

(=-sym
  [_a _b]
  [(= _a _b)] [(= _b _a)])

(=-elim
  [_P _a _b]
  [(= _a _b) (_P _a)] [(_P _b)])

(peano-0
  [_a _b]
  [(= (S _a) (S _b))] [(= _a _b)])

(peano-1
  [_a]
  [] [(-> (= O (S _a)) false)])

(peano-2
  [_P]
  [(_P O)
   (forall ([: _p:<OP> [: _n:O (-> (_p:<OP> _n:O) (_p:<OP> (S _n:O)))]] _P))]
  [(forall _P)])

(+-O [_a   ] [] [(= (+ _a O) _a)])

(+-S [_a _b] [] [(= (+ _a (S _b)) (S (+ _a _b)))])

(*-O [_a   ] [] [(= (* _a O) O)])

(*-S [_a _b] [] [(= (* _a (S _b)) (+ _a (* _a _b)))])

(^-O [_a   ] [] [(= (^ _a O) (S O))])

(^-S [_a _b] [] [(= (^ _a (S _b)) (* _a (^ _a _b)))])

(and-negate-1
  [_A _B]
  [(-> _A false)]
  [(-> (and _A _B) false)])

(and-negate-2
  [_A _B]
  [(-> _B false)]
  [(-> (and _A _B) false)])

(or-negate
  [_A _B]
  [(-> _A false) (-> _B false)]
  [(-> (or _A _B) false)])

(ex-falso
  [_A _B]
  [(-> _A false)]
  [(-> _A _B)])

(veritas-aeterna
  [_A _B]
  [_B]
  [(-> _A _B)])

(impl-negate
  [_A _B]
  [_A (-> _B false)]
  [(-> (-> _A _B) false)])
`;

/// The last few lines are temporary axioms to make tautology tactics easier.
/// They will be replaced by actual proofs.
