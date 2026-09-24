import { describe, it, expect, vi } from "vitest";

import { GamePad } from "../../src/web/gamepads.js";
import { BBC } from "../../src/keymap.js";

describe("GamePad", function () {
    it("routes a deliberate press from a nonzero browser gamepad to the BBC", function () {
        const idle = {
            index: 0,
            connected: true,
            axes: [0, 0, -0.4, 0],
            buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
        };
        const active = {
            index: 1,
            connected: true,
            axes: [0, 0, 0, 0],
            buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
        };
        active.buttons[9] = { pressed: true };
        vi.stubGlobal("navigator", { getGamepads: () => [idle, active] });
        const sysvia = { keyDownRaw: vi.fn(), keyUpRaw: vi.fn() };
        try {
            const gamepad = new GamePad();
            gamepad.update(sysvia);
            expect(sysvia.keyDownRaw).toHaveBeenCalledWith(BBC.SPACE);
            active.buttons[9] = { pressed: false };
            gamepad.update(sysvia);
            expect(sysvia.keyUpRaw).toHaveBeenCalledWith(BBC.SPACE);
            active.buttons[15] = { pressed: true };
            gamepad.update(sysvia);
            expect(sysvia.keyDownRaw).toHaveBeenCalledWith(BBC.X);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    describe("remap", function () {
        it("maps a button to a BBC key", function () {
            const gamepad = new GamePad();

            expect(gamepad.remap("A", "COPY")).toBeNull();
            expect(gamepad.gamepadMapping[0]).toEqual(BBC.COPY);
        });

        it("maps the sticks and a face button together for the direction names", function () {
            const gamepad = new GamePad();

            expect(gamepad.remap("LEFT", "DELETE")).toBeNull();
            expect(gamepad.gamepadAxisMapping[0][-1]).toEqual(BBC.DELETE); // left stick
            expect(gamepad.gamepadAxisMapping[2][-1]).toEqual(BBC.DELETE); // right stick
        });

        it("accepts digits with or without the K prefix", function () {
            const gamepad = new GamePad();

            expect(gamepad.remap("A", "0")).toBeNull();
            expect(gamepad.gamepadMapping[0]).toEqual(BBC.K0);

            expect(gamepad.remap("B", "K9")).toBeNull();
            expect(gamepad.gamepadMapping[1]).toEqual(BBC.K9);
        });

        it("reports an unknown BBC key without changing anything", function () {
            const gamepad = new GamePad();
            const before = gamepad.gamepadMapping[0];

            expect(gamepad.remap("A", "NOTAKEY")).toMatch(/unknown BBC key/);
            expect(gamepad.gamepadMapping[0]).toEqual(before);
        });

        it("reports an unknown gamepad control", function () {
            const gamepad = new GamePad();

            expect(gamepad.remap("WIBBLE", "COPY")).toMatch(/unknown gamepad control/);
        });
    });
});
