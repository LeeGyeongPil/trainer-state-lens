/**
 * Bundled practice samples. Each file lives in /samples and is split into its own lazy chunk,
 * so the 2 MB OpenR1 file is only loaded when someone asks for it. No network request is made:
 * the text is part of the build output.
 */
export type SampleSource = 'own' | 'hub' | 'synthetic'

export interface SampleInfo {
  /** File name without extension, also the i18n key suffix `samples.sample.<id>`. */
  id: string
  source: SampleSource
  license: string
  /** Where a Hub file came from (empty for own and synthetic files). */
  url: string
  /** Loaded by the "Load sample runs" button. */
  starter: boolean
}

const HUB = 'https://huggingface.co/'

export const SAMPLES: readonly SampleInfo[] = [
  { id: 'tiny-sft', source: 'own', license: 'MIT', url: '', starter: true },
  { id: 'tiny-sft-checkpoint-60', source: 'own', license: 'MIT', url: '', starter: true },
  { id: 'tiny-dpo', source: 'own', license: 'MIT', url: '', starter: false },
  { id: 'tiny-grpo', source: 'own', license: 'MIT', url: '', starter: false },
  {
    id: 'zephyr-7b-beta',
    source: 'hub',
    license: 'MIT',
    url: `${HUB}HuggingFaceH4/zephyr-7b-beta`,
    starter: true,
  },
  {
    id: 'mistral-7b-sft-beta',
    source: 'hub',
    license: 'MIT',
    url: `${HUB}HuggingFaceH4/mistral-7b-sft-beta`,
    starter: false,
  },
  {
    id: 'smollm2-1.7b-instruct',
    source: 'hub',
    license: 'Apache-2.0',
    url: `${HUB}HuggingFaceTB/SmolLM2-1.7B-Instruct`,
    starter: false,
  },
  {
    id: 'openr1-distill-7b',
    source: 'hub',
    license: 'Apache-2.0',
    url: `${HUB}open-r1/OpenR1-Distill-7B`,
    starter: false,
  },
  { id: 'synthetic-nan-broken', source: 'synthetic', license: 'MIT', url: '', starter: true },
  { id: 'synthetic-eval-nan', source: 'synthetic', license: 'MIT', url: '', starter: false },
  { id: 'synthetic-infinity-best', source: 'synthetic', license: 'MIT', url: '', starter: false },
  { id: 'synthetic-flat-jitter', source: 'synthetic', license: 'MIT', url: '', starter: false },
  { id: 'synthetic-diverge', source: 'synthetic', license: 'MIT', url: '', starter: false },
  { id: 'synthetic-grpo-stall', source: 'synthetic', license: 'MIT', url: '', starter: false },
]

const loaders = import.meta.glob('../../samples/*.json', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>

/** Text of a bundled sample file. */
export async function loadSampleText(id: string): Promise<string> {
  const load = loaders[`../../samples/${id}.json`]
  if (!load) throw new Error(`Unknown sample "${id}". Known samples: ${SAMPLES.map((s) => s.id).join(', ')}`)
  return load()
}
