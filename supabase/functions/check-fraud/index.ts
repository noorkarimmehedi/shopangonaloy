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

    // Fetch latest 25 orders that haven't been fraud checked or don't have fraud data
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("id, phone, fraud_checked, fraud_data")
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(25);

    if (fetchError) {
      console.error("Error fetching orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch orders", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter orders that need fraud checking
    const ordersToCheck = (orders || []).filter(o => !o.fraud_data && o.phone);
    console.log(`Found ${ordersToCheck.length} orders to check for fraud (out of ${orders?.length || 0})`);

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
      .order("created_at", { ascending: false });

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
