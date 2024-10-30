const productNameMapping = JSON.parse(process.env.PRODUCT_NAME_MAPPING || '{}');
const productAgentCommissionMapping = JSON.parse(process.env.PRODUCT_AGENT_COMMISSION_MAPPING || '{}');
const excludedAgents = JSON.parse(process.env.EXCLUDED_AGENTS || '[]');
const productTypes = JSON.parse(process.env.PRODUCT_TYPES || '{}');
const annuityCommissionPercentage = JSON.parse(process.env.ANNUITY_COMMISSION_PERCENTAGE || '0');

export {
    productNameMapping,
    productAgentCommissionMapping,
    excludedAgents,
    productTypes,
    annuityCommissionPercentage,
};