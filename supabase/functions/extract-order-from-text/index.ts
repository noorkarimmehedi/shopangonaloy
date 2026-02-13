import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderExtractionRequest {
  orderText: string;
}

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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderText }: OrderExtractionRequest = await req.json()

    if (!orderText) {
      return new Response(
        JSON.stringify({ error: 'Order text is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // AI-powered order extraction logic
    const extractedOrder = extractOrderDetails(orderText)

    return new Response(
      JSON.stringify({ extractedOrder }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function extractOrderDetails(orderText: string): ExtractedOrder {
  const text = orderText.toLowerCase()
  
  // Extract customer name
  const namePatterns = [
    /(?:my name is|i am|i'm)\s+([a-z\s]+)/i,
    /name[:\s]+([a-z\s]+)/i,
    /^([a-z\s]+)\s+(?:want|order|need)/i
  ]
  
  let customerName = 'Unknown Customer'
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      customerName = match[1].trim().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
      break
    }
  }

  // Extract phone number
  const phonePatterns = [
    /(?:phone|mobile|contact|number)[:\s]*(?:\+88)?01[3-9]\d{8}/gi,
    /(?:\+88)?01[3-9]\d{8}/g
  ]
  
  let phone = ''
  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      phone = match[0].replace(/[^\d+]/g, '')
      break
    }
  }

  // Extract address
  const addressPatterns = [
    /(?:address|delivery|location)[:\s]+([^,.]+(?:\s+(?:road|street|house|block|sector|dhaka|dhanmondi|gulshan|banani|mirpur|uttara|badda|khilgaon|motijheel|paltan|farmgate|shahbagh))*)/i,
    /(?:house|road|street|block|sector)\s+[^,.]+/i
  ]
  
  let address = 'No address provided'
  for (const pattern of addressPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      address = match[1].trim()
      break
    }
  }

  // Extract product
  const productPatterns = [
    /(?:order|want|need|buy|get)\s+(\d+)\s+(.+?)(?:\s+(?:taka|tk|৳|price|cost))?/i,
    /(\d+)\s+(.+?)(?:\s+(?:taka|tk|৳|price|cost))?/i
  ]
  
  let product = 'Unknown Product'
  let quantity = 1
  let price = 0

  for (const pattern of productPatterns) {
    const match = text.match(pattern)
    if (match) {
      quantity = parseInt(match[1]) || 1
      product = match[2].trim()
      break
    }
  }

  // Extract price
  const pricePatterns = [
    /(?:price|cost|rate|taka|tk|৳)\s*[:\s]*\s*(\d+)/i,
    /(\d+)\s*(?:taka|tk|৳)/i
  ]
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern)
    if (match) {
      price = parseInt(match[match.length - 1]) || 0
      break
    }
  }

  // Determine delivery charge based on address
  const dhakaKeywords = [
    'dhaka', 'dhanmondi', 'gulshan', 'banani', 'mirpur', 'mohammadpur',
    'uttara', 'badda', 'khilgaon', 'motijheel', 'paltan', 'farmgate',
    'shahbagh', 'new market', 'azampur', 'kurmitola', 'tejgaon'
  ]
  
  const isInsideDhaka = dhakaKeywords.some(keyword => address.toLowerCase().includes(keyword))
  const deliveryCharge = isInsideDhaka ? 80 : 120
  const locationType = isInsideDhaka ? 'inside_dhaka' : 'outside_dhaka'

  return {
    customer_name: customerName,
    phone: phone || 'No phone found',
    address: address,
    product: product,
    quantity: quantity,
    price: price,
    delivery_charge: deliveryCharge,
    location_type: locationType
  }
}
