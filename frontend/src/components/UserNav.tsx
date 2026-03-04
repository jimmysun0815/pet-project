'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Calendar, Dog, ClipboardList, LayoutDashboard } from 'lucide-react';

export default function UserNav() {
  const pathname = usePathname();

  const links = [
    { href: '/home', label: '首页', icon: PawPrint },
    { href: '/pets', label: '我的宠物', icon: Dog },
    { href: '/book', label: '预约', icon: Calendar },
    { href: '/appointments', label: '我的预约', icon: ClipboardList },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">PawBook</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                    active ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
            <Link
              href="/store"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition ml-1 border border-gray-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">店长端</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
