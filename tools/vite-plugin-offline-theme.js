const remoteFontImport =
    "@import url(https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap);";

// The embedded emulator must render without contacting the upstream site's font host.
export function offlineThemePlugin() {
    return {
        name: "retrom-offline-theme",
        enforce: "pre",
        transform(code, id) {
            if (!id.includes("/bootswatch/dist/darkly/bootstrap.min.css")) return null;
            if (!code.includes(remoteFontImport)) throw new Error("BOOTSWATCH_FONT_IMPORT_CHANGED");
            return code.replace(remoteFontImport, "");
        },
    };
}
