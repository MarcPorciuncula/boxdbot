import superjson from "superjson";

export function createStore<T>(db: D1Database, table: string) {
  return {
    async get(keys: Record<string, string>): Promise<T | null> {
      const whereClause = Object.keys(keys)
        .map((k) => `${k} = ?`)
        .join(" AND ");
      const values = Object.values(keys);

      const row = await db
        .prepare(`SELECT value FROM ${table} WHERE ${whereClause}`)
        .bind(...values)
        .first<{ value: string }>();

      if (!row) return null;

      return superjson.parse<T>(row.value);
    },

    async set(
      keys: Record<string, string>,
      value: T,
      extraColumns: Record<string, any> = {}
    ): Promise<void> {
      const allData = { ...keys, ...extraColumns };
      const columns = [...Object.keys(allData), "value"];
      const placeholders = columns.map(() => "?").join(", ");
      const values = [...Object.values(allData), superjson.stringify(value)];

      const updateClause = columns.map((col) => `${col} = EXCLUDED.${col}`).join(", ");

      await db
        .prepare(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
           ON CONFLICT(${Object.keys(keys).join(", ")}) DO UPDATE SET ${updateClause}`
        )
        .bind(...values)
        .run();
    },

    async query(filter: Record<string, string> = {}): Promise<T[]> {
      let sql = `SELECT value FROM ${table}`;
      const values = Object.values(filter);

      if (values.length > 0) {
        const whereClause = Object.keys(filter)
          .map((k) => `${k} = ?`)
          .join(" AND ");
        sql += ` WHERE ${whereClause}`;
      }

      const { results } = await db.prepare(sql).bind(...values).all<{ value: string }>();

      return results.map((row) => superjson.parse<T>(row.value));
    },

    async delete(keys: Record<string, string>): Promise<void> {
      const whereClause = Object.keys(keys)
        .map((k) => `${k} = ?`)
        .join(" AND ");
      const values = Object.values(keys);

      await db
        .prepare(`DELETE FROM ${table} WHERE ${whereClause}`)
        .bind(...values)
        .run();
    },
  };
}
