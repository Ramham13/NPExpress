export interface MockColumn {
  tableName: string;
  fieldName: string;
}

export interface EqExpression {
  kind: "eq";
  column: MockColumn;
  value: unknown;
}

export interface DescExpression {
  kind: "desc";
  column: MockColumn;
}

export function eq(column: MockColumn, value: unknown): EqExpression {
  return { kind: "eq", column, value };
}

export function desc(column: MockColumn): DescExpression {
  return { kind: "desc", column };
}
