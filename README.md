# ComfyUI Find Words

Workflow-aware Ctrl+F search for ComfyUI. Find Words searches text that already
exists in the active workflow instead of opening the browser's page search.

The extension places a compact search field beside the **Graph** control. Its
results open as a dropdown directly below the field, without covering the
workflow with a modal.

## Features

- Search node titles, node types, prompts, widget values, and properties.
- Open the search using the topbar field or **Ctrl+F** / **Cmd+F**.
- Group matching fields by node and count repeated occurrences.
- Navigate every occurrence with **Enter** and **Shift+Enter**.
- Keep navigating even while the matched textarea owns the visible selection.
- Filter by text/widgets, titles/types, or properties.
- Optional case-sensitive and whole-word matching.
- Offline synonym and related-term suggestions in English and Portuguese.
- Prompt-oriented vocabulary for footwear, clothing, hair, framing, lighting,
  scenery, weather, visual styles, and other frequent concepts.
- Optional related-term expansion using the **≈** toggle.
- Center and select the matching node automatically.
- Select the exact text inside a prompt and pulse the field for visibility.
- Show exact matches in yellow and related-term matches in blue.
- Clear the current query with one click.
- Debounced input for smoother searching in large workflows.
- Support current and legacy ComfyUI topbar layouts.

## Install

Clone the repository into `ComfyUI/custom_nodes/`:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/v74199506-cyber/comfyui-find-words.git
```

Restart ComfyUI and hard-refresh the browser page.

```text
ComfyUI/
└── custom_nodes/
    └── comfyui-find-words/
        ├── __init__.py
        └── web/
            └── find_words.js
```

There are no additional Python dependencies.

## Use

- **Ctrl+F** / **Cmd+F**: focus the search field
- **Enter** / **Down Arrow**: next occurrence
- **Shift+Enter** / **Up Arrow**: previous occurrence
- **Aa**: toggle case-sensitive matching
- **W**: toggle whole-word matching
- **≈**: include known synonyms and related terms in the workflow results
- **×**: clear the query
- Click a suggestion chip: search for that synonym or related term
- Click a result: focus the node, select the matching text, and close the dropdown
- **Escape**: close the dropdown and restore the previous node selection

The extension searches the active graph shown on the canvas. If you enter a
subgraph, Ctrl+F searches that subgraph.

## Compatibility

Find Words is a frontend-only extension. It dynamically detects both modern
and legacy ComfyUI topbar structures and hides its launcher when insufficient
space is available.

Suggestions come from a curated prompt vocabulary bundled with the extension.
It includes strict synonyms and useful category relationships: for example,
searching for `shoes` can also find `loafers`, `sneakers`, or `boots`. The
feature works offline, sends no prompt text to external services, and is meant
to help explore prompts rather than act as a complete linguistic thesaurus.

## Development

The source is plain browser JavaScript in `web/find_words.js`. Restarting the
backend is usually unnecessary after JavaScript edits, but the browser must be
hard-refreshed to bypass its module cache.

## License

MIT
