import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Nav />
      <main className="pt-14">{children}</main>
    </div>
  );
}
