"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Plus, Heart, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Map", icon: Map },
  { href: "/trips/new", label: "Add Trip", icon: Plus },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

function TravelLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="12.5" stroke="#C89B73" strokeWidth="1.5"/>
      <path d="M8 9 C10 11, 9 14, 11 15 C13 16, 14 13, 16 14 C18 15, 17 18, 19 19"
        stroke="#C89B73" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="8" cy="9" r="1.5" fill="#C89B73"/>
      <circle cx="19" cy="19" r="1.5" fill="#C89B73"/>
      <path d="M17 8 L20 6 M20 6 L19 9 M20 6 L22 8"
        stroke="#C89B73" strokeWidth="1" strokeLinecap="round" strokeDasharray="1.5 2"/>
    </svg>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
      style={{ background: "rgba(34,34,34,0.92)", borderColor: "rgba(200,155,115,0.15)" }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <TravelLogo />
          <span style={{
            fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, system-ui, sans-serif",
            fontWeight: 300,
            letterSpacing: "0.12em",
            fontSize: "0.85rem",
            color: "var(--ivory)",
            textTransform: "lowercase",
          }}>
            my travel story
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
                )}
                style={active ? {
                  background: "rgba(200,155,115,0.15)",
                  color: "#C89B73",
                } : {
                  color: "rgba(248,245,240,0.5)",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline" style={{ fontWeight: 500, fontSize: "0.8rem" }}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
