import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, ListItem, Icon } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, where, getDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { handleCheckpointRecurrence } from '../../utils/checkpointUtils';

const getStatusColor = (status) => {
    switch (status) {
        case 'Verified': return '#4caf50';  // Green
        case 'Active': return '#2196f3';    // Blue
        case 'Upcoming': return '#ff9800';   // Orange
        case 'Past': return '#f44336';      // Red
        default: return '#757575';          // Grey
    }
};

export default function GuardHomeScreen({ navigation }) {
    const [checkpoints, setCheckpoints] = useState([]);
    const [verifiedCheckpoints, setVerifiedCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCheckpointsAndVerifications = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!userDoc.exists()) {
                    throw new Error('User data not found');
                }
                const userCompanyId = userDoc.data().companyId;

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
                    const checkpointList = await Promise.all(snapshot.docs.map(async doc => {
                        const checkpoint = { id: doc.id, ...doc.data() };
                        const recurrenceUpdate = handleCheckpointRecurrence(checkpoint);
                        if (recurrenceUpdate) {
                            await updateDoc(doc.ref, {
                                startTime: recurrenceUpdate.startTime,
                                endTime: recurrenceUpdate.endTime,
                                lastRecurrence: recurrenceUpdate.lastRecurrence
                            });
                            checkpoint.startTime = recurrenceUpdate.startTime;
                            checkpoint.endTime = recurrenceUpdate.endTime;
                            checkpoint.lastRecurrence = recurrenceUpdate.lastRecurrence;
                        }
                        return checkpoint;
                    }));
                    setCheckpoints(checkpointList);
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

    const isCheckpointVerified = (checkpoint) => {
        const verification = verifiedCheckpoints.find(v =>
            v.checkpointId === checkpoint.id &&
            new Date(v.verifiedAt) >= new Date(checkpoint.startTime) &&
            new Date(v.verifiedAt) <= new Date(checkpoint.endTime)
        );
        return !!verification;
    };

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
        const verified = isCheckpointVerified(item);

        let status = 'Pending';
        if (now < startTime) {
            status = 'Upcoming';
        } else if (now > endTime) {
            status = 'Past';
        } else {
            status = verified ? 'Verified' : 'Active';
        }

        return (
            <ListItem
                bottomDivider
                onPress={() => navigation.navigate('CheckpointDetail', {
                    checkpoint: item,
                    isVerified: verified
                })}
            >
                <Icon
                    name={verified ? "check-circle" : "location-pin"}
                    type="material"
                    color={getStatusColor(status)}
                />
                <ListItem.Content>
                    <ListItem.Title>{item.name}</ListItem.Title>
                    <ListItem.Subtitle>
                        {`Time: ${new Date(item.startTime).toLocaleTimeString()} - ${new Date(item.endTime).toLocaleTimeString()}`}
                        {item.isRecurring ? `\nRecurs every ${item.recurringHours} hours` : ''}
                        {'\nStatus: ' + status}
                    </ListItem.Subtitle>
                </ListItem.Content>
                <ListItem.Chevron />
            </ListItem>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text h4>Checkpoints</Text>
                <Button
                    title="Logout"
                    type="clear"
                    onPress={handleLogout}
                />
            </View>

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
                    data={checkpoints}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 