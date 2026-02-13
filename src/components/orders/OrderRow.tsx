
import { memo } from "react";
import { format } from "date-fns";
import {
    Check,
    Search,
    Loader2,
    MoreHorizontal,
    Truck,
    AlertTriangle,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { FraudIndicator } from "./FraudIndicator";
import { NotesPopover } from "./NotesPopover";

// --- Types (Duplicated from OrdersTable or imported if we had a types file) ---
interface FraudData {
    mobile_number: string;
    total_parcels: number;
    total_delivered: number;
    total_cancel: number;
    apis?: Record<string, {
        total_parcels: number;
        total_delivered_parcels: number;
        total_cancelled_parcels: number;
    }>;
}

export interface Order {
    id: string;
    shopify_order_id: number;
    order_number: string;
    customer_name: string | null;
    phone: string | null;
    address: string | null;
    product: string | null;
    quantity: number | null;
    price: number | null;
    status: string;
    created_at: string;
    fraud_checked: boolean | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fraud_data: FraudData | any | null;
    delivery_rate: number | null;
    sent_to_courier?: boolean | null;
    courier_status?: string | null;
    consignment_id?: number | null;
    tracking_code?: string | null;
    courier_message?: string | null;
    notes?: string | null;
    fulfillment_status?: string | null;
}

interface OrderRowProps {
    order: Order;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onStatusUpdate: (order: Order) => void;
    onCheckFraud: (order: Order) => void;
    isCheckingFraud: boolean;
    onOrderUpdate: (order: Order) => void;
    onSendToCourier: (order: Order) => void;
    isSendingToCourier: boolean;
    onGenerateInvoice: (order: Order) => void;
}

// --- Helper Functions ---
function splitProductLines(product: string | null): string[] {
    if (!product) return [];
    return product.split(",").map((s) => s.trim()).filter(Boolean);
}

function hasInlineQty(line: string): boolean {
    return /^\d+\s*(x|×)\s+/i.test(line);
}

function formatProductLine(line: string, fallbackQty: number | null | undefined): string {
    if (!line) return "—";
    if (hasInlineQty(line)) return line;
    if (fallbackQty && fallbackQty > 0) return `${line} ×${fallbackQty}`;
    return line;
}

function productSummary(order: Order): { primary: string; moreCount: number; lines: string[] } {
    const lines = splitProductLines(order.product);
    if (lines.length === 0) {
        return { primary: "—", moreCount: 0, lines: [] };
    }
    const primary = lines.length === 1
        ? formatProductLine(lines[0], order.quantity)
        : formatProductLine(lines[0], undefined);

    return { primary, moreCount: Math.max(0, lines.length - 1), lines };
}

function getCourierStatusBadge(order: Order) {
    if (!order.sent_to_courier) return null;

    const status = order.courier_status?.toLowerCase();
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";

    switch (status) {
        case "delivered":
            variant = "default";
            className = "bg-green-100 text-green-800 hover:bg-green-100";
            break;
        case "cancelled":
            variant = "destructive";
            break;
        case "in_review":
        case "pending":
            variant = "secondary";
            className = "bg-amber-100 text-amber-800 hover:bg-amber-100";
            break;
        default:
            variant = "outline";
    }

    return (
        <Badge variant={variant} className={className}>
            {order.courier_status || "Sent"}
        </Badge>
    );
}


// --- Component ---
export const OrderRowComponent = ({
    order,
    isSelected,
    onSelect,
    onStatusUpdate,
    onCheckFraud,
    isCheckingFraud,
    onOrderUpdate,
    onSendToCourier,
    isSendingToCourier,
    onGenerateInvoice
}: OrderRowProps) => {
    const { primary, moreCount, lines } = productSummary(order);

    return (
        <TableRow
            className={cn(
                "border-b border-black/[0.02] hover:bg-black/[0.01] transition-colors group relative",
                isSelected && "bg-black/[0.015]"
            )}
        >
            {/* Selection Checkbox */}
            <TableCell className="w-12 py-5 pl-10">
                <div
                    onClick={() => onSelect(order.id)}
                    className={cn(
                        "w-4 h-4 rounded border border-black/10 flex items-center justify-center cursor-pointer transition-all",
                        isSelected ? "bg-black border-black shadow-sm" : "bg-white group-hover:border-black/30"
                    )}
                >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
            </TableCell>

            {/* Order Ref & Date */}
            <TableCell className="py-5">
                <span className="font-bold text-[13px] tracking-tight block">{order.order_number}</span>
                <span className="text-[10px] text-black/20 font-medium uppercase tracking-wider">
                    {format(new Date(order.created_at), "MMM dd, yyyy")}
                </span>
            </TableCell>

            {/* Customer */}
            <TableCell className="py-5">
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm tracking-tight">{order.customer_name || "Guest User"}</span>
                    <span className="font-mono text-[11px] text-black">{order.phone || "No Phone"}</span>
                </div>
            </TableCell>

            {/* Trust / Fraud */}
            <TableCell className="text-center py-5">
                <div className="flex items-center justify-center gap-2">
                    <FraudIndicator order={order} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCheckFraud(order);
                        }}
                        disabled={isCheckingFraud}
                        className="p-1.5 rounded-lg bg-black/[0.03] text-black/20 hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        {isCheckingFraud ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Search className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </TableCell>

            {/* Destination */}
            <TableCell className="max-w-[200px] py-5">
                <p className="text-xs text-black/40 font-light truncate" title={order.address || ""}>
                    {order.address || "Digital Delivery"}
                </p>
            </TableCell>

            {/* Merchandise */}
            <TableCell className="max-w-[220px] py-5">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className="text-xs tracking-tight text-black/60 truncate cursor-default">
                            <span className="font-medium">{primary}</span>
                            {moreCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 bg-black/5 rounded text-[9px] font-bold">+{moreCount} More</span>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[360px] bg-black text-white border-none p-4 rounded-2xl shadow-2xl">
                        {lines.length === 0 ? (
                            <p className="text-xs">—</p>
                        ) : (
                            <div className="space-y-2">
                                {lines.map((line, index) => (
                                    <p key={index} className="text-xs font-light">
                                        {lines.length === 1
                                            ? formatProductLine(line, order.quantity)
                                            : line}
                                    </p>
                                ))}
                            </div>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TableCell>

            {/* Value */}
            <TableCell className="text-right py-5 pr-4 tabular-nums">
                <span className="font-medium text-sm">৳{order.price?.toLocaleString()}</span>
            </TableCell>

            {/* Status */}
            <TableCell className="text-center py-5">
                <div className="flex items-center justify-center gap-3">
                    {/* Status Button (Pending/Confirmed) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "h-8 w-24 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all border shadow-sm",
                                    order.status === "confirmed"
                                        ? "bg-black text-white border-black hover:bg-black/90 hover:scale-105"
                                        : "bg-white text-black border-black/10 hover:border-black/30 hover:bg-black/[0.02]"
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {order.status === "confirmed" ? "Fulfilled" : "Pending"}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="center">
                            <div className="grid gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-normal text-xs"
                                    onClick={() => onStatusUpdate(order)}
                                >
                                    {order.status === "confirmed" ? "Mark as Pending" : "Mark as Fulfilled"}
                                </Button>
                                {/* Generate Invoice moved here or kept in row actions? Kept in extra actions for now */}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Notes */}
                    <NotesPopover order={order} onOrderUpdate={onOrderUpdate} />
                </div>
            </TableCell>

            {/* Logistics */}
            <TableCell className="text-center py-5 pr-10">
                <div className="flex items-center justify-end gap-2">
                    {order.sent_to_courier ? (
                        getCourierStatusBadge(order)
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSendToCourier(order);
                            }}
                            disabled={isSendingToCourier}
                            className="h-8 w-8 rounded-full border border-black/10 flex items-center justify-center text-black/40 hover:text-black hover:border-black transition-all disabled:opacity-50"
                            title="Send to Courier"
                        >
                            {isSendingToCourier ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Truck className="h-3.5 w-3.5" />
                            )}
                        </button>
                    )}

                    {/* More Actions Dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center text-black/20 hover:text-black transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start font-normal text-xs h-8"
                                    onClick={() => onGenerateInvoice(order)}
                                >
                                    Generate Invoice
                                </Button>
                                {/* Add other actions here if needed */}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </TableCell>
        </TableRow>
    );
};

// Memoize the component to prevent re-renders when other rows change
export const OrderRow = memo(OrderRowComponent);
