import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  CheckCircle2,
  Loader2,
  Sparkles,
  Package
} from "lucide-react";

interface ExtractedOrder {
  customer_name: string;
  phone: string;
  address: string;
  product: string;
  quantity: number;
  price: number;
  delivery_charge: number;
  location_type: "inside_dhaka" | "outside_dhaka";
}

export default function OrderExtraction() {
  const [orderText, setOrderText] = useState("");
  const [extractedOrder, setExtractedOrder] = useState<ExtractedOrder | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);

  const extractOrderFromText = async () => {
    if (!orderText.trim()) {
      toast.error("Please paste the order text first");
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-order-from-text", {
        body: { orderText }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.extractedOrder) {
        setExtractedOrder(data.extractedOrder);
        toast.success("Order details extracted successfully!");
      }
    } catch (error) {
      console.error("Error extracting order:", error);
      toast.error("Failed to extract order details");
    } finally {
      setExtracting(false);
    }
  };

  const determineDeliveryCharge = (address: string): { charge: number; type: "inside_dhaka" | "outside_dhaka" } => {
    const lowerAddress = address.toLowerCase();
    const dhakaKeywords = [
      "dhaka", "dhanmondi", "gulshan", "banani", "mirpur", "mohammadpur",
      "uttara", "badda", "khilgaon", "motijheel", "paltan", "farmgate",
      "shahbagh", "new market", "azampur", "kurmitola", "tejgaon"
    ];
    
    const isInsideDhaka = dhakaKeywords.some(keyword => lowerAddress.includes(keyword));
    
    return {
      charge: isInsideDhaka ? 80 : 120,
      type: isInsideDhaka ? "inside_dhaka" : "outside_dhaka"
    };
  };

  const createOrder = async () => {
    if (!extractedOrder) {
      toast.error("Please extract order details first");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .insert([{
          shopify_order_id: Date.now(), // Temporary ID
          order_number: `MAN-${Date.now()}`,
          customer_name: extractedOrder.customer_name,
          phone: extractedOrder.phone,
          address: extractedOrder.address,
          product: extractedOrder.product,
          quantity: extractedOrder.quantity,
          price: extractedOrder.price,
          delivery_rate: extractedOrder.delivery_charge,
          status: "pending",
          fraud_checked: false,
          fulfillment_status: "unfulfilled"
        }])
        .select()
        .single();

      if (error) throw error;

      toast.custom((t) => (
        <div className="bg-white border border-black/5 shadow-2xl rounded-2xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Order Created</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-black">{extractedOrder.customer_name}</span>
              <span className="text-xs text-black/50 font-medium">added to dashboard</span>
            </div>
          </div>
        </div>
      ));

      // Reset form
      setOrderText("");
      setExtractedOrder(null);
      setManualEdit(false);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setCreating(false);
    }
  };

  const updateExtractedOrder = (field: keyof ExtractedOrder, value: any) => {
    if (!extractedOrder) return;
    
    const updated = { ...extractedOrder, [field]: value };
    
    // Recalculate delivery charge if address changed
    if (field === "address") {
      const { charge, type } = determineDeliveryCharge(value);
      updated.delivery_charge = charge;
      updated.location_type = type;
    }
    
    setExtractedOrder(updated);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 backdrop-blur-xl px-6 h-16">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-black/40">Order Extraction</span>
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
            <Sparkles className="w-3 h-3" />
            AI-Powered Processing
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl lg:text-6xl font-normal leading-tight"
              >
                Order <span className="italic text-black/30 underline decoration-black/10 transition-colors hover:text-black/60">Extraction</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-black/50 max-w-2xl font-light"
              >
                Paste messenger or social media order text and let AI extract customer details, delivery location, and calculate charges automatically.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-8 lg:grid-cols-2"
        >
          {/* Input Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-black"></div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Order Text Input</h3>
              </div>
              <p className="text-xs text-black/30 font-light">Paste the complete order text from messenger or social media</p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Paste the order message here... Example: 'Hi, I want to order 2 t-shirts. My name is Rahim, phone: 01712345678, address: House 12, Road 5, Dhanmondi, Dhaka'"
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                className="min-h-[200px] bg-[#F8F8F8] border-none rounded-2xl text-base placeholder:text-black/20 focus-visible:ring-1 focus-visible:ring-black/10 resize-none"
              />

              <PlasticButton
                text="Extract Order Details"
                onClick={extractOrderFromText}
                loading={extracting}
                loadingText="Extracting..."
                className="w-full px-6 h-14"
              />
            </div>
          </div>

          {/* Extracted Details Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-black"></div>
                <h3 className="text-sm font-bold uppercase tracking-widest">Extracted Details</h3>
              </div>
              <p className="text-xs text-black/30 font-light">Review and edit extracted information before creating order</p>
            </div>

            {extractedOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Customer Name</label>
                    <Input
                      value={extractedOrder.customer_name}
                      onChange={(e) => updateExtractedOrder("customer_name", e.target.value)}
                      className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Phone Number</label>
                    <Input
                      value={extractedOrder.phone}
                      onChange={(e) => updateExtractedOrder("phone", e.target.value)}
                      className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                      disabled={!manualEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Delivery Address</label>
                  <Input
                    value={extractedOrder.address}
                    onChange={(e) => updateExtractedOrder("address", e.target.value)}
                    className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                    disabled={!manualEdit}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Product</label>
                    <Input
                      value={extractedOrder.product}
                      onChange={(e) => updateExtractedOrder("product", e.target.value)}
                      className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Quantity</label>
                    <Input
                      type="number"
                      value={extractedOrder.quantity}
                      onChange={(e) => updateExtractedOrder("quantity", parseInt(e.target.value) || 1)}
                      className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider">Price (৳)</label>
                    <Input
                      type="number"
                      value={extractedOrder.price}
                      onChange={(e) => updateExtractedOrder("price", parseInt(e.target.value) || 0)}
                      className="h-14 bg-[#F8F8F8] border-none rounded-2xl"
                      disabled={!manualEdit}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black/[0.02] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-black/40" />
                    <div>
                      <p className="text-xs font-medium text-black/60">Delivery Charge</p>
                      <p className="text-lg font-bold text-black">
                        ৳{extractedOrder.delivery_charge}
                        <span className="text-xs text-black/40 ml-2">
                          ({extractedOrder.location_type === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setManualEdit(!manualEdit)}
                    className="flex-1 h-14 text-sm font-medium text-black/50 hover:text-black hover:bg-black/[0.03] rounded-2xl"
                  >
                    {manualEdit ? "Lock Editing" : "Enable Editing"}
                  </Button>
                  <PlasticButton
                    text="Create Order"
                    onClick={createOrder}
                    loading={creating}
                    loadingText="Creating..."
                    className="flex-1 px-6 h-14"
                  />
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-black/5">
                <Package className="w-12 h-12 text-black/5 mx-auto mb-4" />
                <p className="text-[10px] text-black/20 tracking-[0.2em] font-bold uppercase">No data extracted yet</p>
                <p className="text-xs text-black/30 mt-2">Paste order text and click extract to begin</p>
              </div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
