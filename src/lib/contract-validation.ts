export type PrimaryKeyError = {
  field: string;
  message: string;
};

export function validatePrimaryKey(data: {
  contract?: {
    primary_key?: unknown;
    schema?: {
      fields?: Array<{ name?: unknown }>;
    };
  };
}): PrimaryKeyError[] {
  const primaryKey = data?.contract?.primary_key;
  const fields = data?.contract?.schema?.fields ?? [];
  const fieldNames = new Set<string>();
  for (const f of fields) {
    if (typeof f?.name === "string") fieldNames.add(f.name);
  }

  const pkList = Array.isArray(primaryKey) ? primaryKey : primaryKey != null ? [primaryKey] : [];
  const errors: PrimaryKeyError[] = [];
  for (const key of pkList) {
    if (typeof key !== "string" || !key) continue;
    if (!fieldNames.has(key)) {
      errors.push({
        field: key,
        message: `Primary key field "${key}" not found in contract.schema.fields`,
      });
    }
  }
  return errors;
}
