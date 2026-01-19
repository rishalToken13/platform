import { MERCHANT_REGISTRY, PAYMENT } from "@/config";

const MERCHANT_REGISTRY_EVENTS = MERCHANT_REGISTRY.abi.filter((x) => x.type === "event");
const PAYMENT_EVENTS = PAYMENT.abi.filter((x) => x.type === "event");

function eventSignature(tronWeb, eventAbi) {
  const types = eventAbi.inputs.map((i) => i.type).join(",");
  return tronWeb.sha3(`${eventAbi.name}(${types})`);
}

export function normHex(v) {
  if (!v) return "";
  const s = String(v).toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

export function toBytes32(tronWeb, str) {
  const hex = tronWeb.toHex(String(str)).replace(/^0x/, "");
  return "0x" + (hex + "0".repeat(64)).slice(0, 64);
}

function tryDecodeLog(tronWeb, log, eventAbi) {
  const sig = normHex(eventSignature(tronWeb, eventAbi));
  const topic0 = normHex(log.topics?.[0]);
  if (!topic0 || topic0 !== sig) return null;

  const indexedInputs = eventAbi.inputs.filter((i) => i.indexed);
  const nonIndexedInputs = eventAbi.inputs.filter((i) => !i.indexed);

  const args = {};

  // Indexed params from topics
  for (let i = 0; i < indexedInputs.length; i++) {
    const input = indexedInputs[i];
    const topicVal = log.topics[i + 1];
    if (!topicVal) continue;

    if (input.type === "address") {
      const hex = "0x" + topicVal.slice(-40);
      args[input.name] = tronWeb.address.fromHex(hex);
    } else {
      args[input.name] = normHex(topicVal);
    }
  }

  // Non-indexed params from data
  if (nonIndexedInputs.length > 0) {
    const types = nonIndexedInputs.map((i) => i.type);
    const names = nonIndexedInputs.map((i) => i.name);

    const dataHex = log.data?.startsWith("0x") ? log.data : `0x${log.data || ""}`;
    const decoded = tronWeb.utils.abi.decodeParams(types, dataHex);

    for (let i = 0; i < names.length; i++) {
      let v = decoded[i];
      if (types[i] === "address") v = tronWeb.address.fromHex(v);
      args[names[i]] = v;
    }
  }

  return { eventName: eventAbi.name, args };
}

export function decodeMerchantRegistryEvent(tronWeb, txInfo) {
  const logs = txInfo?.log || [];
  for (const log of logs) {
    for (const ev of MERCHANT_REGISTRY_EVENTS) {
      const decoded = tryDecodeLog(tronWeb, log, ev);
      if (decoded) return decoded;
    }
  }
  return null;
}

export function decodePaymentEvent(tronWeb, txInfo) {
  const logs = txInfo?.log || [];
  for (const log of logs) {
    for (const ev of PAYMENT_EVENTS) {
      const decoded = tryDecodeLog(tronWeb, log, ev);
      if (decoded) return decoded;
    }
  }
  return null;
}
