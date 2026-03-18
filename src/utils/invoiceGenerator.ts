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

export const generateInvoice = (orders: Order[]) => {
  // Receipt-style small label: ~80mm x ~120mm (similar to thermal/shipping label)
  const pageWidth = 80;
  const pageHeight = 120;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  const margin = 4;
  const contentWidth = pageWidth - margin * 2;

  orders.forEach((order, index) => {
    if (index > 0) {
      doc.addPage([pageWidth, pageHeight]);
    }

    let y = margin + 2;

    // --- Brand Name ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Angonaloy", margin, y);
    y += 5;

    // --- Invoice Details ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const invoiceNo = order.order_number.replace("#", "");

    doc.text(`Invoice No.: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(`AN-${invoiceNo}`, margin + 16, y);
    y += 3.5;

    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Date: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(order.created_at), "MMM dd, yyyy"), margin + 16, y);
    y += 3.5;

    doc.setFont("helvetica", "normal");
    doc.text(`Courier: `, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text("Steadfast", margin + 16, y);
    y += 3.5;

    const consignmentId = order.consignment_id ?? (order as any).consignment_id;
    if (consignmentId != null) {
      const boxX = margin;
      const boxW = contentWidth;
      const boxH = 12;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(boxX, y, boxW, boxH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`Delivery ID:`, boxX + 2, y + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(String(consignmentId), boxX + 2, y + 10);
      doc.setFontSize(7);
      y += boxH + 2;
    }

    y += 2;

    // --- Invoice To ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Invoice To:", margin, y);
    y += 4;

    doc.setFontSize(7);
    // Name with icon
    doc.setFont("helvetica", "normal");
    doc.text("\u00B7", margin, y); // bullet
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_name || "Customer", margin + 3, y);
    y += 3.5;

    // Phone
    if (order.phone) {
      doc.text("\u00B7", margin, y);
      doc.text(order.phone, margin + 3, y);
      y += 3.5;
    }

    // Address
    if (order.address) {
      doc.text("\u00B7", margin, y);
      const addressLines = doc.splitTextToSize(order.address, contentWidth - 5);
      doc.text(addressLines, margin + 3, y);
      y += addressLines.length * 3.5;
    }

    y += 3;

    // --- Divider line ---
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    // --- Table Header ---
    const col1X = margin;
    const col2X = margin + 42;
    const col3X = margin + 52;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Product", col1X, y);
    doc.text("Qty", col2X, y);
    doc.text("Price", col3X, y, { align: "left" });
    y += 1;

    // Header underline
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    // --- Product Row ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const productName = order.product || "Item";
    const productLines = doc.splitTextToSize(productName, 38);
    doc.text(productLines, col1X, y);

    const qty = order.quantity || 1;
    doc.text(String(qty), col2X + 2, y);

    const subtotal = order.price || 0;
    const priceStr = subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(priceStr, pageWidth - margin, y, { align: "right" });

    y += productLines.length * 3.5 + 2;

    // --- Divider ---
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // --- Totals ---
    const shipping = order.delivery_rate || 0;
    const total = subtotal + shipping;

    const labelX = margin + 28;
    const valueX = pageWidth - margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);

    doc.text("Sub Total", labelX, y);
    doc.text(subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    doc.text("Delivery Fee", labelX, y);
    doc.text(shipping.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    // Grand Total line
    doc.setLineWidth(0.2);
    doc.line(labelX, y - 1, pageWidth - margin, y - 1);
    y += 2;

    doc.setFontSize(8);
    doc.text("Grand Total", labelX, y);
    doc.text(total.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
    y += 4;

    doc.text("Due Amount", labelX, y);
    doc.text(total.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), valueX, y, { align: "right" });
  });

  const filename = orders.length > 1
    ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
    : `Invoice_${orders[0].order_number}.pdf`;

  doc.save(filename);
};
