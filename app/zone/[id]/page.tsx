export default async function ZonePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-dark mb-4">
        DNS Zone: {id}
      </h1>
      <p className="text-gray-slate">
        This is a placeholder page for DNS zone management.
      </p>
    </div>
  );
}

