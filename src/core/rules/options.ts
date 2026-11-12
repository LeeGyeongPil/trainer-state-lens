/** Default thresholds of the rules. Documented in the README; every value can be overridden per call. */
export interface Thresholds {
  /** Eval loss must rise this many percent above its minimum before overfit warns. */
  overfitRisePct: number
  /** Rolling window (number of previous points) for the spike baseline. */
  spikeWindow: number
  /** Spike when (value - median) / (1.4826 * MAD) exceeds this. */
  spikeK: number
  /** ... and the value is at least this fraction above the window median. */
  spikeRelFloor: number
  /** ... and exceeds the median by at least this fraction of the series' starting level. */
  spikeAbsFloor: number
  /** Divergence: end-of-run loss must be this many times the best smoothed loss ... */
  divergeRatio: number
  /** ... and exceed it by at least this fraction of the starting loss. */
  divergeAbsFloor: number
  /** Consecutive loss 0.0 rows with non-finite grad_norm that count as a broken run. */
  brokenRunMinEntries: number
  /** Schedule fit error (mean |lr - model| / peak) above which the shape is reported as unknown. */
  scheduleMaxFitError: number
  /** DPO: mean rewards/accuracies of the last quarter at or above this is "saturated". */
  dpoSaturatedAccuracy: number
  /** GRPO: mean frac_reward_zero_std over the last half at or above this warns. */
  grpoZeroStd: number
  /** GRPO: reward improvement (last quarter mean minus first quarter mean) below this warns. */
  grpoRewardGain: number
  /** GRPO: KL (last quarter mean) at or above this is reported. */
  grpoKlHigh: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  overfitRisePct: 5,
  spikeWindow: 20,
  spikeK: 6,
  spikeRelFloor: 0.5,
  spikeAbsFloor: 0.15,
  divergeRatio: 2,
  divergeAbsFloor: 0.25,
  brokenRunMinEntries: 3,
  scheduleMaxFitError: 0.08,
  dpoSaturatedAccuracy: 0.95,
  grpoZeroStd: 0.5,
  grpoRewardGain: 0.02,
  grpoKlHigh: 0.1,
}

export interface DiagnoseOptions {
  thresholds?: Partial<Thresholds>
}
