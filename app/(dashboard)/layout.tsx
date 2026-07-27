import LayoutsAdmin from "@/components/layouts_admin";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutsAdmin>{children}</LayoutsAdmin>;
}
