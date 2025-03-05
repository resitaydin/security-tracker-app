import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card, Input } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AppBar from '../../components/AppBar';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';

export default function AdminHomeScreen({ navigation }) {
    const [companyData, setCompanyData] = useState(null);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [lateWindowMinutes, setLateWindowMinutes] = useState('15'); // default 15 minutes
    const [stats, setStats] = useState({
        totalGuards: 0,
        activeCheckpoints: 0
    });
    const { t } = useTranslation();

    const fetchCompanyData = async () => {
        try {
            // Make sure we have an authenticated user first
            if (!auth.currentUser) {
                console.log("No user is authenticated, skipping fetchCompanyData");
                return;
            }

            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (!userDoc.exists()) {
                console.log("User document doesn't exist for ID:", auth.currentUser.uid);
                // Instead of throwing an error, just return and don't update state
                return;
            }

            const userData = userDoc.data();

            // Get company data
            const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
            if (!companyDoc.exists()) {
                console.log("Company document doesn't exist for ID:", userData.companyId);
                // Instead of throwing an error, just return and don't update state
                return;
            }

            setCompanyData({
                id: companyDoc.id,
                ...companyDoc.data()
            });

            // Get guards count
            const guardsQuery = query(
                collection(db, 'users'),
                where('companyId', '==', userData.companyId),
                where('role', '==', 'guard')
            );
            const guardsSnapshot = await getDocs(guardsQuery);

            // Get active checkpoints count
            const checkpointsQuery = query(
                collection(db, 'checkpoints'),
                where('companyId', '==', userData.companyId)
            );
            const checkpointsSnapshot = await getDocs(checkpointsQuery);

            setStats({
                totalGuards: guardsSnapshot.size,
                activeCheckpoints: checkpointsSnapshot.size
            });

        } catch (error) {
            console.error('Error fetching company data:', error);
            Alert.alert('Error', error.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchCompanyData();
        }, [])
    );

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const updateCompanySettings = async () => {
        try {
            const minutes = parseInt(lateWindowMinutes);
            if (isNaN(minutes) || minutes < 0) {
                Alert.alert('Error', 'Please enter a valid number of minutes');
                return;
            }

            await updateDoc(doc(db, 'companies', companyData.id), {
                lateWindowMinutes: minutes,
                updatedAt: new Date().toISOString()
            });

            setIsEditingSettings(false);
            Alert.alert('Success', 'Company settings updated');
            fetchCompanyData();
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <AppBar
                title={t('admin.dashboard')}
                rightComponent={{
                    icon: 'logout',
                    color: '#fff',
                    onPress: handleLogout
                }}
            />
            <LanguageSelector />
            <View style={styles.contentContainer}>
                {companyData && (
                    <Card>
                        <Card.Title>{companyData.name}</Card.Title>
                        <Card.Divider />
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.totalGuards}</Text>
                                <Text style={styles.statLabel}>{t('admin.guards')}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.activeCheckpoints}</Text>
                                <Text style={styles.statLabel}>{t('admin.checkpoints')}</Text>
                            </View>
                        </View>
                        <Text style={styles.dateText}>
                            {t('admin.companyCreated')}: {formatDate(companyData.createdAt)}
                        </Text>
                    </Card>

                )}
                <Card>
                    <Card.Title>{t('admin.companySettings')}</Card.Title>
                    <Card.Divider />
                    {isEditingSettings ? (
                        <View>
                            <Input
                                label={t('admin.lateWindowMinutes')}
                                value={lateWindowMinutes}
                                onChangeText={setLateWindowMinutes}
                                keyboardType="numeric"
                                placeholder={t('admin.enterMinutes')}
                            />
                            <View style={styles.settingsButtons}>
                                <Button
                                    title={t('common.cancel')}
                                    type="outline"
                                    onPress={() => setIsEditingSettings(false)}
                                    containerStyle={styles.settingButton}
                                />
                                <Button
                                    title={t('common.save')}
                                    onPress={updateCompanySettings}
                                    containerStyle={styles.settingButton}
                                />
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.settingText}>
                                {t('admin.lateWindow')}: {companyData?.lateWindowMinutes || 15} {t('common.minutes')}
                            </Text>
                            <Button
                                title={t('admin.editSettings')}
                                type="outline"
                                onPress={() => setIsEditingSettings(true)}
                            />
                        </View>
                    )}
                </Card>
                <Button
                    title={t('admin.manageCheckpoints')}
                    onPress={() => navigation.navigate('ManageCheckpoints')}
                    containerStyle={styles.button}
                />

                <Button
                    title={t('admin.monitorGuards')}
                    onPress={() => navigation.navigate('Monitoring')}
                    containerStyle={styles.button}
                />

                <Button
                    title={t('common.logout')}
                    type="clear"
                    onPress={handleLogout}
                    containerStyle={styles.button}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    settingsButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
    },
    settingButton: {
        width: '45%',
    },
    settingText: {
        fontSize: 16,
        marginBottom: 15,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {  // Add this new style
        padding: 20,
    },
    title: {
        textAlign: 'center',
        marginVertical: 20,
    },
    button: {
        marginVertical: 10,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    dateText: {
        textAlign: 'center',
        marginTop: 10,
        color: '#666',
    }
});
