import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from '@/components/layout'
import { useTargets } from '@/lib/target-context'
import { AuditPage } from '@/pages/audit'
import { LookupPage } from '@/pages/lookup'
import { OverviewPage } from '@/pages/overview'
import { PlansPage } from '@/pages/plans'
import { ResourceDetailPage } from '@/pages/resource-detail'
import { ResourcesPage } from '@/pages/resources'
import { TargetsPage } from '@/pages/targets'
import { UserDetailPage } from '@/pages/user-detail'
import { UsersPage } from '@/pages/users'

/** Pages that talk to a target; without one they send the reader to add it. */
function NeedsTarget({ children }: { children: ReactNode }) {
  const { active } = useTargets()
  if (!active) return <Navigate to="/environments" replace />
  // Keyed by target, so switching targets starts every page afresh.
  return <div key={active.id} className="contents">{children}</div>
}

export default function App() {
  const { ready } = useTargets()
  if (!ready) return null
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<NeedsTarget><OverviewPage /></NeedsTarget>} />
          <Route path="users" element={<NeedsTarget><UsersPage /></NeedsTarget>} />
          <Route path="users/:id" element={<NeedsTarget><UserDetailPage /></NeedsTarget>} />
          <Route path="resources" element={<NeedsTarget><ResourcesPage /></NeedsTarget>} />
          <Route path="resources/:id" element={<NeedsTarget><ResourceDetailPage /></NeedsTarget>} />
          <Route path="plans" element={<NeedsTarget><PlansPage /></NeedsTarget>} />
          <Route path="lookup" element={<NeedsTarget><LookupPage /></NeedsTarget>} />
          <Route path="audit" element={<NeedsTarget><AuditPage /></NeedsTarget>} />
          <Route path="environments" element={<TargetsPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
