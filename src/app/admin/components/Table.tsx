// =============================================================================
// Table.tsx
// =============================================================================
// Reusable Data Table Component ใช้ในทุกหน้า admin
// รองรับ pagination, sorting, search, และ custom cell rendering
//
// ความสามารถหลัก:
//   - Pagination       : แบ่งหน้าข้อมูลพร้อมเลือกจำนวนแถวต่อหน้าได้
//   - Sorting          : คลิก column header เพื่อ sort asc/desc (รองรับภาษาไทย)
//   - Search           : ค้นหาข้ามทุก column พร้อมกัน
//   - Custom Render    : แต่ละ column ใส่ render function เองได้
//   - Row Highlight    : highlight แถวที่เพิ่ง add/edit ด้วยสีเหลือง 3 วินาที
//   - Auto-navigate    : เมื่อ highlight แถว จะกระโดดไปหน้าที่มีแถวนั้นอัตโนมัติ
//   - Sub-components   : TableSearchHeader, TableHeaderRow, TablePaginationFooter
// =============================================================================

import React, { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
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

// =============================================================================
// Sub-Component: TableSearchHeader
// =============================================================================

interface TableSearchHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
}

function TableSearchHeader({ searchTerm, onSearchChange, placeholder }: TableSearchHeaderProps) {
  return (
    <div className="p-4 border-b border-gray-200">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// =============================================================================
// Sub-Component: TableHeaderRow
// =============================================================================

interface TableHeaderRowProps {
  columns: Column[];
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

function TableHeaderRow({ columns, sortKey, sortDir, onSort }: TableHeaderRowProps) {
  return (
    <thead>
      <tr className="bg-gray-50 border-b-2 border-gray-200">
        {columns.map((col) => (
          <th key={col.key} className={`px-4 py-3 text-left font-semibold text-gray-700 ${col.className || ''}`}>
            <div
              className={
                col.sortable ? 'cursor-pointer hover:text-gray-900 flex items-center gap-1 select-none' : 'flex items-center gap-1'
              }
              onClick={() => col.sortable && onSort(col.key)}
            >
              <span>{col.label}</span>
              {col.sortable && sortKey === col.key && (
                {
                  asc: <ChevronUp size={16} />,
                  desc: <ChevronDown size={16} />,
                }[sortDir]
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

// =============================================================================
// Sub-Component: TablePaginationFooter
// =============================================================================

interface TablePaginationFooterProps {
  currentPage: number;
  totalPages: number;
  pageLength: number;
  pageSizeOptions: number[];
  infoText: string;
  onPageChange: (page: number) => void;
  onPageLengthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

function TablePaginationFooter({
  currentPage,
  totalPages,
  pageLength,
  pageSizeOptions,
  infoText,
  onPageChange,
  onPageLengthChange,
}: TablePaginationFooterProps) {
  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="table-page-length" className="text-sm text-gray-600">
          Show
        </label>
        <select
          id="table-page-length"
          value={pageLength}
          onChange={onPageLengthChange}
          className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`px-2.5 py-1 rounded-md text-sm transition ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component: Table
// =============================================================================

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

    const totalPages = Math.ceil(sortedData.length / pageLength);
    const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * pageLength;
      const end = start + pageLength;
      return sortedData.slice(start, end);
    }, [sortedData, currentPage, pageLength]);

    useEffect(() => {
      if (highlightedRowId === null) return;

      const highlightedIndex = sortedData.findIndex((row) => row[rowIdKey] === highlightedRowId);

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
        : `Showing ${(currentPage - 1) * pageLength + 1} to ${Math.min(
            currentPage * pageLength,
            sortedData.length
          )} of ${sortedData.length} entries`;

    return (
      <div className={`flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
        {searchable && (
          <TableSearchHeader searchTerm={searchTerm} onSearchChange={handleSearch} placeholder={searchPlaceholder} />
        )}

        <div className="overflow-x-auto">
          <table ref={ref} className="w-full text-sm text-gray-600">
            <TableHeaderRow columns={columns} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />

            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 font-medium">
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) =>
                  renderRow ? (
                    <React.Fragment key={`row-${index}`}>{renderRow(row, index)}</React.Fragment>
                  ) : (
                    <tr
                      key={`row-${index}`}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                        highlightedRowId !== null && row[rowIdKey] === highlightedRowId ? 'bg-yellow-100/80' : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
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

        <TablePaginationFooter
          currentPage={currentPage}
          totalPages={totalPages}
          pageLength={pageLength}
          pageSizeOptions={pageSizeOptions}
          infoText={infoText}
          onPageChange={setCurrentPage}
          onPageLengthChange={handlePageLengthChange}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';
