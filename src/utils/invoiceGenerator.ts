import html2canvas from "html2canvas";
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

const PAGE_WIDTH_MM = 75;
const PAGE_HEIGHT_MM = 100;
const MM_TO_PX = 96 / 25.4;
const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_MM * MM_TO_PX);
const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_MM * MM_TO_PX);

let bengaliFontReady: Promise<void> | null = null;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ensureBengaliFontLoaded = async () => {
  if (document.fonts.check('12px "Noto Sans Bengali"')) return;

  if (!bengaliFontReady) {
    bengaliFontReady = (async () => {
      const response = await fetch("/fonts/NotoSansBengali-Regular.ttf");
      if (!response.ok) throw new Error("Failed to load Bengali font");

      const fontBuffer = await response.arrayBuffer();
      const fontFace = new FontFace("Noto Sans Bengali", fontBuffer, {
        style: "normal",
        weight: "400",
      });

      await fontFace.load();
      document.fonts.add(fontFace);
      await document.fonts.ready;
    })().catch((error) => {
      bengaliFontReady = null;
      throw error;
    });
  }

  await bengaliFontReady;
};

const buildInvoiceMarkup = (order: Order) => {
  const invoiceNo = order.order_number.replace("#", "");
  const subtotal = order.price || 0;
  const shipping = order.delivery_rate || 0;
  const total = subtotal + shipping;
  const quantity = order.quantity || 1;

  const customerName = escapeHtml(order.customer_name || "Customer");
  const customerPhone = order.phone ? escapeHtml(order.phone) : "—";
  const customerAddress = order.address ? escapeHtml(order.address).replace(/\n/g, "<br />") : "—";
  const productName = escapeHtml(order.product || "Item").replace(/\n/g, "<br />");

  return `
    <div style="
      width: ${PAGE_WIDTH_PX}px;
      height: ${PAGE_HEIGHT_PX}px;
      box-sizing: border-box;
      padding: 14px;
      background: #ffffff;
      color: #0a0a0a;
      font-family: 'Noto Sans Bengali', sans-serif;
      display: flex;
      flex-direction: column;
      gap: 8px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #d4d4d4; padding-bottom: 6px;">
        <div>
          <div style="font-size: 15px; font-weight: 700; line-height: 1.1;">অঙ্গনালয়</div>
          <div style="font-size: 10px; color: #525252; margin-top: 2px;">Angonaloy</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: .2px;">INVOICE</div>
          <div style="font-size: 8px; color: #525252; margin-top: 2px;">#AN-${invoiceNo}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 8px;">
        <div style="background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 6px; padding: 5px;">
          <div style="color: #525252; margin-bottom: 2px;">তারিখ / Date</div>
          <div style="font-weight: 700;">${format(new Date(order.created_at), "dd MMM yyyy")}</div>
        </div>
        <div style="background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 6px; padding: 5px;">
          <div style="color: #525252; margin-bottom: 2px;">ডেলিভারি আইডি</div>
          <div style="font-weight: 700;">${order.consignment_id ?? "Pending"}</div>
        </div>
      </div>

      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 6px; font-size: 8px; line-height: 1.45;">
        <div style="font-weight: 700; font-size: 9px; margin-bottom: 4px;">গ্রাহকের তথ্য / Customer</div>
        <div><span style="color:#525252;">নাম:</span> ${customerName}</div>
        <div><span style="color:#525252;">ফোন:</span> ${customerPhone}</div>
        <div><span style="color:#525252;">ঠিকানা:</span> ${customerAddress}</div>
      </div>

      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 6px; font-size: 8px; line-height: 1.4;">
        <div style="font-weight: 700; font-size: 9px; margin-bottom: 4px;">পণ্য / Product</div>
        <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom: 4px;">
          <div style="flex:1;">${productName}</div>
          <div style="white-space: nowrap; font-weight: 700;">x${quantity}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top: 2px;">
          <span style="color:#525252;">Price</span>
          <strong>${formatCurrency(subtotal)}</strong>
        </div>
      </div>

      <div style="margin-top: auto; border-top: 1px dashed #a3a3a3; padding-top: 6px; font-size: 8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
          <span style="color:#525252;">Sub Total</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
          <span style="color:#525252;">Delivery Fee</span>
          <span>${formatCurrency(shipping)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 10px; font-weight: 700; border-top: 1px solid #d4d4d4; padding-top: 4px;">
          <span>মোট / Total</span>
          <span>${formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  `;
};

const renderInvoiceImage = async (order: Order) => {
  await ensureBengaliFontLoaded();

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "-1";
  host.innerHTML = buildInvoiceMarkup(order);

  document.body.appendChild(host);
  const invoiceElement = host.firstElementChild as HTMLElement;

  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(invoiceElement, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  document.body.removeChild(host);
  return canvas.toDataURL("image/png", 1.0);
};

const buildInvoicePdf = async (orders: Order[]) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM],
  });

  for (let index = 0; index < orders.length; index += 1) {
    if (index > 0) doc.addPage([PAGE_WIDTH_MM, PAGE_HEIGHT_MM]);

    const invoiceImage = await renderInvoiceImage(orders[index]);
    doc.addImage(invoiceImage, "PNG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, "FAST");
  }

  return doc;
};

export const generateInvoice = async (orders: Order[]) => {
  const doc = await buildInvoicePdf(orders);
  const filename =
    orders.length > 1
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

  if (!printWindow) {
    doc.save(`Invoice_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
    URL.revokeObjectURL(url);
    return;
  }

  printWindow.onafterprint = () => {
    printWindow.close();
    URL.revokeObjectURL(url);
  };
};
