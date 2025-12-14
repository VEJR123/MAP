const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function getSwimmers(since?: number) {
  let url = `${API_BASE}/swimmers`;
  if (since) {
    url += `?since=${since}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
}

export async function getSwimmer(id: string, poolSize?: number) {
  const url = new URL(`${API_BASE}/swimmers/${id}`, window.location.origin);
  if (poolSize) {
    url.searchParams.append('poolSize', poolSize.toString());
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
}

export async function updateTime(swimmerId: string, timeId: string, patch: any) {
  const res = await fetch(`${API_BASE}/swimmers/${swimmerId}/times/${timeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

export async function deleteTime(swimmerId: string, timeId: string) {
  const res = await fetch(`${API_BASE}/swimmers/${swimmerId}/times/${timeId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

export async function createTime(swimmerId: string, payload: any) {
  const res = await fetch(`${API_BASE}/swimmers/${swimmerId}/times`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Create failed');
  return res.json();
}

export default { getSwimmers, getSwimmer, updateTime, deleteTime, createTime };
