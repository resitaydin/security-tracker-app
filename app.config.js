import 'dotenv/config';

export default {
    expo: {
        name: "Guvenlik Takip Sistemi",
        slug: "security-tracker-app",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            package: "com.resitaydin.securitytrackerapp"
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        extra: {
            eas: {
                projectId: "7bd9f1f0-e99a-46cb-9371-e9233df231c5"
            },
            firebaseConfig: {
                apiKey: process.env.EXPO_PUBLIC_API_KEY,
                authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
                projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
                storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
                messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
                appId: process.env.EXPO_PUBLIC_APP_ID,
                measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID
            }
        },
        updates: {
            fallbackToCacheTimeout: 0
        },
        assetBundlePatterns: [
            "**/*"
        ],
        plugins: [
            [
                "expo-build-properties",
                {
                    "android": {
                        "usesCleartextTraffic": true
                    }
                }
            ]
        ]
    }
};