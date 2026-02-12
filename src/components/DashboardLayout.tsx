import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function DashboardLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        return saved === "true";
    });

    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
    }, [sidebarCollapsed]);

    return (
        <div className="min-h-screen bg-background flex">
            <AppSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <main className={`flex-1 min-h-screen transition-[margin] duration-300 ${sidebarCollapsed ? "ml-[64px]" : "ml-[240px]"}`}>
                <Outlet />
            </main>
        </div>
    );
}
