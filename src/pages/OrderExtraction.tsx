import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Truck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Package,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

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

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function OrderExtraction() {
  const { isAdmin } = useUserRole();
  const [orderText, setOrderText] = useState("");
  const [extractedOrder, setExtractedOrder] = useState<ExtractedOrder | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      const { error } = await supabase.from("products").insert({
        name: newProductName.trim(),
        price: parseFloat(newProductPrice) || 0,
      });
      if (error) throw error;
      toast.success("Product added");
      setNewProductName("");
      setNewProductPrice("");
      setShowAddProduct(false);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add product");
    }
  };

  const updateProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ name: editName.trim(), price: parseFloat(editPrice) || 0 })
        .eq("id", id);
      if (error) throw error;
      toast.success("Product updated");
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update product");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Product deleted");
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    }
  };

  const selectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !extractedOrder) return;
    setExtractedOrder({
      ...extractedOrder,
      product: product.name,
      price: product.price,
    });
  };

  const extractOrderFromText = async () => {
    if (!orderText.trim()) {
      toast.error("Please paste the order text first");
      return;
    }

    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-order-from-text", {
        body: { orderText },
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

  const determineDeliveryCharge = (address: string) => {
    const lowerAddress = address.toLowerCase();
    const dhakaKeywords = [
      "dhaka", "dhanmondi", "gulshan", "banani", "mirpur", "mohammadpur",
      "uttara", "badda", "khilgaon", "motijheel", "paltan", "farmgate",
      "shahbagh", "new market", "azampur", "kurmitola", "tejgaon",
    ];
    const isInsideDhaka = dhakaKeywords.some((k) => lowerAddress.includes(k));
    return {
      charge: isInsideDhaka ? 80 : 120,
      type: (isInsideDhaka ? "inside_dhaka" : "outside_dhaka") as "inside_dhaka" | "outside_dhaka",
    };
  };

  const createOrder = async () => {
    if (!extractedOrder) {
      toast.error("Please extract order details first");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .insert([{
          shopify_order_id: Date.now(),
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
          fulfillment_status: "unfulfilled",
        }]);

      if (error) throw error;

      toast.custom(() => (
        <div className="bg-card border border-border shadow-2xl rounded-xl p-4 flex items-center gap-4 min-w-[300px]">
          <div className="h-10 w-10 rounded-lg bg-[hsl(var(--success)/0.1)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order Created</span>
            <span className="text-sm font-bold text-foreground">{extractedOrder.customer_name}</span>
          </div>
        </div>
      ));

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

  const updateExtractedOrder = (field: keyof ExtractedOrder, value: string | number) => {
    if (!extractedOrder) return;
    const updated = { ...extractedOrder, [field]: value };
    if (field === "address") {
      const { charge, type } = determineDeliveryCharge(value as string);
      updated.delivery_charge = charge;
      updated.location_type = type;
    }
    setExtractedOrder(updated);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            AI-Powered
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Order Extraction</h1>
          <p className="text-sm text-muted-foreground">
            Paste messenger text and let AI extract order details automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Text Input + Products */}
        <div className="space-y-6">
          {/* Text Input Card */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Order Text</h3>
            </div>
            <Textarea
              placeholder="Paste the order message here..."
              value={orderText}
              onChange={(e) => setOrderText(e.target.value)}
              className="min-h-[160px] bg-secondary/50 border-border rounded-lg text-sm placeholder:text-muted-foreground/50 resize-none"
            />
            <PlasticButton
              text="Extract Order Details"
              onClick={extractOrderFromText}
              loading={extracting}
              loadingText="Extracting..."
              className="w-full h-12"
            />
          </div>

          {/* Products Management Card */}
          {isAdmin && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Products</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddProduct(!showAddProduct)}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              <AnimatePresence>
                {showAddProduct && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Product name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="flex-1 h-10 bg-secondary/50 border-border text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="w-24 h-10 bg-secondary/50 border-border text-sm"
                    />
                    <Button size="sm" onClick={addProduct} className="h-10 px-3">
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No products added yet</p>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                    >
                      {editingProduct === product.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 h-8 text-xs bg-secondary/50 border-border"
                          />
                          <Input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-20 h-8 text-xs bg-secondary/50 border-border"
                          />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => updateProduct(product.id)}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingProduct(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">৳{product.price}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingProduct(product.id);
                                setEditName(product.name);
                                setEditPrice(String(product.price));
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Details */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-foreground" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Extracted Details</h3>
            </div>

            {extractedOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Product Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Product</label>
                  <Select onValueChange={selectProduct}>
                    <SelectTrigger className="h-12 bg-secondary/50 border-border rounded-lg">
                      <SelectValue placeholder="Choose a product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ৳{p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Name</label>
                    <Input
                      value={extractedOrder.customer_name}
                      onChange={(e) => updateExtractedOrder("customer_name", e.target.value)}
                      className="h-12 bg-secondary/50 border-border rounded-lg"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                    <Input
                      value={extractedOrder.phone}
                      onChange={(e) => updateExtractedOrder("phone", e.target.value)}
                      className="h-12 bg-secondary/50 border-border rounded-lg"
                      disabled={!manualEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Address</label>
                  <Input
                    value={extractedOrder.address}
                    onChange={(e) => updateExtractedOrder("address", e.target.value)}
                    className="h-12 bg-secondary/50 border-border rounded-lg"
                    disabled={!manualEdit}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</label>
                    <Input
                      value={extractedOrder.product}
                      onChange={(e) => updateExtractedOrder("product", e.target.value)}
                      className="h-12 bg-secondary/50 border-border rounded-lg"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</label>
                    <Input
                      type="number"
                      value={extractedOrder.quantity}
                      onChange={(e) => updateExtractedOrder("quantity", parseInt(e.target.value) || 1)}
                      className="h-12 bg-secondary/50 border-border rounded-lg"
                      disabled={!manualEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price (৳)</label>
                    <Input
                      type="number"
                      value={extractedOrder.price}
                      onChange={(e) => updateExtractedOrder("price", parseInt(e.target.value) || 0)}
                      className="h-12 bg-secondary/50 border-border rounded-lg"
                      disabled={!manualEdit}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Delivery Charge</p>
                      <p className="text-lg font-bold text-foreground">
                        ৳{extractedOrder.delivery_charge}
                        <span className="text-xs text-muted-foreground ml-2">
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
                    className="flex-1 h-12 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    {manualEdit ? "Lock Editing" : "Enable Editing"}
                  </Button>
                  <PlasticButton
                    text="Create Order"
                    onClick={createOrder}
                    loading={creating}
                    loadingText="Creating..."
                    className="flex-1 h-12"
                  />
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-16 rounded-lg bg-secondary/30 border border-border">
                <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-[10px] text-muted-foreground/50 tracking-[0.2em] font-bold uppercase">No data extracted yet</p>
                <p className="text-xs text-muted-foreground mt-1">Paste order text and click extract</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
