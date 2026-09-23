// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRetromBridge } from "../../src/retrom-bridge.js";

function fixture() {
    const state = { ram: new Uint8Array([7, 8, 9]) };
    let restored = null;
    let held = 0;
    let paints = 0;
    const bridge = createRetromBridge({
        processor: { snapshotState: () => state },
        model: { name: "B-DFS1.2" },
        media: { slots: { driveSlots: [] } },
        snapshots: {
            restore: async (snapshot) => {
                restored = snapshot;
            },
        },
        loop: {
            pause: () => {
                held++;
                return () => {
                    held--;
                };
            },
            stop: () => undefined,
        },
        video: {
            paint: () => {
                paints++;
            },
        },
        canvas: {},
    });
    return { bridge, held: () => held, restored: () => restored, paints: () => paints };
}

describe("Retrom bridge", () => {
    it("restores a nonempty checkpoint in a new machine", async () => {
        const first = fixture();
        const bytes = await first.bridge.checkpoint();
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(2);
        expect([...bytes.slice(0, 2)]).toEqual([0x1f, 0x8b]);
        expect(first.held()).toBe(0);

        const second = fixture();
        await second.bridge.restore(bytes);
        expect(second.restored().state.ram).toEqual(new Uint8Array([7, 8, 9]));
        expect(second.paints()).toBe(1);
        expect(second.held()).toBe(0);
    });

    it("rejects empty restore data", async () => {
        await expect(fixture().bridge.restore(new Uint8Array())).rejects.toThrow("JSBEEB_CHECKPOINT_INVALID");
    });
});
