import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "flex h-8 w-8 items-center justify-center bg-black text-white dark:bg-white dark:text-black",
                className
            )}
        >
            <span className="text-xl font-bold italic">A</span>
        </div>
    );
}
