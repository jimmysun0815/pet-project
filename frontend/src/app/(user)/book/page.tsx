'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Pet, AvailableSlotsResponse, Appointment, DateAvailability } from '@/lib/types';
import {
  parseSlotTime,
  formatTimeVancouver,
  formatDateShortVancouver,
  formatShortDateWithWeekdayVancouver,
  formatDateWithWeekdayVancouver,
  formatDateTimeVancouver,
  isTodayVancouver,
  todayVancouver,
  getMondayOfWeekVancouver,
} from '@/lib/format';
import { Clock, PawPrint, ChevronRight, Check, ArrowLeft, Loader2, ChevronLeft } from 'lucide-react';

type Step = 'pet' | 'datetime' | 'confirm' | 'done';

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pet');
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [serviceType, setServiceType] = useState<string>('full_grooming');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAppt, setCreatedAppt] = useState<any>(null);
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [dateAvailability, setDateAvailability] = useState<DateAvailability[]>([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [notes, setNotes] = useState('');

  const todayStr = todayVancouver();

  useEffect(() => {
    api.pets.list().then(setPets).catch(console.error);
  }, []);

  useEffect(() => {
    api.appointments.my().then(setMyAppointments).catch(console.error);
  }, [step]);

  const activeAppointmentByPetId = useMemo(() => {
    const map: Record<number, Appointment> = {};
    for (const a of myAppointments) {
      if (a.status === 'pending' || a.status === 'arrived' || a.status === 'in_progress' || a.status === 'ready_for_pickup') {
        map[a.pet_id] = a;
      }
    }
    return map;
  }, [myAppointments]);

  const petsWithAppointment = useMemo(() => pets.filter((p) => activeAppointmentByPetId[p.id]), [pets, activeAppointmentByPetId]);
  const petsWithoutAppointment = useMemo(() => pets.filter((p) => !activeAppointmentByPetId[p.id]), [pets, activeAppointmentByPetId]);

  const loadSlotsForDate = useCallback(async (date: string, petId: number) => {
    setSlotsLoading(true);
    setSlotsData(null);
    setSelectedSlot('');
    try {
      const data = await api.appointments.availableSlots(date, petId);
      setSlotsData(data);
    } catch (err: any) {
      setError(err.message || '获取时间失败');
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  const handleSelectPet = async (pet: Pet) => {
    setSelectedPet(pet);
    setError('');
    setLoading(true);
    setStep('datetime');
    setWeekIndex(0);

    try {
      const weekStart = getMondayOfWeekVancouver(todayStr);
      const rangeData = await api.appointments.availabilityRange(pet.id, weekStart, 35);
      setDateAvailability(rangeData.dates);

      const firstAvailable = rangeData.dates.find((d: DateAvailability) => d.available && d.date >= todayStr);
      const defaultDate = firstAvailable ? firstAvailable.date : rangeData.dates.find((d: DateAvailability) => d.date >= todayStr)?.date || todayStr;
      setSelectedDate(defaultDate);

      const defaultIdx = rangeData.dates.findIndex((d: DateAvailability) => d.date === defaultDate);
      if (defaultIdx >= 0) {
        setWeekIndex(Math.floor(defaultIdx / 7));
      }
      await loadSlotsForDate(defaultDate, pet.id);
    } catch (err: any) {
      setError(err.message || '获取日期信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = async (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setError('');
    await loadSlotsForDate(date, selectedPet!.id);
  };

  const handleSelectSlot = (slotTime: string, available: boolean) => {
    if (!available) return;
    setSelectedSlot(slotTime);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const appt = await api.appointments.create({
        pet_id: selectedPet!.id,
        service_type: serviceType,
        date: selectedDate,
        slot_time: selectedSlot,
        notes: notes.trim() || undefined,
      });
      setCreatedAppt(appt);
      setStep('done');
    } catch (err: any) {
      setError(err.message || '预约失败');
    } finally {
      setLoading(false);
    }
  };

  const formatSlotTime = (t: string) => {
    const d = new Date(t);
    return formatTimeVancouver(d);
  };

  const formatAppointmentTime = (appt: Appointment) => {
    const slotDate = parseSlotTime(appt.slot_time);
    if (slotDate) return formatDateTimeVancouver(slotDate);
    const dateOnly = appt.date ? String(appt.date).split('T')[0] : '';
    if (!dateOnly) return '—';
    const dateObj = new Date(dateOnly + 'T12:00:00Z');
    return formatDateShortVancouver(dateObj);
  };

  const formatSlotRange = (t: string) => {
    const d = new Date(t);
    const end = new Date(d.getTime() + 30 * 60 * 1000);
    return `${formatTimeVancouver(d)} - ${formatTimeVancouver(end)}`;
  };

  const serviceLabels: Record<string, string> = {
    bath: '洗澡',
    full_grooming: '洗剪吹',
    basic_trim: '基础修剪',
  };

  const getWeekdayShort = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('zh-CN', { timeZone: 'America/Vancouver', weekday: 'short' });
  };

  const getDayNum = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Vancouver', day: 'numeric' }).format(d);
  };

  const getMonthLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return new Intl.DateTimeFormat('zh-CN', { timeZone: 'America/Vancouver', month: 'short' }).format(d);
  };

  const weeks = useMemo(() => {
    const list: DateAvailability[][] = [];
    for (let i = 0; i < dateAvailability.length; i += 7) {
      list.push(dateAvailability.slice(i, i + 7));
    }
    return list;
  }, [dateAvailability]);

  const currentWeek = weeks[weekIndex] ?? [];
  const canPrevWeek = weekIndex > 0;
  const canNextWeek = weekIndex < weeks.length - 1;

  const isDatePast = (dateStr: string) => dateStr < todayStr;
  const isDateSelectable = (dateStr: string, available: boolean) =>
    !isDatePast(dateStr) && available;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {step !== 'pet' && step !== 'done' && (
          <button
            onClick={() => {
              if (step === 'datetime') {
                setStep('pet');
                setDateAvailability([]);
                setSlotsData(null);
              } else if (step === 'confirm') {
                setStep('datetime');
              }
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">预约服务</h1>
          <p className="text-muted text-sm mt-0.5">
            {step === 'pet' && '第一步：选择宠物'}
            {step === 'datetime' && '第二步：选择日期与时间'}
            {step === 'confirm' && '第三步：确认预约'}
            {step === 'done' && '预约成功'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* Step 1: Select pet */}
      {step === 'pet' && (
        <div className="space-y-3">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">服务类型</label>
            <div className="flex gap-2">
              {Object.entries(serviceLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setServiceType(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    serviceType === key
                      ? 'bg-primary text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {pets.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">请先添加宠物</p>
              <button
                onClick={() => router.push('/pets')}
                className="mt-3 px-4 py-2 bg-primary text-white rounded-xl text-sm"
              >
                去添加宠物
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {petsWithoutAppointment.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => handleSelectPet(pet)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:border-primary/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <PawPrint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-sm text-muted">{pet.breed_name_zh} · {pet.weight_kg}kg</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
              {petsWithAppointment.map((pet) => {
                const appt = activeAppointmentByPetId[pet.id];
                return (
                  <div
                    key={pet.id}
                    className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between text-left cursor-not-allowed select-none opacity-75"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <PawPrint className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">{pet.name}</p>
                        <p className="text-sm text-gray-400">{pet.breed_name_zh} · {pet.weight_kg}kg</p>
                        <p className="text-xs text-gray-500 mt-1">
                          已预约：{formatAppointmentTime(appt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">已有预约</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date strip + Time slots (combined) */}
      {step === 'datetime' && selectedPet && (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
            <strong>{selectedPet.name}</strong> · {selectedPet.breed_name_zh} · {serviceLabels[serviceType]}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted text-sm">加载中...</span>
            </div>
          ) : (
            <>
              {/* Week navigation + one week of dates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                    disabled={!canPrevWeek}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label="上一周"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-muted">
                    {currentWeek.length > 0
                      ? (() => {
                          const first = currentWeek[0].date;
                          const last = currentWeek[currentWeek.length - 1].date;
                          const d1 = new Date(first + 'T12:00:00Z');
                          const d2 = new Date(last + 'T12:00:00Z');
                          return `${formatDateShortVancouver(d1)} — ${formatDateShortVancouver(d2)}`;
                        })()
                      : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
                    disabled={!canNextWeek}
                    className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label="下一周"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {currentWeek.map(({ date, available }) => {
                    const isSelected = date === selectedDate;
                    const isToday = isTodayVancouver(date);
                    const isPast = isDatePast(date);
                    const selectable = isDateSelectable(date, available);
                    const grayed = isPast || !available;
                    return (
                      <button
                        key={date}
                        onClick={() => selectable && handleDateClick(date)}
                        disabled={slotsLoading || !selectable}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-center transition ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : grayed
                              ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : grayed ? 'text-gray-300' : 'text-muted'}`}>
                          {getWeekdayShort(date)}
                        </span>
                        <span className={`text-base font-semibold leading-tight ${isSelected ? 'text-white' : ''}`}>
                          {getDayNum(date)}
                        </span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : grayed ? 'text-gray-300' : 'text-muted'}`}>
                          {isToday ? '今天' : getMonthLabel(date)}
                        </span>
                        {!isPast && (
                          <span
                            className={`mt-1 w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : available ? 'bg-green-400' : 'bg-gray-300'
                            }`}
                          />
                        )}
                        {isPast && <span className="mt-1 text-[10px] text-gray-300">已过</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected date label */}
              <div className="text-center text-sm text-muted">
                {formatShortDateWithWeekdayVancouver(new Date(selectedDate + 'T12:00:00Z'))}
              </div>

              {/* Time slots */}
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-muted text-sm">加载时间...</span>
                </div>
              ) : slotsData && slotsData.slots.length > 0 ? (
                (() => {
                  const slotMap: Record<string, { slot_time: string; available: boolean }> = {};
                  for (const s of slotsData.slots) {
                    const d = new Date(s.slot_time);
                    const h = d.getUTCHours !== undefined
                      ? parseInt(d.toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', hour12: false }))
                      : d.getHours();
                    const m = parseInt(d.toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', minute: 'numeric', hour12: false }).split(':').pop()!);
                    slotMap[`${h}-${m}`] = s;
                  }
                  const hours = [...new Set(
                    slotsData.slots.map((s) => {
                      const d = new Date(s.slot_time);
                      return parseInt(d.toLocaleTimeString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', hour12: false }));
                    })
                  )].sort((a, b) => a - b);

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <p className="col-span-2 text-center text-xs text-muted mb-1">整点 · 半点</p>
                      {hours.map((h) => {
                        const slot00 = slotMap[`${h}-0`];
                        const slot30 = slotMap[`${h}-30`];
                        const cell = (slot: { slot_time: string; available: boolean } | undefined, label: string) => {
                          if (!slot)
                            return (
                              <div key={`${h}-${label}`} className="rounded-xl p-3 border border-gray-100 bg-gray-50/50 min-h-[52px]" />
                            );
                          const avail = slot.available;
                          return (
                            <button
                              key={slot.slot_time}
                              type="button"
                              onClick={() => handleSelectSlot(slot.slot_time, avail)}
                              disabled={!avail}
                              className={`rounded-xl p-3 border text-center transition min-h-[52px] flex flex-col items-center justify-center ${
                                avail
                                  ? 'bg-white border-gray-100 hover:border-primary hover:bg-primary/5'
                                  : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <Clock className={`w-4 h-4 mb-1 ${avail ? 'text-primary' : 'text-gray-400'}`} />
                              <span className="text-sm font-medium">{label}</span>
                            </button>
                          );
                        };
                        return (
                          <span key={h} className="contents">
                            {cell(slot00, `${String(h).padStart(2, '0')}:00`)}
                            {cell(slot30, `${String(h).padStart(2, '0')}:30`)}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()
              ) : slotsData ? (
                <div className="text-center py-8 text-gray-500">
                  <p>当天没有可用时间</p>
                  <p className="text-xs text-muted mt-1">请选择其他日期</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedPet && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-semibold text-lg">预约确认</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-muted">宠物</span>
                <span className="font-medium">{selectedPet.name} ({selectedPet.breed_name_zh})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-muted">服务</span>
                <span className="font-medium">{serviceLabels[serviceType]}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-muted">日期</span>
                <span className="font-medium">{formatDateWithWeekdayVancouver(new Date(selectedDate + 'T12:00:00Z'))}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-muted">进门时间</span>
                <span className="font-medium">{formatSlotRange(selectedSlot)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">备注（选填）</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：狗狗怕吹风机、需要留长一点等"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted mt-1">备注会在门店后台显示，便于工作人员提前准备</p>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            {loading ? '预约中...' : '确认预约'}
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && createdAppt && (
        <div className="text-center py-8 space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-700">预约成功！</h2>
          <p className="text-muted">
            您的宝宝 <strong>{createdAppt.pet_name}</strong> 已预约成功
          </p>
          {createdAppt.slot_time && (
            <div className="bg-green-50 rounded-xl p-4 inline-block">
              <p className="text-green-700 font-medium">
                进门时间：{formatDateShortVancouver(new Date(selectedDate + 'T12:00:00Z'))} {formatSlotRange(createdAppt.slot_time)}
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => router.push('/appointments')}
              className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium"
            >
              查看预约
            </button>
            <button
              onClick={() => { setStep('pet'); setCreatedAppt(null); setDateAvailability([]); setSlotsData(null); setNotes(''); }}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              继续预约
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
