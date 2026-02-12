import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";



import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck, Truck, Loader2, Search, NotebookPen } from "lucide-react";
import { format } from "date-fns";

function splitProductLines(product: string | null): string[] {
  if (!product) return [];
  return product
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasInlineQty(line: string): boolean {
  // Matches "3x Item" or "3× Item" (case-insensitive)
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

  // Legacy single-item rows used to store quantity separately; keep that behavior.
  const primary =
    lines.length === 1
      ? formatProductLine(lines[0], order.quantity)
      : formatProductLine(lines[0], undefined);

  return { primary, moreCount: Math.max(0, lines.length - 1), lines };
}

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

interface Order {
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

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onOrderUpdate?: (updatedOrder: Order) => void;
}

function FraudIndicator({ order }: { order: Order }) {
  if (!order.fraud_checked || !order.fraud_data) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center opacity-20">
            <HelpCircle className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white border-0 py-2">
          <p className="text-[9px] font-black uppercase tracking-widest">
            {!order.fraud_checked ? "No Verification" : "Data Missing"}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const { total_parcels, total_delivered, total_cancel } = order.fraud_data;
  const deliveryRate = total_parcels > 0 ? (total_delivered / total_parcels) * 100 : 0;

  let riskColor: string;
  let riskLabel: string;

  if (total_parcels === 0) {
    riskColor = "text-muted-foreground";
    riskLabel = "New Entry";
  } else if (deliveryRate >= 70) {
    riskColor = "text-success";
    riskLabel = "Validated";
  } else if (deliveryRate >= 50) {
    riskColor = "text-warning";
    riskLabel = "Warning";
  } else {
    riskColor = "text-red";
    riskLabel = "Critical Risk";
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger>
        <div className="flex flex-col items-center">
          <span className={`text-[11px] font-black tabular-nums tracking-tighter ${riskColor}`}>
            {total_parcels > 0 ? `${deliveryRate.toFixed(0)}%` : "N/A"}
          </span>
          <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/50">Rate</span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="w-64 p-0 bg-black text-white border-0"
      >
        <div className="p-4 border-b border-white/10">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block mb-1">Security Audit</span>
          <p className={`text-xl font-bold uppercase tracking-tight ${riskColor}`}>{riskLabel}</p>
        </div>

        <div className="p-4 grid grid-cols-3 gap-2 border-b border-white/10">
          <div>
            <p className="text-[14px] font-bold tabular-nums">{total_parcels}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Total</p>
          </div>
          <div>
            <p className="text-[14px] font-bold tabular-nums text-success">{total_delivered}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Success</p>
          </div>
          <div>
            <p className="text-[14px] font-bold tabular-nums text-red">{total_cancel}</p>
            <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Failure</p>
          </div>
        </div>

        {total_parcels > 0 && (
          <div className="p-4 h-1 bg-white/10">
            <div className="h-full bg-red transition-all" style={{ width: `${100 - deliveryRate}%`, float: 'right' }} />
            <div className="h-full bg-success transition-all" style={{ width: `${deliveryRate}%` }} />
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function NotesPopover({ order, onOrderUpdate }: { order: Order; onOrderUpdate?: (updatedOrder: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(order.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("confirm-order", {
        body: { orderId: order.id, notes }
      });
      if (error) throw error;
      if (onOrderUpdate) onOrderUpdate({ ...order, notes });
      setOpen(false);
      toast.success("Registry updated");
    } catch (error) {
      toast.error("Failed to update registry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`p-1 transition-colors ${order.notes ? "text-red" : "text-muted-foreground/30 hover:text-black"}`}
        >
          <NotebookPen className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-black text-white border-0" align="end">
        <div className="p-4 border-b border-white/10">
          <span className="swiss-label text-white/40">Registry Note</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white/5 border-white/10 text-xs text-white placeholder:text-white/20 min-h-[100px] mt-2 tracking-wide"
          />
        </div>
        <div className="flex">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
          >
            Abort
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-red hover:bg-red/80"
          >
            {saving ? "..." : "Commit"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function OrdersTable({ orders, loading, onStatusUpdate, onOrderUpdate }: OrdersTableProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [checkingFraudIds, setCheckingFraudIds] = useState<Set<string>>(new Set());

  const handleStatusToggle = async (order: Order) => {
    const newStatus = order.status === "confirmed" ? "pending" : "confirmed";

    // Optimistic update - update UI immediately
    onStatusUpdate(order.id, newStatus);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", order.id);

      if (error) {
        // Revert on failure
        onStatusUpdate(order.id, order.status);
        throw error;
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleSendToCourier = async (order: Order) => {
    setSendingIds((prev) => new Set(prev).add(order.id));

    try {
      const { data, error } = await supabase.functions.invoke("send-to-courier", {
        body: { orderId: order.id },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.order && onOrderUpdate) {
        onOrderUpdate(data.order);
      }
      toast.success(`Order ${order.order_number} sent to Steadfast courier`);
    } catch (error) {
      console.error("Error sending to courier:", error);
      toast.error("Failed to send order to courier");
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleCheckFraud = async (order: Order) => {
    setCheckingFraudIds((prev) => new Set(prev).add(order.id));

    try {
      const { data, error } = await supabase.functions.invoke("check-fraud", {
        body: { orderId: order.id },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.order && onOrderUpdate) {
        onOrderUpdate(data.order);
      }
      toast.success(`Fraud check completed for ${order.order_number}`);
    } catch (error) {
      console.error("Error checking fraud:", error);
      toast.error("Failed to check fraud status");
    } finally {
      setCheckingFraudIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const formatPrice = (price: number | null, deliveryRate: number | null = null) => {
    if (price === null) return "-";
    const total = price + (deliveryRate ?? 0);
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(total);
  };



  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xs text-muted-foreground tracking-wide uppercase">No orders found</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Click "Sync" to fetch from Shopify</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="border-collapse border-spacing-0">
        <TableHeader className="bg-black">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto pl-8">Order ID</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto">Customer</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto">Contact Info</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto text-center">Safety Rating</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto">Delivery Address</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto text-right pr-8">Valuation</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto text-center">Registry State</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 py-4 h-auto text-center pr-8">Logistics</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const { primary, moreCount, lines } = productSummary(order);

            return (
              <TableRow key={order.id} className="border-b border-border hover:bg-secondary/20 transition-none group">
                <TableCell className="py-6 pl-8">
                  <span className="font-bold text-[12px] tabular-nums block uppercase tracking-wider">{order.order_number}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1 block">{format(new Date(order.created_at), "dd / MM / yyyy")}</span>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-bold uppercase tracking-tight">{order.customer_name || "—"}</span>
                    {order.fulfillment_status && (
                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] w-fit px-1 ${order.fulfillment_status === "fulfilled" ? "bg-success text-white" : "bg-warning text-black"
                        }`}>
                        {order.fulfillment_status}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[11px] py-6 tabular-nums text-muted-foreground tracking-tighter">
                  {order.phone || "—"}
                </TableCell>
                <TableCell className="text-center py-6">
                  <div className="flex items-center justify-center gap-1.5">
                    <FraudIndicator order={order} />
                    <button
                      onClick={() => handleCheckFraud(order)}
                      disabled={checkingFraudIds.has(order.id)}
                      className="p-1 hover:text-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {checkingFraudIds.has(order.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3.2 w-3.2" />
                      )}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="py-6 text-[11px] leading-relaxed max-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <span className="truncate block font-medium uppercase tracking-tight" title={order.product || ""}>
                          {primary} {moreCount > 0 && <span className="text-red">+{moreCount}</span>}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[360px] bg-black text-white border-0">
                        <div className="p-2 space-y-1">
                          {lines.map((line, idx) => (
                            <p key={idx} className="text-[10px] uppercase font-bold tracking-widest leading-none">
                              {lines.length === 1 ? formatProductLine(line, order.quantity) : line}
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] text-muted-foreground truncate" title={order.address || ""}>
                      {order.address || "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-6 font-bold text-[13px] tabular-nums pr-8 tracking-tighter">
                  {formatPrice(order.price, order.delivery_rate)}
                </TableCell>
                <TableCell className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleStatusToggle(order)}
                      className={`h-6 px-3 text-[9px] font-black uppercase tracking-[0.2em] border ${order.status === "confirmed"
                        ? "bg-transparent border-success text-success"
                        : "bg-red border-red text-white"
                        }`}
                    >
                      {order.status === "confirmed" ? "Confirmed" : "Hold"}
                    </button>
                    <NotesPopover order={order} onOrderUpdate={onOrderUpdate} />
                  </div>
                </TableCell>
                <TableCell className="text-center py-6 pr-8">
                  <div className="flex flex-col items-center gap-2">
                    {!order.sent_to_courier ? (
                      <button
                        onClick={() => handleSendToCourier(order)}
                        disabled={sendingIds.has(order.id)}
                        className="h-8 w-8 flex items-center justify-center bg-black text-white hover:bg-red transition-colors"
                        title="Dispatch Order"
                      >
                        {sendingIds.has(order.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Truck className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black tabular-nums tracking-widest">{order.consignment_id}</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1 mt-1 ${order.courier_status?.toLowerCase() === "delivered" ? "bg-success text-white" : "bg-black text-white"
                              }`}>
                              {order.courier_status || "DISPATCHED"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-black text-white border-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                              Tracking: {order.tracking_code || "N/A"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
