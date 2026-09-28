async function requestFollowups(action, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/followups?action=${encodeURIComponent(action)}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
}

export function fetchFollowupWorkspace() {
  return requestFollowups('workspace');
}

export function createFollowupTemplate(input) {
  return requestFollowups('template', { method: 'POST', body: input });
}

export function updateFollowupTemplate(id, input) {
  return requestFollowups(`template&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export function createFollowupSchedule(input) {
  return requestFollowups('schedule', { method: 'POST', body: input });
}

export function scheduleOneOffMessage(input) {
  return requestFollowups('one-off', { method: 'POST', body: input });
}

export function cancelFollowupSchedule(id) {
  return requestFollowups(`schedule&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}
