// =============================================================================
// app/admin/activity-logs/page.tsx
// =============================================================================
// หน้าแสดงและจัดการ Activity Logs (/admin/activity-logs)
// บันทึกการกระทำของผู้ใช้ เช่น view, rate สถานที่
//
// ความสามารถหลัก:
//   - แสดง Stat Cards: จำนวน activity, ผู้ใช้ unique, สถานที่, active today
//   - แสดง Top Viewed Attractions (อันดับสถานที่ที่ถูกดูมากที่สุด)
//   - ตาราง activity log พร้อม search, sort, pagination
//   - ลบ log รายการได้ (พร้อม confirm dialog)
//   - Export ข้อมูลทั้งหมดเป็นไฟล์ CSV
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table } from './components/Table';
import { apiDelete, apiGet } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface ActivityLog {
  log_id: number;
  user_id: number;
  user_name: string | null;
  role?: string | null;
  attraction_id: number | null;
  attraction_name: string | null;
  action_type: string;
  created_at: string;
}

interface TopAttractionItem {
  attraction_id: number;
  attraction_name: string;
  view_count: number;
}

interface Stats {
  total_activities: number;
  unique_users: number;
  unique_attractions: number;
  top_attractions: TopAttractionItem[];
}


// =============================================================================
// Helper Functions
// =============================================================================

/** จัดการ Escape ตัวอักษรพิเศษสำหรับเซลล์ CSV */
function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** สร้างและดาวน์โหลดไฟล์ CSV จากรายการ activity logs */
function exportLogsToCsv(logs: ActivityLog[]): void {
  if (logs.length === 0) {
    void showInfo('No data', 'No activity logs available to export');
    return;
  }

  const headers = [
    'log_id',
    'user_id',
    'user_name',
    'attraction_id',
    'attraction_name',
    'action_type',
    'created_at',
  ];

  const rows = logs.map((log) => [
    log.log_id,
    log.user_id,
    log.user_name,
    log.attraction_id,
    log.attraction_name,
    log.action_type,
    log.created_at,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** คำนวณจำนวนกิจกรรมที่เกิดขึ้นภายในวันนี้ */
function calculateActiveToday(logs: ActivityLog[]): number {
  const todayStr = new Date().toDateString();
  return logs.filter((log) => new Date(log.created_at).toDateString() === todayStr).length;
}


// =============================================================================
// Sub-Components (Modular UI Architecture)
// =============================================================================

interface ActivityStatsGridProps {
  stats: Stats;
  activeTodayCount: number;
}

function ActivityStatsGrid({ stats, activeTodayCount }: ActivityStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="p-6 bg-blue-50 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-blue-600">Total Activities</h3>
        <p className="text-3xl font-bold text-blue-900">{stats.total_activities}</p>
      </div>
      <div className="p-6 bg-green-50 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-green-600">Unique Users</h3>
        <p className="text-3xl font-bold text-green-900">{stats.unique_users}</p>
      </div>
      <div className="p-6 bg-purple-50 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-purple-600">Attractions Viewed</h3>
        <p className="text-3xl font-bold text-purple-900">{stats.unique_attractions}</p>
      </div>
      <div className="p-6 bg-orange-50 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-orange-600">Active Today</h3>
        <p className="text-3xl font-bold text-orange-900">{activeTodayCount}</p>
      </div>
    </div>
  );
}

interface TopAttractionsCardProps {
  topAttractions: TopAttractionItem[];
}

function TopAttractionsCard({ topAttractions }: TopAttractionsCardProps) {
  return (
    <div className="mb-8 border rounded-lg shadow-md bg-white overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-800">Top Viewed Attractions</h2>
      </div>
      <div className="p-6 space-y-2">
        {topAttractions.map((attr, index) => (
          <div key={attr.attraction_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-semibold text-lg text-gray-600">#{index + 1}</span>
            <span className="flex-1 ml-4">{attr.attraction_name || 'Unknown'}</span>
            <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full font-bold">
              {attr.view_count} views
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

export default function ActivityLogsPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSearchTerm] = useState('');

  // ดึงข้อมูล log และสถิติจาก API พร้อมกัน
  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        apiGet('/api/activity-logs'),
        apiGet('/api/activity-logs/stats'),
      ]);
      const rawLogs = logsRes as ActivityLog[];
      const filtered = rawLogs.filter(
        (l) => l.role?.toLowerCase().replace(/[\s_-]/g, '') !== 'usermodel'
      );
      setLogs(filtered);
      setStats(statsRes as Stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  // ยืนยันและลบ activity log
  const handleDelete = async (logId: number, userName: string, attractionName: string) => {
    const subject = attractionName
      ? `${attractionName} - ${userName || 'Unknown'}`
      : userName || `Log #${logId}`;

    const isConfirmed = await confirmAction(
      'Confirm Delete Activity Log',
      `Are you sure you want to delete the activity log for "${subject}"?`
    );
    if (!isConfirmed) {
      return;
    }

    try {
      await apiDelete(`/api/activity-logs/${logId}`);
      await fetchData();
      await showSuccess('Deleted', `Activity log for "${subject}" has been deleted successfully`);
    } catch (err) {
      await showError(
        'Delete Failed',
        err instanceof Error ? err.message : 'An error occurred while deleting the log'
      );
    }
  };

  const columns = [
    { key: 'log_id', label: 'Log ID', sortable: true },
    { key: 'user_name', label: 'User', sortable: true, render: (val: string | null) => val || '-' },
    { key: 'attraction_name', label: 'Attraction', sortable: true, render: (val: string | null) => val || '-' },
    {
      key: 'action_type',
      label: 'Action',
      sortable: true,
      render: (val: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
          {val}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date/Time',
      sortable: true,
      render: (val: string) => new Date(val).toLocaleString('th-TH'),
    },
    /* {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, _log: ActivityLog) => (
        <button
          onClick={() => handleDelete(log.log_id, log.user_name || '', log.attraction_name || '')}
          className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
        >
          Delete
        </button>
      ),
    }, */
  ];

  const activeTodayCount = calculateActiveToday(logs);

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="Go back"
            title="Go back"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        </div>
        {/* <button
          onClick={() => exportLogsToCsv(logs)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold transition"
        >
          Export to CSV
        </button> */}
      </div>

      {/* Statistics Grid */}
      {stats && <ActivityStatsGrid stats={stats} activeTodayCount={activeTodayCount} />}

      {/* Top Attractions List */}
      {stats && stats.top_attractions.length > 0 && (
        <TopAttractionsCard topAttractions={stats.top_attractions} />
      )}

      {/* Activity Logs Table Card */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Recent Activities</h2>
        </div>
        {error && <p className="text-red-500 p-6">{error}</p>}
        {loading && <p className="text-gray-500 p-6">Loading...</p>}
        {!loading && !error && logs.length === 0 ? (
          <p className="text-gray-500 p-6">No activity logs found</p>
        ) : null}
        {!loading && !error && logs.length > 0 ? (
          <div className="overflow-x-auto p-4">
            <Table
              ref={tableRef}
              columns={columns}
              data={logs}
              pageSize={10}
              pageSizeOptions={[5, 10, 20, 50]}
              searchable={true}
              onSearch={handleSearch}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
