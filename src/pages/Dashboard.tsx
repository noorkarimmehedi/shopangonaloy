import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrdersTable } from "@/components/OrdersTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck, Search, LayoutDashboard, TrendingUp, ArrowRight, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PlasticButton } from "@/components/ui/plastic-button";
import { CartoonButton } from "@/components/ui/cartoon-button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
    // Auto-sync from Shopify on load, then fetch orders
    const autoSync = async () => {
      setSyncing(true);
      try {
        await supabase.functions.invoke("fetch-shopify-orders");
      } catch (e) {
        console.error("Auto-sync failed:", e);
      } finally {
        setSyncing(false);
      }
      await fetchOrders();
    };
    autoSync();

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
        .order("order_number", { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      console.error("Error fetching orders:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">System Error</span>
            <span className="text-sm font-bold text-black">Failed to load orders</span>
          </div>
        </div>
      ));
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-shopify-orders");
      if (error) throw error;
      // Always fetch from DB to include manually created orders
      await fetchOrders();
      if (data) {
        toast.custom((t) => (
          <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
            <div className="h-10 w-10 rounded-xl bg-[#95BF47]/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#95BF47] fill-current">
                <path d="M21.2 8.35c-1.35 0-2.45 1.1-2.45 2.45 0 .25.05.5.1.7L15 15.35c-.2-.05-.45-.1-.7-.1-.25 0-.5.05-.7.1L9.8 11.55c.05-.2.1-.45.1-.7 0-1.35-1.1-2.45-2.45-2.45-1.35 0-2.45 1.1-2.45 2.45 0 .25.05.5.1.7L2.85 15.65c-.2-.05-.45-.1-.7-.1-1.35 0-2.45 1.1-2.45 2.45 0 1.35 1.1 2.45 2.45 2.45 1.35 0 2.45-1.1 2.45-2.45 0-.25-.05-.5-.1-.7L6.3 13.25c.2.05.45.1.7.1.25 0 .5-.05.7-.1l3.8 3.8c-.05.2-.1.45-.1.7 0 1.35 1.1 2.45 2.45 2.45 1.35 0 2.45-1.1 2.45-2.45 0-.25-.05-.5-.1-.7l3.8-3.8c.2.05.45.1.7.1.25 0 .5-.05.7-.1l3.85 3.85c-.05.2-.1.45-.1.7 0 1.35 1.1 2.45 2.45 2.45 1.35 0 2.45-1.1 2.45-2.45 0-.25-.05-.5-.1-.7l3.85-3.85c.2.05.45.1.7.1.25 0 .5-.05.7-.1 1.35 0 2.45-1.1 2.45-2.45 0-1.35-1.1-2.45-2.45-2.45z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Synchronization</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-black">{data.synced} Orders</span>
                <span className="text-xs text-black/50 font-medium">from Shopify</span>
              </div>
            </div>
          </div>
        ));
      }
    } catch (error) {
      console.error("Error syncing orders:", error);
      console.error("Error syncing orders:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Sync Failed</span>
            <span className="text-sm font-bold text-black">Could not sync Shopify</span>
          </div>
        </div>
      ));
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
      await fetchOrders();
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Fraud Analysis</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">{data?.successful ?? 0} Verified</span>
              <span className="text-xs text-black/50 font-medium">of {data?.checked ?? 0}</span>
            </div>
          </div>
        </div>
      ));
    } catch (error) {
      console.error("Error checking fraud:", error);
      console.error("Error checking fraud:", error);
      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Analysis Failed</span>
            <span className="text-sm font-bold text-black">Check fraud status failed</span>
          </div>
        </div>
      ));
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
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 backdrop-blur-xl px-6 h-16">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-black/40">Operations Hub</span>
        </div>

      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-16 space-y-16">
        {/* Hero Section */}
        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black/60 text-[10px] font-bold uppercase tracking-wider"
          >
            <TrendingUp className="w-3 h-3" />
            Workspace Overview
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-6xl font-normal leading-tight"
              >
                Order <span className="italic text-black/30 underline decoration-black/10 transition-colors hover:text-black/60">Logistics</span> Management
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-black/50 max-w-2xl font-light"
              >
                Monitor real-time fulfillment, verify customer delivery rates, and synchronize your ecommerce inventory.
              </motion.p>
            </div>
            <div className="shrink-0">
              <CartoonButton label={syncing ? "Syncing..." : "Sync Orders"} onClick={syncOrders} disabled={syncing || checkingFraud} hasHighlight={false} />
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 border-y border-black/5 divide-x divide-black/5"
        >
          <div className="py-12 px-8 group hover:bg-black/[0.01] transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 group-hover:text-black/40 transition-colors">Total Inventory</span>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-5xl font-light tracking-tighter">{orders.length}</p>
              <span className="text-[10px] font-bold text-black/10">Units</span>
            </div>
          </div>
          <div className="py-12 px-8 group hover:bg-black/[0.01] transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 group-hover:text-black/40 transition-colors">Confirmed</span>
            <div className="mt-2">
              <p className="text-5xl font-light tracking-tighter text-blue-600">{confirmedCount}</p>
            </div>
          </div>
          <div className="py-12 px-8 group hover:bg-black/[0.01] transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 group-hover:text-black/40 transition-colors">Pending</span>
            <div className="mt-2">
              <p className="text-5xl font-light tracking-tighter text-amber-500">{pendingCount}</p>
            </div>
          </div>
          <div className="py-12 px-8 group hover:bg-black/[0.01] transition-colors bg-black/[0.02]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/20 group-hover:text-black/40 transition-colors">Verified Accuracy</span>
            <div className="mt-2 flex items-baseline gap-1">
              <p className="text-5xl font-light tracking-tighter">
                {orders.length > 0 ? Math.round((orders.filter(o => o.fraud_checked).length / orders.length) * 100) : 0}
              </p>
              <span className="text-2xl font-light text-black/20">%</span>
            </div>
          </div>
        </motion.section>

        {/* Orders Card */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-8"
        >
          {/* Section Header with Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-black/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-black"></div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Master Order Log</h3>
              </div>
              <p className="text-xs text-black/30 font-light">Global record of all synchronized Shopify transactions</p>
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 transition-colors group-focus-within:text-black" />
              <Input
                placeholder="Search orders, customers, or phones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 pr-6 bg-[#F8F8F8] border-none rounded-xl text-sm w-full md:w-[400px] transition-all focus-visible:ring-1 focus-visible:ring-black/10"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-[2.5rem] bg-white border border-black/5 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.04)]">
            <OrdersTable
              orders={filteredOrders}
              loading={loading}
              onStatusUpdate={handleStatusUpdate}
              onOrderUpdate={handleOrderUpdate}
            />
          </div>
        </motion.section>
      </main>
    </div>
  );
}
