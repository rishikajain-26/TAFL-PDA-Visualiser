# PDA Simulator

Single-page PDA simulator focused on acceptance by final state, with an upgraded visual UI:

- three-column layout (`States/Transitions | Simulation | Stack`)
- bottom full-width SVG state diagram (draggable states)
- presets, import/export JSON, theme toggle
- BFS-based simulation path, branching hint, step/run/back/reset controls
- animated stack and transition/state highlighting

## Run

Open `index.html` directly in a browser.

## Define a Custom PDA

Use the left panel:

1. Add states (set one as Start, mark any as Accept).
2. Add transitions as cards:
   - `from`, `to`: state ids
   - `input`: symbol or `ε`
   - `s.top`: required top stack symbol
   - `push (top-first)`: space-separated symbols, or `ε` for push nothing

Initial stack bottom marker is `Z₀`.

## Nondeterminism Handling

The simulator explores configurations with BFS:

- each configuration is `(state, inputIndex, stackContents)`
- all valid transitions from a configuration are expanded
- visited configurations are memoized to reduce loops
- hard cap at 10,000 configurations prevents infinite epsilon cycles

For step-by-step playback, one BFS-derived path is shown in the log while the UI also shows when the current step has multiple valid outgoing transitions.

Project Deployed Link: <a href="https://tafl-pda-visualiser.vercel.app/">https://tafl-pda-visualiser.vercel.app/
