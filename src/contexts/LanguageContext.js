import React, { createContext, useState, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from '../translations/tr';
import en from '../translations/en';

// Initialize i18next
i18next.use(initReactI18next).init({
    resources: {
        tr: { translation: tr },
        en: { translation: en },
    },
    lng: 'tr', // default language
    fallbackLng: 'tr',
    interpolation: {
        escapeValue: false,
    },
});

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState('tr');

    const changeLanguage = useCallback(async (language) => {
        try {
            await AsyncStorage.setItem('userLanguage', language);
            await i18next.changeLanguage(language);
            setCurrentLanguage(language);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    }, []);

    const initializeLanguage = useCallback(async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('userLanguage');
            if (savedLanguage) {
                await i18next.changeLanguage(savedLanguage);
                setCurrentLanguage(savedLanguage);
            }
        } catch (error) {
            console.error('Error initializing language:', error);
        }
    }, []);

    return (
        <LanguageContext.Provider value={{ currentLanguage, changeLanguage, initializeLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);