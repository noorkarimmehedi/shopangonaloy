import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { OrdersTable } from "@/components/OrdersTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, LogOut, ShieldCheck, Settings } from "lucide-react";

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
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingFraud, setCheckingFraud] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
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

      // Always re-fetch from DB so the UI order matches the dashboard sorting
      // (shopify_order_id desc) and reflects the latest 15 the fraud check was based on.
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Swiss precision with generous spacing */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="swiss-container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Angonaloy</h1>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={syncOrders}
                disabled={syncing || checkingFraud}
                className="h-9 px-4 font-medium"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={checkFraud}
                disabled={syncing || checkingFraud}
                className="h-9 px-4 font-medium"
              >
                <ShieldCheck className={`h-4 w-4 mr-2 ${checkingFraud ? "animate-spin" : ""}`} />
                {checkingFraud ? "Checking..." : "Fraud Check"}
              </Button>
              <div className="w-px h-6 bg-border/60 mx-1" />
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/settings")}
                  className="h-9 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut}
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Swiss Grid */}
      <main className="swiss-container py-10">
        {/* Stats Row - Minimal Swiss cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="swiss-card p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Total Orders
            </p>
            <p className="text-4xl font-semibold tracking-tight">{orders.length}</p>
          </div>
          <div className="swiss-card p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Confirmed
            </p>
            <p className="text-4xl font-semibold tracking-tight text-success">{confirmedCount}</p>
          </div>
          <div className="swiss-card p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Pending
            </p>
            <p className="text-4xl font-semibold tracking-tight text-warning">{pendingCount}</p>
          </div>
        </div>

        {/* Orders Table - Clean Swiss styling */}
        <div className="swiss-card">
          <div className="px-4 py-4 border-b border-border/60">
            <h2 className="text-lg font-semibold tracking-tight">Order Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage orders, verify customers, and dispatch to courier
            </p>
          </div>
          <div className="p-3">
            <OrdersTable
              orders={orders}
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