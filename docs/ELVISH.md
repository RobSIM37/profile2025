ELVISH: Principles

SRP-first, recursive: break features into testable micro-capabilities.

Contract-thinking: every piece declares inputs, outputs, pre/postconditions, and error modes.

The ELVISH Loop (8 Steps, each with exit criteria)
1) Discuss Feature (SRP Breakdown)

Goal: Define the smallest units that produce value.
You produce: Purpose, in/out of scope, success criteria, SRP tree.
AI helps: Suggest sub-steps, edge cases, decomposition.
Exit when: Each sub-step has a one-sentence goal + I/O + errors.

2) Plan, Test, Validate (Risks)

Goal: Build the risk/test matrix before code.
You produce: Known failures, known-unknowns, brainstorm of unknown-unknowns, acceptance criteria.
AI helps: Risk heuristics, test cases, oracles.
Exit when: Each sub-step has at least one happy path + 3 edge tests + one failure test.

3) Prompt Unit Test (Red → Green → Red)

Goal: Lock behavior with executable checks or prompt-checks.
You produce: Test specs + fixtures; if codebase exists, real unit tests.
AI helps: Writes tests/mocks; if no runner, writes a prompt test harness that validates outputs from the model deterministically (text compare or JSON schema).
Exit when: Tests fail for the right reason (RED) under current absence of code.

4) Discuss Architecture (Fit & Flow)

Goal: Place the piece correctly in the system.
You produce: Context diagram, dependency list, dataflow, boundaries.
AI helps: Propose interfaces, module boundaries, ports/adapters.
Exit when: The sub-step exposes a stable interface and no forbidden dependency leaks.

5) Prompt the Implementation (Green)

Goal: Minimum code to pass the tests from Step 3.
You produce: Code; wire-up; minimal docs in code comments.
AI helps: Implementation, refactors, linters, static checks.
Exit when: All unit tests pass; style/lint clean; public API matches the contract.

6) Load/Stress Test (Refactor under pressure)

Goal: Prove shape under volume and contention.
You produce: Simple load profiles + results.
AI helps: Generate load scripts, identify hotspots, propose refactors.
Exit when: Throughput/latency meet targets OR an architectural ticket is filed to fix.

7) End-to-End Test (Integrative)

Goal: Cross-subsystem truth.
You produce: E2E scenarios covering success + top risks.
AI helps: Compose scenarios, stubs/fakes, data setup/teardown.
Exit when: E2E passes with traces that show inputs → outputs and failure handling.

8) Update Documentation (Teach Future You)

Goal: Durable understanding and extension path.
You produce: README snippets, “how to extend,” change log, ADR (architecture decision record) if needed.
AI helps: Summaries, diagrams, checklists.
Exit when: A stranger can run tests, understand contracts, and extend safely.