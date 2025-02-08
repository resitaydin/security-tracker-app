import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { Input, Button, CheckBox } from '@rneui/themed';
import { Text } from '@rneui/base';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

export default function RegisterScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [existingCompanyId, setExistingCompanyId] = useState('');
    const [loading, setLoading] = useState(false);

    const validateInput = () => {
        if (!email || !password || !confirmPassword || !name) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }

        if (isAdmin && !companyName) {
            Alert.alert('Error', 'Please enter a company name');
            return false;
        }

        if (!isAdmin && !existingCompanyId) {
            Alert.alert('Error', 'Please enter an existing company name');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateInput()) return;

        try {
            setLoading(true);
            let companyId = '';

            // Find or create company
            const companiesRef = collection(db, 'companies');
            const companyQuery = query(
                companiesRef,
                where('name', '==', isAdmin ? companyName : existingCompanyId)
            );
            const companySnapshot = await getDocs(companyQuery);

            if (companySnapshot.empty && !isAdmin) {
                Alert.alert('Error', 'Company does not exist. Please enter a valid company name.');
                return;
            }

            if (companySnapshot.empty && isAdmin) {
                // Create company ID with prefix and timestamp
                const timestamp = Date.now();
                const customCompanyId = `COMP_${timestamp}`;

                // Create new company with custom ID
                await setDoc(doc(db, 'companies', customCompanyId), {
                    id: customCompanyId,
                    name: companyName,
                    createdAt: new Date().toISOString(),
                    settings: {}
                });
                companyId = customCompanyId;
            } else {
                companyId = companySnapshot.docs[0].id;
            }

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user document with custom ID
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                id: userCredential.user.uid, // Store UID as id
                name,
                email,
                companyId,
                role: isAdmin ? 'admin' : 'guard',
                createdAt: new Date().toISOString(),
                allowedLocations: []
            });

            Alert.alert('Success', 'Account created successfully');
            //navigation.replace('Login');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.appBar}>
                <Text style={styles.appBarTitle}>Security Tracker - Güvenlik Takip</Text>
            </View>
            <View style={styles.formContainer}>
                <Text h3 style={styles.title}>
                    {isAdmin ? 'Register Company Admin' : 'Register Guard'}
                </Text>

                <CheckBox
                    title="Register as Company Admin"
                    checked={isAdmin}
                    onPress={() => setIsAdmin(!isAdmin)}
                    containerStyle={styles.checkboxContainer}
                />
                <Input
                    placeholder="Name"
                    value={name}
                    onChangeText={setName}
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.input}
                />
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
                <Input
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    containerStyle={styles.inputContainer}
                    inputStyle={styles.input}
                />
                {isAdmin ? (
                    <Input
                        placeholder="Company Name"
                        value={companyName}
                        onChangeText={setCompanyName}
                        containerStyle={styles.inputContainer}
                        inputStyle={styles.input}
                    />
                ) : (
                    <Input
                        placeholder="Company Name"
                        value={existingCompanyId}
                        onChangeText={setExistingCompanyId}
                        containerStyle={styles.inputContainer}
                        inputStyle={styles.input}
                    />
                )}

                <Button
                    title={isAdmin ? "Register Company" : "Register Guard"}
                    onPress={handleRegister}
                    loading={loading}
                    buttonStyle={styles.loginButton}
                    containerStyle={styles.buttonContainer}
                />
                <Button
                    title="Back to Login"
                    type="outline"
                    onPress={() => navigation.navigate('Login')}
                    containerStyle={styles.buttonContainer}
                    titleStyle={styles.registerButtonTitle}
                    buttonStyle={styles.registerButton}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    checkboxContainer: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginBottom: 15,
    },
    container: {
        flex: 1,
        backgroundColor: '#E3F2FD', // Light blue background
    },
    appBar: {
        height: 56,
        backgroundColor: '#1976D2', // Blue primary color
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        elevation: 4,
    },
    appBarTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
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
        borderBottomWidth: 0,    // Remove underline (bottom border)
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
