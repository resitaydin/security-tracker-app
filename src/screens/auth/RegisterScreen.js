import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Input, Button, CheckBox, Text, Overlay } from '@rneui/themed';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import AppBar from '../../components/AppBar';
import * as Clipboard from 'expo-clipboard';

export default function RegisterScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [existingCompanyId, setExistingCompanyId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFirstAdmin, setIsFirstAdmin] = useState(true);
    const [approvalCode, setApprovalCode] = useState('');
    const [showApprovalCodeOverlay, setShowApprovalCodeOverlay] = useState(false);
    const [generatedApprovalCode, setGeneratedApprovalCode] = useState('');

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };
    const generateApprovalCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = 8;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    // Function to copy approval code
    const copyApprovalCode = async () => {
        try {
            await Clipboard.setStringAsync(generatedApprovalCode);
            Alert.alert('Success', 'Approval code copied to clipboard!');
        } catch (error) {
            Alert.alert('Error', 'Failed to copy approval code');
        }
    };

    const validateInput = async () => {
        if (!email || !password || !confirmPassword || !name) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        if (isAdmin) {
            if (!companyName) {
                Alert.alert('Error', 'Please enter a company name');
                return false;
            }

            // For admin registration, verify company and approval code
            try {
                const companiesRef = collection(db, 'companies');
                const companyQuery = query(
                    companiesRef,
                    where('name', '==', companyName)
                );
                const companySnapshot = await getDocs(companyQuery);

                if (!companySnapshot.empty) {
                    // Company exists, this is an additional admin
                    const companyData = companySnapshot.docs[0].data();

                    if (!approvalCode) {
                        Alert.alert('Error', 'Please enter the company approval code');
                        return false;
                    }

                    if (approvalCode !== companyData.approvalCode) {
                        Alert.alert('Error', 'Invalid approval code');
                        return false;
                    }
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to verify company information');
                return false;
            }
        } else {
            if (!existingCompanyId) {
                Alert.alert('Error', 'Please enter an existing company name');
                return false;
            }

            // Verify the company exists for guard registration
            try {
                const companiesRef = collection(db, 'companies');
                const companyQuery = query(
                    companiesRef,
                    where('name', '==', existingCompanyId)
                );
                const companySnapshot = await getDocs(companyQuery);

                if (companySnapshot.empty) {
                    Alert.alert('Error', 'Company does not exist. Please enter a valid company name.');
                    return false;
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to verify company information');
                return false;
            }
        }

        return true;
    };

    const handleRegister = async () => {
        setLoading(true);

        try {
            const isValid = await validateInput();
            if (!isValid) {
                setLoading(false);
                return;
            }

            let companyId = '';
            let companyData = null;

            // Find or create company
            const companiesRef = collection(db, 'companies');
            const companyQuery = query(
                companiesRef,
                where('name', '==', isAdmin ? companyName : existingCompanyId)
            );
            const companySnapshot = await getDocs(companyQuery);

            if (!companySnapshot.empty) {
                companyData = companySnapshot.docs[0].data();
                companyId = companySnapshot.docs[0].id;
            }

            // New company admin registration
            if (companySnapshot.empty && isAdmin) {
                const newApprovalCode = generateApprovalCode();
                const timestamp = Date.now();
                const customCompanyId = `COMP_${timestamp}`;

                await setDoc(doc(db, 'companies', customCompanyId), {
                    id: customCompanyId,
                    name: companyName,
                    approvalCode: newApprovalCode,
                    createdAt: new Date().toISOString(),
                    settings: {}
                });
                companyId = customCompanyId;
                setGeneratedApprovalCode(newApprovalCode);

                // Create user account without automatic sign in
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Immediately sign out
                await signOut(auth);

                // Create user document
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    id: userCredential.user.uid,
                    name,
                    email,
                    companyId,
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    allowedLocations: []
                });

                // Show overlay without immediate navigation
                setShowApprovalCodeOverlay(true);
                return; // Exit early for new admin case
            }

            // Handle regular guard or existing admin registration
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await signOut(auth); // Sign out immediately

            await setDoc(doc(db, 'users', userCredential.user.uid), {
                id: userCredential.user.uid,
                name,
                email,
                companyId,
                role: isAdmin ? 'admin' : 'guard',
                createdAt: new Date().toISOString(),
                allowedLocations: []
            });

            Alert.alert('Success', 'Account created successfully');
            navigation.navigate('Login');

        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const debouncedCompanyCheck = useCallback(
        debounce(async (text) => {
            if (!text) return;

            try {
                const companiesRef = collection(db, 'companies');
                const companyQuery = query(companiesRef, where('name', '==', text));
                const companySnapshot = await getDocs(companyQuery);

                setIsFirstAdmin(companySnapshot.empty);
                if (!companySnapshot.empty) {
                    Alert.alert('Notice', 'This company exists. You will need an approval code to register as an admin.');
                }
            } catch (error) {
                console.error('Error checking company name:', error);
            }
        }, 500),
        []
    );

    const handleCompanyNameChange = (text) => {
        setCompanyName(text);
        debouncedCompanyCheck(text);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <AppBar
                title="Security Tracker App"
                leftComponent={{
                    icon: 'arrow-back',
                    color: '#fff',
                    onPress: () => navigation.goBack()
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollViewContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>

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
                        {isAdmin && (
                            <Input
                                placeholder="Company Name"
                                value={companyName}
                                onChangeText={handleCompanyNameChange}
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.input}
                            />
                        )}

                        {isAdmin && !isFirstAdmin && (
                            <Input
                                placeholder="Company Approval Code"
                                value={approvalCode}
                                onChangeText={setApprovalCode}
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.input}
                            />
                        )}

                        {!isAdmin && (
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
                </ScrollView>
            </KeyboardAvoidingView>
            <Overlay
                isVisible={showApprovalCodeOverlay}
                onBackdropPress={() => { }} // Prevent closing on backdrop press
                backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.8)' }} // Make backdrop darker
            >
                <View style={styles.overlayContent}>
                    <Text h4 style={styles.overlayTitle}>Company Created Successfully</Text>
                    <Text style={styles.overlayText}>
                        Your company approval code is:
                    </Text>
                    <TouchableOpacity onPress={copyApprovalCode} style={styles.codeContainer}>
                        <Text style={styles.codeText}>{generatedApprovalCode}</Text>
                        <Text style={styles.copyText}>(Tap to copy)</Text>
                    </TouchableOpacity>
                    <Text style={styles.warningText}>
                        Please save this code! You'll need it to add more administrators to your company.
                    </Text>
                    <Button
                        title="I've Saved the Code"
                        onPress={async () => {
                            try {
                                setShowApprovalCodeOverlay(false);
                                navigation.navigate('Login');
                            } catch (error) {
                                console.error('Navigation error:', error);
                            }
                        }}
                        containerStyle={styles.overlayButton}
                    />
                </View>
            </Overlay>
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
    formContainer: {
        flex: 0,
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
        borderColor: '#90CAF9',
        borderBottomWidth: 0,
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
    overlayContent: {
        padding: 20,
        minWidth: 300,
    },
    overlayTitle: {
        textAlign: 'center',
        marginBottom: 20,
    },
    overlayText: {
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 16,
    },
    codeContainer: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 8,
        marginVertical: 10,
        alignItems: 'center',
    },
    codeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1976D2',
        letterSpacing: 2,
    },
    copyText: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    warningText: {
        color: '#f44336',
        textAlign: 'center',
        marginVertical: 10,
    },
    overlayButton: {
        marginTop: 20,
    },
});
