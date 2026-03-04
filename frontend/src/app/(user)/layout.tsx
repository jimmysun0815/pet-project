import UserNav from '@/components/UserNav';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <UserNav />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
