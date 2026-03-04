'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Calendar, Dog, PawPrint, Clock } from 'lucide-react';
import type { Pet, Appointment } from '@/lib/types';
import { parseSlotTime, formatDateTimeVancouver } from '@/lib/format';

export default function HomePage() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.pets.list().then(setPets).catch(console.error);
    api.appointments.my().then(setAppointments).catch(console.error);
  }, []);

  const upcoming = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'arrived' || a.status === 'in_progress' || a.status === 'ready_for_pickup',
  );

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">你好，{user?.name}</h1>
        <p className="text-muted mt-1">欢迎使用 PawBook 宠物预约系统</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/pets"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <Dog className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold">我的宠物</h3>
          <p className="text-sm text-muted mt-1">{pets.length} 只宝贝</p>
        </Link>
        <Link
          href="/book"
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group"
        >
          <Calendar className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition" />
          <h3 className="font-semibold">立即预约</h3>
          <p className="text-sm text-muted mt-1">为宝贝安排服务</p>
        </Link>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">进行中的预约</h2>
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PawPrint className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{appt.pet_name}</p>
                      <p className="text-sm text-muted">{appt.breed_name}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[appt.status]}`}>
                    {statusLabel[appt.status]}
                  </span>
                </div>
                {(() => {
                  const slotDate = parseSlotTime(appt.slot_time);
                  return slotDate ? (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      进门时间：{formatDateTimeVancouver(slotDate)}
                    </div>
                  ) : null;
                })()}
                {appt.status === 'ready_for_pickup' && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm text-green-700 font-medium">
                    您的宝宝已准备好，可随时来接！
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
