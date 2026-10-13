export async function onRequestDelete({ params, env }) {
  const db = env.DB;
  const date = params.date;

  if (!date) {
    return new Response(JSON.stringify({ error: 'Missing date parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // DELETE cascades to fund_values via ON DELETE CASCADE
  await db.prepare(
    `DELETE FROM records WHERE date = ?1`
  ).bind(date).run();

  return new Response(null, { status: 204 });
}
