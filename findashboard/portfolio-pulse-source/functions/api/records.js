export async function onRequestGet({ env }) {
  const db = env.DB;
  // Fetch all records with their funds, ordered by date
  const { results } = await db.prepare(
    `SELECT r.id, r.date, r.total, fv.name, fv.code, fv.value
     FROM records r
     JOIN fund_values fv ON fv.record_id = r.id
     ORDER BY r.date ASC, fv.id ASC`
  ).all();

  // Group rows into records array
  const map = new Map();
  for (const row of results) {
    if (!map.has(row.date)) {
      map.set(row.date, { date: row.date, total: row.total, funds: [] });
    }
    map.get(row.date).funds.push({ name: row.name, code: row.code, value: row.value });
  }

  return new Response(JSON.stringify([...map.values()]), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const body = await request.json();
  const { date, total, funds } = body;

  if (!date || total == null || !Array.isArray(funds) || !funds.length) {
    return new Response(JSON.stringify({ error: 'Missing required fields: date, total, funds' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Upsert the record (INSERT OR REPLACE creates a new id; use INSERT OR IGNORE + UPDATE pattern
  // to avoid cascade deleting fund_values when replacing)
  await db.prepare(
    `INSERT INTO records (date, total) VALUES (?1, ?2)
     ON CONFLICT(date) DO UPDATE SET total = excluded.total`
  ).bind(date, total).run();

  // Get the record id
  const { results: [rec] } = await db.prepare(
    `SELECT id FROM records WHERE date = ?1`
  ).bind(date).all();

  // Delete existing fund_values for this record
  await db.prepare(
    `DELETE FROM fund_values WHERE record_id = ?1`
  ).bind(rec.id).run();

  // Insert new fund_values
  for (const fund of funds) {
    await db.prepare(
      `INSERT INTO fund_values (record_id, name, code, value) VALUES (?1, ?2, ?3, ?4)`
    ).bind(rec.id, fund.name, fund.code || '', fund.value).run();
  }

  // Return the saved record
  const savedRecord = { date, total, funds };
  return new Response(JSON.stringify(savedRecord), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
