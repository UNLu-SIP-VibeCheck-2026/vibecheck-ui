import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject } from "rxjs";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "./wagmi.config";

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
  track(txPromise: Promise<any> | string | any): Observable<TxState> {
    let initialHash = "";
    if (typeof txPromise === "string") {
      initialHash = txPromise;
    } else if (typeof txPromise === "object" && txPromise !== null) {
      initialHash = txPromise.hash || txPromise.transactionHash || "";
    }

    const stateSubject = new BehaviorSubject<TxState>({
      status: "pending",
      hash: initialHash,
    });

    const resolveHash = async (resolved: any) => {
      let hash = "";
      if (typeof resolved === "string") {
        hash = resolved;
      } else if (resolved && typeof resolved === "object") {
        hash = resolved.hash || resolved.transactionHash || "";
      }
      return hash;
    };

    const waitTx = async (hash: string) => {
      if (!hash) {
        throw new Error("Transacción sin hash válido.");
      }
      return await waitForTransactionReceipt(config, {
        hash: hash as `0x${string}`,
      });
    };

    if (typeof txPromise === "string") {
      waitTx(txPromise).then(
        (receipt) => {
          stateSubject.next({
            status: "confirmed",
            hash: txPromise,
            receipt,
          });
          stateSubject.complete();
        },
        (error) => {
          stateSubject.next({
            status: "failed",
            hash: txPromise,
            error,
          });
          stateSubject.complete();
        }
      );
    } else {
      Promise.resolve(txPromise)
        .then(async (resolved) => {
          if (resolved && typeof resolved.wait === "function") {
            const hash = resolved.hash || resolved.transactionHash || "";
            stateSubject.next({ status: "pending", hash });
            try {
              const receipt = await resolved.wait();
              stateSubject.next({
                status: "confirmed",
                hash: hash || receipt.transactionHash,
                receipt,
              });
              stateSubject.complete();
            } catch (err) {
              stateSubject.next({
                status: "failed",
                hash,
                error: err,
              });
              stateSubject.complete();
            }
          } else {
            const hash = await resolveHash(resolved);
            stateSubject.next({ status: "pending", hash });
            if (hash) {
              try {
                const receipt = await waitTx(hash);
                stateSubject.next({
                  status: "confirmed",
                  hash,
                  receipt,
                });
                stateSubject.complete();
              } catch (err) {
                stateSubject.next({
                  status: "failed",
                  hash,
                  error: err,
                });
                stateSubject.complete();
              }
            } else {
              stateSubject.next({ status: "confirmed", hash: "" });
              stateSubject.complete();
            }
          }
        })
        .catch((error) => {
          stateSubject.next({
            status: "failed",
            hash: initialHash,
            error,
          });
          stateSubject.complete();
        });
    }

    return stateSubject.asObservable();
  }
}
