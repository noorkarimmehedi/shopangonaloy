import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { OrdersTable } from "@/components/OrdersTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, LogOut, ShieldCheck, Settings, Search } from "lucide-react";
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
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
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
      {/* ── Header ── Swiss precision, sticky */}
      <header className="border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
        <div className="swiss-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo & user */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl !font-normal tracking-tight">Angonaloy</h1>
              <div className="hidden sm:block swiss-divider w-px !h-5 !bg-border/40" />
              <span className="hidden sm:block text-xs text-muted-foreground tracking-wide">
                {user?.email}
              </span>
            </div>

            {/* Actions — tight, minimal */}
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
                {checkingFraud ? "Checking…" : "Fraud"}
              </Button>

              <div className="w-px h-4 bg-border/40 mx-1" />

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="swiss-container py-8 md:py-12 space-y-8">
        {/* ── Stats Row ── Large numbers, tiny labels — Swiss metric */}
        <div className="grid grid-cols-3 gap-4 md:gap-6">
          <div className="swiss-card p-5 md:p-6 hover-lift">
            <p className="swiss-stat-label mb-3">Total Orders</p>
            <p className="swiss-stat-value">{orders.length}</p>
          </div>
          <div className="swiss-card p-5 md:p-6 hover-lift">
            <p className="swiss-stat-label mb-3">Confirmed</p>
            <p className="swiss-stat-value text-success">{confirmedCount}</p>
          </div>
          <div className="swiss-card p-5 md:p-6 hover-lift">
            <p className="swiss-stat-label mb-3">Pending</p>
            <p className="swiss-stat-value text-warning">{pendingCount}</p>
          </div>
        </div>

        {/* ── Orders Section ── */}
        <div className="swiss-card-elevated overflow-hidden">
          {/* Section header */}
          <div className="px-5 md:px-6 py-4 border-b border-border/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Orders</h2>
                <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">
                  Manage, verify &amp; dispatch
                </p>
              </div>
              <div className="relative w-56 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/40 border-transparent focus:border-border focus:bg-card placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-2 md:px-3 pb-3">
            <OrdersTable
              orders={filteredOrders}
              loading={loading}
              onStatusUpdate={handleStatusUpdate}
              onOrderUpdate={handleOrderUpdate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
