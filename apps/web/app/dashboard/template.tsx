export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-content-enter">{children}</div>;
}
