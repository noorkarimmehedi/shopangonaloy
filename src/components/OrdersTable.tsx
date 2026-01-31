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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, ShieldCheck } from "lucide-react";

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
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
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

export function OrdersTable({ orders, loading, onStatusUpdate }: OrdersTableProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

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

  const formatPrice = (price: number | null) => {
    if (price === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No orders found. Click "Sync Orders" to fetch from Shopify.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Order #</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Phone</TableHead>
            <TableHead className="font-semibold text-center">Fraud Check</TableHead>
            <TableHead className="font-semibold">Address</TableHead>
            <TableHead className="font-semibold">Product</TableHead>
            <TableHead className="font-semibold text-center">Qty</TableHead>
            <TableHead className="font-semibold text-right">Price</TableHead>
            <TableHead className="font-semibold text-center">Status</TableHead>
            <TableHead className="font-semibold text-center">Confirmed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{order.order_number}</TableCell>
              <TableCell>{order.customer_name || "-"}</TableCell>
              <TableCell className="font-mono text-sm">{order.phone || "-"}</TableCell>
              <TableCell className="text-center">
                <FraudIndicator order={order} />
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={order.address || ""}>
                {order.address || "-"}
              </TableCell>
              <TableCell className="max-w-[150px] truncate" title={order.product || ""}>
                {order.product || "-"}
              </TableCell>
              <TableCell className="text-center">{order.quantity ?? "-"}</TableCell>
              <TableCell className="text-right font-mono">
                {formatPrice(order.price)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={order.status === "confirmed" ? "default" : "secondary"}
                  className={
                    order.status === "confirmed"
                      ? "bg-success text-success-foreground"
                      : "bg-warning text-warning-foreground"
                  }
                >
                  {order.status === "confirmed" ? "Confirmed" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={order.status === "confirmed"}
                  onCheckedChange={() => handleStatusToggle(order)}
                  disabled={updatingIds.has(order.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
