const { withAndroidStyles } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix the Android 12+ Splash Screen "White Circle" issue.
 * Even with a transparent PNG, Android 12+ forces a circular mask around the icon.
 * This plugin modifies the generated `styles.xml` during `npx expo prebuild`,
 * replacing the `windowSplashScreenAnimatedIcon` with the background color itself.
 */
module.exports = function withTransparentSplashIconFix(config) {
    return withAndroidStyles(config, async (config) => {
        config.modResults = applyTransparentSplashIconFix(config.modResults);
        return config;
    });
};

function applyTransparentSplashIconFix(styles) {
    // Find the Theme.App.SplashScreen style
    if (!styles.resources || !styles.resources.style) {
        return styles;
    }

    const splashScreenStyle = styles.resources.style.find(
        (style) => style.$.name === 'Theme.App.SplashScreen'
    );

    if (!splashScreenStyle || !splashScreenStyle.item) {
        return styles;
    }

    // Find and replace the windowSplashScreenAnimatedIcon item
    const animatedIconItem = splashScreenStyle.item.find(
        (item) => item.$.name === 'windowSplashScreenAnimatedIcon'
    );

    if (animatedIconItem) {
        // Override the value to use the background color instead of the drawable logo
        animatedIconItem._ = '@color/splashscreen_background';
    }

    return styles;
}
