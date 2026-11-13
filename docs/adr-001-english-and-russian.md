# ADR-001: English and Russian in one plugin, life decisions first

**Status:** Accepted
**Date:** 2026-11-13
**Deciders:** plugin author

## Context
Logic Tree began as a personal Russian plugin for debate prep. It is now going into the Obsidian community catalog, where most users run Obsidian in English and very few do debates. The plugin will be presented as a tool for life decisions and for understanding study topics. Debate support stays as an extra.

Constraints:
- No build step. The whole plugin is `main.js`, about 3,900 lines of plain JS with ~400 lines of Russian text. Mobile Obsidian loads only `main.js`, so locale files cannot be required at runtime.
- Existing `.tree` files store the arrow question as text (`q: "Почему правда?"`), and the guided breakdown finds answers by comparing that text. Old Russian trees must keep working when the interface is in English, and new English trees must work in Russian.
- The automated catalog review checks the ESLint rules from `eslint-plugin-obsidianmd` (no inline styles, `createEl`, `getLanguage`, window timers, sentence case and others).

## Decision
1. **The Russian source text stays the message key.** A single map `EN = { 'русский текст': 'English text' }` lives in `main.js`.
   - `tr(text, vars)` returns the English text when the language is English and fills in `{name}` placeholders.
   - Data tables (motion types, life types, sections, help) are kept as Russian sources. `setLanguage()` builds localized copies of them with a deep `tr`.
2. **Questions are compared by meaning, not by text.**
   - `canonQ(q)` maps an English question back to its Russian key.
   - `sameQ(a, b)` compares the canonical forms, and every lookup of answers by question uses it.
   - Files never need migrating.
3. **The language is English by default.** A setting offers Auto (follow Obsidian), English or Русский. Auto uses `getLanguage()` and falls back to English.
4. **The modes are Decision, Topic and Debate, in that order.**
   - Topic is a new guided breakdown for studying: what it is, why it matters, how it works, examples, links, open questions.
   - Debate keeps the positions, the FRIC steps, the speech plan and the trainer.
5. **The motion list for the trainer is per language, not translated**: English motions use "This House would…".

## Options considered

### A. Russian source keys plus an EN map (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low: mechanical wrapping of literals |
| Risk | Low: the Russian UI is unchanged, so all 148 e2e steps still guard it |
| Old files | Work as they are, thanks to `canonQ` |

- **Pros:** small diff and one dictionary that serves both translation and question matching. A test can prove that the English UI shows no Cyrillic.
- **Cons:** contributors see Russian keys in the source, and the English text lives apart from the code.

### B. English key IDs (`t('wizard.next')`) with en/ru tables
| Dimension | Assessment |
|-----------|------------|
| Complexity | High: every string gets renamed and both tables are written from scratch |
| Risk | Higher: the whole UI is rewritten at once |
| Old files | Still need a question-alias table |

- **Pros:** the conventional layout, and the keys are readable for English contributors.
- **Cons:** about twice the work. Question matching still needs its own map.

### C. A build step with JSON locale files
- **Pros:** clean separation of code and text.
- **Cons:** it adds tooling to a project that deliberately has none, and the result is the same single `main.js`.

## Trade-off analysis
The biggest risk is breaking a working plugin that the author uses on a phone every day. Option A keeps the Russian behaviour byte for byte and adds English as a layer. It also lets one map solve both problems: translation and matching stored questions. Option B can be adopted later by renaming keys if outside contributors appear.

## Consequences
- A static test checks that every `tr('…')` literal has an English entry, and that the English data tables contain no Cyrillic.
- e2e runs the existing Russian flow with the language pinned to Russian, plus an English pass that fails on any Cyrillic in the plugin UI.
- Changing the language applies to tabs opened after the change. The setting says so.

## Action items
1. [x] `tr`, `EN`, `canonQ`, `sameQ`, `setLanguage`, plus a settings tab with the language choice.
2. [x] Topic mode and English detection of motions and questions.
3. [x] Fix guideline issues: `createEl`, `setCssStyles`, window timers, `vault.process`, no file iteration.
4. [x] README, LICENSE, `versions.json`, English screenshots, manifest 3.0.0.
