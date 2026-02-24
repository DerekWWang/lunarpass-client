export async function fetchCharacterStats(characterId) {
  try {
    const res = await fetch(`/api/stats?id=${encodeURIComponent(characterId)}`);
    if (!res.ok) return { smashes: 0, passes: 0 };
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch character stats:', err);
    return null;
  }
}

export async function submitAllResults(history) {
  try {
    const entries = Object.entries(history);
    if (entries.length === 0) return false;

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history })
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to submit results:', err);
    return false;
  }
}
