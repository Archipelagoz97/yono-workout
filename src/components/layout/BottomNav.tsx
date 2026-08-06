"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  HomeIcon,
  CalendarIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  UserIcon,
} from "lucide-react";

const navItems = [
  { href: "/today", label: "Today", icon: HomeIcon },
  { href: "/history", label: "History", icon: CalendarIcon },
  { href: "/coach", label: "Coach", icon: MessageSquareIcon },
  { href: "/progress", label: "Progress", icon: TrendingUpIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-card/95 backdrop-blur-md border-t border-border"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
      }}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              id={`nav-${label.toLowerCase()}`}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 relative",
                "touch-target transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "stroke-primary" : "stroke-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
