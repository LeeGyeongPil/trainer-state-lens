/** Folder collection helpers: pick only `trainer_state.json` files by name and derive run names from paths. */

export const STATE_FILE_NAME = 'trainer_state.json'

/** A file picked from the user's machine together with the run name to show for it. */
export interface NamedFile {
  name: string
  file: File
}

/** Split a relative path into non-empty segments (accepts `/` and `\`). */
function segments(path: string): string[] {
  return path.split(/[\\/]+/).filter((part) => part.length > 0)
}

/** True when the path points at a file named exactly `trainer_state.json`. Other files are never read. */
export function isStatePath(path: string): boolean {
  const parts = segments(path)
  return parts.length > 0 && parts[parts.length - 1] === STATE_FILE_NAME
}

/**
 * Run name for a file found in a folder: its parent directory path
 * (`run-a/checkpoint-500/trainer_state.json` -> `run-a/checkpoint-500`).
 * A file without a directory keeps its file name, as single dropped files always did.
 */
export function runNameFromPath(path: string): string {
  const parts = segments(path)
  if (parts.length <= 1) return parts[0] ?? path
  return parts.slice(0, -1).join('/')
}

/** Keep only the entries whose path is a `trainer_state.json`, and name each by its directory path. */
export function selectStateFiles<T extends { path: string }>(entries: T[]): Array<T & { name: string }> {
  return entries.filter((entry) => isStatePath(entry.path)).map((entry) => ({ ...entry, name: runNameFromPath(entry.path) }))
}

// --- browser glue (needs real DOM entries, so it is not unit tested) ---

interface EntryLike {
  isFile: boolean
  isDirectory: boolean
  name: string
  file?: (ok: (file: File) => void, fail: (error: unknown) => void) => void
  createReader?: () => { readEntries: (ok: (entries: EntryLike[]) => void, fail: (error: unknown) => void) => void }
}

async function readAll(entry: EntryLike): Promise<EntryLike[]> {
  const reader = entry.createReader!()
  const all: EntryLike[] = []
  // readEntries returns batches; call it until it returns an empty array.
  for (;;) {
    const batch = await new Promise<EntryLike[]>((ok, fail) => reader.readEntries(ok, fail))
    if (batch.length === 0) return all
    all.push(...batch)
  }
}

async function walk(entry: EntryLike, prefix: string, out: Array<{ path: string; entry: EntryLike }>): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name
  if (entry.isDirectory) {
    for (const child of await readAll(entry)) await walk(child, path, out)
  } else if (entry.isFile) {
    out.push({ path, entry }) // listed by name only; opened later if the name matches
  }
}

function openFile(entry: EntryLike): Promise<File> {
  return new Promise<File>((ok, fail) => entry.file!(ok, fail))
}

/**
 * Collect named `trainer_state.json` files from a drop. Folders are walked recursively;
 * dropped plain files keep their file name and the old behaviour.
 * `fromFolder` tells the caller whether at least one folder was dropped.
 */
export async function collectFromDrop(
  items: DataTransferItemList,
  plainFiles: File[],
): Promise<{ named: NamedFile[]; fromFolder: boolean }> {
  const entries: EntryLike[] = []
  for (const item of [...items]) {
    const getter = (item as unknown as { webkitGetAsEntry?: () => EntryLike | null }).webkitGetAsEntry
    const entry = item.kind === 'file' && getter ? getter.call(item) : null
    if (entry) entries.push(entry)
  }
  if (!entries.some((entry) => entry.isDirectory)) {
    return { named: plainFiles.map((file) => ({ name: file.name, file })), fromFolder: false }
  }

  const named: NamedFile[] = []
  const listed: Array<{ path: string; entry: EntryLike }> = []
  for (const entry of entries) {
    if (entry.isDirectory) await walk(entry, '', listed)
    else if (entry.isFile) {
      const file = await openFile(entry)
      named.push({ name: file.name, file })
    }
  }
  for (const found of selectStateFiles(listed)) named.push({ name: found.name, file: await openFile(found.entry) })
  return { named, fromFolder: true }
}

/** Collect from a `webkitdirectory` input using `webkitRelativePath`. */
export function collectFromPicker(files: File[]): NamedFile[] {
  const listed = files.map((file) => ({ path: file.webkitRelativePath || file.name, file }))
  return selectStateFiles(listed).map((found) => ({ name: found.name, file: found.file }))
}
