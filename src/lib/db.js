import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

export async function fetchCharacterStats(characterId) {
  try {
    const rows = await sql`SELECT smashes, passes FROM choices WHERE id = ${characterId}`;
    if (rows.length === 0) return { smashes: 0, passes: 0 };
    return { smashes: rows[0].smashes || 0, passes: rows[0].passes || 0 };
  } catch (err) {
    console.error('Failed to fetch character stats:', err);
    return null;
  }
}

export async function submitAllResults(history) {
  try {
    const entries = Object.entries(history);
    if (entries.length === 0) {
      console.warn('submitAllResults: history is empty, nothing to submit');
      return false;
    }

    console.log(`Submitting ${entries.length} results to DB...`);

    const promises = entries.map(([id, choice]) => {
      const s = choice === 'smash' ? 1 : 0;
      const p = choice === 'pass' ? 1 : 0;
      return sql`
        INSERT INTO choices (id, smashes, passes) VALUES (${id}, ${s}, ${p})
        ON CONFLICT (id) DO UPDATE SET
          smashes = choices.smashes + ${s},
          passes = choices.passes + ${p}
      `;
    });

    await Promise.all(promises);
    console.log('Successfully submitted all results');
    return true;
  } catch (err) {
    console.error('Failed to submit results:', err);
    return false;
  }
}
