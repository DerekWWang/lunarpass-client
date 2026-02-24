import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { history } = req.body;
  if (!history || typeof history !== 'object') {
    return res.status(400).json({ error: 'Invalid history' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const entries = Object.entries(history);

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
    return res.json({ success: true });
  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
