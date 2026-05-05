function extractRolloutSteps(response) {
  if (Array.isArray(response?.steps)) {
    return response.steps;
  }

  if (Array.isArray(response?.action_sequence)) {
    return response.action_sequence;
  }

  return [];
}

function getStepText(step) {
  return step?.action
    ?? step?.description
    ?? step?.action_name
    ?? step?.name
    ?? 'Unknown step';
}

export function formatRolloutText(response, fallbackGoal) {
  const goal = response?.goal ?? fallbackGoal;
  const steps = extractRolloutSteps(response);
  const stepLines = steps.length
    ? steps.map((step, index) => `${index + 1}. ${getStepText(step)}`).join('\n')
    : 'No steps returned.';

  return `Goal: ${goal}\n\n${stepLines}`;
}
