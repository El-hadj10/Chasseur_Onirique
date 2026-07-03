# Tools

Eight verbs the orchestrator exposes. They live under `src/tools/`. A tool is a
plain async function with a name + JSON-schema-lite descriptor. This is the
shape that's compatible with MCP-tool descriptors, so a real MCP bridge can
drop in later without changing call sites.

> _Chasseur Onirique — by El-hadj Ousmane._

| Tool                | Purpose                                       | Schema (required keys)                       | Dry-run? | Failure mode                                |
| :------------------ | :-------------------------------------------- | :------------------------------------------- | :------: | :------------------------------------------ |
| `read_files`        | Read up to N files (64 KiB cap each)          | `paths: string[]`                            | n/a      | Skips missing paths silently                |
| `write_file`        | Create / overwrite a file                     | `path, content`                              | yes      | mkdir -p before write; refusal via throw    |
| `str_replace`       | Surgical patch via exact-string match         | `path, oldString, newString, allOccurrences?`| yes      | **Throws** on ambiguous (>1) match unless `allOccurrences: true` |
| `list_directory`    | Shallow listing of a directory                | `path`                                       | n/a      | Errors bubble up via the `safeRunTool` wrap |
| `glob`              | Walk + filter by glob pattern (**, *)         | `pattern, root?`                             | n/a      | Recursion caps implicit (stack-based)       |
| `ask_user`          | Hand a question back to the user              | `question, options[]`                        | n/a      | Deterministic-stub: returns `selection: 0`  |
| `write_todos`       | Replace/validate the current plan             | `todos[]`                                    | n/a      | Counts accepted vs rejected                 |
| `suggest_followups` | Surface N clickable follow-ups                 | `followups[]`                                | n/a      | Prints to stdout, returns `count`          |

## Common shape

```ts
interface ToolDescriptor<TIn = unknown, TOut = unknown> {
  name: string;                                                                  // kebab-case id
  description: string;                                                           // human-readable
  schema: { type: 'object'; properties: Record<string, JSONSchema>; required?: string[] };
  run(input: TIn, ctx: ToolContext): Promise<TOut>;
}
```

`ToolContext` carries `{ rootDir, dryRun }`. Tools do *not* see the parent
`Context` — they are stateless verbs.

## Dry-run semantics

Tools that mutate the filesystem (`write_file`, `str_replace`) honor
`ctx.dryRun`:

- `dryRun: true` → still validate; report what would happen, do not touch disk.
- `dryRun: false` → execute for real.

The CLI sets `dryRun: Chasseur Onirique`'s default mode. Switching to live mode
requires the explicit environment flag `CHASSEUR_ONIRIQUE_LIVE=1` — this is a
higher bar than the dry-run default.

## Adding a new tool

1. Create `src/tools/<name>.ts`. Export the descriptor.
2. Add a re-export line to `src/tools/index.ts`.
3. If the tool needs *new* root-only privileges, document them in this file.

That's it. No orchestrator changes required.
