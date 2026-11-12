# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-13

### Added

- Browser app (React 19, Vite 8, TypeScript 7, uPlot): drop `trainer_state.json` files, overlay runs, zoom to diagnosed steps.
- Tolerant parser: bare `NaN` / `Infinity` / `-Infinity` outside strings are restored (including top-level `best_metric`), their positions are reported.
- Checkpoint merge: files of one training are joined by step, different runs stay separate.
- Rule engine (pure TypeScript in `src/core`): non-finite and broken runs, overfit onset, loss and grad_norm spikes, divergence, learning-rate schedule shape (including minimum-LR floor), DPO likelihood displacement and accuracy saturation, GRPO stall, incomplete runs.
- Markdown and JSON export with a fixed schema; deterministic output.
- English and Korean UI with a language menu (`localStorage` key `trainer-state-lens.lang`, `?lang=ko|en` in the address).
- Bundled practice samples (own runs, Hub files under MIT / Apache-2.0, synthetic files) with source labels and licenses.
- CI (typecheck, tests, build) and a prepared GitHub Pages workflow.
