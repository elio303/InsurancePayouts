const originalColumnNames = {
  agency: "Agency",
  payeeId: "Payee ID",
  payeeName: "Payee Name",
  incomeClass: "Income Class",
  writingAgentNumber: "Writing Agt #",
  writingAgentLevel: "Writing Agent Level",
  premiumTransaction: "Premium Transaction",
  processDate: "Process Date",
  premiumEffectiveDate: "Premium Eff Date",
  writingAgentAgency: "Writing Agent Agency",
  agencyName: "Agency Name",
  // Above are dropped
  paymentDate: "Payment Date",
  writingAgent: "Writing Agt",
  productCompany: "Product Co",
  policyIssueDate: "Policy Issue Date",
  insuredName: "Insured Name",
  premiumAmount: "Premium Amt",
};

const columnNames = {
  date: "Date",
  carrier: "Carrier",
  productType: "Product Type",
  policyNumber: "Policy #",
  productName: "Product",
  issueDate: "Issue Date",
  insured: "Insured",
  billingFrequency: "Billing Frequency",
  premium: "Premium",
  commissionRatePercentage: "Comm Rate %",
  grossCommissionEarned: "Gross Comm Earned",
  participationPercentage: "% of particip",
  compensationType: "Compensation Type",
  agent: "Agent",
  transactionType: "Transaction Type",
  gap: " ",
  commissionPercentage: "Commission %",
  commissionOwed: "Commission Owed",
  commissionPaid: "Commission Paid",
  paymentMethod: "Payment Method",
  paymentDate: "Payment Date"
};

const earningsReportName = {
  prefix: "",
  dateFormat: "MMDDYYYY",
};

const acceptedFileFormats = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

const excelCellFormats = {
  money: "$#,##0.00",
  percent: "0.0%",
};

const columnsToDrop = [
  originalColumnNames.agency,
  originalColumnNames.payeeId,
  originalColumnNames.payeeName,
  originalColumnNames.incomeClass,
  originalColumnNames.writingAgentNumber,
  originalColumnNames.writingAgentLevel,
  originalColumnNames.premiumTransaction,
  originalColumnNames.processDate,
  originalColumnNames.premiumEffectiveDate,
  originalColumnNames.writingAgentAgency,
  originalColumnNames.agencyName,
];

const renameMapping = {
  [originalColumnNames.paymentDate]: columnNames.date,
  [originalColumnNames.writingAgent]: columnNames.agent,
  [originalColumnNames.productCompany]: columnNames.carrier,
  [originalColumnNames.policyIssueDate]: columnNames.issueDate,
  [originalColumnNames.insuredName]: columnNames.insured,
  [originalColumnNames.premiumAmount]: columnNames.premium
};

const columnsToKeep = [
  columnNames.date,
  columnNames.carrier,
  columnNames.productType,
  columnNames.policyNumber,
  columnNames.productName,
  columnNames.issueDate,
  columnNames.insured,
  columnNames.billingFrequency,
  columnNames.premium,
  columnNames.commissionRatePercentage,
  columnNames.grossCommissionEarned,
  columnNames.participationPercentage,
  columnNames.compensationType,
  columnNames.agent,
  columnNames.transactionType,
];

const newColumns = [
  columnNames.gap,
  columnNames.commissionPercentage,
  columnNames.commissionOwed,
  columnNames.commissionPaid,
  columnNames.paymentMethod,
  columnNames.paymentDate,
];

const columnFormatMapping = {
  [columnNames.premium]: excelCellFormats.money,
  [columnNames.commissionOwed]: excelCellFormats.money,
  [columnNames.commissionPaid]: excelCellFormats.money,
  [columnNames.grossCommissionEarned]: excelCellFormats.money,
  [columnNames.commissionPercentage]: excelCellFormats.percent,
  [columnNames.participationPercentage]: excelCellFormats.percent,
  [columnNames.commissionRatePercentage]: excelCellFormats.percent,
};

const cellColors = {
  navy: "00004DFF",
  darkBlue: "FF4A90E2",
  lighterBlue: "FFB3E5FC",
  lightestBlue: "FFE0F7FF",
};

const fontColors = {
  white: "FFFFFFFF",
  black: "FF333333",
};

const gapColumnWidth = 4;

const columnNameIndex = 4;

export {
  columnNames,
  earningsReportName,
  acceptedFileFormats,
  excelCellFormats,
  columnsToDrop,
  renameMapping,
  columnsToKeep,
  newColumns,
  columnFormatMapping,
  cellColors,
  fontColors,
  gapColumnWidth,
  columnNameIndex,
};