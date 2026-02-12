import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrdersTable } from "@/components/OrdersTable";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  notes: string | null;
  fulfillment_status: string | null;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingFraud, setCheckingFraud] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Real-time order update:', payload);
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((order) =>
              order.id === updatedOrder.id ? updatedOrder : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("shopify_order_id", { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-shopify-orders");
      if (error) throw error;
      if (data?.orders) {
        setOrders(data.orders);
        toast.success(`Synced ${data.synced} orders from Shopify`);
      }
    } catch (error) {
      console.error("Error syncing orders:", error);
      toast.error("Failed to sync orders from Shopify");
    } finally {
      setSyncing(false);
    }
  };

  const checkFraud = async () => {
    setCheckingFraud(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-fraud");
      if (error) throw error;
      await fetchOrders();
      toast.success(`Fraud check complete: ${data?.successful ?? 0}/${data?.checked ?? 0} verified`);
    } catch (error) {
      console.error("Error checking fraud:", error);
      toast.error("Failed to check fraud status");
    } finally {
      setCheckingFraud(false);
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
  };

  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const filteredOrders = searchQuery.trim()
    ? orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.phone && o.phone.toLowerCase().includes(q))
      );
    })
    : orders;

  return (
    <>
      {/* Top bar — Rigid Swiss Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-8 h-[80px]">
        <div className="flex items-center gap-4">
          <ShieldCheck className="h-4 w-4" />
          <h2 className="text-xs font-bold uppercase tracking-widest">Control Panel</h2>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={syncOrders}
            disabled={syncing || checkingFraud}
            className="h-[80px] px-8 rounded-none border-l border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <RefreshCw className={`h-3 w-3 mr-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing" : "Sync Data"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkFraud}
            disabled={syncing || checkingFraud}
            className="h-[80px] px-8 rounded-none border-l border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <ShieldCheck className={`h-3 w-3 mr-3 ${checkingFraud ? "animate-spin" : ""}`} />
            {checkingFraud ? "Verifying" : "Fraud Check"}
          </Button>
        </div>
      </header>

      <div className="p-0">
        {/* Page heading — Stark & Bold */}
        <div className="swiss-grid-container">
          <div className="col-span-12 swiss-grid-cell border-b-[2px] border-primary">
            <h1 className="leading-none">Overview</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4 text-muted-foreground">
              {orders.length} ACTIVE ENTRIES / {confirmedCount} CONFIRMED
            </p>
          </div>
        </div>

        {/* Stats Grid — Rigid 4x1 */}
        <div className="swiss-grid-container">
          <div className="col-span-12 md:col-span-3 swiss-grid-cell">
            <p className="swiss-stat-label">Total Volume</p>
            <p className="swiss-stat-value mt-4">{orders.length}</p>
          </div>
          <div className="col-span-12 md:col-span-3 swiss-grid-cell">
            <p className="swiss-stat-label">Confirmed</p>
            <p className="swiss-stat-value mt-4 text-accent">{confirmedCount}</p>
          </div>
          <div className="col-span-12 md:col-span-3 swiss-grid-cell">
            <p className="swiss-stat-label">Pending</p>
            <p className="swiss-stat-value mt-4">{pendingCount}</p>
          </div>
          <div className="col-span-12 md:col-span-3 swiss-grid-cell">
            <p className="swiss-stat-label">Verified</p>
            <p className="swiss-stat-value mt-4">
              {orders.filter((o) => o.fraud_checked).length}
            </p>
          </div>
        </div>

        {/* Orders Table — Integrated into the grid */}
        <div className="swiss-grid-container border-b border-border">
          <div className="col-span-12 border-r border-border">
            {/* Table Search Section */}
            <div className="p-8 flex items-center justify-between border-b border-border">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Inventory Log</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Real-time update stream</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="FILTER BY ID / NAME / PHONE"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-secondary border-none text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Table Component */}
            <div className="bg-background">
              <OrdersTable
                orders={filteredOrders}
                loading={loading}
                onStatusUpdate={handleStatusUpdate}
                onOrderUpdate={handleOrderUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
