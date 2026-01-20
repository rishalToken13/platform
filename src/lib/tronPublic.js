import TronWeb from "tronweb";

export function getTronWebPublic() {
  const fullNode = process.env.TRON_FULLNODE;
  const solidityNode = process.env.TRON_SOLIDITYNODE;
  const eventServer = process.env.TRON_EVENTSERVER;

  if (!fullNode || !solidityNode || !eventServer) {
    throw new Error("TRON node URLs missing (TRON_FULLNODE/TRON_SOLIDITYNODE/TRON_EVENTSERVER)");
  }

  return new TronWeb(fullNode, solidityNode, eventServer);
}
