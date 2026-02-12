import { useState, useEffect } from "react";
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
    <div className="min-h-screen bg-background">
      <AppSidebar />

      {/* Main content — offset by sidebar width */}
      <main className="ml-[240px] min-h-screen">
        {/* Top bar with actions */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card/90 backdrop-blur-md px-8 h-14">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={syncOrders}
              disabled={syncing || checkingFraud}
              className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkFraud}
              disabled={syncing || checkingFraud}
              className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className={`h-3.5 w-3.5 mr-1.5 ${checkingFraud ? "animate-spin" : ""}`} />
              {checkingFraud ? "Checking…" : "Fraud Check"}
            </Button>
          </div>
        </header>

        <div className="px-8 py-8 space-y-8">
          {/* Page heading */}
          <div>
            <h1 className="!text-2xl !font-semibold tracking-tight">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and verify your orders</p>
          </div>

          {/* Stats row — divided cells like reference */}
          <div className="swiss-card overflow-hidden">
            <div className="grid grid-cols-4 divide-x divide-border/60">
              <div className="px-6 py-5 text-center">
                <p className="swiss-stat-label mb-2">Total</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{orders.length}</p>
              </div>
              <div className="px-6 py-5 text-center">
                <p className="swiss-stat-label mb-2">Confirmed</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums text-success">{confirmedCount}</p>
              </div>
              <div className="px-6 py-5 text-center">
                <p className="swiss-stat-label mb-2">Pending</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums text-warning">{pendingCount}</p>
              </div>
              <div className="px-6 py-5 text-center">
                <p className="swiss-stat-label mb-2">Fraud Checked</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {orders.filter((o) => o.fraud_checked).length}
                </p>
              </div>
            </div>
          </div>

          {/* Orders card */}
          <div className="swiss-card-elevated overflow-hidden">
            {/* Section header with search */}
            <div className="px-6 py-4 border-b border-border/50">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">All Orders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {orders.length} orders in your workspace
                  </p>
                </div>
                <div className="relative w-56 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-muted/40 border-border/60 focus:border-border focus:bg-card placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="pb-1">
              <OrdersTable
                orders={filteredOrders}
                loading={loading}
                onStatusUpdate={handleStatusUpdate}
                onOrderUpdate={handleOrderUpdate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
