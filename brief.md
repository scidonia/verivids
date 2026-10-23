# Brief: an introductory vericoding series

## Audience

Working programmers and technical managers who write software and have heard
the words "formal verification" without ever having used a proof assistant.
They know what a test is, what a type is, and what a compiler is. They do not
know Lean, and they should not need to before the last episode.

The audience is not asked to install anything. The films explain what
vericoding is and how it is done; the accompanying `vericoding-tutorial`
repository is where a viewer goes to do it.

## Argument, episode by episode

1. **What is vericoding?** Software written as a program, a specification and
   a machine-checked proof, in one language. Tests sample; proofs quantify.
   Large language models moved the cost of proof engineering, which is why
   this is now practical rather than aspirational.
1. **Proofs are programs.** A small kernel checks proofs. By the
   propositions-as-types correspondence, a proof is a program, so the prover
   and the compiler can be the same machine.
1. **Your first contract.** A concrete Lean program with a contract and a
   proof, shown at the level of the goal states Lean itself prints.
1. **Two ways to specify.** Intrinsic versus extrinsic specification, and deep
   versus shallow embedding, with the trade-off stated plainly.
1. **From proof to binary.** Erasure, compilation to C, reference counting,
   and the staircase of semantic levels that a proved refinement path
   requires.
1. **Building the world.** Effects as types, why a binding is not a theory,
   why every theory ends in an assertion, and what to build first.

## Terminology

- **Vericoding**: writing a program together with a specification it must meet
  and a proof that it meets it, in one language, checked by a machine.
- **Contract**: a specification attached to a definition, usually as a theorem
  about it.
- **Refinement**: a relation in which one representation's observable
  behaviour is permitted by another's. Used instead of equivalence wherever
  the implementations differ in ways the specification does not constrain.
- **Lowering**: a transformation from one representation to another, across
  semantic levels.
- **Trusted base**: everything a proof assumes rather than proves, ending in
  the assertions at the bottom of a theory.

## Visual constraints

- 1920x1080, 30 fps, light paper background, dark ink.
- Teal marks a transformation _within_ a level (an optimisation). Purple marks
  a transformation _between_ levels (a lowering). Rust marks an assumption or
  a failure. No other accent colours carry meaning.
- One meaningful change per cue. Most frames are still.
- Scidonia Limited branding is persistent: the wordmark and legal suffix sit
  in the frame chrome of every slide, and each film opens on a branded title
  card. Branding never occupies the centre of a content slide.
- Code is set in a monospaced face on a dark panel; prose is never set in the
  code face and code is never paraphrased in prose on screen.
- Speech and display are separate: the narration says "the implementation's
  behaviours are permitted by the specification"; the screen shows the
  inclusion formula.

## Claims that need care

- The staircase in episode five is a **proposed architecture**. It is labelled
  as such on screen. LambdaPure, LambdaRC, C and the ISA are not presented as
  finished results.
- Refinement is the default relationship. Equivalence is only claimed where
  the specification forces it.
- Functional correctness is kept separate from performance. The one
  performance number quoted is the tutorial's own measurement, attributed to
  it, and is not used to argue that verification makes programs faster.
- Nothing in the series claims that arbitrary liveness or security properties
  follow from trace inclusion.
