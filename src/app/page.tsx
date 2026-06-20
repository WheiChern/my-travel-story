import Link from "next/link";
import { Camera, MapPin, Bell, Users, Star, Sparkles } from "lucide-react";

function TravelLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#C89B73" strokeWidth="1.5"/>
      <path d="M9 10 C11 12, 10 15, 12 16 C14 17, 15 14, 17 15 C19 16, 18 19, 21 20"
        stroke="#C89B73" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="9" cy="10" r="2" fill="#C89B73"/>
      <circle cx="21" cy="20" r="2" fill="#C89B73"/>
      <path d="M19 8 L23 6 M23 6 L22 10 M23 6 L26 9"
        stroke="#C89B73" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#222222", color: "#F8F5F0" }}>
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b"
        style={{ borderColor: "rgba(200,155,115,0.15)" }}>
        <div className="flex items-center gap-3">
          <TravelLogo />
          <span style={{
            fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, system-ui, sans-serif",
            fontWeight: 300,
            letterSpacing: "0.12em",
            fontSize: "0.85rem",
            color: "#F8F5F0",
            textTransform: "lowercase",
          }}>
            my travel story
          </span>
        </div>
        <Link
          href="/dashboard"
          style={{ color: "#C89B73", fontSize: "0.85rem", letterSpacing: "0.05em" }}
          className="transition-opacity hover:opacity-70"
        >
          Enter →
        </Link>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-widest mb-8" style={{ color: "#C89B73", letterSpacing: "0.2em" }}>
          every place · every memory · every story
        </p>

        <h1 style={{
          fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 300,
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "#F8F5F0",
          maxWidth: "700px",
          marginBottom: "1.5rem",
        }}>
          Your life journey,<br />
          <span style={{ color: "#C89B73" }}>beautifully mapped.</span>
        </h1>

        <p className="max-w-md mb-12 leading-relaxed" style={{ color: "rgba(248,245,240,0.5)", fontSize: "1.05rem" }}>
          Visualise every place you&apos;ve visited. Relive trips through photos and memories.
          Plan your next adventure.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="px-8 py-3 rounded-full font-medium transition-opacity hover:opacity-90"
            style={{ background: "#C89B73", color: "#222222", fontSize: "0.9rem", letterSpacing: "0.05em" }}
          >
            Explore the Map
          </Link>
          <Link
            href="/trips/new"
            className="px-8 py-3 rounded-full font-medium transition-colors"
            style={{
              background: "transparent",
              border: "1px solid rgba(200,155,115,0.3)",
              color: "#F8F5F0",
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
            }}
          >
            Add a Trip
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="border-t py-20 px-6" style={{ borderColor: "rgba(200,155,115,0.1)" }}>
        <p className="text-center text-xs uppercase tracking-widest mb-12" style={{ color: "rgba(248,245,240,0.3)" }}>
          Everything you need
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { icon: MapPin, title: "Interactive World Map", desc: "Every city and country you've visited, colour-coded by trip type." },
            { icon: Camera, title: "Trip Storyboards", desc: "Photos, itineraries, routes and cost summaries all in one place." },
            { icon: Users, title: "Travel with Anyone", desc: "Tag family, friends, solo or that special someone." },
            { icon: Bell, title: "Fare Alerts", desc: "Add wishlist destinations and get notified when prices drop." },
            { icon: Star, title: "Import Memories", desc: "Sync from Google Photos or import your Dropbox booking documents." },
            { icon: Sparkles, title: "AI Travel Journal", desc: "Let AI craft a vivid story from your trip data, places and photos." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-5 transition-colors"
              style={{ background: "rgba(248,245,240,0.04)", border: "1px solid rgba(200,155,115,0.1)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(200,155,115,0.12)" }}>
                <Icon className="w-4 h-4" style={{ color: "#C89B73" }} />
              </div>
              <h3 className="font-medium mb-1" style={{ color: "#F8F5F0", fontWeight: 500 }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(248,245,240,0.4)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trip type legend */}
      <div className="border-t py-10 px-6 text-center" style={{ borderColor: "rgba(200,155,115,0.1)" }}>
        <p className="text-xs uppercase tracking-widest mb-6" style={{ color: "rgba(248,245,240,0.3)" }}>
          Colour-coded by travel type
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {[
            { label: "Family", color: "#f59e0b" },
            { label: "Solo", color: "#3b82f6" },
            { label: "Special Someone", color: "#ec4899" },
            { label: "Friends", color: "#10b981" },
            { label: "Business", color: "#6366f1" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: "rgba(248,245,240,0.5)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
