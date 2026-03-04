'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import type { Pet, Breed } from '@/lib/types';
import { Plus, Trash2, Edit, Dog, X, Check, Search } from 'lucide-react';
import PickerWheel, { type PickerOption } from '@/components/PickerWheel';

const KG_TO_LB = 2.20462;

function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB);
}

function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 2) / 2; // round to nearest 0.5 kg
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [form, setForm] = useState({ name: '', breed_id: '', weight_kg: '', age_years: '1', species: 'dog' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [breedsError, setBreedsError] = useState('');

  // Breed autocomplete state
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedList, setShowBreedList] = useState(false);
  const breedListRef = useRef<HTMLDivElement>(null);
  const breedInputRef = useRef<HTMLInputElement>(null);

  // Weight unit state
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  const loadPets = useCallback(async () => {
    try {
      const data = await api.pets.list();
      setPets(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadPets();
    api.breeds
      .list('dog')
      .then((data) => {
        setBreeds(data);
        setBreedsError('');
      })
      .catch((err) => {
        console.error('加载品种失败:', err);
        setBreedsError(err?.message || '品种列表加载失败，请确保后端已启动并已执行 npm run seed');
      });
  }, [loadPets]);

  // Close breed list on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (breedListRef.current && !breedListRef.current.contains(e.target as Node)) {
        setShowBreedList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBreeds = useMemo(() => {
    if (!breedSearch.trim()) return breeds;
    const q = breedSearch.toLowerCase().trim();
    return breeds.filter(
      (b) => b.name_zh.toLowerCase().includes(q) || b.name_en.toLowerCase().includes(q),
    );
  }, [breeds, breedSearch]);

  const selectedBreed = breeds.find((b) => String(b.id) === form.breed_id);

  const weightKgNum = form.weight_kg ? parseFloat(form.weight_kg) : 0.5;
  const weightDisplayVal = weightUnit === 'kg' ? weightKgNum : kgToLb(weightKgNum);
  const weightLabel = weightUnit === 'kg' ? `${weightKgNum} kg` : `${kgToLb(weightKgNum)} lb`;

  const ageNum = form.age_years ? parseInt(form.age_years, 10) : 1;

  const weightOptionsKg: PickerOption[] = useMemo(() => {
    const opts: PickerOption[] = [];
    for (let v = 0.5; v <= 100; v += 0.5) {
      opts.push({ value: v, label: `${v} kg` });
    }
    return opts;
  }, []);

  const weightOptionsLb: PickerOption[] = useMemo(() => {
    const opts: PickerOption[] = [];
    for (let v = 1; v <= 220; v += 1) {
      opts.push({ value: v, label: `${v} lb` });
    }
    return opts;
  }, []);

  const ageOptions: PickerOption[] = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => ({ value: i, label: `${i} 岁` }));
  }, []);

  const weightPickerValue =
    weightUnit === 'kg'
      ? Math.max(0.5, Math.min(100, Math.round(weightKgNum * 2) / 2))
      : Math.max(1, Math.min(220, Math.round(kgToLb(weightKgNum))));
  const weightOptions = weightUnit === 'kg' ? weightOptionsKg : weightOptionsLb;
  const setWeightFromPicker = (val: number) => {
    if (weightUnit === 'kg') {
      setForm((p) => ({ ...p, weight_kg: String(val) }));
    } else {
      setForm((p) => ({ ...p, weight_kg: String(lbToKg(val)) }));
    }
  };

  const resetForm = () => {
    setForm({ name: '', breed_id: '', weight_kg: '', age_years: '1', species: 'dog' });
    setEditingPet(null);
    setShowForm(false);
    setError('');
    setBreedSearch('');
    setWeightUnit('kg');
  };

  const openEdit = (pet: Pet) => {
    setEditingPet(pet);
    setForm({
      name: pet.name,
      breed_id: String(pet.breed_id),
      weight_kg: String(pet.weight_kg),
      age_years: String(Math.round(pet.age_years)),
      species: pet.species,
    });
    setBreedSearch(pet.breed_name_zh || '');
    setShowForm(true);
  };

  const selectBreed = (breed: Breed) => {
    setForm((p) => {
      const newForm = { ...p, breed_id: String(breed.id) };
      if (!p.weight_kg || p.weight_kg === '' || p.weight_kg === '0') {
        const defaultWeight = breed.avg_weight_kg ?? 10;
        newForm.weight_kg = String(defaultWeight);
      }
      return newForm;
    });
    setBreedSearch(breed.name_zh);
    setShowBreedList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.breed_id) {
      setError('请选择品种');
      return;
    }
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) {
      setError('请设置体重');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        species: form.species,
        breed_id: parseInt(form.breed_id),
        weight_kg: parseFloat(form.weight_kg),
        age_years: parseInt(form.age_years),
      };

      if (editingPet) {
        await api.pets.update(editingPet.id, payload);
      } else {
        await api.pets.create(payload);
      }

      await loadPets();
      resetForm();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个宠物吗？')) return;
    try {
      await api.pets.delete(id);
      await loadPets();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的宠物</h1>
          <p className="text-gray-500 text-sm mt-1">管理您的宠物信息</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          添加宠物
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editingPet ? '编辑宠物' : '添加新宠物'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {breedsError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              {breedsError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pet name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">宠物名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="例如：旺财"
                required
              />
            </div>

            {/* Breed autocomplete */}
            <div ref={breedListRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={breedInputRef}
                  type="text"
                  value={breedSearch}
                  onChange={(e) => {
                    setBreedSearch(e.target.value);
                    setShowBreedList(true);
                    if (!e.target.value) {
                      setForm((p) => ({ ...p, breed_id: '' }));
                    }
                  }}
                  onFocus={() => setShowBreedList(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="输入品种名称搜索（中文或英文）"
                  autoComplete="off"
                />
                {form.breed_id && (
                  <button
                    type="button"
                    onClick={() => {
                      setBreedSearch('');
                      setForm((p) => ({ ...p, breed_id: '' }));
                      breedInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showBreedList && !form.breed_id && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredBreeds.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">没有匹配的品种</div>
                  ) : (
                    filteredBreeds.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBreed(b)}
                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition text-sm border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium">{b.name_zh}</span>
                        <span className="text-gray-400 ml-2">{b.name_en}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Weight & Age picker wheels - one row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">体重</span>
                  <span className="text-sm font-semibold text-indigo-600 bg-gray-100 rounded-full px-2.5 py-0.5">
                    {weightLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setWeightUnit('kg')}
                    className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                      weightUnit === 'kg' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    公斤
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeightUnit('lb')}
                    className={`flex-1 py-1 rounded-lg text-xs font-medium transition ${
                      weightUnit === 'lb' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    磅
                  </button>
                </div>
                <PickerWheel
                  options={weightOptions}
                  value={weightPickerValue}
                  onChange={setWeightFromPicker}
                />
              </div>

              {/* Age */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">年龄</span>
                  <span className="text-sm font-semibold text-indigo-600 bg-gray-100 rounded-full px-2.5 py-0.5">
                    {ageNum} 岁
                  </span>
                </div>
                <div className="h-9" />
                <PickerWheel
                  options={ageOptions}
                  value={ageNum}
                  onChange={(v) => setForm((p) => ({ ...p, age_years: String(v) }))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? '保存中...' : editingPet ? '保存修改' : '添加宠物'}
            </button>
          </form>
        </div>
      )}

      {pets.length === 0 ? (
        <div className="text-center py-16">
          <Dog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">还没有添加宠物</h3>
          <p className="text-sm text-gray-400 mt-1">点击上方按钮添加您的第一只宠物</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Dog className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{pet.name}</h3>
                  <p className="text-sm text-gray-500">
                    {pet.breed_name_zh} · {pet.weight_kg}kg · {pet.age_years}岁
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(pet)} className="text-gray-400 hover:text-indigo-600 transition">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(pet.id)} className="text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
