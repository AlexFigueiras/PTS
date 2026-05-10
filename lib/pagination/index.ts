export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const DEFAULT_PAGE_SIZE = 20;

export function getPaginationOffset({ page, pageSize }: PaginationParams): number {
  return (page - 1) * pageSize;
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export function parsePaginationParams(
  searchParams: Record<string, string | string[] | undefined>,
  defaults: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
): PaginationParams {
  const page = Number(searchParams.page) || defaults.page;
  const pageSize = Number(searchParams.pageSize) || defaults.pageSize;
  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
  };
}
