export type Column = {
  name: string;
  type: "TEXT" | "INTEGER" | "REAL" | "BLOB";
  primaryKey?: boolean;
  notNull?: boolean;
};

export type TableSchema = {
  columns: Column[];
  primaryKey?: string[];
  indexes?: string[];
};

export async function ensureTable(
  db: D1Database,
  tableName: string,
  schema: TableSchema
) {
  // Check if table exists
  const tableExists = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .bind(tableName)
    .first();

  if (!tableExists) {
    const columnDefs = schema.columns.map((col) => {
      let def = `${col.name} ${col.type}`;
      if (col.primaryKey && (!schema.primaryKey || schema.primaryKey.length === 1)) {
        def += " PRIMARY KEY";
      }
      if (col.notNull) {
        def += " NOT NULL";
      }
      return def;
    });

    let createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs.join(", ")}`;
    
    if (schema.primaryKey && schema.primaryKey.length > 1) {
      createTableQuery += `, PRIMARY KEY (${schema.primaryKey.join(", ")})`;
    }
    
    createTableQuery += ")";

    await db.exec(createTableQuery);
  } else {
    // Basic column check (optional: could be more thorough with PRAGMA table_info)
    const tableInfo = await db.prepare(`PRAGMA table_info(${tableName})`).all();
    const existingColumns = new Set((tableInfo.results as any[]).map((r) => r.name));

    for (const col of schema.columns) {
      if (!existingColumns.has(col.name)) {
        let alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
        if (col.notNull) {
          // SQLite has restrictions on adding NOT NULL columns without default values
          // For simplicity in this Document Store pattern, we'll skip NOT NULL on ALTER for now
          // or the user can handle it via migrations if they need complex schema evolution.
        }
        await db.exec(alterQuery);
      }
    }
  }

  // Ensure indexes exist
  if (schema.indexes) {
    for (const indexQuery of schema.indexes) {
      await db.exec(indexQuery);
    }
  }
}
