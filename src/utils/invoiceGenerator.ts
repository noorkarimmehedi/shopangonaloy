import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// Note: jsPDF has limited support for Bangla (Bengali) script.
// For full Bangla support, you would need to:
// 1. Download a Bangla font (e.g., Noto Sans Bengali from Google Fonts)
// 2. Convert it using: https://rawgit.com/MrRio/jsPDF/master/fontconverter/fontconverter.html
// 3. Import the generated font file and use doc.addFont() and doc.setFont()
// Currently using default fonts which support basic Latin characters.

// Define Order interface based on what's used in Dashboard
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
}

export const generateInvoice = (orders: Order[]) => {
    // Use A4 dimensions
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const width = doc.internal.pageSize.getWidth(); // ~210mm
    const height = doc.internal.pageSize.getHeight(); // ~297mm
    const margin = 20;

    // Swiss Design Colors (RGB)
    const black = [10, 10, 10] as [number, number, number]; // #0A0A0A
    const darkGrey = [60, 60, 60] as [number, number, number]; // #3C3C3C
    const lightGrey = [230, 230, 230] as [number, number, number]; // #E6E6E6
    const white = [255, 255, 255] as [number, number, number];

    orders.forEach((order, index) => {
        if (index > 0) {
            doc.addPage();
        }

        // --- 1. BRAND HEADER (Top Right) ---
        // Draw Logo: Black Rounded Square with White "A"
        const logoSize = 16;
        const logoX = width - margin - logoSize;
        const logoY = margin;

        doc.setFillColor(black[0], black[1], black[2]);
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, "F");

        doc.setTextColor(white[0], white[1], white[2]);
        doc.setFont("helvetica", "bolditalic"); // Match logo.tsx italic style
        doc.setFontSize(26);
        doc.text("A", logoX + (logoSize / 2), logoY + (logoSize / 1.4), { align: "center" });

        // Brand Name & Details below logo
        doc.setTextColor(black[0], black[1], black[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        // Letter spacing simulation by adding spaces (PDF js doesn't support tracking natively well without plugin)
        doc.text("Angonaloy", width - margin, logoY + logoSize + 6, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
        doc.text("Dhaka, Bangladesh", width - margin, logoY + logoSize + 10, { align: "right" });
        doc.text("https://angonaloy.shop/", width - margin, logoY + logoSize + 14, { align: "right" });
        doc.text("+8801819502705", width - margin, logoY + logoSize + 18, { align: "right" });


        // --- 2. MASSIVE TITLE (Top Left) ---
        doc.setTextColor(black[0], black[1], black[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(60); // Massive display text
        doc.text("INVOICE", margin - 2, 50); // slight offset for optical alignment with margin


        // --- 3. DETAILS GRID ---
        const gridY = 70;

        // Horizontal Separator - Thick
        doc.setDrawColor(black[0], black[1], black[2]);
        doc.setLineWidth(0.7);
        doc.line(margin, gridY, width - margin, gridY);

        // Grid Content
        const col1 = margin;
        const col2 = margin + 60;
        const col3 = margin + 120;
        const row1 = gridY + 8;
        const row2 = gridY + 20;

        // Label Style
        const drawLabel = (text: string, x: number, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
            doc.text(text.toUpperCase(), x, y);
        };

        // Value Style
        const drawValue = (text: string, x: number, y: number) => {
            doc.setFont("helvetica", "bold"); // Bold for high contrast
            doc.setFontSize(10);
            doc.setTextColor(black[0], black[1], black[2]);
            doc.text(text, x, y);
        };

        // Value Paragraph Style
        const drawParagraph = (text: string, x: number, y: number, maxWidth: number) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(black[0], black[1], black[2]);
            doc.text(text, x, y, { maxWidth });
        };

        // Col 1: Invoice Details
        drawLabel("INVOICE NO", col1, row1);
        drawValue(`#${order.order_number}`, col1, row1 + 5);

        drawLabel("DATE ISSUED", col1, row2);
        drawValue(format(new Date(order.created_at), "dd.MM.yyyy"), col1, row2 + 5);

        // Col 2: Bill To
        drawLabel("BILLED TO", col2, row1);
        drawValue(order.customer_name || "Guest Customer", col2, row1 + 5);
        if (order.phone) {
            doc.setFont("helvetica", "normal");
            doc.text(order.phone, col2, row1 + 10);
        }
        if (order.address) {
            drawParagraph(order.address, col2, row1 + 15, 50);
        }




        // --- 4. ITEM TABLE ---
        // Prepare Data
        const productString = order.product || "Item";
        const subtotal = order.price || 0;
        const shipping = order.delivery_rate || 0;
        const total = subtotal + shipping;

        const tableData = [
            [productString, order.quantity || 1]
        ];

        autoTable(doc, {
            startY: 120,
            head: [["DESCRIPTION", "QTY"]],
            body: tableData,
            theme: 'grid',
            styles: {
                font: "helvetica",
                fontSize: 10,
                cellPadding: { top: 12, bottom: 12, left: 0, right: 0 },
                lineColor: black,
                lineWidth: 0,
                textColor: black,
            },
            headStyles: {
                fillColor: white,
                textColor: darkGrey,
                fontStyle: "bold",
                fontSize: 8,
                halign: "left",
            },
            columnStyles: {
                0: { cellWidth: "auto" }, // Description gets auto width
                1: { cellWidth: 30, valign: "top" }, // Qty aligned to top
            },
            margin: { left: margin, right: margin },

            // Custom Drawing for Borders
            didDrawPage: (data) => {
                // Thick Line ABOVE Header
                doc.setDrawColor(black[0], black[1], black[2]);
                doc.setLineWidth(0.7);
                doc.line(margin, data.settings.startY, width - margin, data.settings.startY);

                // Thin Line BELOW Header
                const headerBottom = data.settings.startY + 8; // approx
                doc.setLineWidth(0.1);
                doc.line(margin, headerBottom, width - margin, headerBottom);
            },
            didDrawCell: (data) => {
                // Thick Line BELOW each body row
                if (data.section === 'body' && data.column.index === 1) {
                    const y = data.cell.y + data.cell.height;
                    doc.setDrawColor(lightGrey[0], lightGrey[1], lightGrey[2]);
                    doc.setLineWidth(0.1);
                    doc.line(margin, y, width - margin, y);
                }
            }
        });

        // --- 5. TOTALS SECTION ---
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        const totalsWidth = 80;
        const totalsX = width - margin - totalsWidth;

        // Subtotal
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
        doc.text("Subtotal", totalsX, finalY);

        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(subtotal.toLocaleString(), width - margin, finalY, { align: "right" });

        // Shipping
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
        doc.text("Shipping", totalsX, finalY + 8);

        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(shipping.toLocaleString(), width - margin, finalY + 8, { align: "right" });

        // Total Line
        doc.setDrawColor(black[0], black[1], black[2]);
        doc.setLineWidth(0.5);
        doc.line(totalsX, finalY + 14, width - margin, finalY + 14);

        // GRAND TOTAL
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", totalsX, finalY + 22);

        doc.setFontSize(16); // Large total
        doc.text(`BDT ${total.toLocaleString()}`, width - margin, finalY + 22, { align: "right" });


        // --- 6. FOOTER & THANK YOU ---
        const footerY = height - 30;

        // Aesthetic "Block" footer or large text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(30);
        doc.setTextColor(240, 240, 240); // Very light grey text
        doc.text("THANK YOU", margin, footerY);

        // Notes or Payment Info
        doc.setFontSize(8);
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
        doc.text("Payment due upon receipt.", margin, footerY + 8);
        doc.text("Please include invoice number on your check.", margin, footerY + 12);

        // Page Number
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
        doc.text(`Page 1/1`, width - margin, height - 10, { align: "right" });



    });

    const filename = orders.length > 1
        ? `Invoices_Bulk_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
        : `Invoice_${orders[0].order_number}.pdf`;

    doc.save(filename);
};
