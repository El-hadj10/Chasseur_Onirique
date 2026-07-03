// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * Barrel for all tool primitives.
 * Consumers grab them all from here: `import { readFilesTool, … } from './tools'`.
 */

export { readFilesTool, type ReadFilesInput, type ReadFilesOutput } from './read_files.js';
export { writeFileTool, type WriteFileInput, type WriteFileOutput } from './write_file.js';
export { strReplaceTool, type StrReplaceInput, type StrReplaceOutput } from './str_replace.js';
export { listDirectoryTool, type ListDirectoryOutput } from './list_directory.js';
export { globTool, type GlobOutput } from './glob.js';
export { askUserTool, type AskUserInput, type AskUserOutput } from './ask_user.js';
export { writeTodosTool, type WriteTodosInput, type WriteTodosOutput } from './write_todos.js';
export { suggestFollowupsTool, type SuggestFollowupsInput, type SuggestFollowupsOutput } from './suggest_followups.js';
export { type ToolDescriptor, type ToolContext, type JSONSchema, safeRunTool } from './_schema.js';
