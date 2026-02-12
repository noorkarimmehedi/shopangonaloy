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
            <main className={`flex-1 min-h-screen transition-all duration-300 ease-in-out border-l border-border ${sidebarCollapsed ? "ml-0" : "ml-0"}`}>
                <Outlet />
            </main>
        </div>
    );
}
