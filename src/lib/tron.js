import TronWeb from "tronweb";
import { MERCHANT_REGISTRY } from "@/config";

export function getTronWeb() {
  const pk = process.env.TRON_ADMIN_PRIVATE_KEY;
  if (!pk) throw new Error("TRON_ADMIN_PRIVATE_KEY missing");

  const fullNode = process.env.TRON_FULLNODE;
  const solidityNode = process.env.TRON_SOLIDITYNODE;
  const eventServer = process.env.TRON_EVENTSERVER;

  if (!fullNode || !solidityNode || !eventServer) {
    throw new Error("TRON_* node URLs missing");
  }

  return new TronWeb(fullNode, solidityNode, eventServer, pk);
}

export function getTronWebPublic() {
  const fullNode = process.env.TRON_FULLNODE;
  const solidityNode = process.env.TRON_SOLIDITYNODE;
  const eventServer = process.env.TRON_EVENTSERVER;

  if (!fullNode || !solidityNode || !eventServer) {
    throw new Error("TRON_* node URLs missing");
  }

  return new TronWeb(fullNode, solidityNode, eventServer);
}

export async function registerMerchantOnChain({ merchantAddress, merchantIdBytes32 }) {
    try {
        const tronWeb = getTronWeb();
        const contract = await tronWeb.contract(MERCHANT_REGISTRY.abi, MERCHANT_REGISTRY.address);
        const txid = await contract.onboardMerchant(merchantIdBytes32, merchantAddress).send();
        return txid;
    } catch (error) {
        console.error("Error registering merchant on chain:", error);
    }
  
}

