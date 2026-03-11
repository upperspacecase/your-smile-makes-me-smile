import { Link, useLocation } from "wouter";
import { Users, User, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/check-in", icon: Home, label: "Home" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/me", icon: User, label: "Me" },
  ];

  return (
    <div className="min-h-screen bg-club-blue text-white font-sans pb-20">
      {children}

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pb-safe">
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex flex-col items-center gap-0.5 cursor-pointer transition-opacity",
                    isActive ? "opacity-100" : "opacity-30 hover:opacity-60"
                  )}>
                    <item.icon 
                      className="h-5 w-5 text-club-blue"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="text-[9px] font-semibold text-club-blue">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
