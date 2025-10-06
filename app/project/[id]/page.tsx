export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-dark mb-4">
        Project: {params.id}
      </h1>
      <p className="text-gray-slate">
        This is a placeholder page for project details.
      </p>
    </div>
  );
}

