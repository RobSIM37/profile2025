// Gate transition from setup to play when both prerequisites are done

export function maybeEnterPlayPhase(state, deps) {
  const { isBoardReady, renderRacks, boardEl, enableHumanSelect, aiStepIfNeeded } = deps;
  if (!state || state.phase === 'play') return;
  const setup = state.setup || {};
  const humanTotal = Array.isArray(setup.humanColors) ? setup.humanColors.length : 0;
  const humansDone = humanTotal === 0 || setup.index >= humanTotal || setup.humanPlacementDone === true;
  if (humansDone && !setup.humanPlacementDone) setup.humanPlacementDone = true;
  const aiDone = setup.aiRevealDone === true;
  if (humansDone && aiDone && isBoardReady(state)) {
    state.phase = 'play';
    renderRacks(state);
    // After entering play, ensure interactions and possibly AI move
    boardEl.querySelectorAll('.kio-drop-hover').forEach((el) => el.classList.remove('kio-drop-hover'));
    enableHumanSelect();
    aiStepIfNeeded();
  }
}

