import contracts from "./contract.json";

export const NETWORK = contracts.network;

export const {
  PaymentCoreV1_ADDRESS_TRON: PaymentCore_ADDRESS,
  PaymentCoreV1_ABI: PaymentCore_ABI,

  TRC_20_ABI: USDT_ABI,
  TRC_20_USDT_ADDRESS_TRON: USDT_ADDRESS,

  MerchantRegistryV1_ADDRESS_TRON: MerchantRegistry_ADDRESS,
  MerchantRegistryV1_ABI: MerchantRegistry_ABI
} = contracts;

export const PAYMENT = Object.freeze({
  address: PaymentCore_ADDRESS,
  abi: PaymentCore_ABI
});

export const USDT = Object.freeze({
  address: USDT_ADDRESS,
  abi: USDT_ABI
});

export const MERCHANT_REGISTRY = Object.freeze({
  address: MerchantRegistry_ADDRESS,
  abi: MerchantRegistry_ABI
});
