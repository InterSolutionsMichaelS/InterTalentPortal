export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full min-h-screen min-w-[768px]">{children}</div>;
}
