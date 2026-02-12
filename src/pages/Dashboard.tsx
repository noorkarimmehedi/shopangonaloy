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
      {/* Swiss Minimalist Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-8 h-20">
        <div className="flex items-center gap-6">
          <span className="swiss-label mb-0">System Status</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-success" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={syncOrders}
            disabled={syncing || checkingFraud}
            className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white border border-transparent hover:border-black"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing" : "Sync Database"}
          </Button>
          <Button
            variant="ghost"
            onClick={checkFraud}
            disabled={syncing || checkingFraud}
            className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.2em] bg-black text-white hover:bg-accent hover:border-accent"
          >
            <ShieldCheck className={`h-3.5 w-3.5 mr-2 ${checkingFraud ? "animate-spin" : ""}`} />
            {checkingFraud ? "Verifying..." : "Run Fraud Check"}
          </Button>
        </div>
      </header>

      <div className="p-0"> {/* Continuous Grid Structure */}
        <div className="swiss-grid-container">
          {/* Main Title Block */}
          <div className="swiss-grid-item col-span-12 lg:col-span-8 bg-black text-white">
            <span className="swiss-label text-white/50">Workspace / Analytics</span>
            <h1 className="mt-4">Order Verification <br /> & Performance.</h1>
            <p className="text-sm text-white/60 mt-6 max-w-md font-light leading-relaxed">
              Precision management of Shopify transitions. Real-time fraud detection and fulfillment optimization for the modern commerce environment.
            </p>
          </div>

          {/* Quick Search Block */}
          <div className="swiss-grid-item col-span-12 lg:col-span-4 flex flex-col justify-end">
            <span className="swiss-label">Live Search</span>
            <div className="relative mt-2">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
              <Input
                placeholder="ORDER ID, CUSTOMER, OR PHONE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-12 text-xs font-bold uppercase tracking-widest border-0 border-b border-black focus-visible:ring-0 placeholder:text-black/20 bg-transparent"
              />
            </div>
          </div>

          {/* Stats Bar — Integrated Grid */}
          <div className="swiss-grid-item col-span-6 lg:col-span-3">
            <span className="swiss-label">Total Volume</span>
            <p className="text-6xl font-light tabular-nums leading-none tracking-tighter">
              {orders.length}
            </p>
          </div>
          <div className="swiss-grid-item col-span-6 lg:col-span-3">
            <span className="swiss-label">Confirmed Safe</span>
            <p className="text-6xl font-light tabular-nums leading-none tracking-tighter text-success">
              {confirmedCount}
            </p>
          </div>
          <div className="swiss-grid-item col-span-6 lg:col-span-3">
            <span className="swiss-label">Awaiting Verification</span>
            <p className="text-6xl font-light tabular-nums leading-none tracking-tighter text-red">
              {pendingCount}
            </p>
          </div>
          <div className="swiss-grid-item col-span-6 lg:col-span-3">
            <span className="swiss-label">Verified Security</span>
            <p className="text-6xl font-light tabular-nums leading-none tracking-tighter">
              {orders.filter((o) => o.fraud_checked).length}
            </p>
          </div>

          {/* Table Container */}
          <div className="swiss-grid-item col-span-12 p-0">
            <div className="border-b border-border px-8 py-6 bg-secondary/30 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.3em]">Master Order Registry</h2>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {orders.length} Entries Found
              </span>
            </div>
            <div className="p-0">
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
