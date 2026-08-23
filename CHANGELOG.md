# Changelog

All notable changes to this project are documented here.

## 1.3.1 - 2026-08-23

- Fixed `Ctrl+Z` being able to focus and open the search after a ComfyUI widget
  rebuild.
- Hardened shortcut recognition to require both the `F` key value and physical
  `KeyF` code.
- Preserved normal undo/redo handling by ComfyUI.
- Added a short focus guard for non-search `Ctrl`/`Cmd` shortcuts.

## 1.3.0 - 2026-08-20

- Added simultaneous highlighting for every match in the active prompt.
- Added an aligned, non-interactive textarea highlight layer that preserves
  normal prompt editing and follows canvas movement, zoom, and textarea scroll.
- Kept exact matches yellow and related terms blue.
- Added animated orange highlighting for the current occurrence.
- Removed overlapping duplicate occurrences from navigation.
- Improved repeated-term navigation by tracking each term's occurrence index.

## 1.2.1 - 2026-08-19

- Fixed `Enter` and `Shift+Enter` being passed to the prompt textarea after a
  match was selected, which could replace or delete selected prompt text.
- Kept occurrence navigation active while the result textarea has focus.
- Added blue highlighting for synonyms and related terms, while exact query
  matches remain yellow.
- Added the active matched term to the result status.
- Highlighted every visible related occurrence in result previews.

## 1.2.0 - 2026-08-19

- Expanded the offline vocabulary with common image-prompt terminology.
- Added related concepts for footwear, clothing, hair, framing, lighting,
  scenery, weather, visual styles, and image qualities.
- Connected categories and subtypes, including `shoes` and `loafers`.
- Added transitive merging for overlapping vocabulary groups.
- Renamed the user-facing section to **Synonyms & related** for clarity.

## 1.1.0 - 2026-08-18

- Added offline synonym suggestions in English and Portuguese.
- Added clickable synonym chips that start a new search.
- Added an optional synonym-expanded search mode using the **≈** toggle.
- Added synonym-aware occurrence navigation and exact text highlighting.
- Kept synonym prompt data local, with no external requests.

## 1.0.0 - 2026-08-18

- Added a workflow-aware replacement for Ctrl+F.
- Added a responsive topbar search field and anchored results dropdown.
- Added search across titles, types, prompts, widgets, and properties.
- Added grouping by node and navigation through repeated occurrences.
- Added field filters, case-sensitive search, and whole-word search.
- Added automatic canvas centering and node selection.
- Added exact text selection with an animated highlight pulse.
- Added debounced searching and a query clear button.
- Added compatibility handling for modern and legacy ComfyUI topbars.
