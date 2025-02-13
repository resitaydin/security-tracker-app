import React from 'react';
import { StyleSheet } from 'react-native';
import { Header } from '@rneui/themed';

export default function AppBar({ title, leftComponent, rightComponent }) {
    return (
        <Header
            placement="center"
            leftComponent={leftComponent}
            centerComponent={{
                text: title,
                style: styles.headerTitle
            }}
            rightComponent={rightComponent}
            containerStyle={styles.header}
        />
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#2089dc',
        borderBottomWidth: 0,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});