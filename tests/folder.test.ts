import { describe, expect, it } from 'vitest'
import { collectFromPicker, isStatePath, runNameFromPath, selectStateFiles } from '../src/core/folder.ts'
import { messages } from '../src/i18n/index.ts'

describe('folder helpers', () => {
  it('keeps only files named exactly trainer_state.json', () => {
    const paths = [
      'run-a/trainer_state.json',
      'run-a/model.safetensors',
      'run-a/trainer_state.json.bak',
      'run-a/my_trainer_state.json',
      'run-a/checkpoint-500/trainer_state.json',
    ]
    expect(selectStateFiles(paths.map((path) => ({ path }))).map((e) => e.path)).toEqual([
      'run-a/trainer_state.json',
      'run-a/checkpoint-500/trainer_state.json',
    ])
    expect(isStatePath('trainer_state.json')).toBe(true)
    expect(isStatePath('')).toBe(false)
  })

  it('names runs by the parent directory path, including nested checkpoints', () => {
    expect(runNameFromPath('run-a/checkpoint-500/trainer_state.json')).toBe('run-a/checkpoint-500')
    expect(runNameFromPath('run-a/trainer_state.json')).toBe('run-a')
    expect(runNameFromPath('run-a\\checkpoint-10\\trainer_state.json')).toBe('run-a/checkpoint-10')
  })

  it('keeps the file name for a single file without a directory', () => {
    expect(runNameFromPath('trainer_state.json')).toBe('trainer_state.json')
    expect(runNameFromPath('my-run.json')).toBe('my-run.json')
  })

  it('collects from a directory picker using webkitRelativePath and skips other files', () => {
    const make = (rel: string) => Object.assign(new File(['{}'], rel.split('/').pop()!), { webkitRelativePath: rel })
    const named = collectFromPicker([make('out/trainer_state.json'), make('out/checkpoint-1/trainer_state.json'), make('out/pytorch_model.bin')])
    expect(named.map((n) => n.name)).toEqual(['out', 'out/checkpoint-1'])
  })

  it('returns nothing when a folder has no trainer_state.json', () => {
    const f = Object.assign(new File(['x'], 'a.bin'), { webkitRelativePath: 'out/a.bin' })
    expect(collectFromPicker([f])).toEqual([])
  })

  it('has the new messages in both languages', () => {
    for (const key of ['drop.browseFolder', 'runs.parseError.no_state_in_folder']) {
      expect(messages.en[key as keyof typeof messages.en]).toBeTruthy()
      expect(messages.ko[key as keyof typeof messages.ko]).toBeTruthy()
    }
  })
})
