// src/lib/tron.js
import { createRequire } from "module";
import { MERCHANT_REGISTRY } from "@/config";

export const runtime = "nodejs"; // safe even if unused here

const require = createRequire(import.meta.url);

// tronweb v6+ exports { TronWeb }, older versions exported constructor directly.
// We'll support all shapes.
function resolveTronWebCtor() {
  const mod = require("tronweb");

  // ✅ tronweb@6+ common pattern
  if (mod?.TronWeb) return mod.TronWeb;

  // Some bundlers wrap as default
  if (mod?.default?.TronWeb) return mod.default.TronWeb;
  if (mod?.default) return mod.default;

  // Older versions: module itself is constructor
  if (typeof mod === "function") return mod;

  // Debug help
  const keys = mod ? Object.keys(mod) : [];
  throw new Error(`Unable to resolve TronWeb constructor. Module keys: ${keys.join(", ")}`);
}

const TronWeb = resolveTronWebCtor();

export function getTronWeb() {
  const pk = process.env.TRON_ADMIN_PRIVATE_KEY;
  if (!pk) throw new Error("TRON_ADMIN_PRIVATE_KEY missing");

  const fullNode = process.env.TRON_FULLNODE;
  const solidityNode = process.env.TRON_SOLIDITYNODE;
  const eventServer = process.env.TRON_EVENTSERVER;

  if (!fullNode || !solidityNode || !eventServer) {
    throw new Error(
      "TRON_* node URLs missing (TRON_FULLNODE/TRON_SOLIDITYNODE/TRON_EVENTSERVER)"
    );
  }

  return new TronWeb(fullNode, solidityNode, eventServer, pk);
}

export function getTronWebPublic() {
  const fullNode = process.env.TRON_FULLNODE;
  const solidityNode = process.env.TRON_SOLIDITYNODE;
  const eventServer = process.env.TRON_EVENTSERVER;

  if (!fullNode || !solidityNode || !eventServer) {
    throw new Error(
      "TRON_* node URLs missing (TRON_FULLNODE/TRON_SOLIDITYNODE/TRON_EVENTSERVER)"
    );
  }

  return new TronWeb(fullNode, solidityNode, eventServer);
}

// ✅ onboardMerchant(bytes32,address)
export async function registerMerchantOnChain({ merchantAddress, merchantIdBytes32 }) {
  const tronWeb = getTronWeb();
  const contract = await tronWeb.contract(MERCHANT_REGISTRY.abi, MERCHANT_REGISTRY.address);

  // IMPORTANT: do not swallow errors; let API return the real reason.
  const txid = await contract
    .onboardMerchant(merchantIdBytes32, merchantAddress)
    .send();

  return txid;
}
