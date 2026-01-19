// src/lib/bytes32.js
import { keccak256, toUtf8Bytes, isHexString } from "ethers";

/**
 * bytes32 for Solidity: keccak256(abi.encodePacked(string))
 */
export function toBytes32FromString(_tronWebNotNeeded, input) {
  if (!input) throw new Error("input required");

  // Already bytes32
  if (typeof input === "string" && input.startsWith("0x") && input.length === 66 && isHexString(input)) {
    return input.toLowerCase();
  }

  return keccak256(toUtf8Bytes(String(input)));
}
