const db = require('../config/db'); // your mysql connection/pool module

async function insertQueryLog({
  tenant_id = null,
  query_text,
  results_count = 0,
  model_used,
  response_time_ms,
}) {
  const sql = `
    INSERT INTO query_logs
      (tenant_id, query_text, results_count, model_used, response_time_ms)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [tenant_id, query_text, results_count, model_used, response_time_ms];

  return db.execute(sql, params);
}

module.exports = {
  insertQueryLog,
};
