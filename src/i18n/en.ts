/**
 * English messages: the single place for every user-visible string (UI, findings, exports).
 * `{name}` placeholders are filled from finding evidence or UI values. ko.ts must define the same keys.
 */
export const en = {
  // --- app shell ---
  'app.title': 'trainer-state-lens',
  'app.tagline': 'Drop trainer_state.json files, see the curves, and get rule-based diagnoses with evidence.',
  'lang.label': 'Language',
  'lang.en': 'English',
  'lang.ko': '한국어',

  // --- drop zone ---
  'drop.title': 'Drop trainer_state.json files here',
  'drop.or': 'or',
  'drop.browse': 'Choose files',
  'drop.samples': 'Load sample runs',
  'drop.clear': 'Clear all',
  'drop.privacy': 'Files are read in your browser only. Nothing is uploaded.',
  'drop.hint': 'Checkpoint files of one training are merged by step; different runs are overlaid.',

  // --- practice samples ---
  'samples.title': 'Practice samples',
  'samples.note': 'Practice samples: real and synthetic trainer_state.json files for trying the diagnoses.',
  'samples.add': 'Add',
  'samples.loading': 'Loading...',
  'samples.source.own': 'own run',
  'samples.source.hub': 'Hub file',
  'samples.source.synthetic': 'synthetic',
  'samples.license': 'License',
  'samples.sample.tiny-sft': 'Tiny SFT that memorises 16 sentences: overfits',
  'samples.sample.tiny-sft-checkpoint-60': 'Same SFT, checkpoint-60 file: merges into the run above',
  'samples.sample.tiny-dpo': 'Tiny DPO run: healthy reference',
  'samples.sample.tiny-grpo': 'Tiny GRPO run: healthy reference',
  'samples.sample.zephyr-7b-beta': 'zephyr-7b-beta DPO: likelihood displacement, eval loss rises',
  'samples.sample.mistral-7b-sft-beta': 'mistral-7b-sft-beta SFT: stopped at 272 of 406 steps',
  'samples.sample.smollm2-1.7b-instruct': 'SmolLM2-1.7B-Instruct DPO: healthy reference',
  'samples.sample.openr1-distill-7b': 'OpenR1-Distill-7B SFT (13,645 points): min-LR floor, grad_norm spike',
  'samples.sample.synthetic-nan-broken': 'loss 0.0 with grad_norm NaN in every entry',
  'samples.sample.synthetic-eval-nan': 'NaN mixed into eval_loss, unfinished run',
  'samples.sample.synthetic-infinity-best': 'best_metric is Infinity at the top level',
  'samples.sample.synthetic-flat-jitter': 'Converged loss with tiny jitter: must not be a spike',
  'samples.sample.synthetic-diverge': 'Loss climbs, grad_norm explodes, ends in NaN',
  'samples.sample.synthetic-grpo-stall': 'GRPO with flat reward and zero-variance groups',

  // --- runs ---
  'runs.title': 'Runs',
  'runs.empty': 'No runs yet. Drop files or load the sample runs.',
  'runs.files': '{count} file(s)',
  'runs.show': 'Show in chart',
  'runs.status.error': 'error',
  'runs.status.warn': 'warn',
  'runs.status.ok': 'ok',
  'runs.parseError': 'Could not read {file}',
  'runs.dismiss': 'Dismiss',
  'runs.parseError.invalid_json': 'The file is not valid JSON. It may be truncated: re-download it or copy it again.',
  'runs.parseError.no_log_history':
    'No "log_history" array found. Expected a Hugging Face Trainer trainer_state.json file.',

  // --- chart ---
  'chart.title': 'Curves',
  'chart.metrics': 'Metrics',
  'chart.xaxis': 'X axis',
  'chart.x.step': 'step',
  'chart.x.epoch': 'epoch',
  'chart.x.num_tokens': 'tokens',
  'chart.x.progress': 'progress (% of max_steps)',
  'chart.smooth': 'Smoothing (EMA)',
  'chart.logy': 'Log y axis',
  'chart.empty': 'Nothing to draw yet.',
  'chart.markers': 'Dashed lines mark diagnosed steps (step and progress axes).',
  'chart.compareNote':
    'Comparing runs: logged loss is not comparable across different gradient accumulation settings or library versions. Compare shapes and relative changes, not absolute values.',
  'chart.axis.left': 'left axis: {metrics}',
  'chart.axis.right': 'right axis: {metrics}',
  'chart.points':'Points drawn per line are capped at 2000; diagnoses use every point.',
  'chart.download.png': 'Download PNG',
  'chart.download.failed': 'Could not create the PNG. Try another browser or take a screenshot.',

  // --- findings table ---
  'findings.title': 'Diagnosis',
  'findings.empty': 'No findings. Nothing suspicious in the keys this file has.',
  'findings.col.severity': 'Severity',
  'findings.col.rule': 'Rule',
  'findings.col.step': 'Step',
  'findings.col.evidence': 'Evidence',
  'findings.col.message': 'What we see',
  'findings.col.action': 'What to check',
  'findings.focus': 'Zoom the chart here',
  'severity.error': 'error',
  'severity.warn': 'warn',
  'severity.info': 'info',
  'severity.ok': 'ok',

  // --- export ---
  'export.title': 'Export',
  'export.markdown': 'Copy Markdown',
  'export.json': 'Copy JSON',
  'export.download.md': 'Download .md',
  'export.download.json': 'Download .json',
  'export.copied': 'Copied',
  'export.failed': 'Copy failed: select the text below and copy it manually.',

  // --- report (Markdown export) ---
  'report.title': 'Training run diagnosis',
  'report.files': 'Files',
  'report.status': 'Status',
  'report.entries': 'Entries (train/eval/summary)',
  'report.noFindings': 'No findings.',
  'report.generatedBy': 'Generated by trainer-state-lens. Warnings point at places to check, they are not verdicts.',
  'report.col.severity': 'Severity',
  'report.col.rule': 'Rule',
  'report.col.step': 'Step',
  'report.col.evidence': 'Evidence',
  'report.col.message': 'Message',

  // --- enum labels used inside messages ---
  'enum.constant': 'constant',
  'enum.linear': 'linear decay',
  'enum.cosine': 'cosine decay',
  'enum.linear_min_lr': 'linear decay to a minimum LR floor',
  'enum.cosine_min_lr': 'cosine decay to a minimum LR floor',
  'enum.unknown': 'an irregular shape',

  // --- findings: message ("what we see") and action ("what to check") ---
  'finding.nonfinite.broken_run.msg':
    'Broken run: {entries} logged entries in a row (steps {firstStep} to {lastStep}) have loss 0.0 and a non-finite grad_norm.',
  'finding.nonfinite.broken_run.action':
    'Typical causes are fp16 overflow or a broken loss kernel or library version. Try bf16, a lower learning rate, or update the training libraries, then rerun.',
  'finding.nonfinite.all_loss.msg':
    'Every logged train loss ({entries} entries, first at step {firstStep}) is NaN or Infinity: the run never produced a usable loss.',
  'finding.nonfinite.all_loss.action':
    'Check the data and the first batches, the learning rate, and the precision (try bf16). A loss that is non-finite from the first entry is not a late divergence.',
  'finding.nonfinite.values.msg':
    '{count} non-finite values (NaN or Infinity) in keys {keys}; first at step {firstStep}.',
  'finding.nonfinite.values.action':
    'The file still opens here: non-finite values are left out of charts and statistics. Strict JSON viewers refuse such files.',

  'finding.overfit.eval_rise.msg.warn':
    'Eval loss was lowest at step {evalMinStep} ({evalMin}) and rose {risePct}% to {evalLast}. Train-eval gap went from {gapFirst} to {gapLast}. Non-finite eval values excluded: {excludedNonFinite}.',
  'finding.overfit.eval_rise.msg.ok':
    'Eval loss ends {risePct}% above its minimum {evalMin} (step {evalMinStep}): no overfit signal.',
  'finding.overfit.eval_rise.action':
    'Consider early stopping, load_best_model_at_end, or fewer epochs. A deliberately long recipe can rise on purpose: check generation quality, not only eval loss.',
  'finding.overfit.best_checkpoint_missing.msg':
    'The best eval step {bestStep} was not saved as a checkpoint (save_steps is {saveSteps}) and no best_model_checkpoint is recorded.',
  'finding.overfit.best_checkpoint_missing.action':
    'Make save_steps a multiple of eval_steps and enable load_best_model_at_end so the best model is kept.',
  'finding.overfit.insufficient.msg':
    'Only {evalPoints} finite eval loss points ({excludedNonFinite} non-finite excluded): the overfit check was skipped.',
  'finding.overfit.insufficient.action': 'Find out why eval_loss is NaN (precision, empty eval batches).',

  'finding.spikes.loss.msg':
    '{count} loss spikes; the largest at step {topStep} ({topValue} against a window median of {windowMedian}). Steps: {steps}.',
  'finding.spikes.loss.action':
    'Look at the batches around those steps. A lower learning rate, gradient clipping, or cleaning outlier samples often helps.',
  'finding.spikes.grad_norm.msg':
    '{count} grad_norm spikes; the largest at step {topStep} ({topValue} against a window median of {windowMedian}). Steps: {steps}.',
  'finding.spikes.grad_norm.action':
    'A single spike can be one odd batch. Repeated spikes point at a learning rate that is too high or unstable precision.',
  'finding.spikes.divergence.msg.nonfinite_tail':
    'Loss became non-finite from step {firstNonFiniteStep} ({nonFiniteRows} rows) after a finite stretch: the run diverged.',
  'finding.spikes.divergence.msg.loss_climb':
    'Loss climbed from its best level {bestLoss} (step {bestStep}) to {endLoss} at the end, {ratio} times higher: the run diverged.',
  'finding.spikes.divergence.action':
    'Lower the learning rate, enable gradient clipping, check precision, and resume from a checkpoint saved before the rise.',

  'finding.schedule.shape.msg':
    'Learning rate: {shape}. Warmup peak {peakLr} at step {peakStep} (about {warmupPct}% of the run, resolution {resolution} steps), last value {lastLr}, floor ratio {floorRatio}, fit error {fitError}.',
  'finding.schedule.shape.action':
    'Only observed values are used: trainer_state.json does not store warmup_steps or the scheduler type.',

  'finding.run.empty.msg': 'No train entries (loss rows) were found: there is nothing to diagnose in this run.',
  'finding.run.empty.action':
    'The log_history is empty or holds only eval or summary rows. Check that the file was saved after training logged at least one step (logging_steps).',
  'finding.run.incomplete.msg': 'The run stopped at step {globalStep} of {maxSteps} ({percent}%).',
  'finding.run.incomplete.action':
    'A checkpoint copy or an interrupted run. Read the curves as partial, or resume from the checkpoint.',

  'finding.dpo.likelihood_displacement.msg':
    'Reward margin rose from {marginsFirst} to {marginsLast}, yet rewards/chosen fell from {rewardsChosenFirst} to {rewardsChosenLast} and logps/chosen from {logpsChosenFirst} to {logpsChosenLast} (first vs last quarter): chosen answers became less likely.',
  'finding.dpo.likelihood_displacement.action':
    'Likelihood displacement (arXiv 2410.08847). A long recipe may intend this: compare generations before judging. A lower learning rate or beta, fewer epochs, or checking how similar chosen and rejected answers are can help.',
  'finding.dpo.accuracy_saturated.msg':
    'rewards/accuracies is {accuracy} in the last quarter: the preference pairs are separated easily.',
  'finding.dpo.accuracy_saturated.action':
    'Saturated accuracy means little new signal. Harder pairs or an earlier stop may give more.',

  'finding.grpo.zero_std_groups.msg':
    'In the second half of the run {fracZeroStd} of the groups had identical rewards (frac_reward_zero_std): no learning signal for them.',
  'finding.grpo.zero_std_groups.action':
    'Make the task harder or easier so some samples succeed and some fail, raise the number of generations per prompt, or check the reward function.',
  'finding.grpo.reward_flat.msg':
    'Reward did not improve: first quarter mean {rewardFirst}, last quarter mean {rewardLast}.',
  'finding.grpo.reward_flat.action':
    'Check the reward function, the learning rate and the prompt set. A flat reward from the start often means the reward is never triggered.',
  'finding.grpo.kl_high.msg': 'KL to the reference model grew from {klFirst} to {klLast}.',
  'finding.grpo.kl_high.action': 'The policy is moving far from the reference. Check that quality still holds.',
  'finding.grpo.entropy_collapse.msg': 'Entropy fell from {entropyFirst} to {entropyLast}.',
  'finding.grpo.entropy_collapse.action': 'The policy became nearly deterministic; exploration may have collapsed.',
  'finding.grpo.truncation.msg': '{clippedRatio} of completions hit the maximum length in the last quarter.',
  'finding.grpo.truncation.action': 'Raise the maximum completion length or shorten the expected answers.',
} as const

export type MessageKey = keyof typeof en
