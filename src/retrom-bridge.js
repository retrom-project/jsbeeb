import { createSnapshot, snapshotFromJSON, snapshotToJSON } from "./snapshot.js";
import { snapshotMedia } from "./web/snapshot-ui.js";

const MaxCheckpointBytes = 32 * 1024 * 1024;

/** A small, same-origin API for Retrom's Provider adapter. */
export function createRetromBridge({ processor, model, media, snapshots, loop, video, canvas }) {
    let releasePause = null;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return Object.freeze({
        canvas,
        pause() {
            if (!releasePause) releasePause = loop.pause("Retrom pause");
        },
        resume() {
            releasePause?.();
            releasePause = null;
        },
        async checkpoint() {
            const release = loop.pause("Retrom checkpoint");
            try {
                const manifest = snapshotMedia(media.slots);
                await embedBlobDiscs(manifest);
                const snapshot = createSnapshot(processor, model, manifest);
                const source = encoder.encode(snapshotToJSON(snapshot));
                const compressed = await transform(source, new CompressionStream("gzip"));
                const bytes = new Uint8Array(compressed);
                if (!bytes.length || bytes.length > MaxCheckpointBytes) throw new Error("JSBEEB_CHECKPOINT_INVALID");
                return bytes;
            } finally {
                release();
            }
        },
        async restore(bytes) {
            if (!ArrayBuffer.isView(bytes) || !bytes.byteLength || bytes.byteLength > MaxCheckpointBytes)
                throw new Error("JSBEEB_CHECKPOINT_INVALID");
            const state = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const release = loop.pause("Retrom restore");
            try {
                const decompressed = await transform(state, new DecompressionStream("gzip"));
                if (!decompressed.byteLength || decompressed.byteLength > MaxCheckpointBytes)
                    throw new Error("JSBEEB_CHECKPOINT_INVALID");
                await snapshots.restore(snapshotFromJSON(decoder.decode(decompressed)));
                video.paint();
            } finally {
                release();
            }
        },
        stop() {
            releasePause?.();
            releasePause = null;
            loop.stop();
        },
    });
}

async function embedBlobDiscs(manifest) {
    if (!manifest) return;
    for (const key of ["disc1", "disc2"]) {
        const reference = manifest[key];
        if (typeof reference !== "string" || !reference.startsWith("blob:")) continue;
        const response = await fetch(reference);
        if (!response.ok) throw new Error("JSBEEB_MEDIA_UNAVAILABLE");
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.length || bytes.length > MaxCheckpointBytes) throw new Error("JSBEEB_MEDIA_UNAVAILABLE");
        manifest[`${key}ImageData`] = bytes;
        manifest[`${key}Name`] = key;
        delete manifest[key];
    }
}

function transform(bytes, stream) {
    const input = new ReadableStream({
        start(controller) {
            controller.enqueue(bytes);
            controller.close();
        },
    });
    return new Response(input.pipeThrough(stream)).arrayBuffer();
}
