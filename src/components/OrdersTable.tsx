import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
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
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck, Truck, Loader2, Search, NotebookPen, Package, Check, FileText, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateInvoice, printInvoice } from "@/utils/invoiceGenerator";

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
  if (!order.fraud_checked) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-card border-border shadow-lg">
          <p className="text-sm text-muted-foreground">Not checked yet</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!order.fraud_data) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive/70" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-card border-border shadow-lg p-3 max-w-[250px]">
          <p className="text-sm font-medium text-destructive">API Error</p>
          <p className="text-xs text-muted-foreground mt-1">
            FraudShield API couldn't be reached. Click the check button to retry.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const { total_parcels, total_delivered, total_cancel } = order.fraud_data;

  // Calculate delivery rate from fraud_data directly (not from order.delivery_rate which is shipping cost)
  const deliveryRate = total_parcels > 0
    ? (total_delivered / total_parcels) * 100
    : 0;

  // Determine risk level based on delivery rate
  let RiskIcon: typeof ShieldCheck;
  let riskColor: string;
  let riskBgColor: string;
  let riskLabel: string;

  if (total_parcels === 0) {
    RiskIcon = HelpCircle;
    riskColor = "text-muted-foreground";
    riskBgColor = "bg-muted/50";
    riskLabel = "New Customer";
  } else if (deliveryRate >= 70) {
    RiskIcon = ShieldCheck;
    riskColor = "text-emerald-600";
    riskBgColor = "bg-emerald-50";
    riskLabel = "Safe";
  } else if (deliveryRate >= 50) {
    RiskIcon = AlertTriangle;
    riskColor = "text-amber-600";
    riskBgColor = "bg-amber-50";
    riskLabel = "Caution";
  } else {
    RiskIcon = ShieldAlert;
    riskColor = "text-red-600";
    riskBgColor = "bg-red-50";
    riskLabel = "High Risk";
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger>
        <div className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md ${riskBgColor} transition-colors`}>
          <RiskIcon className={`h-3.5 w-3.5 ${riskColor}`} />
          <span className={`text-[10px] font-semibold tabular-nums ${riskColor}`}>
            {total_parcels > 0 ? `${deliveryRate.toFixed(0)}%` : "N/A"}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        className="w-72 p-0 bg-card border-border shadow-xl rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className={`px-4 py-3 ${riskBgColor} border-b border-border/50`}>
          <div className="flex items-center gap-2">
            <RiskIcon className={`h-5 w-5 ${riskColor}`} />
            <span className={`font-semibold ${riskColor}`}>{riskLabel}</span>
          </div>
          {total_parcels > 0 && (
            <p className="text-2xl font-bold mt-1 text-foreground">
              {deliveryRate.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">delivery rate</span>
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total_parcels}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{total_delivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{total_cancel}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>

          {/* Progress bar */}
          {total_parcels > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Delivery Success</span>
                <span>{total_delivered}/{total_parcels}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${deliveryRate}%` }}
                />
              </div>
            </div>
          )}

          {/* Courier breakdown */}
          {order.fraud_data?.apis && Object.keys(order.fraud_data.apis).length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">By Courier</p>
              <div className="space-y-1.5">
                {Object.entries(order.fraud_data.apis).map(([courier, data]) => {
                  const courierData = data as { total_delivered_parcels: number; total_parcels: number };
                  const courierRate = courierData.total_parcels > 0
                    ? (courierData.total_delivered_parcels / courierData.total_parcels) * 100
                    : 0;
                  return (
                    <div key={courier} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{courier}</span>
                      <span className="font-mono text-muted-foreground">
                        {courierData.total_delivered_parcels}/{courierData.total_parcels}
                        {courierData.total_parcels > 0 && (
                          <span className="ml-1 text-xs">({courierRate.toFixed(0)}%)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
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

export function OrdersTable({ orders, loading, onStatusUpdate, onOrderUpdate }: OrdersTableProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [checkingFraudIds, setCheckingFraudIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkChecking, setIsBulkChecking] = useState(false);
  const [isDeletingOrders, setIsDeletingOrders] = useState(false);

  // Build phone frequency map to detect repeat customers
  const phoneOrderCount = new Map<string, number>();
  orders.forEach((order) => {
    if (order.phone) {
      const phone = order.phone.trim();
      phoneOrderCount.set(phone, (phoneOrderCount.get(phone) || 0) + 1);
    }
  });

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
      console.error("Error updating order status:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Update Failed</span>
            <span className="text-sm font-bold text-black">Could not save status</span>
          </div>
        </div>
      ));
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
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Courier Dispatched</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">Order {order.order_number}</span>
              <span className="text-xs text-black/50 font-medium">Sent to Steadfast</span>
            </div>
          </div>
        </div>
      ));
    } catch (error) {
      console.error("Error sending to courier:", error);
      console.error("Error sending to courier:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Courier Error</span>
            <span className="text-sm font-bold text-black">Failed to send order</span>
          </div>
        </div>
      ));
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
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Fraud Analysis</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">Order {order.order_number}</span>
              <span className="text-xs text-black/50 font-medium">Verified</span>
            </div>
          </div>
        </div>
      ));
    } catch (error) {
      console.error("Error checking fraud:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Analysis Failed</span>
            <span className="text-sm font-bold text-black">Check fraud status failed</span>
          </div>
        </div>
      ));
    } finally {
      setCheckingFraudIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleBulkFraudCheck = async () => {
    if (selectedIds.size === 0 || isBulkChecking) return;

    setIsBulkChecking(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;

    try {
      for (const id of ids) {
        setCheckingFraudIds(prev => new Set(prev).add(id));
        try {
          const { data, error } = await supabase.functions.invoke("check-fraud", {
            body: { orderId: id },
          });

          if (!error && !data?.error && data?.order && onOrderUpdate) {
            onOrderUpdate(data.order);
            successCount++;
          }
        } catch (err) {
          console.error(`Fraud check failed for order ${id}:`, err);
        } finally {
          setCheckingFraudIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }

      if (successCount > 0) {
        toast.custom((t) => (
          <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Bulk Analysis</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-black">{successCount} Orders</span>
                <span className="text-xs text-black/50 font-medium">Verified Successfully</span>
              </div>
            </div>
          </div>
        ));
      }
      setSelectedIds(new Set());
    } finally {
      setIsBulkChecking(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length && orders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerateInvoice = async () => {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    if (selectedOrders.length === 0) return;

    // Show loading toast
    const toastId = toast.custom((t) => (
      <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
        <div className="h-10 w-10 rounded-xl bg-black/[0.03] flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 text-black animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Processing</span>
          <span className="text-sm font-bold text-black">Generating Invoices...</span>
        </div>
      </div>
    ), { duration: Infinity }); // Keep open until done

    try {
      // Small delay to ensure UI renders before heavy PDF gen blocks thread
      await new Promise(resolve => setTimeout(resolve, 100));

      await generateInvoice(selectedOrders);

      toast.dismiss(toastId);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Complete</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">{selectedOrders.length} Invoices</span>
              <span className="text-xs text-black/50 font-medium">Generated</span>
            </div>
          </div>
        </div>
      ));
    } catch (error) {
      console.error("Invoice generation failed:", error);
      toast.dismiss(toastId);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Error</span>
            <span className="text-sm font-bold text-black">Failed to generate PDF</span>
          </div>
        </div>
      ));
    }
  };

  const handlePrintInvoice = async () => {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    if (selectedOrders.length === 0) return;
    try {
      await printInvoice(selectedOrders);
    } catch (error) {
      console.error("Print failed:", error);
      toast.error("Failed to print invoices");
    }
  };

  const handleDeleteOrders = async () => {
    if (selectedIds.size === 0 || isDeletingOrders) return;

    setIsDeletingOrders(true);
    const idsToDelete = Array.from(selectedIds);

    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      // Update parent component by removing deleted orders
      if (onOrderUpdate) {
        // Remove each deleted order from the list
        idsToDelete.forEach(id => {
          const order = orders.find(o => o.id === id);
          if (order) {
            // We'll trigger a refetch by updating with null or similar
            // But since we can't directly remove from parent, we'll rely on the parent to refetch
          }
        });
      }

      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Deleted</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">{idsToDelete.length} Orders</span>
              <span className="text-xs text-black/50 font-medium">Removed from Dashboard</span>
            </div>
          </div>
        </div>
      ));

      // Clear selection
      setSelectedIds(new Set());

      // Force a page reload to refresh the orders list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Delete Failed</span>
            <span className="text-sm font-bold text-black">Could not delete orders</span>
          </div>
        </div>
      ));
    } finally {
      setIsDeletingOrders(false);
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

  const getCourierStatusBadge = (order: Order) => {
    if (!order.sent_to_courier) {
      return null;
    }

    const status = order.courier_status?.toLowerCase();
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "";

    switch (status) {
      case "delivered":
        variant = "default";
        className = "bg-success text-success-foreground";
        break;
      case "cancelled":
        variant = "destructive";
        break;
      case "pending":
        variant = "secondary";
        className = "bg-warning text-warning-foreground";
        break;
      default:
        variant = "outline";
    }

    return (
      <Badge
        variant={variant}
        className={cn("h-7 px-3 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap", className)}
      >
        {order.courier_status || "Sent"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-12 w-full rounded-2xl bg-black/[0.02]" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white">
        <Package className="w-12 h-12 text-black/5 mx-auto mb-4" />
        <p className="text-[10px] text-black/20 tracking-[0.2em] font-bold uppercase">No records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-black/[0.03] hover:bg-transparent">
            <TableHead className="w-12 py-5 pl-10 h-auto">
              <div
                onClick={toggleSelectAll}
                className={cn(
                  "w-4 h-4 rounded border border-black/10 flex items-center justify-center cursor-pointer transition-all",
                  selectedIds.size === orders.length && orders.length > 0 ? "bg-black border-black" : "bg-white hover:border-black/30"
                )}
              >
                {selectedIds.size === orders.length && orders.length > 0 && <Check className="w-3 h-3 text-white" />}
              </div>
            </TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto">Ref</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto">Customer</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto text-center">Trust</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto">Destination</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto">Merchandise</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto text-right">Value</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto text-center">Status</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/30 py-5 h-auto text-center pr-10">Logistics</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {orders.map((order, idx) => {
              const { primary, moreCount, lines } = productSummary(order);

              return (
                <TableRow
                  key={order.id}
                  className={cn(
                    "border-b border-black/[0.02] hover:bg-black/[0.01] transition-colors group relative",
                    selectedIds.has(order.id) && "bg-black/[0.015]"
                  )}
                >
                  <TableCell className="w-12 py-5 pl-10">
                    <div
                      onClick={() => toggleSelectOrder(order.id)}
                      className={cn(
                        "w-4 h-4 rounded border border-black/10 flex items-center justify-center cursor-pointer transition-all",
                        selectedIds.has(order.id) ? "bg-black border-black shadow-sm" : "bg-white group-hover:border-black/30"
                      )}
                    >
                      {selectedIds.has(order.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[13px] tracking-tight">{order.order_number}</span>
                      {order.fulfillment_status === "fulfilled" && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase tracking-wider">Fulfilled</span>
                      )}
                      {order.fulfillment_status === "partial" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-bold uppercase tracking-wider">Partial</span>
                      )}
                      {order.fulfillment_status === "restocked" && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[8px] font-bold uppercase tracking-wider">Cancelled</span>
                      )}
                    </div>
                    <span className="text-[10px] text-black/20 font-medium uppercase tracking-wider">{format(new Date(order.created_at), "MMM dd, yyyy")}</span>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm tracking-tight">{order.customer_name || "Guest User"}</span>
                        {order.phone && (phoneOrderCount.get(order.phone.trim()) || 0) > 1 && (
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider cursor-default">
                                ×{phoneOrderCount.get(order.phone.trim())}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              This number has {phoneOrderCount.get(order.phone.trim())} orders
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-black">{order.phone || "No Phone"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-5">
                    <div className="flex items-center justify-center gap-2">
                      <FraudIndicator order={order} />
                      <button
                        onClick={() => handleCheckFraud(order)}
                        disabled={checkingFraudIds.has(order.id)}
                        className="p-1.5 rounded-lg bg-black/[0.03] text-black/20 hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        {checkingFraudIds.has(order.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] py-5">
                    <p className="text-xs text-black/40 font-light truncate" title={order.address || ""}>
                      {order.address || "Digital Delivery"}
                    </p>
                  </TableCell>
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
                  <TableCell className="text-right py-5 pr-4 tabular-nums">
                    <span className="font-medium text-sm">৳{((order.price || 0) + (order.delivery_rate || 0)).toLocaleString()}</span>
                  </TableCell>
                  <TableCell className="text-center py-5">
                    <div className="flex items-center justify-center gap-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              "h-8 w-24 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all border shadow-sm",
                              order.status === "confirmed"
                                ? "bg-blue-50 border-blue-100 text-blue-600 shadow-blue-900/5"
                                : "bg-amber-50 border-amber-100 text-amber-600 shadow-amber-900/5"
                            )}
                          >
                            {order.status}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[140px] p-2 bg-white/95 backdrop-blur-xl border border-black/5 rounded-2xl shadow-2xl" align="center">
                          <div className="flex flex-col gap-1">
                            {["pending", "confirmed"].map((st) => (
                              <button
                                key={st}
                                onClick={() => {
                                  if (order.status !== st) handleStatusToggle(order);
                                }}
                                className={cn(
                                  "h-9 w-full text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all text-left px-3",
                                  order.status === st
                                    ? "bg-black text-white"
                                    : "hover:bg-black/5 text-black/40"
                                )}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <NotesPopover order={order} onOrderUpdate={onOrderUpdate} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-5 pr-10">
                    <div className="flex items-center justify-center gap-2">
                      {!order.sent_to_courier ? (
                        <PlasticButton
                          text="Send to steadfast"
                          loadingText="Syncing..."
                          loading={sendingIds.has(order.id)}
                          onClick={() => handleSendToCourier(order)}
                          className="h-7 px-3 text-[9px] font-bold uppercase tracking-widest bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="inline-flex items-center gap-2 px-3 py-2 mx-0.5 rounded-lg bg-black/[0.03] border border-black/5 group-hover:border-black/10 transition-all whitespace-nowrap">
                            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-black/30">REF</span>
                            <span className="text-[15px] font-mono font-bold text-black tracking-tight">{order.consignment_id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
        
        </TableBody>
      </Table>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]"
          >
            <div className="bg-black text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-8 backdrop-blur-xl border border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Selection</span>
                <span className="text-sm font-medium">{selectedIds.size} Orders Selected</span>
              </div>

              <div className="h-8 w-px bg-white/10" />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <PlasticButton
                  text="Delete Orders"
                  icon={Trash2}
                  loading={isDeletingOrders}
                  loadingText="Deleting..."
                  onClick={handleDeleteOrders}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.4)]"
                />
                <PlasticButton
                  text="Bulk Fraud Check"
                  loading={isBulkChecking}
                  loadingText="Checking..."
                  onClick={handleBulkFraudCheck}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-gradient-to-b from-white to-zinc-300 !text-black shadow-[0_4px_20px_-4px_rgba(255,255,255,0.2)]"
                />
                <PlasticButton
                  text="Generate Invoice"
                  icon={FileText}
                  onClick={handleGenerateInvoice}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 border border-white/10"
                />
                <PlasticButton
                  text="Print"
                  icon={Printer}
                  onClick={handlePrintInvoice}
                  className="h-10 px-6 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 border border-white/10"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
