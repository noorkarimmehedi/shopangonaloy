import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck, Truck, Loader2, Search } from "lucide-react";

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
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Not checked yet</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!order.fraud_data) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>No data available (invalid phone or new customer)</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const { total_parcels, total_delivered, total_cancel } = order.fraud_data;
  const deliveryRate = order.delivery_rate ?? 0;

  // Determine risk level based on delivery rate
  let riskLevel: "safe" | "warning" | "danger";
  let RiskIcon: typeof ShieldCheck;
  let riskColor: string;
  let riskLabel: string;

  if (total_parcels === 0) {
    riskLevel = "warning";
    RiskIcon = HelpCircle;
    riskColor = "text-muted-foreground";
    riskLabel = "New Customer";
  } else if (deliveryRate >= 70) {
    riskLevel = "safe";
    RiskIcon = ShieldCheck;
    riskColor = "text-success";
    riskLabel = "Safe";
  } else if (deliveryRate >= 50) {
    riskLevel = "warning";
    RiskIcon = AlertTriangle;
    riskColor = "text-warning";
    riskLabel = "Caution";
  } else {
    riskLevel = "danger";
    RiskIcon = ShieldAlert;
    riskColor = "text-destructive";
    riskLabel = "High Risk";
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex flex-col items-center gap-1">
          <RiskIcon className={`h-5 w-5 ${riskColor}`} />
          <span className={`text-xs font-medium ${riskColor}`}>
            {total_parcels > 0 ? `${deliveryRate.toFixed(0)}%` : "N/A"}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold">{riskLabel}</p>
          <div className="text-sm space-y-1">
            <p>Total Orders: {total_parcels}</p>
            <p className="text-success">Delivered: {total_delivered}</p>
            <p className="text-destructive">Cancelled: {total_cancel}</p>
            {total_parcels > 0 && (
              <p>Delivery Rate: {deliveryRate.toFixed(1)}%</p>
            )}
          </div>
          {order.fraud_data?.apis && Object.keys(order.fraud_data.apis).length > 0 && (
            <div className="border-t pt-2 mt-2">
              <p className="text-xs font-medium mb-1">By Courier:</p>
              {Object.entries(order.fraud_data.apis).map(([courier, data]) => {
                const courierData = data as { total_delivered_parcels: number; total_parcels: number };
                return (
                  <p key={courier} className="text-xs">
                    {courier}: {courierData.total_delivered_parcels}/{courierData.total_parcels}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function OrdersTable({ orders, loading, onStatusUpdate, onOrderUpdate }: OrdersTableProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [checkingFraudIds, setCheckingFraudIds] = useState<Set<string>>(new Set());

  const handleStatusToggle = async (order: Order) => {
    const newStatus = order.status === "confirmed" ? "pending" : "confirmed";
    
    setUpdatingIds((prev) => new Set(prev).add(order.id));
    
    try {
      const { error } = await supabase.functions.invoke("update-order-status", {
        body: { orderId: order.id, status: newStatus },
      });

      if (error) {
        throw error;
      }

      onStatusUpdate(order.id, newStatus);
      toast.success(`Order ${order.order_number} marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
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
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">No orders found. Click "Sync" to fetch from Shopify.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 hover:bg-transparent">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Order</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Customer</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Phone</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-center">Fraud</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Address</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4">Product</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-center">Qty</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-right">Price</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-center">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-center">Courier</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-4 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium py-4">{order.order_number}</TableCell>
              <TableCell className="py-4 text-sm">{order.customer_name || "—"}</TableCell>
              <TableCell className="font-mono text-sm py-4">{order.phone || "—"}</TableCell>
              <TableCell className="text-center py-4">
                <div className="flex items-center justify-center gap-2">
                  <FraudIndicator order={order} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCheckFraud(order)}
                    disabled={checkingFraudIds.has(order.id)}
                    className="h-7 w-7 p-0 hover:bg-muted"
                    title="Check fraud status"
                  >
                    {checkingFraudIds.has(order.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell className="max-w-[180px] truncate py-4 text-sm" title={order.address || ""}>
                {order.address || "—"}
              </TableCell>
              <TableCell className="max-w-[140px] truncate py-4 text-sm" title={order.product || ""}>
                {order.product || "—"}
              </TableCell>
              <TableCell className="text-center py-4 text-sm">{order.quantity ?? "—"}</TableCell>
              <TableCell className="text-right font-mono py-4 text-sm">
                {formatPrice(order.price, order.delivery_rate)}
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex items-center justify-center gap-3">
                  <Switch
                    checked={order.status === "confirmed"}
                    onCheckedChange={() => handleStatusToggle(order)}
                    disabled={updatingIds.has(order.id)}
                  />
                  <span className={`text-xs font-medium min-w-[60px] ${order.status === "confirmed" ? "text-success" : "text-warning"}`}>
                    {order.status === "confirmed" ? "Confirmed" : "Pending"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center py-4">
                {order.sent_to_courier ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-sm font-medium">{order.consignment_id || "—"}</span>
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
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-center py-4">
                {!order.sent_to_courier ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendToCourier(order)}
                    disabled={sendingIds.has(order.id)}
                    className="h-8 text-xs font-medium"
                  >
                    {sendingIds.has(order.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : null}
                    {sendingIds.has(order.id) ? "Sending..." : "Send to Steadfast"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sent</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
