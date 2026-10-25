async function readError(res) {
  try {
    const data = await res.json();
    return data.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function generate({ solutionId, text, imageBase64, mimeType }) {
  let res;
  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({ solutionId, text, imageBase64, mimeType }),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('Generate timed out. Try a smaller image, or text only.');
    }
    throw err;
  }
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function listRecords(solutionId) {
  const res = await fetch(`/api/records?solution=${encodeURIComponent(solutionId)}`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function saveRecord({ solutionId, title, payload }) {
  const res = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ solutionId, title, payload }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteRecord(id) {
  const res = await fetch(`/api/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(await readError(res));
}
