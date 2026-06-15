import { Injectable, inject } from "@angular/core";
import { config } from "./wagmi.config";
import { WalletService } from "./wallet.service";
import { readContract, writeContract, getAccount, waitForTransactionReceipt } from "@wagmi/core";
import { parseAbi } from "viem";

@Injectable({
  providedIn: "root",
})
export class TokenApprovalService {
  private walletService = inject(WalletService);

  private readonly ERC20_ABI = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ]);

  async ensureAllowance(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    const account = getAccount(config);
    const ownerAddress = account.address;
    if (!ownerAddress) {
      throw new Error("No hay billetera conectada.");
    }

    const currentAllowance = await readContract(config, {
      address: tokenAddress as `0x${string}`,
      abi: this.ERC20_ABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress as `0x${string}`],
    } as any) as bigint;

    if (currentAllowance < amount) {
      const txPromise = writeContract(config, {
        address: tokenAddress as `0x${string}`,
        abi: this.ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress as `0x${string}`, amount],
      } as any);
      // Mobile: foreground de MetaMask para el approve (deep-link).
      this.walletService.openWallet();
      const txHash = await txPromise;
      await waitForTransactionReceipt(config, { hash: txHash });
    }
  }
}
