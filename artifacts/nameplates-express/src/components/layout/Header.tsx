import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function Header() {
  const { itemCount } = useCart();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: "Products" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/cart", label: "Get a Quote" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[hsl(220_25%_12%)] text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-testid="link-logo">
            <span className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
                <span className="text-xs font-black text-white tracking-tight">NX</span>
              </div>
              <span className="text-lg font-bold tracking-tight">
                Nameplates<span className="text-primary">Express</span>
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <span
                  className={`text-sm font-medium transition-colors cursor-pointer ${
                    location === link.href
                      ? "text-primary"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/cart" data-testid="link-cart">
              <span className="relative flex cursor-pointer items-center gap-1.5 rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-600">
                <ShoppingCart size={16} />
                <span>Quote Cart</span>
                {itemCount > 0 && (
                  <span
                    data-testid="badge-cart-count"
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
                  >
                    {itemCount}
                  </span>
                )}
              </span>
            </Link>

            <button
              className="md:hidden text-slate-300 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700 bg-[hsl(220_25%_12%)] px-4 pb-4 pt-3">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <span
                className="block py-2 text-sm font-medium text-slate-300 hover:text-white cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
