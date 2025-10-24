import { useState } from "react";
import { Camera, Home, BookOpen, Cog, Cpu, Radar, Wrench, Map, Shield, Bell, Server, ChevronRight, Menu, Play } from "lucide-react";

// Utility used in tiny sanity tests below
export function computeThemeClass(dark: boolean) {
  return ""; // always light mode
}

export function isActive(current: string, label: string) {
  return current === label;
}

// Lightweight non-blocking sanity tests (will only log in dev)
if (typeof window !== "undefined" && (process.env.NODE_ENV || "development") !== "production") {
  console.assert(computeThemeClass(true) === "", "computeThemeClass(true) should return empty string in forced light mode");
  console.assert(computeThemeClass(false) === "", "computeThemeClass(false) should return empty string");
  console.assert(isActive("Home", "Home") === true, "isActive should be true when labels match");
  console.assert(isActive("Home", "Get started") === false, "isActive should be false when labels differ");
}

export default function OrbsurvDocsHome() {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState("Home");

  const NavSection = ({ title, items }: { title: string; items: { label: string }[] }) => (
    <div className="mt-8">
      <div className="px-4 text-xs uppercase tracking-wider text-gray-500">{title}</div>
      <div className="mt-2 space-y-1">
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setPage(it.label)}
            className={`w-full px-4 py-2 text-left text-sm rounded-lg hover:bg-gray-100 ${page === it.label ? "bg-gray-200" : ""}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 lg:hidden" onClick={() => setOpen(!open)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-black grid place-items-center">
                <div className="h-4 w-4 rounded-full border-2 border-white" />
              </div>
              {/* Using 'Nico Moji' if available locally; otherwise falls back safely */}
              <div className="font-semibold" style={{ fontFamily: '"Nico Moji", ui-sans-serif, system-ui' }}>Orbsurv</div>
              <div className="hidden sm:block text-sm font-medium text-gray-500">Docs</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a className="hidden sm:inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" href="#">Go to website</a>
            <a className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" href="#">Go to demo</a>
          </div>
        </header>

        {/* Shell */}
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className={`border-r bg-white ${open ? "block" : "hidden"} lg:block`}>
            <div className="h-14" />
            <div className="px-3 py-4">
              <div className="px-4 text-xs uppercase tracking-wider text-gray-500">Welcome</div>
              <div className="mt-2 space-y-1">
                <button onClick={() => setPage("Home")} className={`w-full px-4 py-2 text-left text-sm rounded-lg flex items-center gap-2 ${page === "Home" ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>
                  <Home className="h-4 w-4" /> Home
                </button>
                <button onClick={() => setPage("Get started")} className={`w-full px-4 py-2 text-left text-sm rounded-lg flex items-center gap-2 ${page === "Get started" ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>
                  <BookOpen className="h-4 w-4" /> Get started
                </button>
              </div>

              <NavSection
                title="Basics"
                items={[
                  { label: "Overview" },
                  { label: "Skills" },
                  { label: "Behaviors" },
                  { label: "Simulation" },
                ]}
              />

              <NavSection
                title="Rail"
                items={[
                  { label: "Setup" },
                  { label: "Sensors" },
                  { label: "Manipulation" },
                  { label: "Navigation" },
                  { label: "Hardware" },
                ]}
              />

              <NavSection
                title="AI"
                items={[
                  { label: "Learning" },
                  { label: "Privacy" },
                  { label: "Alerts" },
                  { label: "API" },
                ]}
              />

              <div className="h-16" />
              <div className="px-4 py-3 text-xs text-gray-500">Powered by Orbsurv</div>
            </div>
          </aside>

          {/* Main */}
          <main className="min-h-[calc(100vh-56px)] bg-white">
            {page === "Home" && <HomePage />}
            {page === "Get started" && <GetStartedPage />}
          </main>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <>
      <div className="border-b px-6 py-5">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Welcome</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Home className="h-6 w-6" /> Home
        </div>
      </div>

      <section className="px-6 pt-8">
        <div className="rounded-2xl bg-gray-900 p-6 text-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 opacity-80">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-md bg-gray-700 grid place-items-center">
                <Camera className="h-5 w-5" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">v1 docs</div>
            <div className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">Early access</div>
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="prose prose-gray max-w-none">
          <p className="mt-6 text-base leading-7 text-gray-900 font-normal">
            We build Orbsurv, a smart modular security system that lives in the real world with you. It is centered on a panoramic camera mounted on a motorized horizontal rail that slides left and right to scan wide areas with precision. This motion removes blind spots that fixed cameras cannot cover.
          </p>
          <p className="text-base leading-7 text-gray-700 font-normal">
            The system fuses motion and heat sensors. It learns and adapts. Onboard intelligence prioritizes zones, focuses the lens, and raises alerts with context. Orbsurv scales from homes to businesses to city blocks.
          </p>
          <p className="text-base leading-7 text-gray-900 font-bold">
            The agent brain is designed for tactile reality. It runs policies for patrol, pursuit, and recovery. It remembers events and improves from feedback. You can teach it with demonstrations, code, and prompts.
          </p>
        </div>
      </section>
    </>
  );
}

function GetStartedPage() {
  return (
    <>
      <div className="border-b px-6 py-5">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">Welcome</div>
        <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6" /> Get Started
        </div>
      </div>

      <section className="px-6 py-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Installation</h2>
        <p className="text-sm text-gray-700 font-normal">
          Begin by unboxing the Orbsurv rail unit. Connect the power supply and ensure the camera module is firmly attached. Download the companion software from our website.
        </p>

        <div className="mt-4 p-4 rounded-lg bg-gray-100 text-sm font-mono text-gray-900 font-bold">
          npm install -g orbsurv-cli
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">First Connection</h2>
        <p className="text-sm text-gray-700 font-normal">
          Launch the mobile app or desktop dashboard. Connect via Wi-Fi or Ethernet. The system will auto-detect the Orbsurv rail. Follow the guided setup.
        </p>

        <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">Run First Sweep</h2>
        <p className="text-sm text-gray-700 font-normal">
          Once connected, trigger the first panoramic sweep. Use the app to select your environment size and default patrol routine.
        </p>

        <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white shadow hover:bg-gray-700 font-bold">
          <Play className="h-4 w-4" /> Launch First Patrol
        </button>
      </section>
    </>
  );
}

function FeatureCard({ icon, title, desc, link, visual }: any) {
  return (
    <div className="rounded-2xl border p-6 shadow-sm bg-gradient-to-b from-white to-gray-50">
      <div className="flex items-center gap-3 text-gray-900 font-bold">
        {icon}
        <div>{title}</div>
      </div>
      <p className="mt-2 text-sm text-gray-700 font-normal">{desc}</p>
      <div className="mt-4 h-40 rounded-xl bg-gray-100 grid place-items-center">{visual}</div>
      <button className="group mt-4 inline-flex items-center gap-1 text-sm font-bold text-gray-900 hover:underline">
        {link} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function DiagramPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm font-bold">{label}</div>
  );
}

function RailSVG() {
  return (
    <svg viewBox="0 0 300 120" className="h-36">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#e5e7eb" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      <rect x="20" y="70" width="260" height="8" rx="4" fill="url(#g)" />
      <rect x="120" y="40" width="60" height="30" rx="6" fill="#111827" />
      <circle cx="140" cy="92" r="10" fill="#111827" />
      <circle cx="160" cy="92" r="10" fill="#111827" />
    </svg>
  );
}

function BoardSVG() {
  return (
    <svg viewBox="0 0 300 120" className="h-36">
      <rect x="40" y="20" width="220" height="80" rx="8" fill="#111827" />
      <circle cx="80" cy="60" r="12" fill="#4f46e5" />
      <rect x="110" y="40" width="130" height="8" rx="2" fill="#e5e7eb" />
      <rect x="110" y="60" width="130" height="8" rx="2" fill="#e5e7eb" />
      <rect x="110" y="80" width="90" height="8" rx="2" fill="#e5e7eb" />
    </svg>
  );
}

function DeviceSVG() {
  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-3xl">
      <defs>
        <linearGradient id="p" x1="0" x2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="580" height="280" rx="16" fill="url(#p)" stroke="#e5e7eb" />
      {/* Rail */}
      <rect x="80" y="210" width="440" height="10" rx="5" fill="#c7d2fe" />
      {/* Cart */}
      <rect x="260" y="160" width="120" height="50" rx="8" fill="#111827" />
      <circle cx="290" cy="220" r="12" fill="#111827" />
      <circle cx="350" cy="220" r="12" fill="#111827" />
      {/* Mast and head */}
      <rect x="305" y="130" width="30" height="30" rx="6" fill="#111827" />
      <rect x="300" y="120" width="40" height="12" rx="4" fill="#4f46e5" />
      {/* Sensor arcs */}
      <path d="M420 170 q40 -20 80 0" fill="none" stroke="#a5b4fc" strokeWidth="4" />
      <path d="M100 170 q-40 -20 -80 0" fill="none" stroke="#a5b4fc" strokeWidth="4" />
    </svg>
  );
}
