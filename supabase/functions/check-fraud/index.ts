import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  
  // Handle Bangladesh country code formats
  if (cleanPhone.startsWith("880")) {
    const afterCountryCode = cleanPhone.slice(3);
    
    if (afterCountryCode.startsWith("01") && afterCountryCode.length === 11) {
      cleanPhone = afterCountryCode;
    } else if (afterCountryCode.startsWith("1") && afterCountryCode.length === 10) {
      cleanPhone = "0" + afterCountryCode;
    }
  }
  
  // Validate Bangladesh number format
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting check-fraud function");

    const fraudCheckerApiKey = Deno.env.get("FRAUD_CHECKER_API_KEY");
    if (!fraudCheckerApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing FRAUD_CHECKER_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a specific orderId was provided (skip sync for single order check)
    let body: { orderId?: string; skipSync?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, do bulk check with sync
    }

    // For bulk fraud check, first sync Shopify orders
    if (!body.orderId && !body.skipSync) {
      console.log("Syncing Shopify orders before fraud check...");
      try {
        // Call the Shopify sync function using the same auth/apikey headers as the incoming request
        // so we don't depend on service-role-key-as-JWT behavior.
        const authHeader =
          req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
        const apikey = req.headers.get("apikey") ?? "";

        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-shopify-orders`, {
          method: "POST",
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(apikey ? { apikey } : {}),
            "Content-Type": "application/json",
          },
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          console.log(`Shopify sync complete: ${syncData.synced || 0} orders synced`);
        } else {
          console.error("Shopify sync failed:", await syncResponse.text());
        }
      } catch (syncError) {
        console.error("Error syncing Shopify orders:", syncError);
        // Continue with fraud check even if sync fails
      }
    }

    if (body.orderId) {
      // Check single order
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, phone, fraud_checked, fraud_data")
        .eq("id", body.orderId)
        .single();

      if (fetchError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!order.phone) {
        return new Response(
          JSON.stringify({ error: "Order has no phone number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { fraudData, deliveryRate } = await checkFraudStatus(order.phone, fraudCheckerApiKey);

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          fraud_checked: true,
          fraud_data: fraudData,
          delivery_rate: deliveryRate,
        })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch updated order
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", body.orderId)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          order: updatedOrder
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bulk check: Fetch the latest 15 orders exactly as shown on the dashboard
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, shopify_order_id, phone, fraud_checked, fraud_data")
      .order("shopify_order_id", { ascending: false })
      .limit(15);

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only check orders that don't have fraud data yet
    const ordersToCheck = (orders || []).filter(o => !o.fraud_data && o.phone);
    console.log(`Found ${ordersToCheck.length} orders to check for fraud (out of ${orders?.length || 0} latest orders)`);

    let checkedCount = 0;
    let successCount = 0;

    for (const order of ordersToCheck) {
      // Add delay between requests to avoid rate limiting
      if (checkedCount > 0) {
        await delay(1500);
      }

      const { fraudData, deliveryRate } = await checkFraudStatus(order.phone, fraudCheckerApiKey);
      checkedCount++;

      // Update order with fraud data
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          fraud_checked: true,
          fraud_data: fraudData,
          delivery_rate: deliveryRate,
        })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Error updating order ${order.id}:`, updateError);
      } else if (fraudData) {
        successCount++;
      }
    }

    console.log(`Fraud check complete: ${successCount}/${checkedCount} successful`);

    // Fetch updated orders
    const { data: allOrders, error: allOrdersError } = await supabase
      .from("orders")
      .select("*")
      .order("shopify_order_id", { ascending: false });

    if (allOrdersError) {
      console.error("Error fetching all orders:", allOrdersError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: checkedCount,
        successful: successCount,
        orders: allOrders || []
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
