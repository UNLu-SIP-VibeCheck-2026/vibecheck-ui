import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, from } from "rxjs";
import { catchError, map } from "rxjs/operators";

export interface TxState {
  status: "pending" | "confirmed" | "failed";
  hash: string;
  receipt?: any;
  error?: any;
}

@Injectable({
  providedIn: "root",
})
export class TransactionService {
  track(txPromise: Promise<any> | any): Observable<TxState> {
    // Determine initial transaction hash if available
    let txHash = "";
    if (typeof txPromise === "object" && txPromise !== null) {
      txHash = txPromise.hash || txPromise.transactionHash || "";
    }

    const stateSubject = new BehaviorSubject<TxState>({
      status: "pending",
      hash: txHash,
    });

    // Handle standard ethers.js transaction objects containing wait()
    if (txPromise && typeof txPromise.wait === "function") {
      from(txPromise.wait()).pipe(
        map((receipt: any) => {
          const finalHash = txHash || (receipt ? (receipt.hash || receipt.transactionHash) : "");
          stateSubject.next({
            status: "confirmed",
            hash: finalHash,
            receipt,
          });
          stateSubject.complete();
          return receipt;
        }),
        catchError((error: any) => {
          stateSubject.next({
            status: "failed",
            hash: txHash,
            error,
          });
          stateSubject.complete();
          throw error;
        })
      ).subscribe();
    } else {
      // If it's a standard promise resolving to a transaction object
      from(Promise.resolve(txPromise)).subscribe({
        next: (resolvedTx: any) => {
          const finalHash = (resolvedTx && (resolvedTx.hash || resolvedTx.transactionHash)) || txHash;
          stateSubject.next({ status: "pending", hash: finalHash });

          if (resolvedTx && typeof resolvedTx.wait === "function") {
            resolvedTx.wait().then(
              (receipt: any) => {
                stateSubject.next({
                  status: "confirmed",
                  hash: finalHash || (receipt ? (receipt.hash || receipt.transactionHash) : ""),
                  receipt,
                });
                stateSubject.complete();
              },
              (error: any) => {
                stateSubject.next({
                  status: "failed",
                  hash: finalHash,
                  error,
                });
                stateSubject.complete();
              }
            );
          } else {
            stateSubject.next({ status: "confirmed", hash: finalHash });
            stateSubject.complete();
          }
        },
        error: (error: any) => {
          stateSubject.next({
            status: "failed",
            hash: txHash,
            error,
          });
          stateSubject.complete();
        },
      });
    }

    return stateSubject.asObservable();
  }
}
