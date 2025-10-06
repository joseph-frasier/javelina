export default function ZonePage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-dark mb-4">
        DNS Zone: {params.id}
      </h1>
      <p className="text-gray-slate">
        This is a placeholder page for DNS zone management.
      </p>
    </div>
  );
}

