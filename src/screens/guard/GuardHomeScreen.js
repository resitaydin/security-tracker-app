import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, ListItem, Icon } from '@rneui/themed';
import { signOut } from 'firebase/auth';
import { collection, query, onSnapshot, where, getDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { handleCheckpointRecurrence } from '../../utils/checkpointUtils';

const getStatusColor = (status) => {
    switch (status) {
        case 'Active': return '#4caf50';
        case 'Upcoming': return '#2196f3';
        case 'Past': return '#f44336';
        default: return '#757575';
    }
};

export default function GuardHomeScreen({ navigation }) {
    const [checkpoints, setCheckpoints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCheckpoints = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (!userDoc.exists()) {
                    throw new Error('User data not found');
                }
                const userCompanyId = userDoc.data().companyId;

                const checkpointsQuery = query(
                    collection(db, 'checkpoints'),
                    where('companyId', '==', userCompanyId)
                );

                const unsubscribe = onSnapshot(checkpointsQuery, async (snapshot) => {
                    const checkpointList = await Promise.all(snapshot.docs.map(async doc => {
                        const checkpoint = { id: doc.id, ...doc.data() };

                        // Check for recurrence and update if needed
                        const recurrenceUpdate = handleCheckpointRecurrence(checkpoint);
                        if (recurrenceUpdate) {
                            // Update the checkpoint with new times
                            try {
                                await updateDoc(doc.ref, {
                                    startTime: recurrenceUpdate.startTime,
                                    endTime: recurrenceUpdate.endTime,
                                    lastRecurrence: recurrenceUpdate.lastRecurrence
                                });
                            } catch (error) {
                                console.error('Error updating checkpoint recurrence:', error);
                                // Continue loading even if update fails
                            }

                            // Update the local checkpoint object
                            checkpoint.startTime = recurrenceUpdate.startTime;
                            checkpoint.endTime = recurrenceUpdate.endTime;
                            checkpoint.lastRecurrence = recurrenceUpdate.lastRecurrence;
                        }

                        return checkpoint;
                    }));

                    setCheckpoints(checkpointList);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error fetching checkpoints:', error);
                setLoading(false);
            }
        };

        fetchCheckpoints();
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

        let status = 'Pending';
        if (now < startTime) {
            status = 'Upcoming';
        } else if (now > endTime) {
            status = 'Past';
        } else {
            status = 'Active';
        }

        return (
            <ListItem
                bottomDivider
                onPress={() => navigation.navigate('CheckpointDetail', { checkpoint: item })}
            >
                <Icon
                    name="location-pin"
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