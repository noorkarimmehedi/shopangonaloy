import jsPDF from "jspdf";
import { format } from "date-fns";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  product: string | null;
  quantity: number | null;
  price: number | null;
  status: string;
  created_at: string;
  delivery_rate: number | null;
  courier_status?: string | null;
  consignment_id?: number | null;
  tracking_code?: string | null;
}

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildInvoiceHtml = (order: Order) => {
  const invoiceNo = order.order_number.replace("#", "");
  const consignmentId = order.consignment_id;
  const subtotal = order.price || 0;
  const shipping = order.delivery_rate || 0;
  const total = subtotal + shipping;
  const qty = order.quantity || 1;

  return `
    <div style="font-family: 'Noto Sans Bengali', sans-serif; width: 283px; padding: 15px; box-sizing: border-box; color: #000;">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Angonaloy</div>
      
      <div style="font-size: 9px; line-height: 1.6;">
        <div><span style="color: #666;">Invoice No.:</span> <strong>AN-${invoiceNo}</strong></div>
        <div><span style="color: #666;">Invoice Date:</span> <strong>${format(new Date(order.created_at), "MMM dd, yyyy")}</strong></div>
        <div><span style="color: #666;">Courier:</span> <strong>Steadfast</strong></div>
        ${consignmentId != null ? `<div><span style="color: #666;">Delivery ID:</span> <strong>${consignmentId}</strong></div>` : ""}
      </div>

      <div style="margin-top: 10px; font-size: 9px; font-weight: 700;">Invoice To:</div>
      <div style="font-size: 9px; line-height: 1.6; margin-top: 4px;">
        <div>· ${order.customer_name || "Customer"}</div>
        ${order.phone ? `<div>· ${order.phone}</div>` : ""}
        ${order.address ? `<div>· ${order.address}</div>` : ""}
      </div>

      <hr style="border: none; border-top: 1px solid #000; margin: 10px 0 6px;" />

      <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
        <thead>
          <tr style="font-weight: 700; border-bottom: 1px solid #ccc;">
            <td style="padding: 2px 0; width: 60%;">Product</td>
            <td style="padding: 2px 0; width: 15%; text-align: center;">Qty</td>
            <td style="padding: 2px 0; width: 25%; text-align: right;">Price</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 4px 0;">${order.product || "Item"}</td>
            <td style="padding: 4px 0; text-align: center;">${qty}</td>
            <td style="padding: 4px 0; text-align: right;">${formatCurrency(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <hr style="border: none; border-top: 1px solid #ccc; margin: 6px 0;" />

      <div style="font-size: 9px; font-weight: 700;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Sub Total</span><span>${formatCurrency(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Delivery Fee</span><span>${formatCurrency(shipping)}</span>
        </div>
        <hr style="border: none; border-top: 1.5px solid #000; margin: 4px 0;" />
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
          <span>Grand Total</span><span>${formatCurrency(total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px;">
          <span>Due Amount</span><span>${formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  `;
};

const buildInvoicePdf = async (orders: Order[]) => {
  const pageWidth = 75;
  const pageHeight = 100;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  for (let i = 0; i < orders.length; i++) {
    if (i > 0) {
      doc.addPage([pageWidth, pageHeight]);
    }

    const html = buildInvoiceHtml(orders[i]);

    // Create a temporary container for rendering
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    await new Promise<void>((resolve, reject) => {
      doc.html(container.firstElementChild as HTMLElement, {
        callback: () => {
          resolve();
        },
        x: 0,
        y: i * pageHeight * (72 / 25.4), // offset for correct page (points)
        width: pageWidth,
        windowWidth: 283, // matches the div width in px
        autoPaging: false,
      });
    });

    document.body.removeChild(container);
  }

  return doc;
};

export const generateInvoice = async (orders: Order[]) => {
  const doc = await buildInvoicePdf(orders);
  const filename = orders.length > 1
    ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
    : `Invoice_${orders[0].order_number}.pdf`;
  doc.save(filename);
};

export const printInvoice = async (orders: Order[]) => {
  const doc = await buildInvoicePdf(orders);
  doc.autoPrint();
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onafterprint = () => {
      printWindow.close();
      URL.revokeObjectURL(url);
    };
  }
};
