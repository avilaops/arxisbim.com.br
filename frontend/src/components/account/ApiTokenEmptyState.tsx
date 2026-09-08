export default function ApiTokenEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
      <div className="mx-auto mb-4 text-5xl">🔗</div>
      <p className="text-gray-600 font-semibold mb-2">Nenhuma integração conectada</p>
      <p className="text-sm text-gray-500">
        Clique em "+ Nova integração" para conectar o ArxisVR a uma ferramenta externa.
      </p>
    </div>
  );
}
