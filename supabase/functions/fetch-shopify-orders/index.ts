import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  total_price: string;
  subtotal_price: string;
  total_shipping_price_set?: {
    shop_money?: {
      amount: string;
    };
  };
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    default_address?: {
      address1?: string;
      city?: string;
      province?: string;
      country?: string;
      zip?: string;
    };
  };
  shipping_address?: {
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  };
  note_attributes?: Array<{ name: string; value: string }>;
  line_items?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
}



Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting fetch-shopify-orders function");

    // Get credentials from environment
    const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    const shopifyStoreUrl = Deno.env.get("SHOPIFY_STORE_URL");
    const fraudCheckerApiKey = Deno.env.get("FRAUD_CHECKER_API_KEY");

    if (!shopifyToken || !shopifyStoreUrl) {
      console.error("Missing Shopify credentials");
      return new Response(
        JSON.stringify({ error: "Missing Shopify credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fraudCheckerApiKey) {
      console.warn("Missing FRAUD_CHECKER_API_KEY - fraud checking will be skipped");
    }

    // Clean up store URL - remove protocol and trailing slashes
    const cleanStoreUrl = shopifyStoreUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    console.log(`Fetching orders from store: ${cleanStoreUrl}`);

    // Fetch orders from Shopify Admin API - sorted by created_at desc to get latest first
    const shopifyResponse = await fetch(
      `https://${cleanStoreUrl}/admin/api/2024-10/orders.json?status=any&limit=50&order=created_at+desc`,
      {
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch orders from Shopify", 
          details: errorText,
          status: shopifyResponse.status 
        }),
        { status: shopifyResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopifyData = await shopifyResponse.json();
    const orders: ShopifyOrder[] = shopifyData.orders || [];

    console.log(`Fetched ${orders.length} orders from Shopify`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing orders to preserve fraud data
    const { data: existingOrders } = await supabase
      .from("orders")
      .select("shopify_order_id, fraud_checked, fraud_data, delivery_rate");
    
    const existingOrdersMap = new Map(
      (existingOrders || []).map(o => [o.shopify_order_id, o])
    );

    // Process orders WITHOUT fraud checking (sync only)
    const processedOrders = [];
    
    for (const order of orders) {
      // Extract phone from shipping_address, customer, or note_attributes
      let phone = order.shipping_address?.phone || order.customer?.phone || "";
      
      // Check note_attributes for phone
      if (!phone && order.note_attributes) {
        const phoneAttr = order.note_attributes.find(
          (attr) => attr.name.toLowerCase().includes("phone") || 
                    attr.name.toLowerCase().includes("tel") ||
                    attr.name.toLowerCase().includes("mobile")
        );
        if (phoneAttr) phone = phoneAttr.value;
      }

      // Build address string
      const addr = order.shipping_address || order.customer?.default_address;
      const addressParts = [
        addr?.address1,
        addr?.city,
        addr?.province,
        addr?.country,
        addr?.zip,
      ].filter(Boolean);
      const address = addressParts.join(", ");

      // Get customer name
      const customerName = order.customer
        ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim()
        : "";

      // Get first line item details
      const firstItem = order.line_items?.[0];
      const product = firstItem?.name || "";
      const quantity = firstItem?.quantity || 0;
      
      // Get total price and shipping from Shopify order
      const totalPrice = parseFloat(order.total_price) || 0;
      const shippingPrice = parseFloat(order.total_shipping_price_set?.shop_money?.amount || "0");
      const subtotalPrice = parseFloat(order.subtotal_price) || 0;

      // Preserve existing fraud data if available
      const existingOrder = existingOrdersMap.get(order.id);

      processedOrders.push({
        shopify_order_id: order.id,
        order_number: order.name || `#${order.order_number}`,
        customer_name: customerName,
        phone,
        address,
        product,
        quantity,
        price: subtotalPrice,
        delivery_rate: shippingPrice,
        fraud_checked: existingOrder?.fraud_checked || false,
        fraud_data: existingOrder?.fraud_data || null,
      });
    }

    console.log(`Processing ${processedOrders.length} orders for upsert`);

    // Upsert orders to database (update if exists, insert if new)
    const { data: upsertedOrders, error: upsertError } = await supabase
      .from("orders")
      .upsert(processedOrders, { 
        onConflict: "shopify_order_id",
        ignoreDuplicates: false 
      })
      .select();

    if (upsertError) {
      console.error("Error upserting orders:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save orders", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully upserted ${upsertedOrders?.length || 0} orders`);

    // Fetch all orders from database
    const { data: allOrders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .order("shopify_order_id", { ascending: false });

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orders: allOrders,
        synced: processedOrders.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
