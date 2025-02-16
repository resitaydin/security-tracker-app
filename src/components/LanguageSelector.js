import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from '@rneui/themed';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSelector() {
    const { currentLanguage, changeLanguage } = useLanguage();

    return (
        <View style={styles.container}>
            <Button
                title="TR"
                type={currentLanguage === 'tr' ? 'solid' : 'outline'}
                onPress={() => changeLanguage('tr')}
                containerStyle={styles.button}
            />
            <Button
                title="EN"
                type={currentLanguage === 'en' ? 'solid' : 'outline'}
                onPress={() => changeLanguage('en')}
                containerStyle={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 10,
    },
    button: {
        marginHorizontal: 5,
        width: 50,
    },
});