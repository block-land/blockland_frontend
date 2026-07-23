/**
 * Client-side Solana transaction signing helpers.
 *
 * This project is non-custodial: the connected wallet (via Privy) must sign any
 * transaction that moves the user's assets or SOL. The backend only prepares
 * unsigned transactions and settles custody-held assets through the dev wallet.
 *
 * Privy's Solana wallet exposes `signTransaction({ transaction, address, chain })`
 * which returns `{ signedTransaction: Uint8Array }`. We then submit it via an RPC
 * connection.
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { RPC_URL, SOLANA_CLUSTER } from "./constants";

/** A connected Privy Solana wallet (subset of the real interface we use). */
export interface PrivySolanaWallet {
  address: string;
  walletConnectorType?: string;
  signTransaction(input: {
    transaction: Uint8Array;
    address: string;
    /** Privy expects the CAIP-2 chain id, e.g. "solana:devnet". */
    chain: `${string}:${string}`;
  }): Promise<{ signedTransaction: Uint8Array }>;
}

function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

/** Privy expects the chain id in the form "solana:<cluster>". */
function chainId(): `${string}:${string}` {
  return `solana:${SOLANA_CLUSTER}`;
}

/**
 * Sign + submit an unsigned, base64-serialized transaction (produced by the
 * backend) using the connected wallet. Returns the transaction signature.
 *
 * Used for the listing custody transfer (seller signs).
 */
export async function signAndSendBase64Tx(
  base64Tx: string,
  wallet: PrivySolanaWallet
): Promise<string> {
  const bytes = Uint8Array.from(Buffer.from(base64Tx, "base64"));
  const { signedTransaction } = await wallet.signTransaction({
    transaction: bytes,
    address: wallet.address,
    chain: chainId(),
  });

  const connection = getConnection();
  // Try legacy Transaction first (Bubblegum transfers are legacy); fall back to
  // versioned if the wire format is versioned.
  let raw: Uint8Array;
  try {
    const tx = Transaction.from(signedTransaction);
    raw = tx.serialize();
  } catch {
    const vtx = VersionedTransaction.deserialize(signedTransaction);
    raw = vtx.serialize();
  }

  const sig = await connection.sendRawTransaction(raw, { skipPreflight: false });
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

/**
 * Transfer SOL from the connected wallet to a recipient and return the
 * transaction signature. Used to escrow offer funds into the custodian (dev
 * wallet). The bidder signs this on the client.
 */
export async function escrowSol(
  recipientAddress: string,
  lamports: bigint,
  wallet: PrivySolanaWallet
): Promise<string> {
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  // Build a legacy Transaction (the most broadly supported format for signing).
  const transaction = new Transaction({
    feePayer: new PublicKey(wallet.address),
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(wallet.address),
      toPubkey: new PublicKey(recipientAddress),
      lamports: Number(lamports),
    })
  );

  const bytes = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const { signedTransaction } = await wallet.signTransaction({
    transaction: bytes,
    address: wallet.address,
    chain: chainId(),
  });

  // Reconstruct the signed transaction (legacy) and submit.
  const signed = Transaction.from(signedTransaction);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  return sig;
}

export { LAMPORTS_PER_SOL };
