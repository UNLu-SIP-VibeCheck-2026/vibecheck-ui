import { Injectable, inject } from "@angular/core";
import { ethers } from "ethers";
import { Web3Service } from "./web3.service";

@Injectable({
  providedIn: "root",
})
export class TokenApprovalService {
  private web3Service = inject(Web3Service);

  async ensureAllowance(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<void> {
    const signer = await this.web3Service.getSigner();
    const ownerAddress = await signer.getAddress();

    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
      ],
      signer
    );

    const currentAllowance: bigint = await tokenContract["allowance"](
      ownerAddress,
      spenderAddress
    );

    if (currentAllowance < amount) {
      const tx = await tokenContract["approve"](spenderAddress, amount);
      await tx.wait();
    }
  }
}
