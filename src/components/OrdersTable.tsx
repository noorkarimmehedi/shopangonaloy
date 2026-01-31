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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
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
