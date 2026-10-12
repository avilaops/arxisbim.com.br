import { Link2 } from 'lucide-react';

export default function ApiTokenEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <Link2 className="mx-auto mb-3 h-6 w-6 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
      <p className="mb-1 text-sm font-semibold text-gray-900">Nenhuma integração conectada</p>
      <p className="text-xs text-gray-600">
        Use “Nova integração” para conectar o Arxis a uma ferramenta externa.
      </p>
    </div>
  );
}
