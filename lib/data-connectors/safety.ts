export interface SqlSafetyOptions {
  allowedViews: string[];
  maxRows: number;
  requireTenantContext?: boolean;
  tenantId?: string;
}

export interface SqlSafetyResult {
  allowed: boolean;
  sql: string;
  reasons: string[];
  warnings: string[];
}

const BLOCKED_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "create",
  "drop",
  "alter",
  "truncate",
  "grant",
  "revoke",
  "copy",
  "call",
  "execute",
  "merge",
];

const WRITE_FUNCTION_PATTERNS = [
  /\bpg_sleep\s*\(/i,
  /\bdblink\s*\(/i,
  /\blo_import\s*\(/i,
  /\blo_export\s*\(/i,
];

export function parseAllowedViews(value: string | undefined): string[] {
  if (!value) {
    return [
      "v_market_bars",
      "v_latest_news",
      "v_symbol_daily_stats",
      "v_macro_calendar",
      "v_sentiment_rollup",
    ];
  }

  return value
    .split(",")
    .map((view) => view.trim())
    .filter(Boolean);
}

export function normalizeSql(sql: string) {
  return sql.trim().replace(/\s+/g, " ");
}

export function hasMultipleStatements(sql: string) {
  const withoutTrailingSemicolon = sql.trim().replace(/;\s*$/, "");
  return withoutTrailingSemicolon.includes(";");
}

export function extractReferencedRelations(sql: string): string[] {
  const relations = new Set<string>();
  const pattern = /\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_."-]*)/gi;
  let match = pattern.exec(sql);

  while (match) {
    const relation = match[1].replace(/"/g, "").split(".").pop();
    if (relation) relations.add(relation);
    match = pattern.exec(sql);
  }

  return [...relations];
}

export function enforceLimit(sql: string, maxRows: number) {
  if (/\blimit\s+\d+\b/i.test(sql)) {
    return sql.replace(/\blimit\s+(\d+)\b/i, (_match, rawLimit: string) => {
      const requestedLimit = Number.parseInt(rawLimit, 10);
      return `LIMIT ${Math.min(requestedLimit, maxRows)}`;
    });
  }

  return `${sql.replace(/;\s*$/, "")} LIMIT ${maxRows}`;
}

export function validateReadOnlySql(sql: string, options: SqlSafetyOptions): SqlSafetyResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const normalizedSql = normalizeSql(sql);
  const lowerSql = normalizedSql.toLowerCase();

  if (!lowerSql.startsWith("select ")) {
    reasons.push("Only SELECT statements are allowed.");
  }

  if (hasMultipleStatements(normalizedSql)) {
    reasons.push("Multiple SQL statements are not allowed.");
  }

  if (/--|\/\*/.test(normalizedSql)) {
    reasons.push("SQL comments are not allowed in guarded queries.");
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, "i").test(normalizedSql)) {
      reasons.push(`Blocked SQL keyword: ${keyword}.`);
    }
  }

  for (const pattern of WRITE_FUNCTION_PATTERNS) {
    if (pattern.test(normalizedSql)) {
      reasons.push("Blocked unsafe SQL function.");
    }
  }

  const referencedRelations = extractReferencedRelations(normalizedSql);
  const allowedViews = new Set(options.allowedViews);
  const disallowedRelations = referencedRelations.filter((relation) => !allowedViews.has(relation));
  if (disallowedRelations.length > 0) {
    reasons.push(`Query references disallowed relations: ${disallowedRelations.join(", ")}.`);
  }

  if (options.requireTenantContext && !options.tenantId) {
    reasons.push("Tenant context is required in SaaS mode.");
  }

  let safeSql = normalizedSql;
  if (!/\blimit\s+\d+\b/i.test(normalizedSql)) {
    warnings.push(`LIMIT ${options.maxRows} was added automatically.`);
    safeSql = enforceLimit(normalizedSql, options.maxRows);
  } else {
    safeSql = enforceLimit(normalizedSql, options.maxRows);
  }

  return {
    allowed: reasons.length === 0,
    sql: safeSql,
    reasons,
    warnings,
  };
}

