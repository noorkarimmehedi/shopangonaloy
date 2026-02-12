"use client";

import { Bell } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Notification {
    id: string;
    avatar: string;
    fallback: string;
    text: string;
    time: string;
    isRead: boolean;
}

export function NotificationsPopover({
    notifications,
    hasUnread,
    onMarkAsRead,
}: {
    notifications: Notification[];
    hasUnread: boolean;
    onMarkAsRead: () => void;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    <Bell className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {hasUnread && (
                        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-xl border-border/50" align="end">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 bg-muted/30">
                    <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Notifications</span>
                    {hasUnread && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px] font-medium text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
                            onClick={onMarkAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <div className="inline-flex items-center justify-center size-10 rounded-full bg-muted mb-3">
                                <Bell className="size-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-xs text-muted-foreground">No recent notifications</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 border-b border-border/30 px-4 py-3 last:border-0 hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-primary/[0.03]" : ""
                                    }`}
                            >
                                <Avatar className="size-8 border border-border/50 flex-shrink-0">
                                    <AvatarImage src={n.avatar} />
                                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                                        {n.fallback}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-[13px] leading-[1.3] ${!n.isRead ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                            {n.text}
                                        </p>
                                        {!n.isRead && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground/60 font-medium">{n.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
