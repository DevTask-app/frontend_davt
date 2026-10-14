"use client";

import { Button } from "./button";
import { Select } from "./input";

export function Pagination({
  page,
  lastPage,
  total,
  perPage,
  perPageOptions = [12, 24, 48],
  onPageChange,
  onPerPageChange,
  disabled = false,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  perPageOptions?: number[];
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  disabled?: boolean;
}) {
  if (total === 0) return null;

  const safeLastPage = Math.max(lastPage, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {total} data · halaman {page} dari {safeLastPage}
      </p>

      <div className="flex items-center gap-2">
        {onPerPageChange ? (
          <Select
            aria-label="Baris per halaman"
            className="h-8 w-auto py-0 text-xs"
            value={perPage}
            disabled={disabled}
            onChange={(event) => onPerPageChange(Number(event.target.value))}
          >
            {perPageOptions.map((option) => (
              <option key={option} value={option}>
                {option} / halaman
              </option>
            ))}
          </Select>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= safeLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
