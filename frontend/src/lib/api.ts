const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    throw new Error('未授权，请检查后端服务是否正常运行');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data as T;
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string; phone?: string }) =>
      request<{ user: any; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ user: any; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<any>('/auth/me'),
  },
  breeds: {
    list: (species = 'dog') => request<any[]>(`/breeds?species=${species}`),
    get: (id: number) => request<any>(`/breeds/${id}`),
  },
  pets: {
    list: () => request<any[]>('/pets'),
    create: (data: any) => request<any>('/pets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<any>(`/pets/${id}`, { method: 'DELETE' }),
  },
  appointments: {
    availableSlots: (date: string, petId: number) =>
      request<any>(`/appointments/available-slots?date=${date}&pet_id=${petId}`),
    availabilityRange: (petId: number, from?: string, days?: number) =>
      request<any>(`/appointments/availability-range?pet_id=${petId}${from ? `&from=${from}` : ''}${days ? `&days=${days}` : ''}`),
    create: (data: any) => request<any>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    my: () => request<any[]>('/appointments/my'),
    day: (date: string) => request<any[]>(`/appointments/day?date=${date}`),
    stats: (date: string) => request<any>(`/appointments/stats?date=${date}`),
    updateStatus: (id: number, status: string, calculatedScore?: number) =>
      request<any>(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(calculatedScore != null ? { status, calculated_score: calculatedScore } : { status }),
      }),
    updateSlot: (id: number, slotTime: string) =>
      request<any>(`/appointments/${id}/slot`, { method: 'PATCH', body: JSON.stringify({ slot_time: slotTime }) }),
    updateDayOrder: (date: string, appointmentIds: number[]) =>
      request<{ ok: boolean }>('/appointments/day-order', { method: 'PUT', body: JSON.stringify({ date, appointment_ids: appointmentIds }) }),
  },
  capacity: {
    get: (date: string) => request<any>(`/capacity?date=${date}`),
    update: (data: any) => request<any>('/capacity', { method: 'PUT', body: JSON.stringify(data) }),
  },
};
