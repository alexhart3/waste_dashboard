"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const path = usePathname();

    return (
        <nav className="nav">
            <Link href="/" aria-current={path === "/" ? "page" : undefined}>
                Dashboard
            </Link>
            <Link href="/records" aria-current={path === "/records" ? "page" : undefined}>
                Records
            </Link>
        </nav>
    )
}