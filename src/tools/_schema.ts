// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * Tool primitives — the verb set the orchestrator exposes to itself.
 *
 * Shape is deliberately similar to MCP-tool descriptors so a real MCP bridge
 * can drop in later. Each tool exports:
 *   - `name`               — kebab-case id
 *   - `description`        — human readable
 *   - `schema`             — JSON-schema-lite shape (good enough for validation)
 *   - `run(input, ctx)`    — pure async function
 */

export interface ToolContext {
  rootDir: string;
  dryRun: boolean;
}

export type JSONSchema =
  | { type: 'string'; description?: string; enum?: string[] }
  | { type: 'number'; description?: string; minimum?: number; maximum?: number }
  | { type: 'integer'; description?: string }
  | { type: 'boolean'; description?: string }
  | { type: 'array'; items: JSONSchema; description?: string; minItems?: number }
  | { type: 'object'; properties: Record<string, JSONSchema>; required?: string[]; description?: string };

export interface ToolDescriptor<TIn = unknown, TOut = unknown> {
  name: string;
  description: string;
  schema: { type: 'object'; properties: Record<string, JSONSchema>; required?: string[] };
  run: (input: TIn, ctx: ToolContext) => Promise<TOut>;
}

export async function safeRunTool<TIn, TOut>(
  tool: ToolDescriptor<TIn, TOut>,
  input: TIn,
  ctx: ToolContext,
): Promise<TOut> {
  try {
    return await tool.run(input, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`[${tool.name}] ${message}`);
  }
}
