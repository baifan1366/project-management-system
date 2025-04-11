import ProjectSidebar from '@/components/ProjectSidebar'

export default async function ProjectLayout({ children, params }) {
  const resolvedParams = await params
  return (
    <div className="flex w-full">
      <ProjectSidebar projectId={resolvedParams.id} />
      <main className="flex-1 w-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
