import type { MessageKey } from './en.ts'

/**
 * 한국어 메시지. en.ts 와 키가 같아야 한다(타입으로 강제, 테스트로 재확인).
 * 자리표시자 바로 뒤에는 조사를 붙이지 않는다(받침에 따라 틀어지므로): 단위·괄호·띄어쓰기로 문장을 끝낸다.
 */
export const ko: Record<MessageKey, string> = {
  // --- 앱 화면 ---
  'app.title': 'trainer-state-lens',
  'app.tagline': 'trainer_state.json 파일을 끌어다 놓으면 학습 곡선과 근거가 붙은 규칙 진단을 보여 줍니다.',
  'lang.label': '언어',
  'lang.en': 'English',
  'lang.ko': '한국어',

  // --- 끌어놓기 영역 ---
  'drop.title': 'trainer_state.json 파일을 여기에 끌어놓으세요',
  'drop.or': '또는',
  'drop.browse': '파일 선택',
  'drop.samples': '샘플 실행 불러오기',
  'drop.clear': '모두 지우기',
  'drop.privacy': '파일은 브라우저 안에서만 읽습니다. 어디로도 올리지 않습니다.',
  'drop.hint': '같은 학습의 체크포인트 파일은 step 기준으로 합치고, 다른 실행은 겹쳐서 보여 줍니다.',

  // --- 연습용 샘플 ---
  'samples.title': '연습용 샘플',
  'samples.note': '연습용 샘플: 진단을 직접 써 볼 수 있는 실제 파일과 합성 trainer_state.json 파일입니다.',
  'samples.add': '추가',
  'samples.loading': '불러오는 중...',
  'samples.source.own': '직접 학습',
  'samples.source.hub': 'Hub 공개 파일',
  'samples.source.synthetic': '합성',
  'samples.license': '라이선스',
  'samples.sample.tiny-sft': '문장 16개를 외우는 작은 SFT: 과적합',
  'samples.sample.tiny-sft-checkpoint-60': '같은 SFT 의 checkpoint-60 파일: 위 실행에 합쳐집니다',
  'samples.sample.tiny-dpo': '작은 DPO 실행: 정상 기준',
  'samples.sample.tiny-grpo': '작은 GRPO 실행: 정상 기준',
  'samples.sample.zephyr-7b-beta': 'zephyr-7b-beta DPO: 우도 이동, eval 손실 상승',
  'samples.sample.mistral-7b-sft-beta': 'mistral-7b-sft-beta SFT: 406 step 중 272 step 에서 멈춤',
  'samples.sample.smollm2-1.7b-instruct': 'SmolLM2-1.7B-Instruct DPO: 정상 기준',
  'samples.sample.openr1-distill-7b': 'OpenR1-Distill-7B SFT (13,645점): 최소 lr 바닥, grad_norm 스파이크',
  'samples.sample.synthetic-nan-broken': '모든 항목이 loss 0.0 + grad_norm NaN',
  'samples.sample.synthetic-eval-nan': 'eval_loss 에 NaN 이 섞임, 미완료 실행',
  'samples.sample.synthetic-infinity-best': '최상위 best_metric 이 Infinity',
  'samples.sample.synthetic-flat-jitter': '수렴한 손실의 아주 작은 흔들림: 스파이크로 잡으면 안 됨',
  'samples.sample.synthetic-diverge': '손실 상승, grad_norm 폭증, 끝에 NaN',
  'samples.sample.synthetic-grpo-stall': '보상이 평탄하고 그룹 분산이 0 인 GRPO',

  // --- 실행 목록 ---
  'runs.title': '실행',
  'runs.empty': '아직 실행이 없습니다. 파일을 끌어놓거나 샘플 실행을 불러오세요.',
  'runs.files': '파일 {count}개',
  'runs.show': '차트에 표시',
  'runs.status.error': '오류',
  'runs.status.warn': '주의',
  'runs.status.ok': '정상',
  'runs.parseError': '파일을 읽지 못했습니다: {file}',
  'runs.parseError.invalid_json': 'JSON 형식이 올바르지 않습니다. 파일이 잘렸을 수 있으니 다시 내려받거나 다시 복사해 보세요.',
  'runs.parseError.no_log_history':
    '"log_history" 배열이 없습니다. Hugging Face Trainer 가 저장한 trainer_state.json 파일이 필요합니다.',
  'runs.dismiss': '닫기',

  // --- 차트 ---
  'chart.title': '곡선',
  'chart.metrics': '지표',
  'chart.xaxis': 'x축',
  'chart.x.step': 'step',
  'chart.x.epoch': 'epoch',
  'chart.x.progress': '진행률 (max_steps 대비 %)',
  'chart.x.num_tokens': '토큰 수',
  'chart.smooth': '평활(EMA)',
  'chart.logy': 'y축 로그',
  'chart.empty': '아직 그릴 것이 없습니다.',
  'chart.markers': '점선은 진단이 가리키는 step 입니다(step 축과 진행률 축에서 표시).',
  'chart.compareNote':
    '실행 비교 주의: 기울기 누적 설정이나 라이브러리 버전이 다르면 기록된 손실의 절대값은 비교할 수 없습니다. 값이 아니라 모양과 상대 변화를 비교하세요.',
  'chart.axis.left': '왼쪽 축: {metrics}',
  'chart.axis.right': '오른쪽 축: {metrics}',
  'chart.points':'선마다 그리는 점은 최대 2000개이고, 진단은 모든 점을 사용합니다.',
  'chart.download.png': 'PNG 내려받기',
  'chart.download.failed': 'PNG 를 만들지 못했습니다. 다른 브라우저를 쓰거나 화면 캡처를 이용하세요.',

  // --- 진단표 ---
  'findings.title': '진단',
  'findings.empty': '발견된 것이 없습니다. 이 파일이 가진 키에서는 의심스러운 점이 없습니다.',
  'findings.col.severity': '심각도',
  'findings.col.rule': '규칙',
  'findings.col.step': 'Step',
  'findings.col.evidence': '근거',
  'findings.col.message': '확인된 내용',
  'findings.col.action': '확인할 것',
  'findings.focus': '차트를 이 위치로 확대',
  'severity.error': '오류',
  'severity.warn': '주의',
  'severity.info': '참고',
  'severity.ok': '정상',

  // --- 내보내기 ---
  'export.title': '내보내기',
  'export.markdown': 'Markdown 복사',
  'export.json': 'JSON 복사',
  'export.download.md': '.md 내려받기',
  'export.download.json': '.json 내려받기',
  'export.copied': '복사했습니다',
  'export.failed': '복사하지 못했습니다. 아래 글을 선택해 직접 복사하세요.',

  // --- 보고서(Markdown) ---
  'report.title': '학습 실행 진단',
  'report.files': '파일',
  'report.status': '상태',
  'report.entries': '항목 수(학습/평가/요약)',
  'report.noFindings': '발견된 것이 없습니다.',
  'report.generatedBy': 'trainer-state-lens 가 만들었습니다. 주의 표시는 확인할 곳을 가리킬 뿐 판정이 아닙니다.',
  'report.col.severity': '심각도',
  'report.col.rule': '규칙',
  'report.col.step': 'Step',
  'report.col.evidence': '근거',
  'report.col.message': '내용',

  // --- 메시지 안에서 쓰는 값 이름 ---
  'enum.constant': '상수',
  'enum.linear': '선형 감소',
  'enum.cosine': '코사인 감소',
  'enum.linear_min_lr': '최소 lr 바닥까지 선형 감소',
  'enum.cosine_min_lr': '최소 lr 바닥까지 코사인 감소',
  'enum.unknown': '불규칙한 모양',

  // --- 진단 문구: 확인된 내용(msg) 과 확인할 것(action) ---
  'finding.nonfinite.broken_run.msg':
    '고장난 실행: 연속 {entries}개 항목(step {firstStep} ~ {lastStep})이 loss 0.0 이면서 grad_norm 이 유한하지 않습니다.',
  'finding.nonfinite.broken_run.action':
    'fp16 오버플로, 손실 커널 또는 라이브러리 버전 문제가 흔한 원인입니다. bf16 사용, 학습률 낮추기, 학습 라이브러리 업데이트 후 다시 실행해 보세요.',
  'finding.nonfinite.all_loss.msg':
    '기록된 train loss 가 모두(항목 {entries}개, 처음 step {firstStep}) NaN 또는 Infinity 입니다. 쓸 만한 손실이 한 번도 나오지 않은 실행입니다.',
  'finding.nonfinite.all_loss.action':
    '데이터와 첫 배치, 학습률, 정밀도(bf16 시도)를 점검하세요. 첫 항목부터 유한하지 않은 손실은 후반 발산이 아닙니다.',
  'finding.nonfinite.values.msg':
    '유한하지 않은 값(NaN 또는 Infinity) {count}개, 키 {keys}, 처음 나온 step {firstStep}.',
  'finding.nonfinite.values.action':
    '이 앱은 파일을 그대로 엽니다. 유한하지 않은 값은 차트와 통계에서 빼 둡니다. 엄격한 JSON 뷰어는 이런 파일을 열지 못합니다.',

  'finding.overfit.eval_rise.msg.warn':
    'eval 손실이 step {evalMinStep} 에서 최저({evalMin})였고 이후 {risePct}% 올라 마지막 값은 {evalLast} 입니다. 학습-평가 간격: {gapFirst} → {gapLast}. 제외한 비유한 eval 값 수: {excludedNonFinite}.',
  'finding.overfit.eval_rise.msg.ok':
    'eval 손실이 최저값 {evalMin}(step {evalMinStep}) 보다 {risePct}% 높은 상태로 끝납니다: 과적합 신호 없음.',
  'finding.overfit.eval_rise.action':
    '조기 종료, load_best_model_at_end, 에폭 줄이기를 고려하세요. 일부러 길게 돌리는 레시피는 의도적으로 오를 수 있으니 eval 손실만 보지 말고 생성 품질을 확인하세요.',
  'finding.overfit.best_checkpoint_missing.msg':
    '최적 eval step {bestStep} 의 체크포인트가 저장되지 않았고(save_steps {saveSteps}) best_model_checkpoint 기록도 없습니다.',
  'finding.overfit.best_checkpoint_missing.action':
    'save_steps 를 eval_steps 의 배수로 맞추고 load_best_model_at_end 를 켜서 최적 모델을 남기세요.',
  'finding.overfit.insufficient.msg':
    '유한한 eval 손실 점이 {evalPoints}개뿐이어서(비유한 {excludedNonFinite}개 제외) 과적합 검사를 건너뛰었습니다.',
  'finding.overfit.insufficient.action': 'eval_loss 가 NaN 인 이유(정밀도, 빈 평가 배치)를 먼저 확인하세요.',

  'finding.spikes.loss.msg':
    '손실 스파이크 {count}개, 가장 큰 것은 step {topStep}(값 {topValue}, 창 중앙값 {windowMedian}). Step 목록: {steps}.',
  'finding.spikes.loss.action':
    '해당 step 근처의 배치를 살펴보세요. 학습률 낮추기, 기울기 클리핑, 이상치 샘플 정리가 도움이 되는 경우가 많습니다.',
  'finding.spikes.grad_norm.msg':
    'grad_norm 스파이크 {count}개, 가장 큰 것은 step {topStep}(값 {topValue}, 창 중앙값 {windowMedian}). Step 목록: {steps}.',
  'finding.spikes.grad_norm.action':
    '한 번뿐이면 이상한 배치 하나일 수 있습니다. 반복되면 학습률이 너무 높거나 정밀도가 불안정하다는 신호입니다.',
  'finding.spikes.divergence.msg.nonfinite_tail':
    '유한한 구간 뒤 step {firstNonFiniteStep} 부터 손실이 유한하지 않습니다({nonFiniteRows}개 항목): 학습이 발산했습니다.',
  'finding.spikes.divergence.msg.loss_climb':
    '손실이 최저 수준 {bestLoss}(step {bestStep})에서 끝에는 {endLoss}(약 {ratio}배)로 올랐습니다: 학습이 발산했습니다.',
  'finding.spikes.divergence.action':
    '학습률을 낮추고, 기울기 클리핑과 정밀도를 확인하고, 상승 전에 저장한 체크포인트에서 다시 시작하세요.',

  'finding.schedule.shape.msg':
    '학습률: {shape}. 워밍업 정점 {peakLr}(step {peakStep}, 전체의 약 {warmupPct}%, 해상도 {resolution} step), 마지막 값 {lastLr}, 바닥 비율 {floorRatio}, 적합 오차 {fitError}.',
  'finding.schedule.shape.action':
    '관찰된 값만 사용합니다. trainer_state.json 에는 warmup_steps 와 스케줄러 종류가 저장되지 않습니다.',

  'finding.run.empty.msg': 'train 항목(loss 행)이 없어 이 실행에서는 진단할 내용이 없습니다.',
  'finding.run.empty.action':
    'log_history 가 비었거나 eval·요약 행만 있습니다. 학습이 최소 한 번 로그(logging_steps)를 남긴 뒤 저장한 파일인지 확인하세요.',
  'finding.run.incomplete.msg': '실행이 {maxSteps} step 중 {globalStep} step 에서 멈췄습니다({percent}%).',
  'finding.run.incomplete.action':
    '체크포인트 복사본이거나 중단된 실행입니다. 곡선을 일부로 읽거나 체크포인트에서 이어서 학습하세요.',

  'finding.dpo.likelihood_displacement.msg':
    '보상 margin: {marginsFirst} → {marginsLast}, rewards/chosen: {rewardsChosenFirst} → {rewardsChosenLast}, logps/chosen: {logpsChosenFirst} → {logpsChosenLast} (첫 1/4 대 마지막 1/4). margin 은 커졌는데 chosen 답변의 확률은 낮아졌습니다.',
  'finding.dpo.likelihood_displacement.action':
    '우도 이동(arXiv 2410.08847)입니다. 길게 돌리는 레시피에서는 의도일 수 있으니 판단 전에 생성 결과를 비교하세요. 학습률이나 beta 낮추기, 에폭 줄이기, chosen 과 rejected 답변의 유사도 점검이 도움이 될 수 있습니다.',
  'finding.dpo.accuracy_saturated.msg':
    '마지막 1/4 의 rewards/accuracies: {accuracy}. 선호 쌍이 쉽게 구분됩니다.',
  'finding.dpo.accuracy_saturated.action':
    '정확도가 포화되면 새로 배울 신호가 적습니다. 더 어려운 쌍이나 더 이른 종료가 나을 수 있습니다.',

  'finding.grpo.zero_std_groups.msg':
    '학습 후반 그룹 중 보상이 모두 같은 비율(frac_reward_zero_std): {fracZeroStd}. 그런 그룹에서는 학습 신호가 없습니다.',
  'finding.grpo.zero_std_groups.action':
    '일부는 성공하고 일부는 실패하도록 과제 난이도를 조절하고, 프롬프트당 생성 수를 늘리거나 보상 함수를 점검하세요.',
  'finding.grpo.reward_flat.msg': '보상이 오르지 않았습니다: 첫 1/4 평균 {rewardFirst}, 마지막 1/4 평균 {rewardLast}.',
  'finding.grpo.reward_flat.action':
    '보상 함수, 학습률, 프롬프트 구성을 점검하세요. 처음부터 평탄하다면 보상이 한 번도 발생하지 않는 경우가 많습니다.',
  'finding.grpo.kl_high.msg': '기준 모델과의 KL: {klFirst} → {klLast}. 커지고 있습니다.',
  'finding.grpo.kl_high.action': '정책이 기준 모델에서 크게 벗어나고 있습니다. 품질이 유지되는지 확인하세요.',
  'finding.grpo.entropy_collapse.msg': '엔트로피: {entropyFirst} → {entropyLast}. 크게 떨어졌습니다.',
  'finding.grpo.entropy_collapse.action': '정책이 거의 결정적으로 바뀌었습니다. 탐색이 무너졌을 수 있습니다.',
  'finding.grpo.truncation.msg': '마지막 1/4 에서 최대 길이에 닿은 생성 비율: {clippedRatio}.',
  'finding.grpo.truncation.action': '최대 생성 길이를 늘리거나 기대 답변을 짧게 하세요.',
}
