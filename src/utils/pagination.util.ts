import type { Model } from 'mongoose';

type QueryValue = string | string[] | undefined;

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PaginateModelOptions<TDocument, TResult = TDocument> {
  query: Record<string, unknown>;
  filter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  populate?: any;
  select?: any;
  lean?: boolean;
  defaultLimit?: number;
  maxLimit?: number;
  transform?: (items: TDocument[]) => Promise<TResult[]> | TResult[];
}

function getFirstQueryValue(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getPaginationParams(
  query: Record<string, unknown>,
  defaultLimit = 10,
  maxLimit = 100
): PaginationParams {
  const rawPage = getFirstQueryValue(query.page as QueryValue);
  const rawLimit = getFirstQueryValue(query.limit as QueryValue);

  const page = Math.max(1, Number(rawPage) || 1);
  const requestedLimit = Math.max(1, Number(rawLimit) || defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function paginateModel<TDocument, TResult = TDocument>(
  model: Model<TDocument>,
  {
    query,
    filter = {},
    sort,
    populate,
    select,
    lean = false,
    defaultLimit = 10,
    maxLimit = 100,
    transform,
  }: PaginateModelOptions<TDocument, TResult>
) {
  const { page, limit, skip } = getPaginationParams(query, defaultLimit, maxLimit);

  let findQuery: any = model.find(filter).skip(skip).limit(limit);

  if (sort) {
    findQuery = findQuery.sort(sort);
  }

  if (populate) {
    const populateEntries = Array.isArray(populate) ? populate : [populate];
    for (const entry of populateEntries) {
      findQuery = findQuery.populate(entry);
    }
  }

  if (select) {
    findQuery = findQuery.select(select);
  }

  if (lean) {
    findQuery = findQuery.lean();
  }

  const [items, total] = await Promise.all([
    findQuery.exec(),
    model.countDocuments(filter),
  ]);

  const transformedItems = transform ? await transform(items as TDocument[]) : (items as TResult[]);

  return {
    items: transformedItems,
    pagination: buildPaginationMeta(total, page, limit),
  };
}
