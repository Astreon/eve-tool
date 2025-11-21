import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/character/info')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/character/info"!</div>
}
