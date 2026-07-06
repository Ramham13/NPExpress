import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-[hsl(220_25%_12%)] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
                <span className="text-xs font-black text-white">NX</span>
              </div>
              <span className="font-bold text-white">
                Nameplates<span className="text-primary">Express</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Anodized aluminum nameplates for industrial, commercial, and safety applications. Fast turnaround, professional quality.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Products</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products"><span className="cursor-pointer hover:text-white transition-colors">Equipment Tags</span></Link></li>
              <li><Link href="/products"><span className="cursor-pointer hover:text-white transition-colors">Valve Tags</span></Link></li>
              <li><Link href="/products"><span className="cursor-pointer hover:text-white transition-colors">Control Panel Tags</span></Link></li>
              <li><Link href="/products"><span className="cursor-pointer hover:text-white transition-colors">Warning Nameplates</span></Link></li>
              <li><Link href="/products"><span className="cursor-pointer hover:text-white transition-colors">Logo-Ready Templates</span></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Ordering</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-slate-400">
                <span className="font-medium text-amber-400">PayPal sandbox checkout is available for testing.</span>
              </li>
              <li className="text-slate-400">
                Industrial customers may submit for PO/invoice handling.
              </li>
              <li className="text-slate-400">
                Questions? <span className="text-white">info@nameplatesexpress.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Nameplates Express. All rights reserved.</span>
          <span>Material: Anodized Aluminum &bull; Made in USA</span>
        </div>
      </div>
    </footer>
  );
}
