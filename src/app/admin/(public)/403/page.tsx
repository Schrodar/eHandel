import Link from 'next/link';

export const metadata = {
  title: 'Admin – 403',
};

export default function AdminForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg items-center px-4">
      <div className="w-full space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-2xl font-serif text-rose-900">403 – Not authorized</h1>
        <p className="text-sm text-rose-900">
          Du är inloggad men saknar behörighet att nå admin.
        </p>
        <div className="flex items-center justify-between text-sm">
          <Link href="/" className="text-rose-900 underline-offset-2 hover:underline">
            Tillbaka till shoppen
          </Link>
          <form action="/admin/logout" method="post">
            <button type="submit" className="text-rose-900 underline-offset-2 hover:underline">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
