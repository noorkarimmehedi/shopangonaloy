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
          <div className="flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-card border-border shadow-lg">
          <p className="text-sm text-muted-foreground">
            {!order.fraud_checked ? "Not checked yet" : "No data available"}
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
              className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                hasNotes 
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
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40 hover:bg-transparent">
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto">Order</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto">Customer</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto">Phone</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto text-center">Fraud</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto">Address</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto">Product</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto text-right">Price</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto text-center">Status</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto text-center">Courier</TableHead>
            <TableHead className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70 py-3 h-auto text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const { primary, moreCount, lines } = productSummary(order);

            return (
              <TableRow key={order.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors group">
              <TableCell className="py-3">
                <span className="font-medium text-xs tabular-nums block">{order.order_number}</span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{format(new Date(order.created_at), "dd MMM yyyy")}</span>
              </TableCell>
              <TableCell className="py-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{order.customer_name || "—"}</span>
                  {order.fulfillment_status === "fulfilled" && (
                    <span className="text-[9px] px-1.5 py-px rounded-full bg-success/10 text-success font-semibold uppercase tracking-wider shrink-0">
                      Fulfilled
                    </span>
                  )}
                  {order.fulfillment_status === "partial" && (
                    <span className="text-[9px] px-1.5 py-px rounded-full bg-warning/10 text-warning font-semibold uppercase tracking-wider shrink-0">
                      Partial
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs py-3 text-muted-foreground">{order.phone || "—"}</TableCell>
              <TableCell className="text-center py-3">
                <div className="flex items-center justify-center gap-1.5">
                  <FraudIndicator order={order} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCheckFraud(order)}
                    disabled={checkingFraudIds.has(order.id)}
                    className="h-6 w-6 p-0 hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Check fraud status"
                  >
                    {checkingFraudIds.has(order.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell className="max-w-[160px] truncate py-3 text-xs text-muted-foreground" title={order.address || ""}>
                {order.address || "—"}
              </TableCell>
                <TableCell className="max-w-[160px] py-3 text-xs">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <span
                        className="block truncate cursor-default"
                        title={order.product || ""}
                      >
                        <span>{primary}</span>
                        {moreCount > 0 && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground/60">+{moreCount}</span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[360px]">
                      {lines.length === 0 ? (
                        <p className="text-sm">—</p>
                      ) : (
                        <div className="space-y-1">
                          {lines.map((line, index) => (
                            <p key={index} className="text-sm">
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
              <TableCell className="text-right font-mono py-3 text-xs tabular-nums">
                {formatPrice(order.price, order.delivery_rate)}
              </TableCell>
              <TableCell className="text-center py-3">
                <div className="flex items-center justify-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className={`h-7 w-[76px] text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
                          order.status === "confirmed"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {order.status === "confirmed" ? "Confirmed" : "Pending"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[96px] p-1" align="center">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            if (order.status !== "pending") handleStatusToggle(order);
                          }}
                          className={`h-7 w-full text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                            order.status === "pending"
                              ? "bg-warning/10 text-warning"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => {
                            if (order.status !== "confirmed") handleStatusToggle(order);
                          }}
                          className={`h-7 w-full text-[10px] font-semibold uppercase tracking-wider rounded-md transition-colors ${
                            order.status === "confirmed"
                              ? "bg-success/10 text-success"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          Confirmed
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <NotesPopover order={order} onOrderUpdate={onOrderUpdate} />
                </div>
              </TableCell>
              <TableCell className="text-center py-3">
                {order.sent_to_courier ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-xs font-medium tabular-nums">{order.consignment_id || "—"}</span>
                        {getCourierStatusBadge(order)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm space-y-1">
                        <p><strong>Consignment ID:</strong> {order.consignment_id || "N/A"}</p>
                        <p><strong>Tracking:</strong> {order.tracking_code || "N/A"}</p>
                        {order.courier_message && <p>{order.courier_message}</p>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground/40 text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-center py-3">
                {!order.sent_to_courier ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendToCourier(order)}
                    disabled={sendingIds.has(order.id)}
                    className="h-7 text-[10px] font-medium tracking-wide px-3 border-border/40 hover:bg-muted/60"
                  >
                    {sendingIds.has(order.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {sendingIds.has(order.id) ? "Sending…" : "Send"}
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Sent</span>
                )}
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
