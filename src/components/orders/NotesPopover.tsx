
import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Order {
    id: string;
    notes?: string | null;
}

export function NotesPopover({ order, onOrderUpdate }: { order: Order; onOrderUpdate?: (updatedOrder: Order) => void }) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState(order.notes || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from("orders")
                .update({ notes })
                .eq("id", order.id);

            if (error) throw error;

            if (onOrderUpdate) {
                onOrderUpdate({ ...order, notes });
            }
            setOpen(false);
            toast.success("Notes saved");
        } catch (error) {
            console.error("Error saving notes:", error);
            toast.error("Failed to save notes");
        } finally {
            setSaving(false);
        }
    };

    const hasNotes = order.notes && order.notes.trim().length > 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <button
                            className={`relative p-1.5 rounded-lg transition-all duration-200 ${hasNotes
                                ? "bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/20 hover:ring-primary/40 hover:shadow-md"
                                : "text-muted-foreground/30 hover:bg-muted/50 hover:text-muted-foreground"
                                }`}
                        >
                            <NotebookPen className="h-3.5 w-3.5" />
                            {hasNotes && (
                                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                            )}
                        </button>
                    </PopoverTrigger>
                </TooltipTrigger>
                {!open && hasNotes && (
                    <TooltipContent side="top" className="max-w-[200px] text-sm">
                        {order.notes}
                    </TooltipContent>
                )}
            </Tooltip>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Order Notes</p>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes..."
                        className="min-h-[80px] text-sm resize-none"
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
