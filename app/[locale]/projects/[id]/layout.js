import ProjectSidebar from '@/components/ProjectSidebar'

export default async function ProjectLayout({ children, params }) {
  const resolvedParams = await params
  return (
    <div className="flex">
      <ProjectSidebar projectId={resolvedParams.id} />
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
