import { NextResponse } from 'next/server';

export async function GET() {
  // Parse environment variables
  const productNameMapping = JSON.parse(process.env.PRODUCT_NAME_MAPPING || '{}');
  const productAgentCommissionMapping = JSON.parse(process.env.PRODUCT_AGENT_COMMISSION_MAPPING || '{}');
  const excludedAgents = JSON.parse(process.env.EXCLUDED_AGENTS || '[]');
  const productTypes = JSON.parse(process.env.PRODUCT_TYPES || '{}');
  const annuityCommissionPercentage = JSON.parse(process.env.ANNUITY_COMMISSION_PERCENTAGE || '0');

  // Respond with JSON object containing mappings
  return NextResponse.json({
    productNameMapping,
    productAgentCommissionMapping,
    excludedAgents,
    productTypes,
    annuityCommissionPercentage,
  });
}