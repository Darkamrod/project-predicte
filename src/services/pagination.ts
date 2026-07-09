export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface PaginationInput {
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface ResolvedPagination {
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationDefaults {
  defaultPageSize?: number | undefined;
  maxPageSize?: number | undefined;
}

export function resolvePagination(
  input: PaginationInput = {},
  defaults: PaginationDefaults = {}
): ResolvedPagination {
  const maxPageSize = normalizePositiveInteger(defaults.maxPageSize, MAX_PAGE_SIZE);
  const defaultPageSize = Math.min(
    normalizePositiveInteger(defaults.defaultPageSize, DEFAULT_PAGE_SIZE),
    maxPageSize
  );
  const page = normalizePositiveInteger(input.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(input.pageSize, defaultPageSize), maxPageSize);
  const from = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    from,
    to: from + pageSize - 1
  };
}

export function createPaginatedResult<T>(
  items: T[],
  resolved: ResolvedPagination,
  totalItems: number | null | undefined
): PaginatedResult<T> {
  const safeTotalItems = Math.max(0, totalItems ?? items.length);
  const totalPages =
    safeTotalItems === 0 ? 0 : Math.max(1, Math.ceil(safeTotalItems / resolved.pageSize));

  return {
    items,
    pagination: {
      page: resolved.page,
      pageSize: resolved.pageSize,
      totalItems: safeTotalItems,
      totalPages,
      hasNextPage: resolved.to + 1 < safeTotalItems
    }
  };
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);

  return integer > 0 ? integer : fallback;
}
