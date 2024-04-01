Saphyra 2024 Spring Report
===

[__Saphyra__](https://github.com/pennzht/saphyra) is a proof assistant under development, with simplicity and user-friendliness as goals. As of April 1, 2024, it is able to verify some simple statements about natural numbers and automatically prove (propositional) tautologies with ≤ 6 variables (the limit is artificial to avoid long running loops). A Web user interface is also added, so you can prove propositions by clicking on suitable tactics.

This software is in its early stages and incomplete, but I have plans to continue developing it and improving it.

[Click here to try the Web demo](https://mage-of-the-east.com/saphyra/js/start.html)

Using the Web demo
---

Prove a given goal:

1. Click on the “incomplete” tab to enter this workspace.
2. The red block on the left is a goal not yet proven; click on it to see a list of tactics.
3. Apply the tactic `impl-intro` to create a subgoal: proving _(B → (A and A) and B)_ using _A_.
4. Use `impl-intro` on the new goal again.
5. Use `and-intro` twice to destruct the goal into _A_, _A_, and _B_.
6. _A_ is an exact match with the assumption _A_; use `exact-match` to resolve.
7. Now the entire workspace is verified.

Prove a custom goal:

1. Click on the “empty” tab.
2. Click on “node #root” on the top-left.
3. On the right, enter a new goal, such as `(-> (and _A _B) (-> _C _A))`, then click “Apply”.
4. Click on the new goal on the left, and select the `tauto` tactic.
5. Now the entire workspace is verified.
6. Click on “open/close” under “node #0” to see the whole proof.

Foundation and Proof Structure
---

<!-- node-based -->

Statement Syntax
---

Statements are entered in a Lisp-like format, with variables (propositions or objects) beginning with an underscore (`_`).

<table>
  <tr>
    <th scope="col">Statement</th>
    <th scope="col">Code</th>
  </tr>

  <tr>
    <td>
      <em>A</em>
    </td>
    <td>
      <code>_A</code>
    </td>
  </tr>

  <tr>
    <td>
      (<em>A</em> and <em>B</em>) → <em>C</em>
    </td>
    <td>
      <code>(-> (and _A _B) _C)</code>
    </td>
  </tr>

  <tr>
    <td>
      not <em>A</em> (equivalently, <em>A</em> → false)
    </td>
    <td>
      <code>(-> _A false)</code>
    </td>
  </tr>

  <tr>
    <td>
      ∀ <em>x</em> : Nat, <em>x</em> = <em>x</em>
    </td>
    <td>
      <code>(forall (: _x:O (= _x:O _x:O)))</code>
    </td>
  </tr>
</table>

Codebase Introduction
---

Future Plans

* Complete Peano arithmetic and add tactics for natural numbers.
* Switch to ZFC / ETCS / Dependent Types as foundation, so that it may formalize most of modern mathematics.
* Improve automatic reasoning.
