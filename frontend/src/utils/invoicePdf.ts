import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export interface InvoicePDFData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  // Business info
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessNpwp: string;
  businessLogo?: string;
  businessSignature?: string;
  businessSignatureQr?: string;
  businessBankInfo: string;
  // Client info
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  // Items
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  ppnEnabled: boolean;
  ppnRate: number;
  ppnAmount: number;
  total: number;
  notes?: string;
  status: string;
}

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "#F3F4F6", text: "#6B7280", label: "Draft" },
    sent: { bg: "#DBEAFE", text: "#1D4ED8", label: "Terkirim" },
    paid: { bg: "#D1FAE5", text: "#059669", label: "Lunas" },
    overdue: { bg: "#FEE2E2", text: "#DC2626", label: "Terlambat" },
  };
  const c = colors[status] || colors.draft;
  return `<span style="background:${c.bg};color:${c.text};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${c.label}</span>`;
}

export function generateInvoiceHTML(data: InvoicePDFData): string {
  const itemRows = data.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #E5E7EB;">${idx + 1}</td>
        <td style="padding:12px;border-bottom:1px solid #E5E7EB;">${item.description}</td>
        <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:center;">${item.quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:right;">${formatRp(item.rate)}</td>
        <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;">${formatRp(item.amount)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #1F2937;
      background: #fff;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1E40AF;
    }
    .logo-section { display: flex; align-items: center; gap: 16px; }
    .logo { width: 80px; height: 80px; object-fit: contain; border-radius: 12px; }
    .company-name { font-size: 24px; font-weight: 800; color: #1E40AF; }
    .company-detail { font-size: 12px; color: #6B7280; margin-top: 4px; line-height: 1.6; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 32px; color: #1E40AF; font-weight: 800; letter-spacing: -1px; }
    .invoice-number { font-size: 14px; color: #6B7280; margin-top: 8px; }
    .invoice-status { margin-top: 12px; }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 32px;
    }
    .info-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9CA3AF;
      margin-bottom: 12px;
    }
    .info-box p {
      font-size: 14px;
      line-height: 1.8;
      color: #374151;
    }
    .info-box .name { font-weight: 700; font-size: 16px; color: #1F2937; }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #1E40AF;
      color: #fff;
      padding: 14px 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table th:first-child { border-radius: 8px 0 0 0; }
    .items-table th:last-child { border-radius: 0 8px 0 0; }
    .items-table td {
      font-size: 14px;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .totals-row.total {
      border-bottom: none;
      border-top: 2px solid #1E40AF;
      margin-top: 8px;
      padding-top: 16px;
    }
    .totals-row .label { color: #6B7280; }
    .totals-row .value { font-weight: 600; }
    .totals-row.total .label { font-weight: 700; color: #1F2937; font-size: 16px; }
    .totals-row.total .value { font-weight: 800; color: #1E40AF; font-size: 20px; }
    
    .bank-info {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 12px;
      margin-top: 32px;
    }
    .bank-info h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    .bank-info p {
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-line;
    }
    
    .notes {
      margin-top: 24px;
      padding: 16px;
      background: #FFFBEB;
      border-radius: 12px;
      border-left: 4px solid #F59E0B;
    }
    .notes h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #92400E;
      margin-bottom: 8px;
    }
    .notes p { color: #78350F; font-size: 13px; line-height: 1.6; }
    
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-box {
      text-align: center;
    }
    .signature-box img {
      height: 60px;
      margin-bottom: 8px;
    }
    .signature-box .name {
      font-weight: 700;
      padding-top: 8px;
      border-top: 1px solid #1F2937;
      min-width: 150px;
    }
    .qr-box {
      text-align: center;
    }
    .qr-box img {
      width: 80px;
      height: 80px;
    }
    .qr-box .label {
      font-size: 10px;
      color: #6B7280;
      margin-top: 4px;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #9CA3AF;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${data.businessLogo ? `<img src="${data.businessLogo}" class="logo" />` : ""}
      <div>
        <div class="company-name">${data.businessName || "Luar Jendela Creatrip"}</div>
        <div class="company-detail">
          ${data.businessAddress ? `${data.businessAddress}<br>` : ""}
          ${data.businessPhone ? `Tel: ${data.businessPhone}` : ""}
          ${data.businessEmail ? ` | ${data.businessEmail}` : ""}
          ${data.businessNpwp ? `<br>NPWP: ${data.businessNpwp}` : ""}
        </div>
      </div>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <div class="invoice-number">${data.invoiceNumber}</div>
      <div class="invoice-status">${getStatusBadge(data.status)}</div>
    </div>
  </div>
  
  <div class="info-grid">
    <div class="info-box">
      <h3>Tagihan Kepada</h3>
      <p>
        <span class="name">${data.clientName || "-"}</span><br>
        ${data.clientAddress || ""}<br>
        ${data.clientPhone ? `Tel: ${data.clientPhone}` : ""}
        ${data.clientEmail ? `<br>${data.clientEmail}` : ""}
      </p>
    </div>
    <div class="info-box" style="text-align:right;">
      <h3>Detail Invoice</h3>
      <p>
        <strong>Tanggal:</strong> ${data.issueDate}<br>
        <strong>Jatuh Tempo:</strong> ${data.dueDate}
      </p>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Deskripsi</th>
        <th style="width:80px;text-align:center">Qty</th>
        <th style="width:120px;text-align:right">Harga</th>
        <th style="width:140px;text-align:right">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span class="label">Subtotal</span>
      <span class="value">${formatRp(data.subtotal)}</span>
    </div>
    ${
      data.ppnEnabled
        ? `
    <div class="totals-row">
      <span class="label">PPN (${data.ppnRate}%)</span>
      <span class="value">${formatRp(data.ppnAmount)}</span>
    </div>
    `
        : ""
    }
    <div class="totals-row total">
      <span class="label">Total</span>
      <span class="value">${formatRp(data.total)}</span>
    </div>
  </div>
  
  ${
    data.businessBankInfo
      ? `
  <div class="bank-info">
    <h3>Informasi Pembayaran</h3>
    <p>${data.businessBankInfo}</p>
  </div>
  `
      : ""
  }
  
  ${
    data.notes
      ? `
  <div class="notes">
    <h3>Catatan</h3>
    <p>${data.notes}</p>
  </div>
  `
      : ""
  }
  
  <div class="signature-section">
    <div class="signature-box">
      ${data.businessSignature ? `<img src="${data.businessSignature}" />` : '<div style="height:60px"></div>'}
      <div class="name">${data.businessName || "Authorized"}</div>
    </div>
    ${
      data.businessSignatureQr
        ? `
    <div class="qr-box">
      <img src="${data.businessSignatureQr}" />
      <div class="label">Verifikasi Digital</div>
    </div>
    `
        : ""
    }
  </div>
  
  <div class="footer">
    Dokumen ini dibuat secara elektronik oleh Luar Jendela Creatrip<br>
    Terima kasih atas kepercayaan Anda
  </div>
</body>
</html>
  `;
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<string> {
  const html = generateInvoiceHTML(data);
  
  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });
    return uri;
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}

export async function shareInvoicePDF(data: InvoicePDFData): Promise<void> {
  const uri = await generateInvoicePDF(data);
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Invoice ${data.invoiceNumber}`,
      UTI: "com.adobe.pdf",
    });
  } else {
    // On web, just open the print dialog
    if (Platform.OS === "web") {
      const html = generateInvoiceHTML(data);
      await Print.printAsync({ html });
    }
  }
}

export async function printInvoice(data: InvoicePDFData): Promise<void> {
  const html = generateInvoiceHTML(data);
  await Print.printAsync({ html });
}
