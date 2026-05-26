import React, { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column[];
  data: T[];
  pageSize?: number;
  pageSizeOptions?: number[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  initialSortKey?: string;
  initialSortDir?: 'asc' | 'desc';
  className?: string;
  renderRow?: (row: T, index: number) => React.ReactNode;
  highlightedRowId?: number | null;
  rowIdKey?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps<any>>(
  (
    {
      columns,
      data,
      pageSize = 10,
      pageSizeOptions = [5, 10, 20, 50],
      searchable = false,
      searchPlaceholder = 'Search...',
      onSearch,
      initialSortKey,
      initialSortDir = 'asc',
      className = '',
      renderRow,
      highlightedRowId = null,
      rowIdKey = 'id',
    },
    ref
  ) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLength, setPageLength] = useState(pageSize);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(initialSortKey || null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

    // Filter data based on search term
    const filteredData = useMemo(() => {
      if (!searchTerm.trim()) return data;

      return data.filter((row) => {
        return columns.some((col) => {
          const value = row[col.key];
          const searchValue = String(value || '').toLowerCase();
          return searchValue.includes(searchTerm.trim().toLowerCase());
        });
      });
    }, [data, searchTerm, columns]);

    // Sort data
    const sortedData = useMemo(() => {
      if (!sortKey) return filteredData;

      return [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDir === 'asc' ? comparison : -comparison;
      });
    }, [filteredData, sortKey, sortDir]);

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageLength);
    const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * pageLength;
      const end = start + pageLength;
      return sortedData.slice(start, end);
    }, [sortedData, currentPage, pageLength]);

    // Auto-navigate to page containing highlighted row
    useEffect(() => {
      if (highlightedRowId === null) return;

      const highlightedIndex = sortedData.findIndex(
        (row) => row[rowIdKey] === highlightedRowId
      );

      if (highlightedIndex !== -1) {
        const pageNumber = Math.floor(highlightedIndex / pageLength) + 1;
        setCurrentPage(pageNumber);
      }
    }, [highlightedRowId, sortedData, pageLength, rowIdKey]);

    const handleSearch = (value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
      onSearch?.(value);
    };

    const handleSort = (key: string) => {
      if (!columns.find((col) => col.key === key)?.sortable) return;

      if (sortKey === key) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    };

    const handlePageLengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLength = Number(e.target.value);
      setPageLength(newLength);
      setCurrentPage(1);
    };

    const infoText =
      sortedData.length === 0
        ? 'Showing 0 entries'
        : `Showing ${(currentPage - 1) * pageLength + 1} to ${Math.min(currentPage * pageLength, sortedData.length)} of ${sortedData.length} entries`;

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Search Bar */}
        {searchable && (
          <div className="p-4 border-b">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table ref={ref} className="w-full text-sm text-gray-600">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 text-left font-semibold text-gray-700 ${col.className || ''}`}>
                    <div
                      className={col.sortable ? 'cursor-pointer hover:text-gray-900 flex items-center gap-1' : 'flex items-center gap-1'}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) =>
                  renderRow ? (
                    <React.Fragment key={index}>{renderRow(row, index)}</React.Fragment>
                  ) : (
                    <tr
                      key={index}
                      className={`border-b hover:bg-gray-50 transition ${
                        highlightedRowId !== null && row[rowIdKey] === highlightedRowId
                          ? 'bg-yellow-100'
                          : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination and Info */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="page-length-select" className="text-sm text-gray-600">
              Show
            </label>
            <select
              id="page-length-select"
              value={pageLength}
              onChange={handlePageLengthChange}
              className="px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>

          <span className="text-sm text-gray-600">{infoText}</span>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-2 py-1 rounded-md text-sm transition ${
                      currentPage === pageNum ? 'bg-blue-600 text-white' : 'border hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }
);

Table.displayName = 'Table';
