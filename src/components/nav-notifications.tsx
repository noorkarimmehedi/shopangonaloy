"use client";

import { Bell } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Notification {
    id: string;
    avatar: string;
    fallback: string;
    text: string;
    time: string;
}

export function NotificationsPopover({
    notifications,
}: {
    notifications: Notification[];
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-4" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-2">
                    <span className="font-semibold">Notifications</span>
                    <Button variant="ghost" size="sm" className="text-xs">
                        Mark all as read
                    </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className="flex items-start gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/50"
                        >
                            <Avatar className="size-8">
                                <AvatarImage src={n.avatar} />
                                <AvatarFallback>{n.fallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <p className="text-sm">{n.text}</p>
                                <p className="text-xs text-muted-foreground">{n.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
