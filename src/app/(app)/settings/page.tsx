"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Trash2, LogOut, Download, Link2, Unlink, Check } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    fetch("/api/dropbox/status").then((r) => r.json()).then((d) => setDropboxConnected(d.connected));
    fetch("/api/google-photos/status").then((r) => r.json()).then((d) => setGoogleConnected(d.connected));

    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") setGoogleConnected(true);
    if (params.get("dropbox") === "connected") setDropboxConnected(true);
  }, []);

  const disconnectDropbox = async () => {
    await fetch("/api/dropbox/status", { method: "DELETE" });
    setDropboxConnected(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {/* Connected Accounts */}
        <section className="mb-8">
          <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Connected Accounts</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
            {/* Dropbox — live status */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 43 40" className="w-5 h-5 flex-shrink-0" fill="none">
                  <path d="M12.5 0L0 8.125l8.75 7L21.25 7.5 12.5 0z" fill="#0061FF"/>
                  <path d="M30 0l-8.75 7.5 12.5 7.625L42.5 8.125 30 0z" fill="#0061FF"/>
                  <path d="M0 21.875L12.5 30l8.75-7.5-12.5-7.625L0 21.875z" fill="#0061FF"/>
                  <path d="M42.5 21.875l-12.5-7.125-8.75 7.5L30 30l12.5-8.125z" fill="#0061FF"/>
                  <path d="M12.5 32.5L21.25 40 30 32.5l-8.75-7.5-8.75 7.5z" fill="#0061FF"/>
                </svg>
                <div>
                  <p className="text-white text-sm font-medium">Dropbox</p>
                  <p className={`text-xs mt-0.5 ${dropboxConnected ? "text-green-400" : "text-white/40"}`}>
                    {dropboxConnected ? "Connected — ready to import" : "Not connected"}
                  </p>
                </div>
              </div>
              {dropboxConnected ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push("/import")}
                    className="border-white/10 text-white/60 hover:bg-white/5 text-xs">
                    Import files
                  </Button>
                  <Button size="sm" variant="outline" onClick={disconnectDropbox}
                    className="border-red-900 text-red-400 hover:bg-red-900/20 text-xs">
                    <Unlink className="w-3 h-3 mr-1" /> Disconnect
                  </Button>
                </div>
              ) : (
                <a href="/api/dropbox/auth" className="inline-flex items-center gap-1 px-3 py-1.5 border border-white/10 text-white/60 hover:bg-white/5 text-xs rounded-md transition-colors">
                  <Link2 className="w-3 h-3" /> Connect
                </a>
              )}
            </div>

            {/* Google Photos */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">📸</span>
                <div>
                  <p className="text-white text-sm font-medium">Google Photos</p>
                  <p className={`text-xs mt-0.5 ${googleConnected ? "text-green-400" : "text-white/40"}`}>
                    {googleConnected ? "Connected — pick photos from any trip to import them" : "Not connected"}
                  </p>
                </div>
              </div>
              {googleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-green-400 text-xs">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                  <Button size="sm" variant="outline"
                    onClick={async () => { await fetch("/api/google-photos/status", { method: "DELETE" }); setGoogleConnected(false); }}
                    className="border-red-900 text-red-400 hover:bg-red-900/20 text-xs">
                    <Unlink className="w-3 h-3 mr-1" /> Disconnect
                  </Button>
                </div>
              ) : (
                <a href="/api/google-photos/auth" className="inline-flex items-center gap-1 px-3 py-1.5 border border-white/10 text-white/60 hover:bg-white/5 text-xs rounded-md transition-colors">
                  <Link2 className="w-3 h-3" /> Connect
                </a>
              )}
            </div>

            {/* Facebook */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">📘</span>
                <div>
                  <p className="text-white text-sm font-medium">Facebook</p>
                  <p className="text-white/40 text-xs mt-0.5">Not connected</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => alert("Add FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET to .env")}
                className="border-white/10 text-white/60 hover:bg-white/5 text-xs">
                <Link2 className="w-3 h-3 mr-1" /> Connect
              </Button>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-8">
          <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Privacy</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">All trips are private by default</p>
                  <p className="text-white/40 text-xs mt-0.5">Your travel memories are never shared publicly unless you explicitly enable it.</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">AI processing requires your consent</p>
                  <p className="text-white/40 text-xs mt-0.5">AI extraction only runs when you choose it. Your documents are never used to train models.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data */}
        <section className="mb-8">
          <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Your Data</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-white text-sm font-medium">Export your data</p>
                <p className="text-white/40 text-xs mt-0.5">Download all your trips and photos</p>
              </div>
              <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:bg-white/5 text-xs"
                onClick={() => alert("Export coming soon")}>
                <Download className="w-3 h-3 mr-1" /> Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-red-400 text-sm font-medium">Delete account</p>
                <p className="text-white/40 text-xs mt-0.5">Permanently delete all your data</p>
              </div>
              <Button variant="outline" size="sm"
                className="border-red-900 text-red-400 hover:bg-red-900/20 text-xs"
                onClick={() => confirm("Are you sure? This cannot be undone.") && alert("Account deletion coming soon")}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </section>

        <Button variant="outline" className="w-full border-white/10 text-white/60 hover:bg-white/5"
          onClick={() => alert("Sign out via NextAuth signOut()")}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
