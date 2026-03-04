'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import type { Appointment, DayStats } from '@/lib/types';
import {
  parseSlotTime,
  formatTimeVancouver,
  formatDateLongVancouver,
  todayVancouver,
  isTodayVancouver,
} from '@/lib/format';
import { addDays } from 'date-fns';
import {
  Play,
  CheckCircle2,
  PackageCheck,
  Clock,
  PawPrint,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Dog,
  AlertTriangle,
  GripVertical,
  MapPin,
  User,
  Phone,
  FileText,
  Minus,
  Plus,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  pending: '尚未到店',
  arrived: '已到店',
  in_progress: '已开始',
  ready_for_pickup: '已结束',
  picked_up: '已取走',
};

/** 右侧按钮的「动作」文案，与左侧当前状态区分：左侧是状态，右侧是操作 */
const ACTION_BUTTON_LABEL: Record<string, string> = {
  pending: '确认到店',
  arrived: '开始服务',
  in_progress: '完成',
  ready_for_pickup: '确认取走',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  arrived: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  in_progress: { bg: 'bg-fuchsia-500', text: 'text-white', border: 'border-fuchsia-600' },
  ready_for_pickup: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  picked_up: { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-600' },
};

function SortableCard({
  appt,
  onStatusClick,
  statusStyle,
}: {
  appt: Appointment;
  onStatusClick: (appt: Appointment, newStatus: string) => void;
  statusStyle: typeof STATUS_STYLE;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: appt.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const slotDate = parseSlotTime(appt.slot_time);
  const arrivalTime = slotDate ? formatTimeVancouver(slotDate) : '—';
  const nextStatus =
    appt.status === 'pending'
      ? 'arrived'
      : appt.status === 'arrived'
        ? 'in_progress'
        : appt.status === 'in_progress'
          ? 'ready_for_pickup'
          : appt.status === 'ready_for_pickup'
            ? 'picked_up'
            : null;
  const styleState = statusStyle[appt.status] ?? statusStyle.pending;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 ${styleState.border} bg-white shadow-sm overflow-hidden ${isDragging ? 'opacity-80 z-10 shadow-lg' : ''}`}
    >
      <div className="flex items-stretch min-h-[88px]">
        {/* Drag handle - 长按可拖动，移动端需长按约 0.3 秒 */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center min-w-[56px] w-16 shrink-0 bg-gray-100 cursor-grab active:cursor-grabbing text-gray-500 hover:bg-gray-200 transition touch-none select-none"
          style={{ touchAction: 'none' }}
          aria-label="长按拖动调整顺序"
        >
          <GripVertical className="w-6 h-6 pointer-events-none" />
        </div>

        {/* Avatar */}
        <div className="w-14 shrink-0 flex items-center justify-center bg-gray-50 border-r border-gray-100">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
            <PawPrint className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Status - most prominent */}
        <div className={`w-28 shrink-0 flex items-center justify-center px-2 ${styleState.bg} ${styleState.text}`}>
          <span className="font-bold text-sm text-center leading-tight">{STATUS_LABEL[appt.status] ?? appt.status}</span>
        </div>

        {/* Name, breed, arrival time */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-3 px-4 border-r border-gray-100">
          <h3 className="font-semibold text-gray-900 truncate">{appt.pet_name}</h3>
          <p className="text-sm text-gray-600 truncate">{appt.breed_name} · {appt.weight_kg}kg</p>
          <p className="text-base font-semibold text-primary mt-0.5 flex items-center gap-1">
            <Clock className="w-4 h-4 shrink-0" />
            {arrivalTime}
          </p>
        </div>

        {/* Owner, phone, notes */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-3 px-4 border-r border-gray-100 text-sm text-gray-600 space-y-0.5">
          {appt.owner_name && (
            <p className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 shrink-0 text-muted" />
              {appt.owner_name}
            </p>
          )}
          {appt.owner_phone && (
            <p className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 shrink-0 text-muted" />
              {appt.owner_phone}
            </p>
          )}
          {appt.notes && (
            <div className="mt-1 p-1.5 bg-gray-50 rounded border border-gray-100">
              <p className="flex items-start gap-1.5 text-gray-700 text-xs">
                <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" />
                <span className="line-clamp-2 break-words">{appt.notes}</span>
              </p>
            </div>
          )}
        </div>

        {/* Action button - 浅色样式，与左侧状态块区分；文案为动作而非状态名 */}
        <div className="w-36 shrink-0 flex items-stretch">
          {nextStatus && (
            <button
              type="button"
              onClick={() => onStatusClick(appt, nextStatus)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-l-2 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 font-medium text-sm transition rounded-r-xl"
            >
              {nextStatus === 'arrived' && <MapPin className="w-4 h-4 text-gray-500" />}
              {nextStatus === 'in_progress' && <Play className="w-4 h-4 text-gray-500" />}
              {nextStatus === 'ready_for_pickup' && <CheckCircle2 className="w-4 h-4 text-gray-500" />}
              {nextStatus === 'picked_up' && <PackageCheck className="w-4 h-4 text-gray-500" />}
              <span>{ACTION_BUTTON_LABEL[appt.status]}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreDashboard() {
  const [date, setDate] = useState(todayVancouver());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ appt: Appointment; newStatus: string } | null>(null);
  const [confirmScore, setConfirmScore] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, dayStats] = await Promise.all([
        api.appointments.day(date),
        api.appointments.stats(date),
      ]);
      setAppointments(appts);
      setStats(dayStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusClick = (appt: Appointment, newStatus: string) => {
    setConfirmModal({ appt, newStatus });
    if (newStatus === 'ready_for_pickup') {
      const s = appt.calculated_score ?? 1;
      setConfirmScore(Math.max(1, Math.min(5, s)));
    }
  };

  const handleConfirmStatus = async () => {
    if (!confirmModal) return;
    try {
      const scoreToSend = confirmModal.newStatus === 'ready_for_pickup' ? confirmScore : undefined;
      await api.appointments.updateStatus(confirmModal.appt.id, confirmModal.newStatus, scoreToSend);
      setConfirmModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || '状态更新失败');
    }
  };

  const isCompleteModal = confirmModal?.newStatus === 'ready_for_pickup';
  const scoreMin = 1;
  const scoreMax = 5;
  const scoreStep = 0.5;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = appointments.findIndex((a) => a.id === active.id);
    const newIndex = appointments.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(appointments, oldIndex, newIndex);
    setAppointments(reordered);
    try {
      await api.appointments.updateDayOrder(date, reordered.map((a) => a.id));
    } catch (err: any) {
      alert(err.message || '保存顺序失败');
      await loadData();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 260, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T12:00:00Z');
    const next = addDays(d, delta);
    setDate(next.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' }));
  };

  const scorePercent = stats?.score_percentage ?? 0;
  const dogsPercent = stats?.dogs_percentage ?? 0;
  const isNearFull = scorePercent >= 95;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-white transition">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold">
              {formatDateLongVancouver(new Date(date + 'T12:00:00Z'))}
            </h1>
            <p className="text-sm text-muted">
              {new Date(date + 'T12:00:00Z').toLocaleDateString('zh-CN', { timeZone: 'America/Vancouver', weekday: 'long' })}
              {isTodayVancouver(date) && (
                <span className="ml-1 text-primary font-medium">（今天）</span>
              )}
            </p>
          </div>
          <button onClick={() => changeDate(1)} className="p-1.5 rounded-lg hover:bg-white transition">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setDate(todayVancouver())}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-white transition"
          >
            今天
          </button>
        </div>
      </div>

      {/* Capacity Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`bg-white rounded-xl p-4 border ${isNearFull ? 'border-red-200' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> 分数用量
              </span>
              {isNearFull && <AlertTriangle className="w-4 h-4 text-danger" />}
            </div>
            <p className="text-2xl font-bold">{stats.used_score} <span className="text-sm font-normal text-muted">/ {stats.capacity.max_total_score}</span></p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isNearFull ? 'bg-danger' : scorePercent >= 80 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, scorePercent)}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1">{scorePercent}%</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Dog className="w-4 h-4 text-muted" />
              <span className="text-sm text-muted">狗数</span>
            </div>
            <p className="text-2xl font-bold">{stats.used_dogs} <span className="text-sm font-normal text-muted">/ {stats.capacity.max_dogs}</span></p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${dogsPercent >= 90 ? 'bg-warning' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, dogsPercent)}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1">{dogsPercent}%</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <span className="text-sm text-muted">状态分布</span>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-orange-600 font-medium">尚未到店</span><span className="font-medium">{stats.pending_count}</span></div>
              <div className="flex justify-between"><span className="text-blue-600 font-medium">已到店</span><span className="font-medium">{stats.arrived_count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-fuchsia-600 font-medium">已开始</span><span className="font-medium">{stats.in_progress_count}</span></div>
              <div className="flex justify-between"><span className="text-green-600 font-medium">已结束</span><span className="font-medium">{stats.ready_count}</span></div>
              <div className="flex justify-between"><span className="text-slate-600 font-medium">已取走</span><span className="font-medium">{stats.picked_up_count}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <span className="text-sm text-muted">营业时间</span>
            <p className="text-2xl font-bold mt-2">{stats.capacity.business_start} <span className="text-sm font-normal text-muted">-</span> {stats.capacity.business_end}</p>
          </div>
        </div>
      )}

      {isNearFull && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          当日分数已达上限的 95%，新预约将受限
        </div>
      )}

      {/* Appointment Cards - Sortable */}
      {loading ? (
        <div className="text-center py-16 text-muted animate-pulse">加载中...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <PawPrint className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">当天暂无预约</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted mb-2 sm:mb-1">长按左侧把手可拖动调整顺序</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={appointments.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
              {appointments.map((appt) => (
                <SortableCard
                  key={appt.id}
                  appt={appt}
                  onStatusClick={handleStatusClick}
                  statusStyle={STATUS_STYLE}
                />
              ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">确认状态变更</h3>
            <p className="text-gray-600">
              确认将 <strong>{confirmModal.appt.pet_name}</strong> 标记为「{STATUS_LABEL[confirmModal.newStatus]}」吗？
            </p>

            {isCompleteModal && (
              <div className="py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-3 text-center">完成后可调整评分（1～5），便于后续数据统计</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setConfirmScore((s) => Math.max(scoreMin, s - scoreStep))}
                    disabled={confirmScore <= scoreMin}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    aria-label="减 0.5 分"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-bold text-primary min-w-[3rem] text-center tabular-nums">
                    {confirmScore.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmScore((s) => Math.min(scoreMax, s + scoreStep))}
                    disabled={confirmScore >= scoreMax}
                    className="w-12 h-12 rounded-xl border-2 border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    aria-label="加 0.5 分"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmStatus}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
