'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Appointment } from '@/lib/types';
import { parseSlotTime, formatTimeVancouver, formatDateShortVancouver } from '@/lib/format';
import { Clock, PawPrint, Calendar, ClipboardList } from 'lucide-react';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>('active');

  useEffect(() => {
    api.appointments.my().then(setAppointments).catch(console.error);
  }, []);

  const filtered = appointments.filter((a) => {
    if (filter === 'active') return ['pending', 'arrived', 'in_progress', 'ready_for_pickup'].includes(a.status);
    if (filter === 'done') return a.status === 'picked_up';
    return true;
  });

  const statusLabel: Record<string, string> = {
    pending: '等待中',
    arrived: '已到店',
    in_progress: '进行中',
    ready_for_pickup: '可接走',
    picked_up: '已取走',
    cancelled: '已取消',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    arrived: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-100 text-blue-800',
    ready_for_pickup: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  const serviceLabels: Record<string, string> = {
    bath: '洗澡',
    full_grooming: '洗剪吹',
    basic_trim: '基础修剪',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的预约</h1>
        <p className="text-muted text-sm mt-1">查看和管理您的预约</p>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'active', label: '进行中' },
          { key: 'done', label: '已完成' },
          { key: 'all', label: '全部' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f.key ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无预约</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => (
            <div key={appt.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <PawPrint className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{appt.pet_name}</p>
                    <p className="text-sm text-muted">{appt.breed_name} · {serviceLabels[appt.service_type] || appt.service_type}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[appt.status]}`}>
                  {statusLabel[appt.status]}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateShortVancouver(new Date(String(appt.date).split('T')[0] + 'T12:00:00Z'))}
                </span>
                {(() => {
                const slotDate = parseSlotTime(appt.slot_time);
                return slotDate ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimeVancouver(slotDate)}
                  </span>
                ) : null;
              })()}
              </div>

              {appt.status === 'ready_for_pickup' && (
                <div className="mt-3 p-2.5 bg-green-50 rounded-lg text-sm text-green-700 font-medium">
                  您的宝宝已准备好，可随时来接！
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
