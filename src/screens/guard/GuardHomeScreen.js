import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, ListItem, Icon } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { filterCheckpointsForTimeWindow } from '../../utils/checkpointUtils';
import AppBar from '../../components/AppBar';

const getStatusColor = (status) => {
    switch (status) {
        case 'verified_ontime': return '#4caf50';
        case 'verified_late': return '#ff9800';
        case 'missed': return '#f44336';
        case 'active': return '#2196f3';
        case 'upcoming': return '#757575';
        case 'late_verifiable': return '#ffd700';
        default: return '#757575';
    }
};

export default function GuardHomeScreen({ navigation }) {
    const [checkpoints, setCheckpoints] = useState([]);
    const [verifiedCheckpoints, setVerifiedCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredCheckpoints, setFilteredCheckpoints] = useState([]);
    const [companySettings, setCompanySettings] = useState(null);
    const [, setRefresh] = useState(0); // Force refresh timer

    useEffect(() => {
        // Update status every minute
        const timer = setInterval(() => {
            setRefresh(prev => prev + 1); // Force re-render
        }, 60000); // Check every minute

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchCheckpointsAndVerifications = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!userDoc.exists()) {
                    throw new Error('User data not found');
                }
                const userCompanyId = userDoc.data().companyId;

                const companyDoc = await getDoc(doc(db, 'companies', userCompanyId));
                if (companyDoc.exists()) {
                    setCompanySettings(companyDoc.data());
                }

                // Set up checkpoint listener
                const checkpointsQuery = query(
                    collection(db, 'checkpoints'),
                    where('companyId', '==', userCompanyId)
                );

                // Set up verifications listener
                const verificationsQuery = query(
                    collection(db, 'checkpoint_verifications'),
                    where('guardId', '==', auth.currentUser.uid),
                    where('companyId', '==', userCompanyId)
                );

                const unsubscribeCheckpoints = onSnapshot(checkpointsQuery, async (snapshot) => {
                    const checkpointList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    const filtered = filterCheckpointsForTimeWindow(checkpointList)
                        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                    setCheckpoints(checkpointList);
                    setFilteredCheckpoints(filtered);
                });

                const unsubscribeVerifications = onSnapshot(verificationsQuery, (snapshot) => {
                    const verifications = snapshot.docs.map(doc => ({
                        ...doc.data(),
                        verifiedAt: new Date(doc.data().verifiedAt)
                    }));
                    setVerifiedCheckpoints(verifications);
                });

                setLoading(false);
                return () => {
                    unsubscribeCheckpoints();
                    unsubscribeVerifications();
                };
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchCheckpointsAndVerifications();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderCheckpoint = ({ item }) => {
        const now = new Date();
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);

        // Calculate late window end time
        const lateWindowEnd = new Date(endTime);
        lateWindowEnd.setMinutes(lateWindowEnd.getMinutes() + (companySettings?.lateWindowMinutes || 15));

        // Find verification for current guard only
        const verification = verifiedCheckpoints.find(v =>
            v.checkpointId === item.id &&
            v.guardId === auth.currentUser.uid &&
            new Date(v.verifiedAt) >= startTime
        );

        let status;
        if (verification) {
            status = verification.status;
        } else if (now < startTime) {
            status = 'upcoming';
        } else if (now > endTime) {
            // Check if current time is past the late window
            status = now > lateWindowEnd ? 'missed' : 'late_verifiable';
        } else {
            status = 'active';
        }

        return (
            <ListItem
                bottomDivider
                onPress={() => navigation.navigate('CheckpointDetail', {
                    checkpoint: item,
                    verificationData: verification || null
                })}
            >
                <Icon
                    name={verification ? "check-circle" : "location-pin"}
                    type="material"
                    color={getStatusColor(status)}
                />
                <ListItem.Content>
                    <ListItem.Title>{item.name}</ListItem.Title>
                    <ListItem.Subtitle>
                        {`Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`}
                        {`\nLate Window: ${companySettings?.lateWindowMinutes || 15} minutes`}
                        {item.isRecurring ? `\nRecurs every ${item.recurringHours} hours` : ''}
                        {'\nStatus: ' + status.replace('_', ' ').toUpperCase()}
                    </ListItem.Subtitle>
                </ListItem.Content>
                <ListItem.Chevron />
            </ListItem>
        );
    };

    return (
        <View style={styles.container}>
            <AppBar
                title="Security Rounds"
                rightComponent={{
                    icon: 'logout',
                    color: '#fff',
                    onPress: handleLogout
                }}
            />

            {loading ? (
                <View style={styles.center}>
                    <Text>Loading checkpoints...</Text>
                </View>
            ) : checkpoints.length === 0 ? (
                <View style={styles.center}>
                    <Text>No checkpoints available</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCheckpoints}
                    renderItem={renderCheckpoint}
                    keyExtractor={item => item.id}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 