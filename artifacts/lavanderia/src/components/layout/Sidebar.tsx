import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Tags, 
  Receipt,
  Shirt
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Órdenes", href: "/ordenes", icon: ShoppingBag },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Servicios", href: "/servicios", icon: Tags },
  { name: "Facturas", href: "/facturas", icon: Receipt },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 border-r border-border bg-sidebar h-screen flex flex-col sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Shirt className="w-6 h-6" />
          <span>Lavandería</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "opacity-100" : "opacity-70")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            AD
          </div>
          <div>
            <p className="font-medium">Admin</p>
            <p className="text-xs opacity-70">admin@lavanderia.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
