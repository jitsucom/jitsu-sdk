/**
 * Primitive value of DB field
 */
export declare type DataWarehousePrimitive = null | undefined | number | string | Date | any[];

/**
 * Object that is ready to be written to database. Can be coupled with JitsuDestinationHints.
 *
 * see flattenToTable() from pipeline-helpers module
 *
 */
export declare type TableObject = {
  [field: string]: DataWarehousePrimitive;
};

/**
 * This structure suggest how Jitsu JSON object should be put
 * to put to an SQL table (JITSU_TABLE_NAME). It defines a table name and
 * sql typing hints for fields (__sql_type_*).
 *
 * Not every type should have have a hint. If field has no hint,
 * the type will be picked automatically based on JSON type
 */
import { throws } from "assert";

export declare type JitsuDestinationHints<T extends TableObject> = {
  [key in `__sql_type_${string}`]: SqlTypeHint;
} & {
  JITSU_TABLE_NAME?: string;
};

/**
 * Hint for SQL type for particular field. It could be either
 * CanonicalSqlTypeHint — a detailed information about how the
 * column should be mapped to SQL type or shortcut. Shortcuts are
 * being converted to CanonicalSqlTypeHint by `canonicalSqlTypeHint` from
 * pipeline-helpers package
 *
 * Supported shortcuts: string (just an SQL type), [string, string] (ddl type, cast type)
 */
export declare type SqlTypeHint = CanonicalSqlTypeHint | string | [string, string];

export declare type CanonicalSqlTypeHint = {
  defaultDDLType: string;
  defaultCastType: string;
  dialects?: {
    [dialect: string]: { ddlType: string; castType: string };
  };
};
