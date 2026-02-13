import { useState, useCallback } from "react";
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
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck, Truck, Loader2, Search, NotebookPen, Package, Check, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { generateInvoice } from "@/utils/invoiceGenerator";

import { OrderRow } from "./orders/OrderRow";

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
  fraud_data: any | null;
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

// Local components FraudIndicator and NotesPopover removed as they are now imported from ./orders/

export function OrdersTable({ orders, loading, onStatusUpdate, onOrderUpdate }: OrdersTableProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [checkingFraudIds, setCheckingFraudIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkChecking, setIsBulkChecking] = useState(false);

  const handleStatusToggle = useCallback(async (order: Order) => {
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
  }, [onStatusUpdate]);

  const handleSendToCourier = useCallback(async (order: Order) => {
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
  }, [onOrderUpdate]);

  const handleCheckFraud = useCallback(async (order: Order) => {
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
  }, [onOrderUpdate]);

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

  const toggleSelectOrder = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleGenerateInvoice = useCallback(async (order?: Order) => {
    // If order is passed, generate for just that order.
    // If no order is passed (or check selection), generate for selected.
    // The previous implementation used selectedOrders. 
    // We need to support both single (from row action) and bulk (from header action).

    let targetOrders: Order[] = [];

    if (order) {
      targetOrders = [order];
    } else {
      targetOrders = orders.filter((o) => selectedIds.has(o.id));
    }

    if (targetOrders.length === 0) return;

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

      generateInvoice(targetOrders);

      toast.dismiss(toastId);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Complete</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">{targetOrders.length} Invoices</span>
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
  }, [orders, selectedIds]);

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
      case "in_review":
      case "pending":
        variant = "secondary";
        className = "bg-warning text-warning-foreground";
        break;
      default:
        variant = "outline";
    }

    return (
      <Badge variant={variant} className={className}>
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
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isSelected={selectedIds.has(order.id)}
              onSelect={toggleSelectOrder}
              onStatusUpdate={handleStatusToggle}
              onCheckFraud={handleCheckFraud}
              isCheckingFraud={checkingFraudIds.has(order.id)}
              onOrderUpdate={onOrderUpdate || (() => { })}
              onSendToCourier={handleSendToCourier}
              isSendingToCourier={sendingIds.has(order.id)}
              onGenerateInvoice={handleGenerateInvoice}
            />
          ))}
        </TableBody>
      </Table>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
