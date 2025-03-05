import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Input, Button, CheckBox, Text, Overlay } from '@rneui/themed';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import AppBar from '../../components/AppBar';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };
    const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
            Alert.alert(t('common.success'), t('auth.approvalCodeCopied'));
        } catch (error) {
            Alert.alert(t('common.error'), 'Failed to copy approval code');
        }
    };

    const validateInput = async () => {
        if (!email || !password || !confirmPassword || !name) {
            Alert.alert(t('common.error'), t('auth.fillAllFields'));
            return false;
        }
        if (password.length < 6) {
            Alert.alert(t('common.error'), t('auth.passwordTooShort'));
            return false;
        }
        if (!isValidEmail(email)) {
            Alert.alert(t('common.error'), t('auth.invalidEmail'));
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('common.error'), t('auth.passwordsDoNotMatch'));
            return false;
        }

        if (isAdmin) {
            if (!companyName) {
                Alert.alert(t('common.error'), t('auth.enterCompanyName'));
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
                        Alert.alert(t('common.error'), t('auth.enterApprovalCode'));
                        return false;
                    }

                    if (approvalCode !== companyData.approvalCode) {
                        Alert.alert(t('common.error'), t('auth.invalidApprovalCode'));
                        return false;
                    }
                }
            } catch (error) {
                Alert.alert(t('common.error'), t('auth.verifyCompanyError'));
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
                    Alert.alert(t('common.error'), t('auth.companyNotFound'));
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

            // Find existing company
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

            // For new company admin registration
            if (companySnapshot.empty && isAdmin) {
                // First create the user to check if email is available
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const userId = userCredential.user.uid; // Store this before signing out

                // Only create company if user registration was successful
                const newApprovalCode = generateApprovalCode();
                const timestamp = Date.now();
                const customCompanyId = `COMP_${timestamp}`;

                // Create company document
                await setDoc(doc(db, 'companies', customCompanyId), {
                    id: customCompanyId,
                    name: companyName,
                    approvalCode: newApprovalCode,
                    createdAt: new Date().toISOString(),
                    settings: {}
                });

                // Create user document
                await setDoc(doc(db, 'users', userId), {
                    id: userId,
                    name,
                    email,
                    companyId: customCompanyId,
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                    allowedLocations: []
                });

                await signOut(auth);
                setGeneratedApprovalCode(newApprovalCode);
                setShowApprovalCodeOverlay(true);
                return;
            }

            // Handle regular guard or existing admin registration
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid; // Store this before signing out

            await setDoc(doc(db, 'users', userId), {
                id: userId,
                name,
                email,
                companyId,
                role: isAdmin ? 'admin' : 'guard',
                createdAt: new Date().toISOString(),
                allowedLocations: []
            });

            await signOut(auth);

            Alert.alert('Success', 'Account created successfully');
            navigation.navigate('Login');

        } catch (error) {
            Alert.alert('Error', error.message);
            return;
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
                    Alert.alert(t('common.warning'), t('auth.companyExists'));
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
                title={t('common.appTitle')}
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
                            title={t('auth.registerAsGuardOrAdmin')}
                            checked={isAdmin}
                            onPress={() => setIsAdmin(!isAdmin)}
                            containerStyle={styles.checkboxContainer}
                        />
                        <Input
                            placeholder={t('auth.name')}
                            value={name}
                            onChangeText={setName}
                            containerStyle={styles.inputContainer}
                            inputStyle={styles.input}
                        />
                        <Input
                            placeholder={t('auth.email')}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            containerStyle={styles.inputContainer}
                            inputStyle={styles.input}
                        />
                        <Input
                            placeholder={t('auth.password')}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            containerStyle={styles.inputContainer}
                            inputStyle={styles.input}
                        />
                        <Input
                            placeholder={t('auth.confirmPassword')}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            containerStyle={styles.inputContainer}
                            inputStyle={styles.input}
                        />
                        {isAdmin && (
                            <Input
                                placeholder={t('auth.companyName')}
                                value={companyName}
                                onChangeText={handleCompanyNameChange}
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.input}
                            />
                        )}

                        {isAdmin && !isFirstAdmin && (
                            <Input
                                placeholder={t('auth.approvalCode')}
                                value={approvalCode}
                                onChangeText={setApprovalCode}
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.input}
                            />
                        )}

                        {!isAdmin && (
                            <Input
                                placeholder={t('auth.companyName')}
                                value={existingCompanyId}
                                onChangeText={setExistingCompanyId}
                                containerStyle={styles.inputContainer}
                                inputStyle={styles.input}
                            />
                        )}

                        <Button
                            title={isAdmin ? t('auth.registerAsAdmin') : t('auth.registerAsGuard')}
                            onPress={handleRegister}
                            loading={loading}
                            buttonStyle={styles.loginButton}
                            containerStyle={styles.buttonContainer}
                        />
                        <Button
                            title={t('auth.backToLogin')}
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
                    <Text h4 style={styles.overlayTitle}>{t('auth.companyCreated')}</Text>
                    <Text style={styles.overlayText}>
                        {t('auth.yourCompanyApprovalCode')}
                    </Text>
                    <TouchableOpacity onPress={copyApprovalCode} style={styles.codeContainer}>
                        <Text style={styles.codeText}>{generatedApprovalCode}</Text>
                        <Text style={styles.copyText}>{t('auth.tapToCopy')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.warningText}>
                        Please save this code! You'll need it to add more administrators to your company.
                    </Text>
                    <Button
                        title={t('auth.iveSavedTheCode')}
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
