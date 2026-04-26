import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Table } from '@/components/Table';
import { apiGet, apiDelete } from '@/lib/apiClient';
import { confirmAction, showError, showInfo, showSuccess } from '@/lib/swal';

interface ActivityLog {
  log_id: number;
  user_id: number;
  user_name: string | null;
  attraction_id: number | null;
  attraction_name: string | null;
  action_type: string;
  created_at: string;
}

interface Stats {
  total_activities: number;
  unique_users: number;
  unique_attractions: number;
  top_attractions: Array<{
    attraction_id: number;
    attraction_name: string;
    view_count: number;
  }>;
}

export default function ActivityLogsPage() {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportCsv = () => {
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

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        apiGet('/api/activity-logs'),
        apiGet('/api/activity-logs/stats'),
      ]);
      setLogs(logsRes);
      setStats(statsRes);
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
      fetchData();
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
    { key: 'user_name', label: 'User', sortable: true, render: (val: string) => val || '-' },
    { key: 'attraction_name', label: 'Attraction', sortable: true, render: (val: string) => val || '-' },
    { 
      key: 'action_type', 
      label: 'Action', 
      sortable: true,
      render: (val: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
          {val}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Date/Time', 
      sortable: true,
      render: (val: string) => new Date(val).toLocaleString('th-TH')
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, log: ActivityLog) => (
        <button
          onClick={() => handleDelete(log.log_id, log.user_name || '', log.attraction_name || '')}
          className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
        >
          Delete
        </button>
      )
    }
  ];

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="Go back"
            title="Go back"
            className="h-10 w-10 flex items-center justify-center border rounded-md text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        </div>
        <button
          onClick={handleExportCsv}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md shadow-md hover:bg-emerald-700 font-semibold"
        >
          Export to CSV
        </button>
      </div>

      {/* Statistics Section */}
      {stats && (
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
            <p className="text-3xl font-bold text-orange-900">
              {logs.filter(log => {
                const logDate = new Date(log.created_at).toDateString();
                return logDate === new Date().toDateString();
              }).length}
            </p>
          </div>
        </div>
      )}

      {/* Top Attractions Section */}
      {stats && stats.top_attractions.length > 0 && (
        <div className="mb-8 border rounded-lg shadow-md bg-white overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Top Viewed Attractions</h2>
          </div>
          <div className="p-6 space-y-2">
            {stats.top_attractions.map((attr, index) => (
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
      )}

      {/* Activity Logs Table */}
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
