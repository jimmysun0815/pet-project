'use client';

import Link from 'next/link';
import { PawPrint, LayoutDashboard, Calendar } from 'lucide-react';

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl mb-4 shadow-lg">
            <PawPrint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">PawBook</h1>
          <p className="text-gray-500 mt-2">宠物店预约管理系统</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/home"
            className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition shrink-0">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">用户预约端</h2>
              <p className="text-sm text-gray-500 mt-0.5">添加宠物、选择时间、预约美容服务</p>
            </div>
          </Link>

          <Link
            href="/store"
            className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition shrink-0">
              <LayoutDashboard className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">店长管理端</h2>
              <p className="text-sm text-gray-500 mt-0.5">今日看板、状态管理</p>
            </div>
          </Link>
        </div>

        <p className="text-xs text-gray-400">开发演示模式 · 无需登录</p>
      </div>
    </div>
  );
}
