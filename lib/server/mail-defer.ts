import { after } from "next/server";

/**
 * Runs a mail send after the response has been flushed (`after`). SMTP costs
 * 1-5s per message; Laravel sends inline, but deferring only changes when the
 * work happens -- the API payload and status stay identical, and a transport
 * failure now lands in the server log instead of turning a 201 into a 500.
 *
 * Falls back to a detached send when called outside a request scope.
 */
export function sendAfterResponse(task: () => Promise<void>): void {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error("[mail]", error);
      }
    });
  } catch {
    void task().catch((error) => {
      console.error("[mail]", error);
    });
  }
}
