'use client';

type Props = {
  action: (formData: FormData) => Promise<void>;
  driveId: string;
  driveName: string;
};

export function DeleteDriveButton({ action, driveId, driveName }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Radera kampanjen "${driveName}" och alla dess koder?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={driveId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
      >
        Radera
      </button>
    </form>
  );
}
