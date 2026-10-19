export interface PaginatedResult<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export function buildPagination<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
  requestUrl: URL,
): PaginatedResult<T> {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const empty = total === 0 || page > lastPage;
  const from = empty ? null : (page - 1) * perPage + 1;
  const to = empty ? null : Math.min(page * perPage, total);

  const pageUrl = (target: number): string => {
    const url = new URL(requestUrl.toString());
    url.searchParams.set("page", String(target));
    return url.toString();
  };

  return {
    data: items,
    links: {
      first: pageUrl(1),
      last: pageUrl(lastPage),
      prev: page > 1 ? pageUrl(page - 1) : null,
      next: page < lastPage ? pageUrl(page + 1) : null,
    },
    meta: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to,
    },
  };
}

export function parsePagination(
  page: number | null | undefined,
  perPage: number | null | undefined,
  defaultPerPage: number,
): { page: number; perPage: number } {
  return {
    page: page && page > 0 ? Math.floor(page) : 1,
    perPage: perPage && perPage > 0 ? Math.floor(perPage) : defaultPerPage,
  };
}
