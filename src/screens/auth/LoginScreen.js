import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { Input, Button } from '@rneui/themed';
import { Text } from '@rneui/base';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import AppBar from '../../components/AppBar';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Fetch user data
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            if (!userDoc.exists()) {
                throw new Error('User data not found');
            }

            const userData = userDoc.data();

            // Fetch company data
            const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
            if (!companyDoc.exists()) {
                throw new Error('Company data not found');
            }

            // Store user and company data in global state or context if needed
            // For now, we'll let the navigation handle role-based routing
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <AppBar title="Security Tracker App" />
            <View style={styles.formContainer}>
                <Input
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.input}
                />
                <Input
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.input}
                />
                <Button
                    title="Login"
                    onPress={handleLogin}
                    loading={loading}
                    buttonStyle={styles.loginButton}
                    containerStyle={styles.buttonContainer}
                />
                <Button
                    title="Register"
                    type="outline"
                    onPress={() => navigation.navigate('Register')}
                    containerStyle={styles.buttonContainer}
                    titleStyle={styles.registerButtonTitle}
                    buttonStyle={styles.registerButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E3F2FD', // Light blue background
    },
    formContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: '600',
        color: '#333',
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#90CAF9', // Lighter blue for border
        borderBottomWidth: 0,  // Remove underline by setting bottom border width to 0
    },
    input: {
        fontSize: 16,
        color: '#333',
    },
    loginButton: {
        backgroundColor: '#1976D2',
        paddingVertical: 12,
        borderRadius: 8,
    },
    registerButton: {
        borderColor: '#1976D2',
        paddingVertical: 12,
        borderRadius: 8,
    },
    registerButtonTitle: {
        color: '#1976D2',
    },
    buttonContainer: {
        marginVertical: 8,
    },
});
