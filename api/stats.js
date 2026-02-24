import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT smashes, passes FROM choices WHERE id = ${id}`;

    if (rows.length === 0) return res.json({ smashes: 0, passes: 0 });
    return res.json({ smashes: rows[0].smashes || 0, passes: rows[0].passes || 0 });
  } catch (err) {
    console.error('stats error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
