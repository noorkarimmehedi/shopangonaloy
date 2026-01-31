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

interface FraudCheckResponse {
  mobile_number: string;
  total_parcels: number;
  total_delivered: number;
  total_cancel: number;
  apis: Record<string, {
    total_parcels: number;
    total_delivered_parcels: number;
    total_cancelled_parcels: number;
  }>;
}

// Helper function to add delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to check fraud status for a phone number
async function checkFraudStatus(phone: string, apiKey: string): Promise<{ fraudData: FraudCheckResponse | null; deliveryRate: number | null }> {
  if (!phone || !apiKey) {
    return { fraudData: null, deliveryRate: null };
  }

  // Clean phone number - remove non-digits
  let cleanPhone = phone.replace(/\D/g, "");
  
  // Handle Bangladesh country code formats:
  // International format: +880 1XXXXXXXXX (13 digits total) - country code replaces leading 0
  // Local with extra 0: +880 01XXXXXXXXX (14 digits total) - some systems add extra 0
  // Local format: 01XXXXXXXXX (11 digits) - valid as is
  
  if (cleanPhone.startsWith("880")) {
    const afterCountryCode = cleanPhone.slice(3);
    
    if (afterCountryCode.startsWith("01") && afterCountryCode.length === 11) {
      // Format: 880 + 01XXXXXXXXX (14 digits) - just remove country code
      cleanPhone = afterCountryCode;
    } else if (afterCountryCode.startsWith("1") && afterCountryCode.length === 10) {
      // Format: 880 + 1XXXXXXXXX (13 digits) - add leading 0
      cleanPhone = "0" + afterCountryCode;
    }
  }
  
  // Now check if it's a valid Bangladesh number (11 digits starting with 01)
  if (cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
    console.log(`Skipping fraud check for invalid BD number: ${phone} -> ${cleanPhone}`);
    return { fraudData: null, deliveryRate: null };
  }

  try {
    console.log(`Checking fraud status for: ${cleanPhone}`);
    
    const formData = new FormData();
    formData.append("phone", cleanPhone);

    const response = await fetch("https://fraudchecker.link/api/v1/qc/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error(`Fraud API error for ${cleanPhone}: ${response.status}`);
      return { fraudData: null, deliveryRate: null };
    }

    const data: FraudCheckResponse = await response.json();
    
    // Calculate delivery rate
    const deliveryRate = data.total_parcels > 0 
      ? (data.total_delivered / data.total_parcels) * 100 
      : null;

    console.log(`Fraud check result for ${cleanPhone}: ${data.total_delivered}/${data.total_parcels} delivered (${deliveryRate?.toFixed(1)}%)`);

    return { fraudData: data, deliveryRate };
  } catch (error) {
    console.error(`Error checking fraud for ${cleanPhone}:`, error);
    return { fraudData: null, deliveryRate: null };
  }
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

    // Fetch orders from Shopify Admin API
    const shopifyResponse = await fetch(
      `https://${cleanStoreUrl}/admin/api/2024-01/orders.json?status=any&limit=50`,
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

    // Process orders and check fraud status
    const processedOrders = [];
    let fraudCheckCount = 0;
    
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
      const price = firstItem ? parseFloat(firstItem.price) : 0;

      // Check if we already have fraud data for this order
      const existingOrder = existingOrdersMap.get(order.id);
      let fraudData = existingOrder?.fraud_data || null;
      let deliveryRate = existingOrder?.delivery_rate || null;
      let fraudChecked = existingOrder?.fraud_checked || false;

      // Only check fraud if we don't already have data and API key is available
      if (fraudCheckerApiKey && phone && !fraudData) {
        // Add delay between requests to avoid rate limiting (1.5 seconds)
        if (fraudCheckCount > 0) {
          await delay(1500);
        }
        
        const fraudResult = await checkFraudStatus(phone, fraudCheckerApiKey);
        if (fraudResult.fraudData) {
          fraudData = fraudResult.fraudData;
          deliveryRate = fraudResult.deliveryRate;
        }
        fraudChecked = true;
        fraudCheckCount++;
      }

      processedOrders.push({
        shopify_order_id: order.id,
        order_number: order.name || `#${order.order_number}`,
        customer_name: customerName,
        phone,
        address,
        product,
        quantity,
        price,
        fraud_checked: fraudChecked,
        fraud_data: fraudData,
        delivery_rate: deliveryRate,
      });
    }

    console.log(`Checked fraud status for ${fraudCheckCount} new orders`);

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
      .order("created_at", { ascending: false });

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
