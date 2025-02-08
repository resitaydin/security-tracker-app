import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function AdminHomeScreen({ navigation }) {
    const [companyData, setCompanyData] = useState(null);
    const [stats, setStats] = useState({
        totalGuards: 0,
        activeCheckpoints: 0
    });

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                // Get user data to get companyId
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!userDoc.exists()) {
                    throw new Error('User data not found');
                }

                const userData = userDoc.data();

                // Get company data
                const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
                if (!companyDoc.exists()) {
                    throw new Error('Company data not found');
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

        fetchCompanyData();
    }, []);

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

    return (
        <View style={styles.container}>
            <Text h4 style={styles.title}>Admin Dashboard</Text>

            {companyData && (
                <Card>
                    <Card.Title>{companyData.name}</Card.Title>
                    <Card.Divider />
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.totalGuards}</Text>
                            <Text style={styles.statLabel}>Guards</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.activeCheckpoints}</Text>
                            <Text style={styles.statLabel}>Checkpoints</Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>
                        Company created: {formatDate(companyData.createdAt)}
                    </Text>
                </Card>
            )}

            <Button
                title="Manage Checkpoints"
                onPress={() => navigation.navigate('ManageCheckpoints')}
                containerStyle={styles.button}
            />

            <Button
                title="Monitor Guards"
                onPress={() => navigation.navigate('Monitoring')}
                containerStyle={styles.button}
            />

            <Button
                title="Logout"
                type="clear"
                onPress={handleLogout}
                containerStyle={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
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
