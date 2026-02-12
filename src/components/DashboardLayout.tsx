import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function DashboardLayout() {
    const [open, setOpen] = useState(() => {
        const saved = localStorage.getItem("sidebar-open");
        return saved !== null ? saved === "true" : true;
    });

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        localStorage.setItem("sidebar-open", String(newOpen));
    };

    return (
        <SidebarProvider open={open} onOpenChange={handleOpenChange}>
            <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />
                <SidebarInset className="flex flex-col border-l">
                    <main className="flex-1">
                        <Outlet />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
