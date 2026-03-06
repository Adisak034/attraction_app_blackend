import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DataTable from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
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
  const dataTableRef = useRef<any>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      void showInfo('ไม่มีข้อมูล', 'ไม่มีกิจกรรมสำหรับส่งออก');
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
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
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

  useEffect(() => {
    if (loading) return;
    if (!tableRef.current) return;

    if (dataTableRef.current) {
      dataTableRef.current.destroy();
      dataTableRef.current = null;
    }

    if (logs.length === 0) return;

    dataTableRef.current = new DataTable(tableRef.current, {
      pageLength: 10,
      lengthMenu: [5, 10, 20, 50],
      searching: true,
      ordering: true,
      paging: true,
      info: true,
      dom: 'lrtip',
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, [loading, logs]);

  const handleDelete = async (logId: number, userName: string, attractionName: string) => {
    const subject = attractionName
      ? `${userName} - ${attractionName}`
      : userName || `Log #${logId}`;
    const isConfirmed = await confirmAction('ยืนยันการลบกิจกรรม', `ต้องการลบรายการ "${subject}" ใช่หรือไม่?`);
    if (!isConfirmed) {
      return;
    }
    try {
      await apiDelete(`/api/activity-logs/${logId}`);
      fetchData();
      await showSuccess('ลบสำเร็จ', `ลบกิจกรรม "${subject}" เรียบร้อยแล้ว`);
    } catch (err) {
      await showError('เกิดข้อผิดพลาด', err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
  };

  useEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;

    const handleTableClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const deleteButton = target.closest('.delete-log-btn') as HTMLButtonElement | null;
      if (!deleteButton) return;

      const logId = Number(deleteButton.dataset.logId);
      const userName = deleteButton.dataset.userName || '';
      const attractionName = deleteButton.dataset.attractionName || '';
      if (!Number.isFinite(logId)) return;
      handleDelete(logId, userName, attractionName);
    };

    tableElement.addEventListener('click', handleTableClick);
    return () => tableElement.removeEventListener('click', handleTableClick);
  }, [logs]);

  return (
    <div className="px-4 py-8 bg-gray-50 min-h-screen w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            aria-label="ย้อนกลับ"
            title="ย้อนกลับ"
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
            <table ref={tableRef} className="w-full display compact hover stripe">
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>User</th>
                  <th>Attraction</th>
                  <th>Action</th>
                  <th>Date/Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id} data-id={log.log_id}>
                    <td>{log.log_id}</td>
                    <td>{log.user_name || '-'}</td>
                    <td>{log.attraction_name || '-'}</td>
                    <td>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {log.action_type}
                      </span>
                    </td>
                    <td>
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="delete-log-btn bg-red-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-700 transition shadow-sm"
                        data-log-id={log.log_id}
                        data-user-name={log.user_name || ''}
                        data-attraction-name={log.attraction_name || ''}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
