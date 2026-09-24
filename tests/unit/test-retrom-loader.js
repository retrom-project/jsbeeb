// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { loadData } from "../../src/loader.js";

describe("Retrom external BIOS", () => {
    afterEach(() => {
        delete window.RetromJsbeebBios;
        window.history.replaceState({}, "", "/");
    });

    it("loads an authorized ROM from the parent without an HTTP request", async () => {
        window.history.replaceState({}, "", "/?retrom=1");
        window.RetromJsbeebBios = { "roms/os.rom": new Uint8Array([1, 2, 3]) };
        const bytes = await loadData("roms/os.rom");
        expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
        bytes[0] = 9;
        expect(window.RetromJsbeebBios["roms/os.rom"][0]).toBe(1);
    });

    it("loads an authorized ROM when Retrom settings are in the URL fragment", async () => {
        window.history.replaceState({}, "", "/#retrom=1&disc1=game.ssd");
        window.RetromJsbeebBios = { "roms/os.rom": new Uint8Array([4, 5, 6]) };
        expect(await loadData("roms/os.rom")).toEqual(new Uint8Array([4, 5, 6]));
    });

    it("fails closed when a required ROM was not supplied", async () => {
        window.history.replaceState({}, "", "/?retrom=1");
        await expect(loadData("roms/BASIC.ROM")).rejects.toThrow("JSBEEB_BIOS_MISSING");
    });
});
