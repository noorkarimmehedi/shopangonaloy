"use client";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Route {
    id: string;
    title: string;
    icon: ReactNode;
    link: string;
    subs?: {
        title: string;
        link: string;
        icon?: ReactNode;
    }[];
}

export default function DashboardNavigation({ routes }: { routes: Route[] }) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {routes.map((route) => {
                        const hasSubs = route.subs && route.subs.length > 0;

                        if (isCollapsed) {
                            return (
                                <SidebarMenuItem key={route.id}>
                                    <SidebarMenuButton asChild tooltip={route.title}>
                                        <a href={route.link} className="flex w-full items-center justify-center">
                                            {route.icon}
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        }

                        return (
                            <Collapsible key={route.id} asChild className="group/collapsible" defaultOpen={false}>
                                <SidebarMenuItem>
                                    {hasSubs ? (
                                        <>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton tooltip={route.title}>
                                                    {route.icon}
                                                    <span>{route.title}</span>
                                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {route.subs?.map((sub) => (
                                                        <SidebarMenuSubItem key={sub.title}>
                                                            <SidebarMenuSubButton asChild>
                                                                <a href={sub.link}>
                                                                    {sub.icon}
                                                                    <span>{sub.title}</span>
                                                                </a>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </>
                                    ) : (
                                        <SidebarMenuButton asChild tooltip={route.title}>
                                            <a href={route.link}>
                                                {route.icon}
                                                <span>{route.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            </Collapsible>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
