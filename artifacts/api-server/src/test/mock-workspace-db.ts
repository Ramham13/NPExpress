import type { DescExpression, EqExpression, MockColumn } from "./mock-drizzle";

type TableName = "admin_config" | "orders" | "order_delivery_attempts";

type AdminConfigRow = {
  id: number;
  sizes: unknown[];
  workflowSettings: Record<string, unknown>;
  updatedAt: Date;
};

type OrderRow = {
  id: number;
  orderId: string;
  state: string;
  paymentMethod: string;
  payload: Record<string, unknown>;
  payloadChecksum: string;
  n8nDeliveryToken: string;
  n8nAckReceivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttemptRow = {
  id: number;
  orderId: string;
  attemptNumber: number;
  requestChecksum: string;
  requestPayload: unknown;
  requestStatus: string;
  responseStatus: string | null;
  responseBody: Record<string, unknown> | null;
  confirmationState: string;
  createdAt: Date;
};

type RowByTable = {
  admin_config: AdminConfigRow;
  orders: OrderRow;
  order_delivery_attempts: AttemptRow;
};

type Selection = Record<string, MockColumn> | undefined;

function column(tableName: TableName, fieldName: string): MockColumn {
  return { tableName, fieldName };
}

function table<T extends TableName, TShape extends Record<string, MockColumn>>(name: T, shape: TShape) {
  return {
    __name: name,
    ...shape,
  };
}

export const adminConfigTable = table("admin_config", {
  id: column("admin_config", "id"),
  sizes: column("admin_config", "sizes"),
  workflowSettings: column("admin_config", "workflowSettings"),
  updatedAt: column("admin_config", "updatedAt"),
});

export const orderTable = table("orders", {
  id: column("orders", "id"),
  orderId: column("orders", "orderId"),
  state: column("orders", "state"),
  paymentMethod: column("orders", "paymentMethod"),
  payload: column("orders", "payload"),
  payloadChecksum: column("orders", "payloadChecksum"),
  n8nDeliveryToken: column("orders", "n8nDeliveryToken"),
  n8nAckReceivedAt: column("orders", "n8nAckReceivedAt"),
  createdAt: column("orders", "createdAt"),
  updatedAt: column("orders", "updatedAt"),
});

export const orderDeliveryAttemptTable = table("order_delivery_attempts", {
  id: column("order_delivery_attempts", "id"),
  orderId: column("order_delivery_attempts", "orderId"),
  attemptNumber: column("order_delivery_attempts", "attemptNumber"),
  requestChecksum: column("order_delivery_attempts", "requestChecksum"),
  requestPayload: column("order_delivery_attempts", "requestPayload"),
  requestStatus: column("order_delivery_attempts", "requestStatus"),
  responseStatus: column("order_delivery_attempts", "responseStatus"),
  responseBody: column("order_delivery_attempts", "responseBody"),
  confirmationState: column("order_delivery_attempts", "confirmationState"),
  createdAt: column("order_delivery_attempts", "createdAt"),
});

const rows: Record<TableName, Array<RowByTable[TableName]>> = {
  admin_config: [],
  orders: [],
  order_delivery_attempts: [],
};

const sequences: Record<TableName, number> = {
  admin_config: 1,
  orders: 1,
  order_delivery_attempts: 1,
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeValue(value: unknown) {
  if (value instanceof Date) return value.getTime();
  return value;
}

function matches(row: Record<string, unknown>, expression?: EqExpression) {
  if (!expression) return true;
  return normalizeValue(row[expression.column.fieldName]) === normalizeValue(expression.value);
}

function sortRows<T extends Record<string, unknown>>(input: T[], orderings: DescExpression[]) {
  if (orderings.length === 0) return input;
  return [...input].sort((left, right) => {
    for (const ordering of orderings) {
      const field = ordering.column.fieldName;
      const a = normalizeValue(left[field]);
      const b = normalizeValue(right[field]);
      if (a === b) continue;
      return a! < b! ? 1 : -1;
    }
    return 0;
  });
}

function projectRow<T extends TableName>(tableName: T, row: RowByTable[T], selection: Selection) {
  if (!selection) return clone(row);
  const result: Record<string, unknown> = {};
  for (const [alias, selectedColumn] of Object.entries(selection)) {
    if (selectedColumn.tableName !== tableName) continue;
    result[alias] = clone((row as Record<string, unknown>)[selectedColumn.fieldName]);
  }
  return result;
}

class SelectQuery<T extends TableName> implements PromiseLike<Array<unknown>> {
  private targetTable?: T;
  private whereExpression?: EqExpression;
  private orderings: DescExpression[] = [];
  private limitCount?: number;

  constructor(private readonly selection?: Selection) {}

  from(tableRef: { __name: T }) {
    this.targetTable = tableRef.__name;
    return this;
  }

  where(expression: EqExpression) {
    this.whereExpression = expression;
    return this;
  }

  orderBy(...orderings: DescExpression[]) {
    this.orderings = orderings;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private execute() {
    if (!this.targetTable) {
      return [];
    }
    let result = rows[this.targetTable]
      .filter((row) => matches(row as Record<string, unknown>, this.whereExpression));
    result = sortRows(result as Array<Record<string, unknown>>, this.orderings) as typeof result;
    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }
    return result.map((row) => projectRow(this.targetTable!, row as RowByTable[T], this.selection));
  }

  then<TResult1 = Array<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Array<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

class InsertQuery<T extends TableName> {
  private pendingValues: Array<Partial<RowByTable[T]>> = [];

  constructor(private readonly tableName: T) {}

  values(value: Partial<RowByTable[T]> | Array<Partial<RowByTable[T]>>) {
    this.pendingValues = Array.isArray(value) ? value : [value];
    return this;
  }

  async returning() {
    return this.pendingValues.map((value) => insertRow(this.tableName, value));
  }
}

class UpdateQuery<T extends TableName> implements PromiseLike<Array<RowByTable[T]>> {
  private patch: Partial<RowByTable[T]> = {};
  private whereExpression?: EqExpression;

  constructor(private readonly tableName: T) {}

  set(value: Partial<RowByTable[T]>) {
    this.patch = value;
    return this;
  }

  where(expression: EqExpression) {
    this.whereExpression = expression;
    return this;
  }

  private execute() {
    const updated: Array<RowByTable[T]> = [];
    rows[this.tableName] = rows[this.tableName].map((current) => {
      if (!matches(current as Record<string, unknown>, this.whereExpression)) {
        return current;
      }
      const next = {
        ...current,
        ...clone(this.patch),
      } as RowByTable[T];
      if ("updatedAt" in next && !("updatedAt" in this.patch)) {
        (next as Record<string, unknown>).updatedAt = new Date();
      }
      updated.push(clone(next));
      return next;
    }) as Array<RowByTable[TableName]>;
    return updated;
  }

  returning() {
    return Promise.resolve(this.execute());
  }

  then<TResult1 = Array<RowByTable[T]>, TResult2 = never>(
    onfulfilled?: ((value: Array<RowByTable[T]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

function insertRow<T extends TableName>(tableName: T, value: Partial<RowByTable[T]>) {
  const nextId = sequences[tableName]++;
  const now = new Date();

  let next: RowByTable[T];
  if (tableName === "admin_config") {
    next = {
      id: nextId,
      sizes: [],
      workflowSettings: {},
      updatedAt: now,
      ...clone(value),
    } as unknown as RowByTable[T];
  } else if (tableName === "orders") {
    next = {
      id: nextId,
      n8nAckReceivedAt: null,
      createdAt: now,
      updatedAt: now,
      ...clone(value),
    } as unknown as RowByTable[T];
  } else {
    next = {
      id: nextId,
      createdAt: now,
      ...clone(value),
    } as unknown as RowByTable[T];
  }

  rows[tableName].push(next);
  return clone(next);
}

export const db = {
  select(selection?: Selection) {
    return new SelectQuery(selection);
  },
  insert<T extends TableName>(tableRef: { __name: T }) {
    return new InsertQuery(tableRef.__name);
  },
  update<T extends TableName>(tableRef: { __name: T }) {
    return new UpdateQuery(tableRef.__name);
  },
};

export function resetMockDb() {
  rows.admin_config = [];
  rows.orders = [];
  rows.order_delivery_attempts = [];
  sequences.admin_config = 1;
  sequences.orders = 1;
  sequences.order_delivery_attempts = 1;
}

export function seedAdminConfig(value: Partial<AdminConfigRow>) {
  return insertRow("admin_config", value);
}

export function seedOrder(value: Partial<OrderRow>) {
  return insertRow("orders", value);
}

export function seedAttempt(value: Partial<AttemptRow>) {
  return insertRow("order_delivery_attempts", value);
}

export function getTableRows<T extends TableName>(tableRef: { __name: T }): Array<RowByTable[T]> {
  return clone(rows[tableRef.__name]) as Array<RowByTable[T]>;
}
